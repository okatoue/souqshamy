import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import { useCallback, useEffect, useState } from 'react';

interface UseCategoryListingsParams {
    categoryId: string;
    subcategoryId?: string | null;
}

export function useCategoryListings({ categoryId, subcategoryId }: UseCategoryListingsParams) {
    const [listings, setListings] = useState<Listing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchListings = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            let query = supabase
                .from('listings')
                .select('*')
                .eq('category_id', parseInt(categoryId))
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            // Add subcategory filter if provided
            if (subcategoryId) {
                query = query.eq('subcategory_id', parseInt(subcategoryId));
            }

            const { data, error: fetchError } = await query;

            if (fetchError) {
                throw new Error(fetchError.message);
            }

            setListings(data || []);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to fetch listings');
            console.error('Error fetching category listings:', error);
            setError(error);
        } finally {
            setIsLoading(false);
        }
    }, [categoryId, subcategoryId]);

    useEffect(() => {
        fetchListings();
    }, [fetchListings]);

    const searchListings = useCallback((searchQuery: string) => {
        if (!searchQuery.trim()) {
            fetchListings();
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
        refetch: fetchListings,
        searchListings
    };
}