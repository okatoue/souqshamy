import { useAuth } from '@/lib/auth_context';
import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

const FAVORITES_CACHE_KEY = '@favorites_cache';
const FAVORITE_IDS_CACHE_KEY = '@favorite_ids_cache';

interface CachedFavorites {
    listings: Listing[];
    ids: string[];
    userId: string;
}

export function useFavorites() {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState<Listing[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const isInitialLoad = useRef(true);

    // Load cached favorites from AsyncStorage
    const loadCachedFavorites = useCallback(async (): Promise<CachedFavorites | null> => {
        try {
            const cachedData = await AsyncStorage.getItem(FAVORITES_CACHE_KEY);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
        } catch (err) {
            console.error('Error loading cached favorites:', err);
        }
        return null;
    }, []);

    // Save favorites to cache
    const saveCachedFavorites = useCallback(async (listings: Listing[], ids: string[]) => {
        if (!user) return;
        try {
            const cacheData: CachedFavorites = {
                listings,
                ids,
                userId: user.id
            };
            await AsyncStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(cacheData));
        } catch (err) {
            console.error('Error saving cached favorites:', err);
        }
    }, [user]);

    // Clear cache (for logout or user change)
    const clearCache = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(FAVORITES_CACHE_KEY);
        } catch (err) {
            console.error('Error clearing favorites cache:', err);
        }
    }, []);

    // Fetch user's favorite listings
    const fetchFavorites = useCallback(async (refresh = false, showLoading = false) => {
        if (!user) {
            setFavorites([]);
            setFavoriteIds(new Set());
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

            // Get favorite listing IDs
            const { data: favoriteData, error: favoriteError } = await supabase
                .from('favorites')
                .select('listing_id')
                .eq('user_id', user.id);

            if (favoriteError) throw favoriteError;

            if (!favoriteData || favoriteData.length === 0) {
                setFavorites([]);
                setFavoriteIds(new Set());
                await saveCachedFavorites([], []);
                return;
            }

            const listingIds = favoriteData.map(f => f.listing_id);
            setFavoriteIds(new Set(listingIds));

            // Fetch the actual listings
            const { data: listingsData, error: listingsError } = await supabase
                .from('listings')
                .select('*')
                .in('id', listingIds)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (listingsError) throw listingsError;

            const listings = listingsData || [];
            setFavorites(listings);

            // Update cache
            await saveCachedFavorites(listings, listingIds);
        } catch (error) {
            console.error('Error fetching favorites:', error);
            // Only show alert on manual refresh, not background updates
            if (refresh) {
                Alert.alert('Error', 'Failed to load favorites');
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user, saveCachedFavorites, clearCache]);

    // Initialize: load cache first, then refresh in background
    useEffect(() => {
        const initialize = async () => {
            if (!user) {
                setFavorites([]);
                setFavoriteIds(new Set());
                setIsLoading(false);
                return;
            }

            // Try to load from cache first
            const cached = await loadCachedFavorites();

            if (cached && cached.userId === user.id && cached.listings.length > 0) {
                // Show cached data immediately - no loading spinner
                setFavorites(cached.listings);
                setFavoriteIds(new Set(cached.ids));
                setIsLoading(false);

                // Then refresh in background
                fetchFavorites(false, false);
            } else {
                // No valid cache - show loading and fetch
                await fetchFavorites(false, true);
            }

            isInitialLoad.current = false;
        };

        initialize();
    }, [user, loadCachedFavorites, fetchFavorites]);

    // Check if a listing is favorited
    const isFavorite = useCallback((listingId: string) => {
        return favoriteIds.has(listingId);
    }, [favoriteIds]);

    // Add a listing to favorites
    const addFavorite = useCallback(async (listingId: string) => {
        if (!user) {
            Alert.alert('Sign In Required', 'Please sign in to save favorites');
            return false;
        }

        try {
            const { error } = await supabase
                .from('favorites')
                .insert({
                    user_id: user.id,
                    listing_id: listingId
                });

            if (error) {
                // Handle duplicate error gracefully
                if (error.code === '23505') {
                    return true;
                }
                throw error;
            }

            // Update local state immediately (optimistic)
            setFavoriteIds(prev => new Set([...prev, listingId]));

            // Refresh in background to get full listing details
            fetchFavorites(false, false);

            return true;
        } catch (error) {
            console.error('Error adding favorite:', error);
            Alert.alert('Error', 'Failed to add to favorites');
            return false;
        }
    }, [user, fetchFavorites]);

    // Remove a listing from favorites
    const removeFavorite = useCallback(async (listingId: string | number) => {
        if (!user) return false;

        const id = String(listingId);

        try {
            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('user_id', user.id)
                .eq('listing_id', id);

            if (error) throw error;

            // Update local state immediately (optimistic)
            setFavoriteIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });

            // Update favorites list
            setFavorites(prev => {
                const updated = prev.filter(l => String(l.id) !== id);
                // Update cache with new list
                saveCachedFavorites(updated, Array.from(favoriteIds).filter(fid => fid !== id));
                return updated;
            });

            return true;
        } catch (error) {
            console.error('Error removing favorite:', error);
            Alert.alert('Error', 'Failed to remove from favorites');
            return false;
        }
    }, [user, favoriteIds, saveCachedFavorites]);

    // Toggle favorite status
    const toggleFavorite = useCallback(async (listingId: string) => {
        if (isFavorite(listingId)) {
            return removeFavorite(listingId);
        } else {
            return addFavorite(listingId);
        }
    }, [isFavorite, addFavorite, removeFavorite]);

    return {
        favorites,
        favoriteIds,
        isLoading,
        isRefreshing,
        fetchFavorites,
        isFavorite,
        addFavorite,
        removeFavorite,
        toggleFavorite
    };
}