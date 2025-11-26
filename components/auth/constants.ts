// components/auth/constants.ts
import { Dimensions } from 'react-native';
import { BRAND_COLOR, BRAND_COLOR_DARK, Colors } from '@/constants/theme';

// Re-export brand colors for convenience
export { BRAND_COLOR, BRAND_COLOR_DARK };

// Screen dimensions
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
export const isSmallScreen = SCREEN_HEIGHT < 700;

// Auth-specific color palette (using theme colors)
export const AUTH_COLORS = {
  // Background colors
  background: Colors.light.inputBackground, // #f8fafc
  cardBackground: Colors.light.cardBackground, // #fff

  // Text colors
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  textLabel: '#334155',

  // Border colors
  border: Colors.light.border, // #e2e8f0

  // State colors
  success: '#22c55e',
  successDark: '#16a34a',
  error: '#ef4444',

  // Social button colors
  facebook: '#1877F2',
  telegram: '#0088cc',
} as const;

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
