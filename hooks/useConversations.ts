import { useAuth } from '@/lib/auth_context';
import { getDisplayName } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import { ConversationWithDetails } from '@/types/chat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const CONVERSATIONS_CACHE_KEY = '@conversations_cache';

interface CachedConversations {
    conversations: ConversationWithDetails[];
    userId: string;
    timestamp: number;
}

export function useConversations() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);

    // Load cached conversations
    const loadCachedConversations = useCallback(async (): Promise<ConversationWithDetails[] | null> => {
        if (!user) return null;
        try {
            const cached = await AsyncStorage.getItem(`${CONVERSATIONS_CACHE_KEY}_${user.id}`);
            if (cached) {
                const parsed: CachedConversations = JSON.parse(cached);
                if (parsed.userId === user.id) {
                    return parsed.conversations;
                }
            }
        } catch (error) {
            console.error('Error loading cached conversations:', error);
        }
        return null;
    }, [user]);

    // Save conversations to cache
    const saveCachedConversations = useCallback(async (convs: ConversationWithDetails[]) => {
        if (!user) return;
        try {
            const cacheData: CachedConversations = {
                conversations: convs,
                userId: user.id,
                timestamp: Date.now()
            };
            await AsyncStorage.setItem(`${CONVERSATIONS_CACHE_KEY}_${user.id}`, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error saving cached conversations:', error);
        }
    }, [user]);

    // Fetch conversations from Supabase
    const fetchConversations = useCallback(async (refresh = false) => {
        if (!user) {
            setConversations([]);
            setIsLoading(false);
            return;
        }

        try {
            if (refresh) {
                setIsRefreshing(true);
            }

            // Fetch conversations where user is buyer or seller
            const { data: convData, error: convError } = await supabase
                .from('conversations')
                .select(`
                    *,
                    listing:listings(id, title, price, currency, images, status)
                `)
                .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
                .order('last_message_at', { ascending: false });

            if (convError) {
                console.error('Error fetching conversations:', convError);
                throw convError;
            }

            if (!convData || convData.length === 0) {
                setConversations([]);
                setTotalUnreadCount(0);
                setIsLoading(false);
                setIsRefreshing(false);
                return;
            }

            // Get unique other user IDs
            const otherUserIds = convData.map(conv =>
                conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id
            );
            const uniqueUserIds = [...new Set(otherUserIds)];

            // Fetch profiles for other users
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, email, phone_number, display_name, avatar_url')
                .in('id', uniqueUserIds);

            if (profilesError) {
                console.error('Error fetching profiles:', profilesError);
            }

            // Create a map of profiles
            const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

            // Build conversation with details
            const conversationsWithDetails: ConversationWithDetails[] = convData.map(conv => {
                const isBuyer = conv.buyer_id === user.id;
                const otherUserId = isBuyer ? conv.seller_id : conv.buyer_id;
                const otherUserProfile = profileMap.get(otherUserId);

                return {
                    ...conv,
                    other_user: {
                        id: otherUserId,
                        display_name: getDisplayName(otherUserProfile),
                        avatar_url: otherUserProfile?.avatar_url || null
                    },
                    unread_count: isBuyer ? conv.buyer_unread_count : conv.seller_unread_count
                };
            });

            setConversations(conversationsWithDetails);
            await saveCachedConversations(conversationsWithDetails);

            // Calculate total unread
            const unread = conversationsWithDetails.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
            setTotalUnreadCount(unread);

        } catch (error) {
            console.error('Error in fetchConversations:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user, saveCachedConversations]);

    // Delete a conversation
    const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
        if (!user) return false;

        try {
            // Delete the conversation from Supabase
            const { error } = await supabase
                .from('conversations')
                .delete()
                .eq('id', conversationId);

            if (error) {
                console.error('Error deleting conversation:', error);
                return false;
            }

            // Update local state and cache
            setConversations(prev => {
                const updated = prev.filter(c => c.id !== conversationId);
                // Update cache asynchronously
                saveCachedConversations(updated);
                return updated;
            });

            return true;
        } catch (error) {
            console.error('Error in deleteConversation:', error);
            return false;
        }
    }, [user, saveCachedConversations]);

    // Get or create a conversation
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

            if (findError && findError.code !== 'PGRST116') {
                // PGRST116 = not found, which is expected
                console.error('Error finding conversation:', findError);
            }

            // Create new conversation
            const { data: newConv, error: createError } = await supabase
                .from('conversations')
                .insert({
                    listing_id: listingId,
                    buyer_id: user.id,
                    seller_id: sellerId
                })
                .select('id')
                .single();

            if (createError) {
                console.error('Error creating conversation:', createError);
                throw createError;
            }

            // Refresh conversations list
            fetchConversations(false);

            return newConv?.id || null;

        } catch (error) {
            console.error('Error in getOrCreateConversation:', error);
            return null;
        }
    }, [user, fetchConversations]);

    // Initialize with cache, then fetch fresh data
    useEffect(() => {
        const initialize = async () => {
            if (!user) {
                setConversations([]);
                setIsLoading(false);
                return;
            }

            // Load from cache first
            const cached = await loadCachedConversations();
            if (cached && cached.length > 0) {
                setConversations(cached);
                const unread = cached.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
                setTotalUnreadCount(unread);
                setIsLoading(false);
                // Fetch fresh data in background
                fetchConversations(false);
            } else {
                // No cache, show loading
                await fetchConversations(false);
            }
        };

        initialize();
    }, [user, loadCachedConversations, fetchConversations]);

    // Subscribe to real-time updates (only INSERT and UPDATE, not DELETE)
    useEffect(() => {
        if (!user) return;

        console.log('[useConversations] Setting up real-time subscriptions');

        const subscription = supabase
            .channel('conversations-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'conversations',
                    filter: `buyer_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('[useConversations] Conversation INSERT (buyer):', payload);
                    fetchConversations(false);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'conversations',
                    filter: `buyer_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('[useConversations] Conversation UPDATE (buyer):', payload);
                    fetchConversations(false);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'conversations',
                    filter: `seller_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('[useConversations] Conversation INSERT (seller):', payload);
                    fetchConversations(false);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'conversations',
                    filter: `seller_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('[useConversations] Conversation UPDATE (seller):', payload);
                    fetchConversations(false);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                (payload) => {
                    console.log('[useConversations] New message detected:', payload);
                    // Refresh conversations when a new message is inserted
                    // The database trigger updates conversation.last_message but we also
                    // need to refresh to get the latest unread counts
                    fetchConversations(false);
                }
            )
            .subscribe((status, err) => {
                console.log('[useConversations] Subscription status:', status);
                if (err) {
                    console.error('[useConversations] Subscription error:', JSON.stringify(err, null, 2));
                }
            });

        return () => {
            console.log('[useConversations] Cleaning up subscriptions');
            subscription.unsubscribe();
        };
    }, [user, fetchConversations]);

    return {
        conversations,
        isLoading,
        isRefreshing,
        totalUnreadCount,
        fetchConversations,
        getOrCreateConversation,
        deleteConversation
    };
}