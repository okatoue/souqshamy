import { favoritesApi, listingsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth_context';
import { CACHE_KEYS, clearCache, readCache, writeCache } from '@/lib/cache';
import { handleError, showAuthRequiredAlert } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// Cache TTL: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;

// Background refresh threshold: 1 minute (refresh if cache is older than this)
const CACHE_REFRESH_THRESHOLD_MS = 60 * 1000;

interface CachedFavorites {
  listings: Listing[];
  ids: string[];
  timestamp: number;
}

interface FavoritesContextType {
  favorites: Listing[];
  favoriteIds: Set<string>;
  isLoading: boolean;
  isRefreshing: boolean;
  fetchFavorites: (refresh?: boolean, showLoading?: boolean) => Promise<void>;
  isFavorite: (listingId: string | number) => boolean;
  addFavorite: (listingId: string | number, sellerId?: string) => Promise<boolean>;
  removeFavorite: (listingId: string | number) => Promise<boolean>;
  toggleFavorite: (listingId: string | number, sellerId?: string) => Promise<boolean>;
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

    const cached = await readCache<CachedFavorites>(CACHE_KEYS.FAVORITES, { userId: user.id });

    if (!cached) return null;

    // Check if cache has expired
    if (cached.timestamp && Date.now() - cached.timestamp > CACHE_TTL_MS) {
      console.log('[Favorites] Cache expired, will refresh');
      return null;
    }

    return cached;
  }, [user]);

  const saveCachedFavorites = useCallback(
    async (listings: Listing[], ids: string[]) => {
      if (!user) return;
      await writeCache<CachedFavorites>(
        CACHE_KEYS.FAVORITES,
        {
          listings,
          ids,
          timestamp: Date.now(),
        },
        user.id
      );
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

        // Use new API that returns listings ordered by favorite creation date (newest first)
        const { data: favoritesData, error: favoritesError } = await favoritesApi.getWithListings(user.id);

        if (favoritesError) throw favoritesError;

        if (!favoritesData || favoritesData.length === 0) {
          setFavorites([]);
          setFavoriteIds(new Set());
          await saveCachedFavorites([], []);
          return;
        }

        // Extract listings and IDs (already ordered newest first)
        const listings = favoritesData.map(item => item.listing);
        const ids = listings.map(listing => String(listing.id));

        setFavorites(listings);
        setFavoriteIds(new Set(ids));

        await saveCachedFavorites(listings, ids);
      } catch (error) {
        console.error('[Favorites] Error in fetchFavorites:', error);

        // CRITICAL: Clear stale cache on error to prevent showing outdated data
        await clearCache(CACHE_KEYS.FAVORITES);

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
        // Use cache immediately
        setFavorites(cached.listings);
        setFavoriteIds(new Set(cached.ids));
        setIsLoading(false);

        // Only background refresh if cache is older than the refresh threshold
        // This prevents double fetch when cache is fresh
        const cacheAge = cached.timestamp ? Date.now() - cached.timestamp : Infinity;
        if (cacheAge > CACHE_REFRESH_THRESHOLD_MS) {
          fetchFavorites(false, false);
        }
      } else {
        // No valid cache, fetch fresh
        await fetchFavorites(false, true);
      }

      isInitialLoad.current = false;
    };

    initialize();
  }, [user, loadCachedFavorites, fetchFavorites]);

  const isFavorite = useCallback(
    (listingId: string | number): boolean => {
      return favoriteIds.has(String(listingId));
    },
    [favoriteIds]
  );

  const addFavorite = useCallback(
    async (listingId: string | number, sellerId?: string): Promise<boolean> => {
      if (!user) {
        showAuthRequiredAlert();
        return false;
      }

      const id = String(listingId);

      // Prevent users from favoriting their own listings
      let ownerIdToCheck = sellerId;
      if (!ownerIdToCheck) {
        // If sellerId not provided, fetch the listing to check ownership
        const { data: listing } = await listingsApi.getById(id);
        ownerIdToCheck = listing?.user_id;
      }

      if (ownerIdToCheck && user.id === ownerIdToCheck) {
        return false;
      }

      // Check if already a favorite to prevent duplicate operations
      if (favoriteIds.has(id)) {
        return true;
      }

      // Optimistic update IMMEDIATELY before API call
      setFavoriteIds((prev) => new Set([...prev, id]));

      try {
        const { error } = await favoritesApi.add(user.id, id);

        if (error) throw error;

        // DON'T call fetchFavorites here - it causes race condition
        // The optimistic update is sufficient for UI
        // Full data will be fetched when user visits Favorites tab

        return true;
      } catch (error) {
        // Revert on failure
        setFavoriteIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });

        handleError(error, {
          context: 'FavoritesContext.addFavorite',
          alertTitle: 'Error',
        });
        return false;
      }
    },
    [user, favoriteIds]
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
    async (listingId: string | number, sellerId?: string): Promise<boolean> => {
      const id = String(listingId);
      // Read directly from current state to avoid stale closure
      const isCurrentlyFavorite = favoriteIds.has(id);

      if (isCurrentlyFavorite) {
        return removeFavorite(id);
      } else {
        return addFavorite(id, sellerId);
      }
    },
    [favoriteIds, addFavorite, removeFavorite]
  );

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<FavoritesContextType>(
    () => ({
      favorites,
      favoriteIds,
      isLoading,
      isRefreshing,
      fetchFavorites,
      isFavorite,
      addFavorite,
      removeFavorite,
      toggleFavorite,
    }),
    [
      favorites,
      favoriteIds,
      isLoading,
      isRefreshing,
      fetchFavorites,
      isFavorite,
      addFavorite,
      removeFavorite,
      toggleFavorite,
    ]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavoritesContext(): FavoritesContextType {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavoritesContext must be used within a FavoritesProvider');
  }
  return context;
}
