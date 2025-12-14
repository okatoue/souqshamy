import { favoritesApi, listingsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth_context';
import { CACHE_KEYS, clearCache, readCache, writeCache } from '@/lib/cache';
import { handleError, showAuthRequiredAlert } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase';
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
      if (!user) {
        setFavorites([]);
        setFavoriteIds(new Set());
        setIsLoading(false);
        await clearCache(CACHE_KEYS.FAVORITES);
        return;
      }

      // Set loading states at the very beginning
      if (refresh) {
        setIsRefreshing(true);
      } else if (showLoading) {
        setIsLoading(true);
      }

      try {
        // Verify session is valid before making API calls
        // This prevents hanging when the session token isn't fully propagated
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setFavorites([]);
          setFavoriteIds(new Set());
          return;
        }

        // Verify session user matches the expected user
        if (session.user.id !== user.id) {
          setFavorites([]);
          setFavoriteIds(new Set());
          return;
        }

        const { data: listingIds, error: favoriteError } = await favoritesApi.getIds(user.id);

        if (favoriteError) throw favoriteError;

        if (!listingIds || listingIds.length === 0) {
          setFavorites([]);
          setFavoriteIds(new Set());
          await saveCachedFavorites([], []);
          return;
        }

        setFavoriteIds(new Set(listingIds));

        const { data: listings, error: listingsError } = await listingsApi.getByIds(listingIds);

        if (listingsError) throw listingsError;

        const listingData = listings || [];
        setFavorites(listingData);

        await saveCachedFavorites(listingData, listingIds);
      } catch (error) {
        console.error('[Favorites] Error in fetchFavorites:', error);
        // On error, set empty state to prevent stale data
        setFavorites([]);
        setFavoriteIds(new Set());
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
        // ALWAYS reset loading states - this is critical
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user, saveCachedFavorites]
  );

  useEffect(() => {
    const initialize = async () => {
      if (!user) {
        setFavorites([]);
        setFavoriteIds(new Set());
        setIsLoading(false);
        return;
      }

      // Wait for the Supabase session to be fully established
      // This is especially important for OAuth flows where the session takes time to propagate
      const waitForSession = async (maxAttempts = 5, delayMs = 500): Promise<boolean> => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const { data: { session } } = await supabase.auth.getSession();

          if (session && session.user?.id === user.id) {
            return true;
          }

          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            // Increase delay for subsequent attempts (exponential backoff capped at 2s)
            delayMs = Math.min(delayMs * 1.5, 2000);
          }
        }

        return false;
      };

      // Try to get a valid session
      const hasValidSession = await waitForSession();

      if (!hasValidSession) {
        setFavorites([]);
        setFavoriteIds(new Set());
        setIsLoading(false);
        return;
      }

      const cached = await loadCachedFavorites();

      if (cached && cached.listings.length > 0) {
        setFavorites(cached.listings);
        setFavoriteIds(new Set(cached.ids));
        setIsLoading(false);
        fetchFavorites(false, false);
      } else {
        await fetchFavorites(false, true);
      }

      isInitialLoad.current = false;
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
