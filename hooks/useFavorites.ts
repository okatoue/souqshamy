import { useFavoritesContext } from '@/lib/favorites_context';

/**
 * Hook for accessing favorites state and actions.
 * This is a convenience wrapper around FavoritesContext that maintains
 * backward compatibility with existing code.
 *
 * All components using this hook share the same state, ensuring
 * instant sync across all screens.
 */
export function useFavorites() {
  return useFavoritesContext();
}
