import { useAuth } from '@/lib/auth_context';
import { favoritesApi, listingsApi } from '@/lib/api';
import { CACHE_KEYS, readCache, writeCache, clearCache } from '@/lib/cache';
import { handleError, showAuthRequiredAlert } from '@/lib/errorHandler';
import { Listing } from '@/types/listing';
import { useCallback, useEffect, useRef, useState } from 'react';

interface CachedFavorites {
    listings: Listing[];
    ids: string[];
}

export function useFavorites() {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState<Listing[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const isInitialLoad = useRef(true);

    // Load cached favorites
    const loadCachedFavorites = useCallback(async (): Promise<CachedFavorites | null> => {
        if (!user) return null;
        return readCache<CachedFavorites>(CACHE_KEYS.FAVORITES, { userId: user.id });
    }, [user]);

    // Save favorites to cache
    const saveCachedFavorites = useCallback(async (listings: Listing[], ids: string[]) => {
        if (!user) return;
        await writeCache<CachedFavorites>(
            CACHE_KEYS.FAVORITES,
            { listings, ids },
            user.id
        );
    }, [user]);

    // Fetch user's favorite listings
    const fetchFavorites = useCallback(async (refresh = false, showLoading = false) => {
        if (!user) {
            setFavorites([]);
            setFavoriteIds(new Set());
            setIsLoading(false);
            await clearCache(CACHE_KEYS.FAVORITES);
            return;
        }

        try {
            if (refresh) {
                setIsRefreshing(true);
            } else if (showLoading) {
                setIsLoading(true);
            }

            // Get favorite listing IDs
            const { data: listingIds, error: favoriteError } = await favoritesApi.getIds(user.id);

            if (favoriteError) throw favoriteError;

            if (!listingIds || listingIds.length === 0) {
                setFavorites([]);
                setFavoriteIds(new Set());
                await saveCachedFavorites([], []);
                return;
            }

            setFavoriteIds(new Set(listingIds));

            // Fetch the actual listings
            const { data: listings, error: listingsError } = await listingsApi.getByIds(listingIds);

            if (listingsError) throw listingsError;

            const listingData = listings || [];
            setFavorites(listingData);

            // Update cache
            await saveCachedFavorites(listingData, listingIds);
        } catch (error) {
            // Only show alert on manual refresh
            if (refresh) {
                handleError(error, {
                    context: 'useFavorites.fetchFavorites',
                    alertTitle: 'Error',
                    showAlert: true,
                });
            } else {
                handleError(error, {
                    context: 'useFavorites.fetchFavorites',
                    showAlert: false,
                });
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user, saveCachedFavorites]);

    // Initialize: load cache first, then refresh in background
    useEffect(() => {
        const initialize = async () => {
            if (!user) {
                setFavorites([]);
                setFavoriteIds(new Set());
                setIsLoading(false);
                return;
            }

            // Try to load from cache first
            const cached = await loadCachedFavorites();

            if (cached && cached.listings.length > 0) {
                // Show cached data immediately - no loading spinner
                setFavorites(cached.listings);
                setFavoriteIds(new Set(cached.ids));
                setIsLoading(false);

                // Then refresh in background
                fetchFavorites(false, false);
            } else {
                // No valid cache - show loading and fetch
                await fetchFavorites(false, true);
            }

            isInitialLoad.current = false;
        };

        initialize();
    }, [user, loadCachedFavorites, fetchFavorites]);

    // Check if a listing is favorited
    const isFavorite = useCallback((listingId: string) => {
        return favoriteIds.has(listingId);
    }, [favoriteIds]);

    // Add a listing to favorites
    const addFavorite = useCallback(async (listingId: string) => {
        if (!user) {
            showAuthRequiredAlert();
            return false;
        }

        try {
            const { error } = await favoritesApi.add(user.id, listingId);

            if (error) throw error;

            // Update local state immediately (optimistic)
            setFavoriteIds(prev => new Set([...prev, listingId]));

            // Refresh in background to get full listing details
            fetchFavorites(false, false);

            return true;
        } catch (error) {
            handleError(error, {
                context: 'useFavorites.addFavorite',
                alertTitle: 'Error',
            });
            return false;
        }
    }, [user, fetchFavorites]);

    // Remove a listing from favorites
    const removeFavorite = useCallback(async (listingId: string | number) => {
        if (!user) return false;

        const id = String(listingId);

        try {
            const { error } = await favoritesApi.remove(user.id, id);

            if (error) throw error;

            // Update local state immediately (optimistic)
            setFavoriteIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });

            // Update favorites list
            setFavorites(prev => {
                const updated = prev.filter(l => String(l.id) !== id);
                // Update cache with new list
                saveCachedFavorites(updated, Array.from(favoriteIds).filter(fid => fid !== id));
                return updated;
            });

            return true;
        } catch (error) {
            handleError(error, {
                context: 'useFavorites.removeFavorite',
                alertTitle: 'Error',
            });
            return false;
        }
    }, [user, favoriteIds, saveCachedFavorites]);

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
