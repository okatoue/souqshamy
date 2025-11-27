/**
 * Hook for accessing theme colors based on current color scheme.
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ThemeColors = typeof Colors.light & typeof Colors.dark;

/**
 * Returns a color value based on the current theme (light/dark).
 *
 * @param props - Optional light/dark color overrides
 * @param colorName - The key of the color in the Colors object
 * @returns The appropriate color value for the current theme
 */
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof ThemeColors
): string {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  return Colors[theme][colorName] ?? Colors.light[colorName];
}

/**
 * Returns multiple theme colors at once.
 * Useful when a component needs several colors.
 */
export function useThemeColors<K extends keyof ThemeColors>(
  colorNames: K[]
): Record<K, string> {
  const theme = useColorScheme() ?? 'light';

  return colorNames.reduce((acc, colorName) => {
    acc[colorName] = Colors[theme][colorName] ?? Colors.light[colorName];
    return acc;
  }, {} as Record<K, string>);
}

/**
 * Returns the current theme ('light' or 'dark').
 */
export function useTheme(): 'light' | 'dark' {
  return useColorScheme() ?? 'light';
}
