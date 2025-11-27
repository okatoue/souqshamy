// components/auth/useAuthStyles.ts
import { useMemo } from 'react';
import { useTheme } from '@/hooks/use-theme-color';
import { createAuthStyles, AuthStylesType } from './styles';
import { getAuthColors } from './constants';

/**
 * Hook to get theme-aware auth styles
 * @returns Auth styles configured for the current theme
 */
export function useAuthStyles(): AuthStylesType {
  const theme = useTheme();
  return useMemo(() => createAuthStyles(theme), [theme]);
}

/**
 * Hook to get theme-aware auth colors
 * @returns Auth color palette for the current theme
 */
export function useAuthColors() {
  const theme = useTheme();
  return useMemo(() => getAuthColors(theme), [theme]);
}

/**
 * Hook to get both auth styles and colors
 * @returns Object containing both styles and colors for the current theme
 */
export function useAuthTheme() {
  const theme = useTheme();
  return useMemo(
    () => ({
      styles: createAuthStyles(theme),
      colors: getAuthColors(theme),
      isDark: theme === 'dark',
    }),
    [theme]
  );
}
