import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const RECENTLY_VIEWED_KEY = '@recently_viewed_listings';
const RECENTLY_VIEWED_CACHE_KEY = '@recently_viewed_cache';
const MAX_RECENTLY_VIEWED = 20;

export function useRecentlyViewed() {
    const [listings, setListings] = useState<Listing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const isInitialLoad = useRef(true);

    // Load cached listings from AsyncStorage (instant, no network)
    const loadCachedListings = useCallback(async (): Promise<Listing[]> => {
        try {
            const cachedData = await AsyncStorage.getItem(RECENTLY_VIEWED_CACHE_KEY);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
        } catch (err) {
            console.error('Error loading cached listings:', err);
        }
        return [];
    }, []);

    // Save listings to cache
    const saveCachedListings = useCallback(async (listingsToCache: Listing[]) => {
        try {
            await AsyncStorage.setItem(RECENTLY_VIEWED_CACHE_KEY, JSON.stringify(listingsToCache));
        } catch (err) {
            console.error('Error saving cached listings:', err);
        }
    }, []);

    // Load recently viewed listings (with background refresh)
    const loadRecentlyViewed = useCallback(async (showLoading = false) => {
        try {
            // Only show loading spinner on initial load when no cached data exists
            if (showLoading) {
                setIsLoading(true);
            }
            setError(null);

            // Get stored listing IDs
            const storedIds = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
            if (!storedIds) {
                setListings([]);
                await saveCachedListings([]);
                return;
            }

            const ids: number[] = JSON.parse(storedIds);
            if (ids.length === 0) {
                setListings([]);
                await saveCachedListings([]);
                return;
            }

            // Fetch listings from Supabase
            const { data, error: fetchError } = await supabase
                .from('listings')
                .select('*')
                .in('id', ids)
                .eq('status', 'active');

            if (fetchError) {
                throw new Error(fetchError.message);
            }

            // Sort by the order in stored IDs (most recent first)
            const sortedListings = ids
                .map(id => data?.find(listing => listing.id === id))
                .filter((listing): listing is Listing => listing !== undefined);

            // Update state and cache
            setListings(sortedListings);
            await saveCachedListings(sortedListings);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to load recently viewed');
            console.error('Error loading recently viewed:', error);
            setError(error);
            // Keep showing cached data on error
        } finally {
            setIsLoading(false);
        }
    }, [saveCachedListings]);

    // Add a listing to recently viewed
    const addToRecentlyViewed = useCallback(async (listingId: number) => {
        try {
            const storedIds = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
            let ids: number[] = storedIds ? JSON.parse(storedIds) : [];

            // Remove if already exists (to move to front)
            ids = ids.filter(id => id !== listingId);

            // Add to front
            ids.unshift(listingId);

            // Keep only the most recent
            ids = ids.slice(0, MAX_RECENTLY_VIEWED);

            // Save back to storage
            await AsyncStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(ids));

            // Reload listings in background (no loading spinner)
            await loadRecentlyViewed(false);
        } catch (err) {
            console.error('Error adding to recently viewed:', err);
        }
    }, [loadRecentlyViewed]);

    // Clear recently viewed
    const clearRecentlyViewed = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(RECENTLY_VIEWED_KEY);
            await AsyncStorage.removeItem(RECENTLY_VIEWED_CACHE_KEY);
            setListings([]);
        } catch (err) {
            console.error('Error clearing recently viewed:', err);
        }
    }, []);

    // Background refresh - updates data without showing loading state
    const refresh = useCallback(async () => {
        await loadRecentlyViewed(false);
    }, [loadRecentlyViewed]);

    // Initial load: show cached data immediately, then refresh in background
    useEffect(() => {
        const initialize = async () => {
            // First, load cached data instantly (no network)
            const cachedListings = await loadCachedListings();

            if (cachedListings.length > 0) {
                // Show cached data immediately - no loading spinner
                setListings(cachedListings);
                setIsLoading(false);

                // Then refresh in background
                loadRecentlyViewed(false);
            } else {
                // No cache - show loading and fetch
                await loadRecentlyViewed(true);
            }

            isInitialLoad.current = false;
        };

        initialize();
    }, [loadCachedListings, loadRecentlyViewed]);

    return {
        listings,
        isLoading,
        error,
        addToRecentlyViewed,
        clearRecentlyViewed,
        refresh
    };
}