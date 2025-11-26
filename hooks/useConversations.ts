import { useAuth } from '@/lib/auth_context';
import { supabase } from '@/lib/supabase';
import { ConversationWithDetails } from '@/types/chat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const CONVERSATIONS_CACHE_KEY = '@conversations_cache';

interface CachedConversations {
    conversations: ConversationWithDetails[];
    userId: string;
}

export function useConversations() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);
    const isInitialLoad = useRef(true);

    // Load cached conversations
    const loadCachedConversations = useCallback(async (): Promise<CachedConversations | null> => {
        try {
            const cachedData = await AsyncStorage.getItem(CONVERSATIONS_CACHE_KEY);
            if (cachedData) {
                const parsed: CachedConversations = JSON.parse(cachedData);
                if (user && parsed.userId === user.id) {
                    return parsed;
                }
            }
        } catch (err) {
            console.error('Error loading cached conversations:', err);
        }
        return null;
    }, [user]);

    // Save conversations to cache
    const saveCachedConversations = useCallback(async (convos: ConversationWithDetails[]) => {
        if (!user) return;
        try {
            const cacheData: CachedConversations = {
                conversations: convos,
                userId: user.id
            };
            await AsyncStorage.setItem(CONVERSATIONS_CACHE_KEY, JSON.stringify(cacheData));
        } catch (err) {
            console.error('Error saving cached conversations:', err);
        }
    }, [user]);

    // Clear cache
    const clearCache = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(CONVERSATIONS_CACHE_KEY);
        } catch (err) {
            console.error('Error clearing conversations cache:', err);
        }
    }, []);

    // Fetch conversations
    const fetchConversations = useCallback(async (refresh = false) => {
        if (!user) {
            setConversations([]);
            setIsLoading(false);
            await clearCache();
            return;
        }

        try {
            if (refresh) {
                setIsRefreshing(true);
            }

            // Fetch conversations where user is buyer or seller
            const { data: convos, error } = await supabase
                .from('conversations')
                .select(`
                    *,
                    listing:listings(id, title, price, currency, images, status)
                `)
                .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
                .order('last_message_at', { ascending: false });

            if (error) throw error;

            if (!convos || convos.length === 0) {
                setConversations([]);
                setTotalUnreadCount(0);
                await saveCachedConversations([]);
                return;
            }

            // Get all other user IDs
            const otherUserIds = convos.map(c =>
                c.buyer_id === user.id ? c.seller_id : c.buyer_id
            );

            // Fetch other users' profiles
            // Fetch other users' profiles
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, display_name, email, avatar_url')
                .in('id', otherUserIds);

            if (profilesError) {
                console.error('Error fetching profiles:', profilesError);
            }

            // Create a map for quick profile lookup
            const profileMap = new Map(
                (profiles || []).map(p => [p.id, p])
            );

            // Transform conversations with details
            const conversationsWithDetails: ConversationWithDetails[] = convos.map(conv => {
                const isBuyer = conv.buyer_id === user.id;
                const otherUserId = isBuyer ? conv.seller_id : conv.buyer_id;
                const otherUserProfile = profileMap.get(otherUserId);

                // Get display name with fallback
                const getDisplayName = () => {
                    if (otherUserProfile?.display_name) return otherUserProfile.display_name;
                    if (otherUserProfile?.email) {
                        const emailName = otherUserProfile.email.split('@')[0];
                        // Check if it's a phone placeholder email
                        if (emailName.match(/^\d+$/)) return 'User';
                        return emailName;
                    }
                    return 'User';
                };

                return {
                    ...conv,
                    other_user: {
                        id: otherUserId,
                        display_name: getDisplayName(),
                        avatar_url: otherUserProfile?.avatar_url || null
                    },
                    unread_count: isBuyer ? conv.buyer_unread_count : conv.seller_unread_count
                };
            });

            // Calculate total unread
            const totalUnread = conversationsWithDetails.reduce(
                (sum, c) => sum + c.unread_count, 0
            );

            setConversations(conversationsWithDetails);
            setTotalUnreadCount(totalUnread);
            await saveCachedConversations(conversationsWithDetails);

        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user, saveCachedConversations, clearCache]);

    // Get or create conversation for a listing
    const getOrCreateConversation = useCallback(async (
        listingId: string,
        sellerId: string
    ): Promise<string | null> => {
        if (!user) return null;

        try {
            // Check if conversation already exists
            const { data: existing, error: findError } = await supabase
                .from('conversations')
                .select('id')
                .eq('listing_id', listingId)
                .eq('buyer_id', user.id)
                .eq('seller_id', sellerId)
                .single();

            if (existing) {
                return existing.id;
            }

            // Create new conversation
            const { data: newConvo, error: createError } = await supabase
                .from('conversations')
                .insert({
                    listing_id: listingId,
                    buyer_id: user.id,
                    seller_id: sellerId
                })
                .select('id')
                .single();

            if (createError) throw createError;

            // Refresh conversations list
            fetchConversations(false);

            return newConvo?.id || null;

        } catch (error) {
            console.error('Error getting/creating conversation:', error);
            return null;
        }
    }, [user, fetchConversations]);

    // Initial load with cache
    useEffect(() => {
        const initializeConversations = async () => {
            if (!user) {
                setConversations([]);
                setIsLoading(false);
                return;
            }

            // Load from cache first
            const cached = await loadCachedConversations();
            if (cached && cached.conversations.length > 0) {
                setConversations(cached.conversations);
                const totalUnread = cached.conversations.reduce(
                    (sum, c) => sum + c.unread_count, 0
                );
                setTotalUnreadCount(totalUnread);
                setIsLoading(false);

                // Then fetch fresh data in background
                fetchConversations(false);
            } else {
                // No cache, fetch fresh
                await fetchConversations(false);
            }

            isInitialLoad.current = false;
        };

        initializeConversations();
    }, [user, loadCachedConversations, fetchConversations]);

    // Subscribe to real-time updates
    useEffect(() => {
        if (!user) return;

        const subscription = supabase
            .channel('conversations-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'conversations',
                    filter: `buyer_id=eq.${user.id}`
                },
                () => fetchConversations(false)
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'conversations',
                    filter: `seller_id=eq.${user.id}`
                },
                () => fetchConversations(false)
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user, fetchConversations]);

    return {
        conversations,
        isLoading,
        isRefreshing,
        totalUnreadCount,
        fetchConversations,
        getOrCreateConversation
    };
}