import { useAuth } from '@/lib/auth_context';
import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

export function useUserListings() {
    const { user } = useAuth();
    const [listings, setListings] = useState<Listing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchUserListings = useCallback(async (refresh = false) => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        try {
            if (refresh) setIsRefreshing(true);
            else setIsLoading(true);

            const { data, error } = await supabase
                .from('listings')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setListings(data || []);
        } catch (error) {
            console.error('Error fetching listings:', error);
            Alert.alert('Error', 'Failed to load your listings');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        fetchUserListings();
    }, [fetchUserListings]);

    const handleDeleteListing = async (listingId: number) => {
        Alert.alert(
            'Remove Listing',
            'Are you sure you want to remove this listing? You can reactivate it later.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('listings')
                                .update({ status: 'inactive' })
                                .eq('id', listingId)
                                .eq('user_id', user?.id);

                            if (error) throw error;

                            setListings(prev =>
                                prev.map(l =>
                                    l.id === listingId ? { ...l, status: 'inactive' } : l
                                )
                            );
                            Alert.alert('Success', 'Listing has been removed');
                        } catch (error) {
                            console.error('Remove error:', error);
                            Alert.alert('Error', 'Failed to remove listing');
                        }
                    }
                }
            ]
        );
    };

    const handleToggleStatus = async (listing: Listing) => {
        let newStatus: 'active' | 'sold' | 'inactive';
        if (listing.status === 'active') {
            newStatus = 'sold';
        } else if (listing.status === 'sold') {
            newStatus = 'inactive';
        } else {
            newStatus = 'active';
        }

        try {
            const { error } = await supabase
                .from('listings')
                .update({ status: newStatus })
                .eq('id', listing.id)
                .eq('user_id', user?.id);

            if (error) throw error;

            setListings(prev =>
                prev.map(l =>
                    l.id === listing.id ? { ...l, status: newStatus } : l
                )
            );

            let message = '';
            if (newStatus === 'active') message = 'Listing reactivated';
            else if (newStatus === 'sold') message = 'Listing marked as sold';
            else message = 'Listing deactivated';

            Alert.alert('Success', message);
        } catch (error) {
            console.error('Status update error:', error);
            Alert.alert('Error', 'Failed to update listing status');
        }
    };

    return {
        listings,
        isLoading,
        isRefreshing,
        fetchUserListings,
        handleDeleteListing,
        handleToggleStatus
    };
}
