import { useAuth } from '@/lib/auth_context';
import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

export function useFavorites() {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState<Listing[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Fetch user's favorite listings
    const fetchFavorites = useCallback(async (refresh = false) => {
        if (!user) {
            setFavorites([]);
            setFavoriteIds(new Set());
            setIsLoading(false);
            return;
        }

        try {
            if (refresh) setIsRefreshing(true);
            else setIsLoading(true);

            // Get favorite listing IDs
            const { data: favoriteData, error: favoriteError } = await supabase
                .from('favorites')
                .select('listing_id')
                .eq('user_id', user.id);

            if (favoriteError) throw favoriteError;

            if (!favoriteData || favoriteData.length === 0) {
                setFavorites([]);
                setFavoriteIds(new Set());
                return;
            }

            const listingIds = favoriteData.map(f => f.listing_id);
            setFavoriteIds(new Set(listingIds));

            // Fetch the actual listings
            const { data: listingsData, error: listingsError } = await supabase
                .from('listings')
                .select('*')
                .in('id', listingIds)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (listingsError) throw listingsError;

            setFavorites(listingsData || []);
        } catch (error) {
            console.error('Error fetching favorites:', error);
            Alert.alert('Error', 'Failed to load favorites');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user]);

    // Load favorites on mount and when user changes
    useEffect(() => {
        fetchFavorites();
    }, [fetchFavorites]);

    // Check if a listing is favorited
    const isFavorite = useCallback((listingId: string) => {
        return favoriteIds.has(listingId);
    }, [favoriteIds]);

    // Add a listing to favorites
    const addFavorite = useCallback(async (listingId: string) => {
        if (!user) {
            Alert.alert('Sign In Required', 'Please sign in to save favorites');
            return false;
        }

        try {
            const { error } = await supabase
                .from('favorites')
                .insert({
                    user_id: user.id,
                    listing_id: listingId
                });

            if (error) {
                // Handle duplicate error gracefully
                if (error.code === '23505') {
                    // Already favorited
                    return true;
                }
                throw error;
            }

            // Update local state
            setFavoriteIds(prev => new Set([...prev, listingId]));

            // Refresh the full list to get the listing details
            fetchFavorites(true);

            return true;
        } catch (error) {
            console.error('Error adding favorite:', error);
            Alert.alert('Error', 'Failed to add to favorites');
            return false;
        }
    }, [user, fetchFavorites]);

    // Remove a listing from favorites
    const removeFavorite = useCallback(async (listingId: string) => {
        if (!user) return false;

        try {
            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('user_id', user.id)
                .eq('listing_id', listingId);

            if (error) throw error;

            // Update local state
            setFavoriteIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(listingId);
                return newSet;
            });
            setFavorites(prev => prev.filter(l => l.id !== listingId));

            return true;
        } catch (error) {
            console.error('Error removing favorite:', error);
            Alert.alert('Error', 'Failed to remove from favorites');
            return false;
        }
    }, [user]);

    // Toggle favorite status
    const toggleFavorite = useCallback(async (listingId: string) => {
        if (isFavorite(listingId)) {
            return removeFavorite(listingId);
        } else {
            return addFavorite(listingId);
        }
    }, [isFavorite, addFavorite, removeFavorite]);

    return {
        favorites,
        favoriteIds,
        isLoading,
        isRefreshing,
        fetchFavorites,
        isFavorite,
        addFavorite,
        removeFavorite,
        toggleFavorite
    };
}