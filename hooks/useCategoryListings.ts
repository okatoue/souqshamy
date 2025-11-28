import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocationFilter } from './useLocationFilter';

interface UseCategoryListingsParams {
    categoryId: string | undefined;
    subcategoryId?: string | null;
}

const getCacheKey = (
    categoryId: string,
    subcategoryId?: string | null,
    locationKey?: string
) => {
    let key = `@category_listings_${categoryId}`;
    if (subcategoryId) {
        key += `_${subcategoryId}`;
    }
    if (locationKey) {
        key += `_${locationKey}`;
    }
    return key;
};

// Cache expiry time (5 minutes) - category listings change more frequently
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

interface CachedCategoryListings {
    listings: Listing[];
    timestamp: number;
}

export function useCategoryListings({ categoryId, subcategoryId }: UseCategoryListingsParams) {
    const [listings, setListings] = useState<Listing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const isInitialLoad = useRef(true);

    // Get location filter for bounding box queries
    const { locationFilter, getBoundingBox, isLoading: isLocationLoading } = useLocationFilter();

    // Create a stable location cache key based on bounding box
    const getLocationCacheKey = useCallback(() => {
        const boundingBox = getBoundingBox();
        if (!boundingBox) {
            // No location filter active (radius >= 100km)
            return 'all';
        }
        // Round to 2 decimal places for cache key stability
        return `${boundingBox.minLat.toFixed(2)}_${boundingBox.maxLat.toFixed(2)}_${boundingBox.minLon.toFixed(2)}_${boundingBox.maxLon.toFixed(2)}`;
    }, [getBoundingBox]);

    // Load cached listings from AsyncStorage
    const loadCachedListings = useCallback(async (): Promise<Listing[] | null> => {
        if (!categoryId) return null;

        try {
            const locationKey = getLocationCacheKey();
            const cacheKey = getCacheKey(categoryId, subcategoryId, locationKey);
            const cachedData = await AsyncStorage.getItem(cacheKey);

            if (cachedData) {
                const parsed: CachedCategoryListings = JSON.parse(cachedData);

                // Check if cache is still valid
                const isExpired = Date.now() - parsed.timestamp > CACHE_EXPIRY_MS;
                if (!isExpired) {
                    return parsed.listings;
                }
            }
        } catch (err) {
            console.error('Error loading cached category listings:', err);
        }
        return null;
    }, [categoryId, subcategoryId, getLocationCacheKey]);

    // Save listings to cache
    const saveCachedListings = useCallback(async (listingsToCache: Listing[]) => {
        if (!categoryId) return;

        try {
            const locationKey = getLocationCacheKey();
            const cacheKey = getCacheKey(categoryId, subcategoryId, locationKey);
            const cacheData: CachedCategoryListings = {
                listings: listingsToCache,
                timestamp: Date.now()
            };
            await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (err) {
            console.error('Error saving cached category listings:', err);
        }
    }, [categoryId, subcategoryId, getLocationCacheKey]);

    // Fetch listings from Supabase
    const fetchListings = useCallback(async (showLoading = false) => {
        // Validate categoryId before making the query
        if (!categoryId) {
            setIsLoading(false);
            return;
        }

        const parsedCategoryId = parseInt(categoryId, 10);
        if (isNaN(parsedCategoryId)) {
            console.error('useCategoryListings: Invalid categoryId:', categoryId);
            setError(new Error('Invalid category ID'));
            setIsLoading(false);
            return;
        }

        try {
            if (showLoading) {
                setIsLoading(true);
            }
            setError(null);

            let query = supabase
                .from('listings')
                .select('*')
                .eq('category_id', parsedCategoryId)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            // Add subcategory filter if provided
            if (subcategoryId) {
                const parsedSubcategoryId = parseInt(subcategoryId, 10);
                if (!isNaN(parsedSubcategoryId)) {
                    query = query.eq('subcategory_id', parsedSubcategoryId);
                }
            }

            // Apply location-based bounding box filter for efficient database queries
            // This filters listings at the database level, only fetching items within the selected radius
            const boundingBox = getBoundingBox();
            if (boundingBox) {
                // Only apply location filter if bounding box is available (radius < 100km)
                // Listings without coordinates (null) will be excluded when filtering is active
                query = query
                    .gte('location_lat', boundingBox.minLat)
                    .lte('location_lat', boundingBox.maxLat)
                    .gte('location_lon', boundingBox.minLon)
                    .lte('location_lon', boundingBox.maxLon);
            }
            // When boundingBox is null (radius >= 100km), no location filter is applied
            // This acts as a "show all listings" fallback

            const { data, error: fetchError } = await query;

            if (fetchError) {
                throw new Error(fetchError.message);
            }

            const fetchedListings = data || [];
            setListings(fetchedListings);

            // Update cache
            await saveCachedListings(fetchedListings);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to fetch listings');
            console.error('Error fetching category listings:', error);
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, [categoryId, subcategoryId, saveCachedListings, getBoundingBox]);

    // Initialize: load cache first, then refresh in background
    // Also refetch when location filter changes
    useEffect(() => {
        const initialize = async () => {
            // Wait for location filter to load before fetching
            if (isLocationLoading) {
                return;
            }

            if (!categoryId) {
                setIsLoading(false);
                return;
            }

            // Try to load from cache first
            const cachedListings = await loadCachedListings();

            if (cachedListings && cachedListings.length > 0) {
                // Show cached data immediately - no loading spinner
                setListings(cachedListings);
                setIsLoading(false);

                // Then refresh in background
                fetchListings(false);
            } else {
                // No valid cache - show loading and fetch
                await fetchListings(true);
            }

            isInitialLoad.current = false;
        };

        initialize();
    }, [categoryId, subcategoryId, loadCachedListings, fetchListings, isLocationLoading, locationFilter]);

    // Local search within loaded listings
    const searchListings = useCallback((searchQuery: string) => {
        if (!searchQuery.trim()) {
            // Reset to full list - trigger a refresh
            fetchListings(false);
            return;
        }

        const filtered = listings.filter(listing =>
            listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            listing.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            listing.location.toLowerCase().includes(searchQuery.toLowerCase())
        );

        setListings(filtered);
    }, [listings, fetchListings]);

    return {
        listings,
        isLoading,
        error,
        refetch: () => fetchListings(false),
        searchListings
    };
}