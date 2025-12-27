/**
 * Hook for fetching seller profile and listings data.
 * Extracted from the seller profile screen for better code organization.
 */

import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import { useCallback, useEffect, useState } from 'react';

export interface SellerProfile {
    id: string;
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
    created_at: string;
}

// TODO: Uncomment when implementing stats feature
// export interface SellerStats {
//     totalListings: number;
//     replyRate: number | null;
//     avgReplyTimeHours: number | null;
// }

interface UseSellerProfileResult {
    profile: SellerProfile | null;
    listings: Listing[];
    // stats: SellerStats | null;  // TODO: Uncomment when implementing
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

export function useSellerProfile(sellerId: string | undefined): UseSellerProfileResult {
    const [profile, setProfile] = useState<SellerProfile | null>(null);
    const [listings, setListings] = useState<Listing[]>([]);
    // const [stats, setStats] = useState<SellerStats | null>(null);  // TODO: Uncomment
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchSellerData = useCallback(async () => {
        if (!sellerId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Parallel fetch for better performance
            const [profileResult, listingsResult] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('id, display_name, email, avatar_url, created_at')
                    .eq('id', sellerId)
                    .single(),
                supabase
                    .from('listings')
                    .select('*')
                    .eq('user_id', sellerId)
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
            ]);

            if (profileResult.error) {
                throw profileResult.error;
            }

            setProfile(profileResult.data);
            setListings(listingsResult.data || []);

            // TODO: Uncomment when implementing stats feature
            // setStats({
            //     totalListings: listingsResult.data?.length || 0,
            //     replyRate: null,
            //     avgReplyTimeHours: null
            // });

        } catch (err) {
            console.error('Error fetching seller data:', err);
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    }, [sellerId]);

    useEffect(() => {
        fetchSellerData();
    }, [fetchSellerData]);

    return {
        profile,
        listings,
        // stats,  // TODO: Uncomment
        isLoading,
        error,
        refetch: fetchSellerData,
    };
}
