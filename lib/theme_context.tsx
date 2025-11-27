import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

// Theme preference types
export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

// Storage key for persisting theme preference
const THEME_STORAGE_KEY = '@app_theme_preference';

// Context value interface
interface ThemeContextValue {
  /** The user's preference: 'light', 'dark', or 'system' */
  themePreference: ThemePreference;
  /** The resolved theme based on preference and system setting */
  resolvedTheme: ResolvedTheme;
  /** Update the theme preference */
  setThemePreference: (preference: ThemePreference) => void;
  /** Whether the theme is still loading from storage */
  isLoading: boolean;
}

// Create context with undefined default to detect missing provider
// Exported for use in use-color-scheme.ts hook
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Provider props
interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * ThemeProvider manages the app's theme state and persists it to AsyncStorage.
 * It resolves the actual theme based on user preference and system settings.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useSystemColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Resolve the actual theme based on preference
  const resolvedTheme: ResolvedTheme = React.useMemo(() => {
    if (themePreference === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themePreference;
  }, [themePreference, systemColorScheme]);

  // Load saved theme preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedPreference && ['light', 'dark', 'system'].includes(savedPreference)) {
          setThemePreferenceState(savedPreference as ThemePreference);
        }
      } catch (error) {
        console.error('[ThemeContext] Failed to load theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePreference();
  }, []);

  // Update theme preference and persist to storage
  const setThemePreference = useCallback(async (preference: ThemePreference) => {
    setThemePreferenceState(preference);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch (error) {
      console.error('[ThemeContext] Failed to save theme preference:', error);
    }
  }, []);

  const value: ThemeContextValue = React.useMemo(
    () => ({
      themePreference,
      resolvedTheme,
      setThemePreference,
      isLoading,
    }),
    [themePreference, resolvedTheme, setThemePreference, isLoading]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access the theme context.
 * @returns The theme context value
 */
export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook to get just the resolved theme ('light' or 'dark').
 * This is meant to replace the direct usage of React Native's useColorScheme.
 * @returns The resolved color scheme
 */
export function useAppColorScheme(): ResolvedTheme {
  const { resolvedTheme } = useThemeContext();
  return resolvedTheme;
}
