import { useCallback, useEffect, useState } from 'react';
import { useFavorites } from './useFavorites';

interface UseFavoriteToggleOptions {
  listingId: string;
}

interface UseFavoriteToggleResult {
  isFavorite: boolean;
  isToggling: boolean;
  handleToggle: () => Promise<void>;
}

/**
 * Custom hook for managing favorite toggle state with optimistic updates.
 * Extracts the common toggle logic used across FavoriteButton and ListingCard.
 */
export function useFavoriteToggle({ listingId }: UseFavoriteToggleOptions): UseFavoriteToggleResult {
  const { isFavorite: checkIsFavorite, toggleFavorite } = useFavorites();
  const [isToggling, setIsToggling] = useState(false);
  const [localIsFavorite, setLocalIsFavorite] = useState(false);

  // Sync with the parent hook's state
  useEffect(() => {
    setLocalIsFavorite(checkIsFavorite(listingId));
  }, [checkIsFavorite, listingId]);

  const handleToggle = useCallback(async () => {
    if (isToggling) return;

    setIsToggling(true);
    // Optimistic update for immediate UI feedback
    const previousState = localIsFavorite;
    setLocalIsFavorite(!previousState);

    const success = await toggleFavorite(listingId);

    if (!success) {
      // Revert on failure
      setLocalIsFavorite(previousState);
    }

    setIsToggling(false);
  }, [isToggling, localIsFavorite, listingId, toggleFavorite]);

  return {
    isFavorite: localIsFavorite,
    isToggling,
    handleToggle,
  };
}
