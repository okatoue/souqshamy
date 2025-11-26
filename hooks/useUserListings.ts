import { useAuth } from '@/lib/auth_context';
import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

const USER_LISTINGS_CACHE_KEY = '@user_listings_cache';

interface CachedUserListings {
    listings: Listing[];
    userId: string;
}

export function useUserListings() {
    const { user } = useAuth();
    const [listings, setListings] = useState<Listing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const isInitialLoad = useRef(true);

    // Load cached listings from AsyncStorage
    const loadCachedListings = useCallback(async (): Promise<CachedUserListings | null> => {
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

    // Save listings to cache
    const saveCachedListings = useCallback(async (listingsToCache: Listing[]) => {
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

    // Clear cache
    const clearCache = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(USER_LISTINGS_CACHE_KEY);
        } catch (err) {
            console.error('Error clearing user listings cache:', err);
        }
    }, []);

    // Fetch user's listings
    const fetchUserListings = useCallback(async (refresh = false, showLoading = false) => {
        if (!user) {
            setListings([]);
            setIsLoading(false);
            await clearCache();
            return;
        }

        try {
            if (refresh) {
                setIsRefreshing(true);
            } else if (showLoading) {
                setIsLoading(true);
            }

            const { data, error } = await supabase
                .from('listings')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const fetchedListings = data || [];
            setListings(fetchedListings);

            // Update cache
            await saveCachedListings(fetchedListings);
        } catch (error) {
            console.error('Error fetching listings:', error);
            // Only show alert on manual refresh
            if (refresh) {
                Alert.alert('Error', 'Failed to load your listings');
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user, saveCachedListings, clearCache]);

    // Initialize: load cache first, then refresh in background
    useEffect(() => {
        const initialize = async () => {
            if (!user) {
                setListings([]);
                setIsLoading(false);
                return;
            }

            // Try to load from cache first
            const cached = await loadCachedListings();

            if (cached && cached.userId === user.id && cached.listings.length > 0) {
                // Show cached data immediately - no loading spinner
                setListings(cached.listings);
                setIsLoading(false);

                // Then refresh in background
                fetchUserListings(false, false);
            } else {
                // No valid cache - show loading and fetch
                await fetchUserListings(false, true);
            }

            isInitialLoad.current = false;
        };

        initialize();
    }, [user, loadCachedListings, fetchUserListings]);

    // Soft delete (mark as inactive)
    const handleSoftDelete = async (listingId: number) => {
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

                            // Update local state immediately
                            setListings(prev => {
                                const updated = prev.map(l =>
                                    l.id === listingId ? { ...l, status: 'inactive' as const } : l
                                );
                                // Update cache
                                saveCachedListings(updated);
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
    };

    // Permanent delete
    const handlePermanentDelete = async (listingId: number) => {
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

                            // Update local state immediately
                            setListings(prev => {
                                const updated = prev.filter(l => l.id !== listingId);
                                // Update cache
                                saveCachedListings(updated);
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
    };

    // Update status (active/sold)
    const handleUpdateStatus = async (listing: Listing, newStatus: 'active' | 'sold') => {
        try {
            const { error } = await supabase
                .from('listings')
                .update({ status: newStatus })
                .eq('id', listing.id)
                .eq('user_id', user?.id);

            if (error) throw error;

            // Update local state immediately
            setListings(prev => {
                const updated = prev.map(l =>
                    l.id === listing.id ? { ...l, status: newStatus } : l
                );
                // Update cache
                saveCachedListings(updated);
                return updated;
            });

            Alert.alert('Success', `Listing marked as ${newStatus}`);
        } catch (error) {
            console.error('Status update error:', error);
            Alert.alert('Error', 'Failed to update listing status');
        }
    };

    return {
        listings,
        isLoading,
        isRefreshing,
        fetchUserListings,
        handleSoftDelete,
        handlePermanentDelete,
        handleUpdateStatus
    };
}