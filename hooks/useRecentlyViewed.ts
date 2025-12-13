import { useAuth } from '@/lib/auth_context';
import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const RECENTLY_VIEWED_KEY = '@recently_viewed_listings';
const RECENTLY_VIEWED_CACHE_KEY = '@recently_viewed_cache';
const MAX_RECENTLY_VIEWED = 20;

// Cache version - increment this to invalidate old caches
// v2: Added version field and images validation
const RECENTLY_VIEWED_CACHE_VERSION = 2;

interface CachedRecentlyViewed {
    listings: Listing[];
    version: number;
}

// Helper to get user-specific storage keys
const getStorageKeys = (userId: string | undefined) => ({
    idsKey: userId ? `${RECENTLY_VIEWED_KEY}_${userId}` : RECENTLY_VIEWED_KEY,
    cacheKey: userId ? `${RECENTLY_VIEWED_CACHE_KEY}_${userId}` : RECENTLY_VIEWED_CACHE_KEY,
});

// Helper to check if a listing has valid images
const hasValidImages = (listing: Listing): boolean => {
    return !!(listing.images && listing.images.length > 0 && listing.images[0]);
};

// Helper to check if cache appears stale (most listings missing images)
const isCacheStale = (listings: Listing[]): boolean => {
    if (listings.length === 0) return false;
    // If more than 50% of listings are missing images, consider cache stale
    const listingsWithImages = listings.filter(hasValidImages);
    return listingsWithImages.length < listings.length * 0.5;
};

export function useRecentlyViewed() {
    const { user } = useAuth();
    const [listings, setListings] = useState<Listing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const isInitialLoad = useRef(true);
    const previousUserId = useRef<string | undefined>(undefined);

    // Get current user's storage keys
    const storageKeys = getStorageKeys(user?.id);

    // Load cached listings from AsyncStorage (instant, no network)
    const loadCachedListings = useCallback(async (): Promise<Listing[]> => {
        try {
            const cachedData = await AsyncStorage.getItem(storageKeys.cacheKey);
            if (cachedData) {
                const parsed = JSON.parse(cachedData);

                // Handle versioned cache format
                if (parsed && typeof parsed === 'object' && 'version' in parsed) {
                    const versionedCache = parsed as CachedRecentlyViewed;
                    // Check if cache version matches current version
                    if (versionedCache.version !== RECENTLY_VIEWED_CACHE_VERSION) {
                        console.log('[RecentlyViewed] Cache version mismatch, clearing stale cache');
                        await AsyncStorage.removeItem(storageKeys.cacheKey);
                        return [];
                    }
                    // Check if cached listings have valid images
                    if (isCacheStale(versionedCache.listings)) {
                        console.log('[RecentlyViewed] Cache appears stale (missing images), will refresh');
                        return [];
                    }
                    return versionedCache.listings;
                } else {
                    // Old format (plain array) - clear and return empty
                    console.log('[RecentlyViewed] Old cache format detected, clearing');
                    await AsyncStorage.removeItem(storageKeys.cacheKey);
                    return [];
                }
            }
        } catch (err) {
            console.error('Error loading cached listings:', err);
        }
        return [];
    }, [storageKeys.cacheKey]);

    // Save listings to cache with version
    const saveCachedListings = useCallback(async (listingsToCache: Listing[]) => {
        try {
            const cacheData: CachedRecentlyViewed = {
                listings: listingsToCache,
                version: RECENTLY_VIEWED_CACHE_VERSION
            };
            await AsyncStorage.setItem(storageKeys.cacheKey, JSON.stringify(cacheData));
        } catch (err) {
            console.error('Error saving cached listings:', err);
        }
    }, [storageKeys.cacheKey]);

    // Load recently viewed listings (with background refresh)
    const loadRecentlyViewed = useCallback(async (showLoading = false) => {
        try {
            // Only show loading spinner on initial load when no cached data exists
            if (showLoading) {
                setIsLoading(true);
            }
            setError(null);

            // Get stored listing IDs
            const storedIds = await AsyncStorage.getItem(storageKeys.idsKey);
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
    }, [storageKeys.idsKey, saveCachedListings]);

    // Add a listing to recently viewed
    const addToRecentlyViewed = useCallback(async (listingId: number) => {
        try {
            const storedIds = await AsyncStorage.getItem(storageKeys.idsKey);
            let ids: number[] = storedIds ? JSON.parse(storedIds) : [];

            // Remove if already exists (to move to front)
            ids = ids.filter(id => id !== listingId);

            // Add to front
            ids.unshift(listingId);

            // Keep only the most recent
            ids = ids.slice(0, MAX_RECENTLY_VIEWED);

            // Save back to storage
            await AsyncStorage.setItem(storageKeys.idsKey, JSON.stringify(ids));

            // Reload listings in background (no loading spinner)
            await loadRecentlyViewed(false);
        } catch (err) {
            console.error('Error adding to recently viewed:', err);
        }
    }, [storageKeys.idsKey, loadRecentlyViewed]);

    // Clear recently viewed
    const clearRecentlyViewed = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(storageKeys.idsKey);
            await AsyncStorage.removeItem(storageKeys.cacheKey);
            setListings([]);
        } catch (err) {
            console.error('Error clearing recently viewed:', err);
        }
    }, [storageKeys.idsKey, storageKeys.cacheKey]);

    // Background refresh - updates data without showing loading state
    const refresh = useCallback(async () => {
        await loadRecentlyViewed(false);
    }, [loadRecentlyViewed]);

    // Clear data when user changes (logout/login with different account)
    useEffect(() => {
        const currentUserId = user?.id;

        // If user changed (including logout), clear current state
        if (previousUserId.current !== currentUserId) {
            // Clear state immediately when user changes
            setListings([]);
            setIsLoading(true);
            isInitialLoad.current = true;
            previousUserId.current = currentUserId;
        }
    }, [user?.id]);

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
    }, [loadCachedListings, loadRecentlyViewed, user?.id]);

    return {
        listings,
        isLoading,
        error,
        addToRecentlyViewed,
        clearRecentlyViewed,
        refresh
    };
}