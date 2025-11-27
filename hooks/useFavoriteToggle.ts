import { useCallback } from 'react';
import { useFavorites } from './useFavorites';

interface UseFavoriteToggleOptions {
  listingId: string;
}

interface UseFavoriteToggleResult {
  isFavorite: boolean;
  handleToggle: () => void;
}

/**
 * Custom hook for managing favorite toggle with instant feedback.
 * Since FavoritesContext handles optimistic updates, the UI updates
 * immediately without any loading state.
 */
export function useFavoriteToggle({ listingId }: UseFavoriteToggleOptions): UseFavoriteToggleResult {
  const { isFavorite: checkIsFavorite, toggleFavorite } = useFavorites();

  const handleToggle = useCallback(() => {
    // Fire and forget - context handles optimistic update and rollback
    toggleFavorite(listingId);
  }, [listingId, toggleFavorite]);

  return {
    isFavorite: checkIsFavorite(listingId),
    handleToggle,
  };
}
