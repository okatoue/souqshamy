// lib/app_data_context.tsx
import { useAuth } from '@/lib/auth_context';
import { getDisplayName } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import { ConversationWithDetails } from '@/types/chat';
import { Listing } from '@/types/listing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

// Cache keys
const CONVERSATIONS_CACHE_KEY = '@conversations_cache';
const USER_LISTINGS_CACHE_KEY = '@user_listings_cache';
const RECENTLY_VIEWED_KEY = '@recently_viewed_listings';
const RECENTLY_VIEWED_CACHE_KEY = '@recently_viewed_cache';
const MAX_RECENTLY_VIEWED = 20;

// Types
interface CachedConversations {
    conversations: ConversationWithDetails[];
    userId: string;
    timestamp: number;
}

interface CachedUserListings {
    listings: Listing[];
    userId: string;
}

interface AppDataContextType {
    // Loading states
    isDataLoading: boolean;
    isConversationsLoading: boolean;
    isUserListingsLoading: boolean;
    isRecentlyViewedLoading: boolean;

    // Refreshing states
    isConversationsRefreshing: boolean;
    isUserListingsRefreshing: boolean;

    // Conversations data
    conversations: ConversationWithDetails[];
    totalUnreadCount: number;
    fetchConversations: (refresh?: boolean) => Promise<void>;
    getOrCreateConversation: (listingId: string, sellerId: string) => Promise<string | null>;
    deleteConversation: (conversationId: string) => Promise<boolean>;

    // User listings data
    userListings: Listing[];
    fetchUserListings: (refresh?: boolean) => Promise<void>;
    handleSoftDelete: (listingId: number) => Promise<void>;
    handlePermanentDelete: (listingId: number) => Promise<void>;
    handleUpdateStatus: (listing: Listing, newStatus: 'active' | 'sold') => Promise<void>;

    // Recently viewed data
    recentlyViewed: Listing[];
    recentlyViewedError: Error | null;
    addToRecentlyViewed: (listingId: number) => Promise<void>;
    clearRecentlyViewed: () => Promise<void>;
    refreshRecentlyViewed: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();

    // Track which user we've completed initialization for
    // This is the KEY fix: isDataLoading is computed synchronously from this
    const [initializedForUserId, setInitializedForUserId] = useState<string | null>(null);

    // Conversations state
    const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
    const [isConversationsLoading, setIsConversationsLoading] = useState(true);
    const [isConversationsRefreshing, setIsConversationsRefreshing] = useState(false);
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);

    // User listings state
    const [userListings, setUserListings] = useState<Listing[]>([]);
    const [isUserListingsLoading, setIsUserListingsLoading] = useState(true);
    const [isUserListingsRefreshing, setIsUserListingsRefreshing] = useState(false);

    // Recently viewed state
    const [recentlyViewed, setRecentlyViewed] = useState<Listing[]>([]);
    const [isRecentlyViewedLoading, setIsRecentlyViewedLoading] = useState(true);
    const [recentlyViewedError, setRecentlyViewedError] = useState<Error | null>(null);

    // Refs
    const previousUserId = useRef<string | undefined>(undefined);

    // CRITICAL: Compute unified loading state SYNCHRONOUSLY
    // This ensures isDataLoading is true immediately when user changes,
    // before any effects run, preventing the flash of empty content
    const isDataLoading = !!(user && user.id !== initializedForUserId);

    // Get storage keys for recently viewed
    const getRecentlyViewedKeys = useCallback((userId: string | undefined) => ({
        idsKey: userId ? `${RECENTLY_VIEWED_KEY}_${userId}` : RECENTLY_VIEWED_KEY,
        cacheKey: userId ? `${RECENTLY_VIEWED_CACHE_KEY}_${userId}` : RECENTLY_VIEWED_CACHE_KEY,
    }), []);

    // ============================================================================
    // CONVERSATIONS LOGIC
    // ============================================================================

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

    const fetchConversations = useCallback(async (refresh = false) => {
        if (!user) {
            setConversations([]);
            setIsConversationsLoading(false);
            return;
        }

        try {
            if (refresh) {
                setIsConversationsRefreshing(true);
            }

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
                setIsConversationsLoading(false);
                setIsConversationsRefreshing(false);
                return;
            }

            const otherUserIds = convData.map(conv =>
                conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id
            );
            const uniqueUserIds = [...new Set(otherUserIds)];

            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, email, phone_number, display_name, avatar_url')
                .in('id', uniqueUserIds);

            if (profilesError) {
                console.error('Error fetching profiles:', profilesError);
            }

            const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

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

            const unread = conversationsWithDetails.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
            setTotalUnreadCount(unread);

        } catch (error) {
            console.error('Error in fetchConversations:', error);
        } finally {
            setIsConversationsLoading(false);
            setIsConversationsRefreshing(false);
        }
    }, [user, saveCachedConversations]);

    const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
        if (!user) return false;

        try {
            const { error } = await supabase
                .from('conversations')
                .delete()
                .eq('id', conversationId);

            if (error) {
                console.error('Error deleting conversation:', error);
                return false;
            }

            setConversations(prev => {
                const updated = prev.filter(c => c.id !== conversationId);
                saveCachedConversations(updated);
                return updated;
            });

            return true;
        } catch (error) {
            console.error('Error in deleteConversation:', error);
            return false;
        }
    }, [user, saveCachedConversations]);

    const getOrCreateConversation = useCallback(async (
        listingId: string,
        sellerId: string
    ): Promise<string | null> => {
        if (!user) return null;

        try {
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
                console.error('Error finding conversation:', findError);
            }

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

            fetchConversations(false);

            return newConv?.id || null;

        } catch (error) {
            console.error('Error in getOrCreateConversation:', error);
            return null;
        }
    }, [user, fetchConversations]);

    // ============================================================================
    // USER LISTINGS LOGIC
    // ============================================================================

    const loadCachedUserListings = useCallback(async (): Promise<CachedUserListings | null> => {
        try {
            const cachedData = await AsyncStorage.getItem(USER_LISTINGS_CACHE_KEY);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
        } catch (err) {
            console.error('Error loading cached user listings:', err);
        }
        return null;
    }, []);

    const saveCachedUserListings = useCallback(async (listingsToCache: Listing[]) => {
        if (!user) return;
        try {
            const cacheData: CachedUserListings = {
                listings: listingsToCache,
                userId: user.id
            };
            await AsyncStorage.setItem(USER_LISTINGS_CACHE_KEY, JSON.stringify(cacheData));
        } catch (err) {
            console.error('Error saving cached user listings:', err);
        }
    }, [user]);

    const clearUserListingsCache = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(USER_LISTINGS_CACHE_KEY);
        } catch (err) {
            console.error('Error clearing user listings cache:', err);
        }
    }, []);

    const fetchUserListings = useCallback(async (refresh = false) => {
        if (!user) {
            setUserListings([]);
            setIsUserListingsLoading(false);
            await clearUserListingsCache();
            return;
        }

        try {
            if (refresh) {
                setIsUserListingsRefreshing(true);
            }

            const { data, error } = await supabase
                .from('listings')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const fetchedListings = data || [];
            setUserListings(fetchedListings);
            await saveCachedUserListings(fetchedListings);
        } catch (error) {
            console.error('Error fetching listings:', error);
            if (refresh) {
                Alert.alert('Error', 'Failed to load your listings');
            }
        } finally {
            setIsUserListingsLoading(false);
            setIsUserListingsRefreshing(false);
        }
    }, [user, saveCachedUserListings, clearUserListingsCache]);

    const handleSoftDelete = useCallback(async (listingId: number) => {
        Alert.alert(
            'Remove Listing',
            'This will remove the listing from your active/sold items.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('listings')
                                .update({ status: 'inactive' })
                                .eq('id', listingId)
                                .eq('user_id', user?.id);

                            if (error) throw error;

                            setUserListings(prev => {
                                const updated = prev.map(l =>
                                    l.id === listingId ? { ...l, status: 'inactive' as const } : l
                                );
                                saveCachedUserListings(updated);
                                return updated;
                            });

                            Alert.alert('Success', 'Listing moved to removed items');
                        } catch (error) {
                            console.error('Remove error:', error);
                            Alert.alert('Error', 'Failed to remove listing');
                        }
                    }
                }
            ]
        );
    }, [user, saveCachedUserListings]);

    const handlePermanentDelete = useCallback(async (listingId: number) => {
        Alert.alert(
            'Delete Permanently',
            'Are you sure you want to permanently delete this listing? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('listings')
                                .delete()
                                .eq('id', listingId)
                                .eq('user_id', user?.id);

                            if (error) throw error;

                            setUserListings(prev => {
                                const updated = prev.filter(l => l.id !== listingId);
                                saveCachedUserListings(updated);
                                return updated;
                            });

                            Alert.alert('Success', 'Listing permanently deleted');
                        } catch (error) {
                            console.error('Delete error:', error);
                            Alert.alert('Error', 'Failed to delete listing');
                        }
                    }
                }
            ]
        );
    }, [user, saveCachedUserListings]);

    const handleUpdateStatus = useCallback(async (listing: Listing, newStatus: 'active' | 'sold') => {
        try {
            const { error } = await supabase
                .from('listings')
                .update({ status: newStatus })
                .eq('id', listing.id)
                .eq('user_id', user?.id);

            if (error) throw error;

            setUserListings(prev => {
                const updated = prev.map(l =>
                    l.id === listing.id ? { ...l, status: newStatus } : l
                );
                saveCachedUserListings(updated);
                return updated;
            });

            Alert.alert('Success', `Listing marked as ${newStatus}`);
        } catch (error) {
            console.error('Status update error:', error);
            Alert.alert('Error', 'Failed to update listing status');
        }
    }, [user, saveCachedUserListings]);

    // ============================================================================
    // RECENTLY VIEWED LOGIC
    // ============================================================================

    const loadCachedRecentlyViewed = useCallback(async (): Promise<Listing[]> => {
        const keys = getRecentlyViewedKeys(user?.id);
        try {
            const cachedData = await AsyncStorage.getItem(keys.cacheKey);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
        } catch (err) {
            console.error('Error loading cached listings:', err);
        }
        return [];
    }, [user?.id, getRecentlyViewedKeys]);

    const saveCachedRecentlyViewed = useCallback(async (listingsToCache: Listing[]) => {
        const keys = getRecentlyViewedKeys(user?.id);
        try {
            await AsyncStorage.setItem(keys.cacheKey, JSON.stringify(listingsToCache));
        } catch (err) {
            console.error('Error saving cached listings:', err);
        }
    }, [user?.id, getRecentlyViewedKeys]);

    const loadRecentlyViewed = useCallback(async (showLoading = false) => {
        const keys = getRecentlyViewedKeys(user?.id);
        try {
            if (showLoading) {
                setIsRecentlyViewedLoading(true);
            }
            setRecentlyViewedError(null);

            const storedIds = await AsyncStorage.getItem(keys.idsKey);
            if (!storedIds) {
                setRecentlyViewed([]);
                await saveCachedRecentlyViewed([]);
                return;
            }

            const ids: number[] = JSON.parse(storedIds);
            if (ids.length === 0) {
                setRecentlyViewed([]);
                await saveCachedRecentlyViewed([]);
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('listings')
                .select('*')
                .in('id', ids)
                .eq('status', 'active');

            if (fetchError) {
                throw new Error(fetchError.message);
            }

            const sortedListings = ids
                .map(id => data?.find(listing => listing.id === id))
                .filter((listing): listing is Listing => listing !== undefined);

            setRecentlyViewed(sortedListings);
            await saveCachedRecentlyViewed(sortedListings);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to load recently viewed');
            console.error('Error loading recently viewed:', error);
            setRecentlyViewedError(error);
        } finally {
            setIsRecentlyViewedLoading(false);
        }
    }, [user?.id, getRecentlyViewedKeys, saveCachedRecentlyViewed]);

    const addToRecentlyViewed = useCallback(async (listingId: number) => {
        const keys = getRecentlyViewedKeys(user?.id);
        try {
            const storedIds = await AsyncStorage.getItem(keys.idsKey);
            let ids: number[] = storedIds ? JSON.parse(storedIds) : [];

            ids = ids.filter(id => id !== listingId);
            ids.unshift(listingId);
            ids = ids.slice(0, MAX_RECENTLY_VIEWED);

            await AsyncStorage.setItem(keys.idsKey, JSON.stringify(ids));
            await loadRecentlyViewed(false);
        } catch (err) {
            console.error('Error adding to recently viewed:', err);
        }
    }, [user?.id, getRecentlyViewedKeys, loadRecentlyViewed]);

    const clearRecentlyViewed = useCallback(async () => {
        const keys = getRecentlyViewedKeys(user?.id);
        try {
            await AsyncStorage.removeItem(keys.idsKey);
            await AsyncStorage.removeItem(keys.cacheKey);
            setRecentlyViewed([]);
        } catch (err) {
            console.error('Error clearing recently viewed:', err);
        }
    }, [user?.id, getRecentlyViewedKeys]);

    const refreshRecentlyViewed = useCallback(async () => {
        await loadRecentlyViewed(false);
    }, [loadRecentlyViewed]);

    // ============================================================================
    // INITIALIZATION EFFECTS
    // ============================================================================

    // Clear state when user changes
    useEffect(() => {
        const currentUserId = user?.id;

        if (previousUserId.current !== currentUserId) {
            // User changed - clear all state and reset initialization tracker
            setConversations([]);
            setUserListings([]);
            setRecentlyViewed([]);
            setIsConversationsLoading(true);
            setIsUserListingsLoading(true);
            setIsRecentlyViewedLoading(true);
            // Don't reset initializedForUserId here - the synchronous check
            // (user.id !== initializedForUserId) already handles this correctly
            previousUserId.current = currentUserId;
        }
    }, [user?.id]);

    // Initialize all data when user is available
    useEffect(() => {
        const initializeAllData = async () => {
            if (!user) {
                // No user - set empty states and mark loading complete
                setConversations([]);
                setUserListings([]);
                setRecentlyViewed([]);
                setIsConversationsLoading(false);
                setIsUserListingsLoading(false);
                setIsRecentlyViewedLoading(false);
                // Clear initialization tracker when there's no user
                setInitializedForUserId(null);
                return;
            }

            try {
                // Load from cache first for instant UI, then fetch fresh data in parallel
                const [cachedConversations, cachedUserListings, cachedRecentlyViewed] = await Promise.all([
                    loadCachedConversations(),
                    loadCachedUserListings(),
                    loadCachedRecentlyViewed()
                ]);

                // Apply cached data immediately
                if (cachedConversations && cachedConversations.length > 0) {
                    setConversations(cachedConversations);
                    const unread = cachedConversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
                    setTotalUnreadCount(unread);
                    setIsConversationsLoading(false);
                }

                if (cachedUserListings && cachedUserListings.userId === user.id && cachedUserListings.listings.length > 0) {
                    setUserListings(cachedUserListings.listings);
                    setIsUserListingsLoading(false);
                }

                if (cachedRecentlyViewed.length > 0) {
                    setRecentlyViewed(cachedRecentlyViewed);
                    setIsRecentlyViewedLoading(false);
                }

                // Fetch fresh data in parallel - use allSettled to not block on failures
                await Promise.allSettled([
                    fetchConversations(false),
                    fetchUserListings(false),
                    loadRecentlyViewed(!cachedRecentlyViewed.length)
                ]);
            } catch (error) {
                console.error('[AppData] Error during initialization:', error);
            } finally {
                // ALWAYS mark initialization complete, even on error
                // This prevents infinite loading - the app can still work with partial/empty data
                setInitializedForUserId(user.id);
            }
        };

        initializeAllData();
    }, [user, loadCachedConversations, loadCachedUserListings, loadCachedRecentlyViewed, fetchConversations, fetchUserListings, loadRecentlyViewed]);

    // Subscribe to real-time conversation updates
    useEffect(() => {
        if (!user) return;

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
                () => {
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
                () => {
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
                () => {
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
                () => {
                    fetchConversations(false);
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user, fetchConversations]);

    const value: AppDataContextType = {
        // Loading states
        isDataLoading,
        isConversationsLoading,
        isUserListingsLoading,
        isRecentlyViewedLoading,

        // Refreshing states
        isConversationsRefreshing,
        isUserListingsRefreshing,

        // Conversations
        conversations,
        totalUnreadCount,
        fetchConversations,
        getOrCreateConversation,
        deleteConversation,

        // User listings
        userListings,
        fetchUserListings,
        handleSoftDelete,
        handlePermanentDelete,
        handleUpdateStatus,

        // Recently viewed
        recentlyViewed,
        recentlyViewedError,
        addToRecentlyViewed,
        clearRecentlyViewed,
        refreshRecentlyViewed,
    };

    return (
        <AppDataContext.Provider value={value}>
            {children}
        </AppDataContext.Provider>
    );
}

export function useAppData(): AppDataContextType {
    const context = useContext(AppDataContext);
    if (!context) {
        throw new Error('useAppData must be used within an AppDataProvider');
    }
    return context;
}
