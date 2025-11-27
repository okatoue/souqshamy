/**
 * Theme constants for 3ANTAR Marketplace
 * Centralized source of truth for all colors, spacing, and design tokens
 */

import { Platform, StyleSheet } from 'react-native';

// =============================================================================
// BRAND COLORS
// =============================================================================

/** Primary brand color - used for CTAs, links, highlights */
export const BRAND_COLOR = '#18AEF2';
export const BRAND_COLOR_DARK = '#0d9fe0';
export const BRAND_COLOR_LIGHT = '#5cc5f5';

// =============================================================================
// SEMANTIC COLORS
// =============================================================================

export const COLORS = {
  // Accent colors (used for notifications, prices, favorites)
  favorite: '#FF3B30',      // Bright red for favorites/hearts
  error: '#FF3B30',         // Same red for errors
  warning: '#FF9500',       // Orange for warnings
  success: '#4CD964',       // Green for success states

  // Status badge colors
  statusActive: '#4CAF50',  // Green for active listings
  statusSold: '#FF9800',    // Orange for sold items
  statusInactive: '#D32F2F', // Red for removed/inactive items

  // Muted/Secondary text colors
  muted: '#888888',
  mutedLight: '#666666',
  mutedDark: '#999999',
  placeholder: '#999999',

  // Overlay colors
  overlayLight: 'rgba(255, 255, 255, 0.9)',
  overlayDark: 'rgba(0, 0, 0, 0.4)',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',

  // Transparent backgrounds for pressed states
  pressedOverlay: 'rgba(255, 59, 48, 0.1)',
  pressedPrimary: 'rgba(24, 174, 242, 0.1)',

  // Border colors
  borderLight: 'rgba(150, 150, 150, 0.3)',

  // Contact button colors
  chatButton: '#FF6B35',
  callButton: '#007AFF',
  whatsappButton: '#25D366',
} as const;

// =============================================================================
// SPACING TOKENS
// =============================================================================

export const SPACING = {
  /** 4px - Extra small spacing */
  xs: 4,
  /** 8px - Small spacing */
  sm: 8,
  /** 12px - Medium spacing */
  md: 12,
  /** 16px - Large spacing */
  lg: 16,
  /** 20px - Extra large spacing */
  xl: 20,
  /** 24px - 2x extra large spacing */
  xxl: 24,
  /** 32px - 3x extra large spacing */
  xxxl: 32,
  /** 40px - Section spacing */
  section: 40,
} as const;

// =============================================================================
// BORDER RADIUS TOKENS
// =============================================================================

export const BORDER_RADIUS = {
  /** 4px - Extra small radius */
  xs: 4,
  /** 8px - Small radius */
  sm: 8,
  /** 10px - Medium radius */
  md: 10,
  /** 12px - Large radius */
  lg: 12,
  /** 15px - Extra large radius */
  xl: 15,
  /** 20px - Round corners */
  round: 20,
  /** 24px - Extra round */
  xxl: 24,
  /** 30px - Pill shape */
  pill: 30,
  /** 9999px - Full circle */
  full: 9999,
} as const;

// =============================================================================
// SHADOW STYLES
// =============================================================================

export const SHADOWS = StyleSheet.create({
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomSheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
});

// =============================================================================
// LIGHT/DARK THEME COLORS
// =============================================================================

const tintColorLight = BRAND_COLOR;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    // Core colors
    text: '#11181C',
    textSecondary: '#666666',
    textMuted: '#888888',
    background: '#ffffff',
    backgroundSecondary: '#f5f5f5',
    tint: tintColorLight,

    // Interactive elements
    icon: '#687076',
    iconMuted: '#999999',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,

    // Brand
    primary: BRAND_COLOR,
    primaryDark: BRAND_COLOR_DARK,
    primaryLight: BRAND_COLOR_LIGHT,

    // Borders
    border: '#e2e8f0',
    borderSecondary: '#e0e0e0',
    divider: '#f0f0f0',

    // Cards & Surfaces
    cardBackground: '#ffffff',
    cardBackgroundSecondary: '#f8f8f8',
    inputBackground: '#f8fafc',

    // Search bar
    searchBackground: '#f0f0f0',
    searchBorder: '#e0e0e0',

    // Image placeholders
    placeholder: '#f0f0f0',
    placeholderIcon: '#666666',

    // Bottom sheet
    handleIndicator: '#DDDDDD',
    sheetItemBackground: '#F5F5F5',
  },
  dark: {
    // Core colors
    text: '#ECEDEE',
    textSecondary: '#999999',
    textMuted: '#888888',
    background: '#151718',
    backgroundSecondary: '#1a1a1a',
    tint: tintColorDark,

    // Interactive elements
    icon: '#9BA1A6',
    iconMuted: '#666666',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,

    // Brand
    primary: BRAND_COLOR,
    primaryDark: BRAND_COLOR_DARK,
    primaryLight: BRAND_COLOR_LIGHT,

    // Borders
    border: '#333333',
    borderSecondary: '#2a2a2a',
    divider: '#222222',

    // Cards & Surfaces
    cardBackground: '#1e1e1e',
    cardBackgroundSecondary: '#1c1c1e',
    inputBackground: '#1a1a1a',

    // Search bar
    searchBackground: '#1a1a1a',
    searchBorder: '#333333',

    // Image placeholders
    placeholder: '#2a2a2a',
    placeholderIcon: '#666666',

    // Bottom sheet
    handleIndicator: '#444444',
    sheetItemBackground: '#1a1a1a',
  },
};

// =============================================================================
// FONT CONFIGURATION
// =============================================================================

export const Fonts = Platform.select({
  ios: {
    /** iOS UIFontDescriptorSystemDesignDefault */
    sans: 'system-ui',
    /** iOS UIFontDescriptorSystemDesignSerif */
    serif: 'ui-serif',
    /** iOS UIFontDescriptorSystemDesignRounded */
    rounded: 'ui-rounded',
    /** iOS UIFontDescriptorSystemDesignMonospaced */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// =============================================================================
// TYPOGRAPHY SIZES
// =============================================================================

export const FONT_SIZES = {
  xs: 11,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 22,
  title: 24,
  display: 28,
  hero: 32,
} as const;

// =============================================================================
// LINE HEIGHTS
// =============================================================================

export const LINE_HEIGHTS = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;
