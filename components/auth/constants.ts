// components/auth/constants.ts
import { Dimensions } from 'react-native';
import { BRAND_COLOR, BRAND_COLOR_DARK, Colors, ACCENT_COLOR } from '@/constants/theme';

// Re-export brand colors for convenience
export { BRAND_COLOR, BRAND_COLOR_DARK, ACCENT_COLOR };

// Screen dimensions
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
export const isSmallScreen = SCREEN_HEIGHT < 700;

// Auth-specific color palette for light mode (using theme colors)
export const AUTH_COLORS = {
  // Background colors
  background: Colors.light.backgroundSecondary,
  cardBackground: Colors.light.cardBackground,

  // Text colors
  textPrimary: Colors.light.text,
  textSecondary: Colors.light.textSecondary,
  textMuted: Colors.light.textMuted,
  textLabel: Colors.light.textLabel,

  // Border colors
  border: Colors.light.border,

  // State colors
  success: '#22c55e',
  successDark: '#16a34a',
  error: ACCENT_COLOR,

  // Social button colors
  facebook: '#1877F2',
  telegram: '#0088cc',
} as const;

// Auth-specific color palette for dark mode
export const AUTH_COLORS_DARK = {
  // Background colors
  background: Colors.dark.background,
  cardBackground: Colors.dark.cardBackground,

  // Text colors
  textPrimary: Colors.dark.text,
  textSecondary: Colors.dark.textSecondary,
  textMuted: Colors.dark.textMuted,
  textLabel: Colors.dark.textLabel,

  // Border colors
  border: Colors.dark.border,

  // State colors
  success: '#22c55e',
  successDark: '#16a34a',
  error: ACCENT_COLOR,

  // Social button colors
  facebook: '#1877F2',
  telegram: '#0088cc',
} as const;

// Helper to get auth colors based on theme
export function getAuthColors(theme: 'light' | 'dark') {
  return theme === 'dark' ? AUTH_COLORS_DARK : AUTH_COLORS;
}

// Common spacing values
export const AUTH_SPACING = {
  horizontal: 24,
  verticalSmall: 16,
  verticalLarge: 24,
  gap: {
    small: 6,
    medium: 10,
    large: 16,
  },
} as const;

// Common sizing values
export const AUTH_SIZING = {
  inputHeight: isSmallScreen ? 46 : 50,
  buttonHeight: isSmallScreen ? 46 : 50,
  socialButtonHeight: isSmallScreen ? 44 : 48,
  logoSize: isSmallScreen ? 56 : 68,
  logoRadius: isSmallScreen ? 14 : 17,
  iconSize: {
    small: isSmallScreen ? 28 : 36,
    medium: 18,
    large: 22,
  },
  borderRadius: 12,
} as const;

// Typography
export const AUTH_TYPOGRAPHY = {
  title: {
    fontSize: isSmallScreen ? 22 : 26,
    fontWeight: 'bold' as const,
  },
  subtitle: {
    fontSize: isSmallScreen ? 13 : 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  body: {
    fontSize: 15,
  },
  button: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  small: {
    fontSize: 12,
  },
  footer: {
    fontSize: 11,
  },
} as const;
