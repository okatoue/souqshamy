import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { useAuth } from '@/lib/auth_context';
import { useFavorites } from './useFavorites';

interface UseFavoriteToggleOptions {
  listingId: string | number;
  sellerId?: string;
}

interface UseFavoriteToggleResult {
  isFavorite: boolean;
  isOwnListing: boolean;
  handleToggle: () => void;
}

/**
 * Custom hook for managing favorite toggle with instant feedback and haptics.
 * Since FavoritesContext handles optimistic updates, the UI updates
 * immediately without any loading state.
 *
 * Accepts both string and number listingId for flexibility.
 * Provides haptic feedback: medium tap for add, light tap for remove.
 * Users cannot favorite their own listings.
 */
export function useFavoriteToggle({ listingId, sellerId }: UseFavoriteToggleOptions): UseFavoriteToggleResult {
  const { user } = useAuth();
  const { isFavorite: checkIsFavorite, toggleFavorite } = useFavorites();

  const id = String(listingId);

  // Check if this is the user's own listing
  const isOwnListing = Boolean(user && sellerId && user.id === sellerId);

  // This will re-evaluate on every render when favoriteIds changes
  const currentlyFavorite = checkIsFavorite(id);

  const handleToggle = useCallback(async () => {
    // Prevent favoriting own listings
    if (isOwnListing) {
      return;
    }

    // Read the CURRENT state at execution time, not at definition time
    const isNowFavorite = checkIsFavorite(id);

    // Haptic feedback - different for add vs remove
    if (isNowFavorite) {
      // Removing - light tap
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Adding - medium tap (more satisfying)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Fire and forget - context handles optimistic update and rollback
    await toggleFavorite(id, sellerId);
  }, [id, sellerId, isOwnListing, toggleFavorite, checkIsFavorite]);

  return {
    isFavorite: currentlyFavorite,
    isOwnListing,
    handleToggle,
  };
}
