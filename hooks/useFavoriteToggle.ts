import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { useFavorites } from './useFavorites';

interface UseFavoriteToggleOptions {
  listingId: string | number;
}

interface UseFavoriteToggleResult {
  isFavorite: boolean;
  handleToggle: () => void;
}

/**
 * Custom hook for managing favorite toggle with instant feedback and haptics.
 * Since FavoritesContext handles optimistic updates, the UI updates
 * immediately without any loading state.
 *
 * Accepts both string and number listingId for flexibility.
 * Provides haptic feedback: medium tap for add, light tap for remove.
 */
export function useFavoriteToggle({ listingId }: UseFavoriteToggleOptions): UseFavoriteToggleResult {
  const { isFavorite: checkIsFavorite, toggleFavorite } = useFavorites();

  const id = String(listingId);

  // This will re-evaluate on every render when favoriteIds changes
  const currentlyFavorite = checkIsFavorite(id);

  const handleToggle = useCallback(async () => {
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
    await toggleFavorite(id);
  }, [id, toggleFavorite, checkIsFavorite]);

  return {
    isFavorite: currentlyFavorite,
    handleToggle,
  };
}
