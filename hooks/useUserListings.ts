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

    const handleSoftDelete = async (listingId: number) => {
        Alert.alert(
            'Remove Listing',
            'This will remove the listing from your active/sold items.',
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
                                prev.map(l => l.id === listingId ? { ...l, status: 'inactive' } : l)
                            );
                            Alert.alert('Success', 'Listing moved to removed items');
                        } catch (error) {
                            console.error('Remove error:', error);
                            Alert.alert('Error', 'Failed to remove listing');
                        }
                    }
                }
            ]
        );
    };

    const handlePermanentDelete = async (listingId: number) => {
        Alert.alert(
            'Delete Permanently',
            'Are you sure you want to permanently delete this listing? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('listings')
                                .delete()
                                .eq('id', listingId)
                                .eq('user_id', user?.id);

                            if (error) throw error;

                            setListings(prev => prev.filter(l => l.id !== listingId));
                            Alert.alert('Success', 'Listing permanently deleted');
                        } catch (error) {
                            console.error('Delete error:', error);
                            Alert.alert('Error', 'Failed to delete listing');
                        }
                    }
                }
            ]
        );
    };

    const handleUpdateStatus = async (listing: Listing, newStatus: 'active' | 'sold') => {
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

            Alert.alert('Success', `Listing marked as ${newStatus}`);
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
        handleSoftDelete,
        handlePermanentDelete,
        handleUpdateStatus
    };
}
