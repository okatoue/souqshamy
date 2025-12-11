// lib/app_data_context.tsx
// Global data pre-fetching context to eliminate waterfall effect on tab screens

import { useAuth } from '@/lib/auth_context';
import { getDisplayName } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import { ConversationWithDetails } from '@/types/chat';
import { Listing } from '@/types/listing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

// Cache keys
const CONVERSATIONS_CACHE_KEY = '@conversations_cache';
const USER_LISTINGS_CACHE_KEY = '@user_listings_cache';
const RECENTLY_VIEWED_KEY = '@recently_viewed_listings';
const RECENTLY_VIEWED_CACHE_KEY = '@recently_viewed_cache';
const MAX_RECENTLY_VIEWED = 20;

// Cache types
interface CachedConversations {
    conversations: ConversationWithDetails[];
    userId: string;
    timestamp: number;
}

interface CachedUserListings {
    listings: Listing[];
    userId: string;
}

// Helper to get user-specific storage keys for recently viewed
const getRecentlyViewedKeys = (userId: string | undefined) => ({
    idsKey: userId ? `${RECENTLY_VIEWED_KEY}_${userId}` : RECENTLY_VIEWED_KEY,
    cacheKey: userId ? `${RECENTLY_VIEWED_CACHE_KEY}_${userId}` : RECENTLY_VIEWED_CACHE_KEY,
});

interface AppDataContextType {
    // Global loading state - true until all initial data is fetched
    isGlobalLoading: boolean;

    // Conversations
    conversations: ConversationWithDetails[];
    conversationsLoading: boolean;
    conversationsRefreshing: boolean;
    totalUnreadCount: number;
    fetchConversations: (refresh?: boolean) => Promise<void>;
    deleteConversation: (conversationId: string) => Promise<boolean>;
    getOrCreateConversation: (listingId: string, sellerId: string) => Promise<string | null>;

    // User Listings
    userListings: Listing[];
    userListingsLoading: boolean;
    userListingsRefreshing: boolean;
    fetchUserListings: (refresh?: boolean, showLoading?: boolean) => Promise<void>;
    handleSoftDelete: (listingId: number) => Promise<void>;
    handlePermanentDelete: (listingId: number) => Promise<void>;
    handleUpdateStatus: (listing: Listing, newStatus: 'active' | 'sold') => Promise<void>;

    // Recently Viewed
    recentlyViewed: Listing[];
    recentlyViewedLoading: boolean;
    recentlyViewedError: Error | null;
    addToRecentlyViewed: (listingId: number) => Promise<void>;
    clearRecentlyViewed: () => Promise<void>;
    refreshRecentlyViewed: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();

    // Global loading state
    const [isGlobalLoading, setIsGlobalLoading] = useState(true);
    const initialLoadComplete = useRef(false);
    const previousUserId = useRef<string | undefined>(undefined);

    // ========== CONVERSATIONS STATE ==========
    const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
    const [conversationsLoading, setConversationsLoading] = useState(true);
    const [conversationsRefreshing, setConversationsRefreshing] = useState(false);
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);

    // ========== USER LISTINGS STATE ==========
    const [userListings, setUserListings] = useState<Listing[]>([]);
    const [userListingsLoading, setUserListingsLoading] = useState(true);
    const [userListingsRefreshing, setUserListingsRefreshing] = useState(false);

    // ========== RECENTLY VIEWED STATE ==========
    const [recentlyViewed, setRecentlyViewed] = useState<Listing[]>([]);
    const [recentlyViewedLoading, setRecentlyViewedLoading] = useState(true);
    const [recentlyViewedError, setRecentlyViewedError] = useState<Error | null>(null);

    // ========== CONVERSATIONS CACHE HELPERS ==========
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

    // ========== USER LISTINGS CACHE HELPERS ==========
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

    // ========== RECENTLY VIEWED CACHE HELPERS ==========
    const storageKeys = getRecentlyViewedKeys(user?.id);

    const loadCachedRecentlyViewed = useCallback(async (): Promise<Listing[]> => {
        try {
            const cachedData = await AsyncStorage.getItem(storageKeys.cacheKey);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
        } catch (err) {
            console.error('Error loading cached recently viewed:', err);
        }
        return [];
    }, [storageKeys.cacheKey]);

    const saveCachedRecentlyViewed = useCallback(async (listingsToCache: Listing[]) => {
        try {
            await AsyncStorage.setItem(storageKeys.cacheKey, JSON.stringify(listingsToCache));
        } catch (err) {
            console.error('Error saving cached recently viewed:', err);
        }
    }, [storageKeys.cacheKey]);

    // ========== FETCH CONVERSATIONS ==========
    const fetchConversations = useCallback(async (refresh = false) => {
        if (!user) {
            setConversations([]);
            setConversationsLoading(false);
            return;
        }

        try {
            if (refresh) {
                setConversationsRefreshing(true);
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
                setConversationsLoading(false);
                setConversationsRefreshing(false);
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
            setConversationsLoading(false);
            setConversationsRefreshing(false);
        }
    }, [user, saveCachedConversations]);

    // ========== DELETE CONVERSATION ==========
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

    // ========== GET OR CREATE CONVERSATION ==========
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

    // ========== FETCH USER LISTINGS ==========
    const fetchUserListings = useCallback(async (refresh = false, showLoading = false) => {
        if (!user) {
            setUserListings([]);
            setUserListingsLoading(false);
            await clearUserListingsCache();
            return;
        }

        try {
            if (refresh) {
                setUserListingsRefreshing(true);
            } else if (showLoading) {
                setUserListingsLoading(true);
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
            console.error('Error fetching user listings:', error);
            if (refresh) {
                Alert.alert('Error', 'Failed to load your listings');
            }
        } finally {
            setUserListingsLoading(false);
            setUserListingsRefreshing(false);
        }
    }, [user, saveCachedUserListings, clearUserListingsCache]);

    // ========== USER LISTINGS MUTATIONS ==========
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

    // ========== FETCH RECENTLY VIEWED ==========
    const loadRecentlyViewed = useCallback(async (showLoading = false) => {
        try {
            if (showLoading) {
                setRecentlyViewedLoading(true);
            }
            setRecentlyViewedError(null);

            const storedIds = await AsyncStorage.getItem(storageKeys.idsKey);
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
            setRecentlyViewedLoading(false);
        }
    }, [storageKeys.idsKey, saveCachedRecentlyViewed]);

    const addToRecentlyViewed = useCallback(async (listingId: number) => {
        try {
            const storedIds = await AsyncStorage.getItem(storageKeys.idsKey);
            let ids: number[] = storedIds ? JSON.parse(storedIds) : [];

            ids = ids.filter(id => id !== listingId);
            ids.unshift(listingId);
            ids = ids.slice(0, MAX_RECENTLY_VIEWED);

            await AsyncStorage.setItem(storageKeys.idsKey, JSON.stringify(ids));
            await loadRecentlyViewed(false);
        } catch (err) {
            console.error('Error adding to recently viewed:', err);
        }
    }, [storageKeys.idsKey, loadRecentlyViewed]);

    const clearRecentlyViewed = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(storageKeys.idsKey);
            await AsyncStorage.removeItem(storageKeys.cacheKey);
            setRecentlyViewed([]);
        } catch (err) {
            console.error('Error clearing recently viewed:', err);
        }
    }, [storageKeys.idsKey, storageKeys.cacheKey]);

    const refreshRecentlyViewed = useCallback(async () => {
        await loadRecentlyViewed(false);
    }, [loadRecentlyViewed]);

    // ========== CLEAR DATA ON USER CHANGE ==========
    useEffect(() => {
        const currentUserId = user?.id;

        if (previousUserId.current !== currentUserId) {
            // User changed (login/logout/switch) - reset all state
            setConversations([]);
            setUserListings([]);
            setRecentlyViewed([]);
            setTotalUnreadCount(0);
            setConversationsLoading(true);
            setUserListingsLoading(true);
            setRecentlyViewedLoading(true);
            setIsGlobalLoading(true);
            initialLoadComplete.current = false;
            previousUserId.current = currentUserId;
        }
    }, [user?.id]);

    // ========== GLOBAL DATA INITIALIZATION ==========
    useEffect(() => {
        const initializeAllData = async () => {
            console.log('[AppData] initializeAllData called, user:', !!user, 'initialLoadComplete:', initialLoadComplete.current);

            if (!user) {
                // No user - clear everything and stop loading
                console.log('[AppData] No user, clearing data');
                setConversations([]);
                setUserListings([]);
                setRecentlyViewed([]);
                setConversationsLoading(false);
                setUserListingsLoading(false);
                setRecentlyViewedLoading(false);
                setIsGlobalLoading(false);
                return;
            }

            if (initialLoadComplete.current) {
                console.log('[AppData] Initial load already complete, skipping');
                return;
            }

            console.log('[AppData] Starting data initialization for user:', user.id);

            // Wait a short time for the Supabase session to be fully propagated.
            // After OAuth, setSession() triggers onAuthStateChange synchronously,
            // but the internal session state might not be fully ready for queries.
            // This delay prevents getSession() and queries from hanging.
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log('[AppData] Session propagation delay complete');

            // STEP 1: Load from cache first (instant, no network)
            console.log('[AppData] Step 1: Loading from cache...');
            let cachedConversations, cachedUserListings, cachedRecentlyViewed;
            try {
                [cachedConversations, cachedUserListings, cachedRecentlyViewed] = await Promise.all([
                    loadCachedConversations(),
                    loadCachedUserListings(),
                    loadCachedRecentlyViewed()
                ]);
                console.log('[AppData] Cache loaded successfully');
            } catch (cacheError) {
                console.error('[AppData] Error loading cache:', cacheError);
                cachedConversations = null;
                cachedUserListings = null;
                cachedRecentlyViewed = [];
            }

            // Apply cached data immediately
            if (cachedConversations && cachedConversations.length > 0) {
                setConversations(cachedConversations);
                const unread = cachedConversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
                setTotalUnreadCount(unread);
                setConversationsLoading(false);
            }

            if (cachedUserListings && cachedUserListings.userId === user.id && cachedUserListings.listings.length > 0) {
                setUserListings(cachedUserListings.listings);
                setUserListingsLoading(false);
            }

            if (cachedRecentlyViewed.length > 0) {
                setRecentlyViewed(cachedRecentlyViewed);
                setRecentlyViewedLoading(false);
            }

            // STEP 2: Fetch fresh data from network in parallel
            console.log('[AppData] Step 2: Starting network fetches...');
            const fetchPromises: Promise<void>[] = [];

            // Conversations fetch
            fetchPromises.push(
                (async () => {
                    console.log('[AppData] Fetching conversations...');
                    try {
                        const { data: convData, error: convError } = await supabase
                            .from('conversations')
                            .select(`
                                *,
                                listing:listings(id, title, price, currency, images, status)
                            `)
                            .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
                            .order('last_message_at', { ascending: false });

                        if (convError) throw convError;

                        if (!convData || convData.length === 0) {
                            setConversations([]);
                            setTotalUnreadCount(0);
                        } else {
                            const otherUserIds = convData.map(conv =>
                                conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id
                            );
                            const uniqueUserIds = [...new Set(otherUserIds)];

                            const { data: profiles } = await supabase
                                .from('profiles')
                                .select('id, email, phone_number, display_name, avatar_url')
                                .in('id', uniqueUserIds);

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
                        }
                    } catch (error) {
                        console.error('[AppData] Error fetching conversations during init:', error);
                    } finally {
                        console.log('[AppData] Conversations fetch complete');
                        setConversationsLoading(false);
                    }
                })()
            );

            // User listings fetch
            fetchPromises.push(
                (async () => {
                    console.log('[AppData] Fetching user listings...');
                    try {
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
                        console.error('[AppData] Error fetching user listings during init:', error);
                    } finally {
                        console.log('[AppData] User listings fetch complete');
                        setUserListingsLoading(false);
                    }
                })()
            );

            // Recently viewed fetch
            fetchPromises.push(
                (async () => {
                    console.log('[AppData] Fetching recently viewed...');
                    try {
                        const storedIds = await AsyncStorage.getItem(storageKeys.idsKey);
                        if (!storedIds) {
                            setRecentlyViewed([]);
                            return;
                        }

                        const ids: number[] = JSON.parse(storedIds);
                        if (ids.length === 0) {
                            setRecentlyViewed([]);
                            return;
                        }

                        const { data, error: fetchError } = await supabase
                            .from('listings')
                            .select('*')
                            .in('id', ids)
                            .eq('status', 'active');

                        if (fetchError) throw fetchError;

                        const sortedListings = ids
                            .map(id => data?.find(listing => listing.id === id))
                            .filter((listing): listing is Listing => listing !== undefined);

                        setRecentlyViewed(sortedListings);
                        await saveCachedRecentlyViewed(sortedListings);
                    } catch (error) {
                        console.error('[AppData] Error fetching recently viewed during init:', error);
                    } finally {
                        console.log('[AppData] Recently viewed fetch complete');
                        setRecentlyViewedLoading(false);
                    }
                })()
            );

            // Wait for all fetches to complete
            console.log('[AppData] Waiting for all fetches to complete...');
            try {
                await Promise.all(fetchPromises);
                console.log('[AppData] All fetches completed successfully');
            } catch (fetchAllError) {
                console.error('[AppData] Error in Promise.all:', fetchAllError);
            }

            initialLoadComplete.current = true;
            setIsGlobalLoading(false);
            console.log('[AppData] Global loading complete, isGlobalLoading set to false');
        };

        initializeAllData();
    }, [
        user,
        loadCachedConversations,
        loadCachedUserListings,
        loadCachedRecentlyViewed,
        saveCachedConversations,
        saveCachedUserListings,
        saveCachedRecentlyViewed,
        storageKeys.idsKey
    ]);

    // ========== REAL-TIME SUBSCRIPTIONS FOR CONVERSATIONS ==========
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
        isGlobalLoading,

        conversations,
        conversationsLoading,
        conversationsRefreshing,
        totalUnreadCount,
        fetchConversations,
        deleteConversation,
        getOrCreateConversation,

        userListings,
        userListingsLoading,
        userListingsRefreshing,
        fetchUserListings,
        handleSoftDelete,
        handlePermanentDelete,
        handleUpdateStatus,

        recentlyViewed,
        recentlyViewedLoading,
        recentlyViewedError,
        addToRecentlyViewed,
        clearRecentlyViewed,
        refreshRecentlyViewed,
    };

    return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextType {
    const context = useContext(AppDataContext);
    if (!context) {
        throw new Error('useAppData must be used within an AppDataProvider');
    }
    return context;
}
