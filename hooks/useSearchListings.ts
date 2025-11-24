import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import { useCallback, useState } from 'react';

export function useSearchListings() {
    const [listings, setListings] = useState<Listing[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

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

            const { data, error: fetchError } = await supabase
                .from('listings')
                .select('*')
                .eq('status', 'active')
                .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
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
    }, []);

    const clearSearch = useCallback(() => {
        setListings([]);
        setError(null);
    }, []);

    return {
        listings,
        isLoading,
        error,
        searchListings,
        clearSearch
    };
}