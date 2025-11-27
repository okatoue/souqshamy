/**
 * Custom useColorScheme hook that integrates with ThemeContext.
 * This replaces the direct React Native useColorScheme to support user preference.
 */

import { useContext } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// Import context directly to avoid circular dependency
import { ThemeContext } from '@/lib/theme_context';

/**
 * Returns the current color scheme based on user preference and system settings.
 * Uses ThemeContext when available, falls back to system scheme otherwise.
 * @returns 'light' | 'dark'
 */
export function useColorScheme(): 'light' | 'dark' {
  const context = useContext(ThemeContext);
  const systemScheme = useRNColorScheme();

  // If context is available, use the resolved theme
  if (context) {
    return context.resolvedTheme;
  }

  // Fallback to system scheme if context is not available
  return systemScheme ?? 'light';
}
