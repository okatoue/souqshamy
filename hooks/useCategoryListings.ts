import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseCategoryListingsParams {
    categoryId: string | undefined;
    subcategoryId?: string | null;
}

const getCacheKey = (categoryId: string, subcategoryId?: string | null) => {
    const base = `@category_listings_${categoryId}`;
    return subcategoryId ? `${base}_${subcategoryId}` : base;
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

    // Load cached listings from AsyncStorage
    const loadCachedListings = useCallback(async (): Promise<Listing[] | null> => {
        if (!categoryId) return null;

        try {
            const cacheKey = getCacheKey(categoryId, subcategoryId);
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
    }, [categoryId, subcategoryId]);

    // Save listings to cache
    const saveCachedListings = useCallback(async (listingsToCache: Listing[]) => {
        if (!categoryId) return;

        try {
            const cacheKey = getCacheKey(categoryId, subcategoryId);
            const cacheData: CachedCategoryListings = {
                listings: listingsToCache,
                timestamp: Date.now()
            };
            await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (err) {
            console.error('Error saving cached category listings:', err);
        }
    }, [categoryId, subcategoryId]);

    // Fetch listings from Supabase
    const fetchListings = useCallback(async (showLoading = false) => {
        // Validate categoryId before making the query
        if (!categoryId) {
            console.log('useCategoryListings: No categoryId provided, skipping fetch');
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
    }, [categoryId, subcategoryId, saveCachedListings]);

    // Initialize: load cache first, then refresh in background
    useEffect(() => {
        const initialize = async () => {
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
    }, [categoryId, subcategoryId, loadCachedListings, fetchListings]);

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