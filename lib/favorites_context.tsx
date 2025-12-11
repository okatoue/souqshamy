import { favoritesApi, listingsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth_context';
import { CACHE_KEYS, clearCache, readCache, writeCache } from '@/lib/cache';
import { handleError, showAuthRequiredAlert } from '@/lib/errorHandler';
import { Listing } from '@/types/listing';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

interface CachedFavorites {
  listings: Listing[];
  ids: string[];
}

interface FavoritesContextType {
  favorites: Listing[];
  favoriteIds: Set<string>;
  isLoading: boolean;
  isRefreshing: boolean;
  fetchFavorites: (refresh?: boolean, showLoading?: boolean) => Promise<void>;
  isFavorite: (listingId: string) => boolean;
  addFavorite: (listingId: string) => Promise<boolean>;
  removeFavorite: (listingId: string | number) => Promise<boolean>;
  toggleFavorite: (listingId: string) => Promise<boolean>;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isInitialLoad = useRef(true);

  const loadCachedFavorites = useCallback(async (): Promise<CachedFavorites | null> => {
    if (!user) return null;
    return readCache<CachedFavorites>(CACHE_KEYS.FAVORITES, { userId: user.id });
  }, [user]);

  const saveCachedFavorites = useCallback(
    async (listings: Listing[], ids: string[]) => {
      if (!user) return;
      await writeCache<CachedFavorites>(CACHE_KEYS.FAVORITES, { listings, ids }, user.id);
    },
    [user]
  );

  const fetchFavorites = useCallback(
    async (refresh = false, showLoading = false) => {
      console.log('[Favorites] fetchFavorites called, refresh:', refresh, 'showLoading:', showLoading);

      if (!user) {
        console.log('[Favorites] No user in fetchFavorites, clearing');
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

        console.log('[Favorites] Fetching favorite IDs...');
        const { data: listingIds, error: favoriteError } = await favoritesApi.getIds(user.id);

        if (favoriteError) throw favoriteError;

        if (!listingIds || listingIds.length === 0) {
          console.log('[Favorites] No favorites found');
          setFavorites([]);
          setFavoriteIds(new Set());
          await saveCachedFavorites([], []);
          return;
        }

        console.log('[Favorites] Found', listingIds.length, 'favorite IDs');
        setFavoriteIds(new Set(listingIds));

        console.log('[Favorites] Fetching listing details...');
        const { data: listings, error: listingsError } = await listingsApi.getByIds(listingIds);

        if (listingsError) throw listingsError;

        const listingData = listings || [];
        console.log('[Favorites] Got', listingData.length, 'listings');
        setFavorites(listingData);

        await saveCachedFavorites(listingData, listingIds);
        console.log('[Favorites] Favorites cached');
      } catch (error) {
        console.error('[Favorites] Error in fetchFavorites:', error);
        if (refresh) {
          handleError(error, {
            context: 'FavoritesContext.fetchFavorites',
            alertTitle: 'Error',
            showAlert: true,
          });
        } else {
          handleError(error, {
            context: 'FavoritesContext.fetchFavorites',
            showAlert: false,
          });
        }
      } finally {
        console.log('[Favorites] fetchFavorites complete, setting isLoading to false');
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user, saveCachedFavorites]
  );

  useEffect(() => {
    const initialize = async () => {
      console.log('[Favorites] initialize called, user:', !!user);

      if (!user) {
        console.log('[Favorites] No user, clearing favorites');
        setFavorites([]);
        setFavoriteIds(new Set());
        setIsLoading(false);
        return;
      }

      // Wait a short time for the Supabase session to be fully propagated after OAuth
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('[Favorites] Session propagation delay complete');

      console.log('[Favorites] Loading cached favorites...');
      const cached = await loadCachedFavorites();

      if (cached && cached.listings.length > 0) {
        console.log('[Favorites] Cache found, applying cached data');
        setFavorites(cached.listings);
        setFavoriteIds(new Set(cached.ids));
        setIsLoading(false);
        console.log('[Favorites] Fetching fresh data in background...');
        fetchFavorites(false, false);
      } else {
        console.log('[Favorites] No cache, fetching with loading state...');
        await fetchFavorites(false, true);
      }

      isInitialLoad.current = false;
      console.log('[Favorites] Initialization complete');
    };

    initialize();
  }, [user, loadCachedFavorites, fetchFavorites]);

  const isFavorite = useCallback(
    (listingId: string) => {
      return favoriteIds.has(listingId);
    },
    [favoriteIds]
  );

  const addFavorite = useCallback(
    async (listingId: string) => {
      if (!user) {
        showAuthRequiredAlert();
        return false;
      }

      // Optimistic update IMMEDIATELY before API call
      setFavoriteIds((prev) => new Set([...prev, listingId]));

      try {
        const { error } = await favoritesApi.add(user.id, listingId);

        if (error) throw error;

        // Refresh in background to get full listing details for Favorites tab
        fetchFavorites(false, false);

        return true;
      } catch (error) {
        // Revert on failure
        setFavoriteIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(listingId);
          return newSet;
        });

        handleError(error, {
          context: 'FavoritesContext.addFavorite',
          alertTitle: 'Error',
        });
        return false;
      }
    },
    [user, fetchFavorites]
  );

  const removeFavorite = useCallback(
    async (listingId: string | number) => {
      if (!user) return false;

      const id = String(listingId);

      // Optimistic update IMMEDIATELY before API call
      const previousIds = new Set(favoriteIds);
      const previousFavorites = [...favorites];

      setFavoriteIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });

      setFavorites((prev) => prev.filter((l) => String(l.id) !== id));

      try {
        const { error } = await favoritesApi.remove(user.id, id);

        if (error) throw error;

        // Update cache
        const updatedFavorites = previousFavorites.filter((l) => String(l.id) !== id);
        const updatedIds = Array.from(previousIds).filter((fid) => fid !== id);
        saveCachedFavorites(updatedFavorites, updatedIds);

        return true;
      } catch (error) {
        // Revert on failure
        setFavoriteIds(previousIds);
        setFavorites(previousFavorites);

        handleError(error, {
          context: 'FavoritesContext.removeFavorite',
          alertTitle: 'Error',
        });
        return false;
      }
    },
    [user, favoriteIds, favorites, saveCachedFavorites]
  );

  const toggleFavorite = useCallback(
    async (listingId: string) => {
      if (isFavorite(listingId)) {
        return removeFavorite(listingId);
      } else {
        return addFavorite(listingId);
      }
    },
    [isFavorite, addFavorite, removeFavorite]
  );

  const value: FavoritesContextType = {
    favorites,
    favoriteIds,
    isLoading,
    isRefreshing,
    fetchFavorites,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
  };

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavoritesContext(): FavoritesContextType {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavoritesContext must be used within a FavoritesProvider');
  }
  return context;
}
