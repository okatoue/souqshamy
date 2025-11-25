import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const RECENTLY_VIEWED_KEY = '@recently_viewed_listings';
const MAX_RECENTLY_VIEWED = 20;

export function useRecentlyViewed() {
    const [listings, setListings] = useState<Listing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Load recently viewed listings
    const loadRecentlyViewed = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Get stored listing IDs
            const storedIds = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
            if (!storedIds) {
                setListings([]);
                return;
            }

            const ids: number[] = JSON.parse(storedIds);
            if (ids.length === 0) {
                setListings([]);
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

            setListings(sortedListings);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to load recently viewed');
            console.error('Error loading recently viewed:', error);
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

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

            // Reload listings
            await loadRecentlyViewed();
        } catch (err) {
            console.error('Error adding to recently viewed:', err);
        }
    }, [loadRecentlyViewed]);

    // Clear recently viewed
    const clearRecentlyViewed = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(RECENTLY_VIEWED_KEY);
            setListings([]);
        } catch (err) {
            console.error('Error clearing recently viewed:', err);
        }
    }, []);

    // Load on mount
    useEffect(() => {
        loadRecentlyViewed();
    }, [loadRecentlyViewed]);

    return {
        listings,
        isLoading,
        error,
        addToRecentlyViewed,
        clearRecentlyViewed,
        refresh: loadRecentlyViewed
    };
}