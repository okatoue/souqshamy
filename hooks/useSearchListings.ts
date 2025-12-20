import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import { useCallback, useState } from 'react';
import { useLocationFilter } from './useLocationFilter';

export function useSearchListings() {
    const [listings, setListings] = useState<Listing[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Get location filter for bounding box queries
    const { locationFilter, getBoundingBox } = useLocationFilter();

    const searchListings = useCallback(async (query: string) => {
        if (!query.trim()) {
            setListings([]);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Search in title and description using ilike for case-insensitive partial matching
            const searchTerm = `%${query.trim()}%`;

            let queryBuilder = supabase
                .from('listings')
                .select('*')
                .eq('status', 'active')
                .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`);

            // Apply location-based bounding box filter for efficient database queries
            // This filters listings at the database level, only fetching items within the selected radius
            const boundingBox = getBoundingBox();
            if (boundingBox) {
                // Only apply location filter if bounding box is available (radius < 100km)
                // Listings without coordinates (null) will be excluded when filtering is active
                queryBuilder = queryBuilder
                    .gte('location_lat', boundingBox.minLat)
                    .lte('location_lat', boundingBox.maxLat)
                    .gte('location_lon', boundingBox.minLon)
                    .lte('location_lon', boundingBox.maxLon);
            }
            // When boundingBox is null (radius >= 100km), no location filter is applied
            // This acts as a "show all listings" fallback

            const { data, error: fetchError } = await queryBuilder
                .order('created_at', { ascending: false })
                .limit(50);

            if (fetchError) {
                throw new Error(fetchError.message);
            }

            setListings(data || []);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to search listings');
            console.error('Error searching listings:', error);
            setError(error);
            setListings([]);
        } finally {
            setIsLoading(false);
        }
    }, [getBoundingBox]);

    const clearSearch = useCallback(() => {
        setListings([]);
        setError(null);
    }, []);

    return {
        listings,
        isLoading,
        error,
        searchListings,
        clearSearch,
        locationFilter, // Expose for UI to show current location
    };
}