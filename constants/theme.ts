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
// ACCENT COLOR (for notifications, prices, favorites)
// =============================================================================

export const ACCENT_COLOR = '#FF3B30';  // Bright Red

// =============================================================================
// SEMANTIC COLORS
// =============================================================================

export const COLORS = {
  // Accent colors (used for notifications, prices, favorites)
  accent: ACCENT_COLOR,     // Primary accent color
  favorite: ACCENT_COLOR,   // Bright red for favorites/hearts
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
// Following "White & Light Grey" secondary scheme
// =============================================================================

export const Colors = {
  light: {
    // Core colors
    text: '#11181C',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    textLabel: '#334155',
    background: '#ffffff',
    backgroundSecondary: '#f8fafc',
    tint: BRAND_COLOR,

    // Interactive elements
    icon: '#687076',
    iconMuted: '#94a3b8',
    tabIconDefault: '#8E8E93',
    tabIconSelected: BRAND_COLOR,

    // Brand
    primary: BRAND_COLOR,
    primaryDark: BRAND_COLOR_DARK,
    primaryLight: BRAND_COLOR_LIGHT,
    accent: ACCENT_COLOR,

    // Borders
    border: '#e2e8f0',
    borderSecondary: '#e0e0e0',
    divider: '#f1f5f9',

    // Cards & Surfaces
    cardBackground: '#ffffff',
    cardBackgroundSecondary: '#f8fafc',
    inputBackground: '#f8fafc',

    // Search bar
    searchBackground: '#f1f5f9',
    searchBorder: '#e2e8f0',

    // Image placeholders
    placeholder: '#f1f5f9',
    placeholderIcon: '#64748b',

    // Bottom sheet
    handleIndicator: '#cbd5e1',
    sheetItemBackground: '#f8fafc',

    // Chat colors
    chatBubbleMine: '#007AFF',
    chatBubbleOther: '#e5e5ea',
    chatTextMine: '#ffffff',
    chatTextOther: '#000000',
  },
  dark: {
    // Core colors
    text: '#ECEDEE',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    textLabel: '#d4d4d8',
    background: '#0a0a0a',
    backgroundSecondary: '#18181b',
    tint: BRAND_COLOR,

    // Interactive elements
    icon: '#9BA1A6',
    iconMuted: '#52525b',
    tabIconDefault: '#636366',
    tabIconSelected: BRAND_COLOR,

    // Brand
    primary: BRAND_COLOR,
    primaryDark: BRAND_COLOR_DARK,
    primaryLight: BRAND_COLOR_LIGHT,
    accent: ACCENT_COLOR,

    // Borders
    border: '#27272a',
    borderSecondary: '#3f3f46',
    divider: '#27272a',

    // Cards & Surfaces
    cardBackground: '#18181b',
    cardBackgroundSecondary: '#27272a',
    inputBackground: '#18181b',

    // Search bar
    searchBackground: '#27272a',
    searchBorder: '#3f3f46',

    // Image placeholders
    placeholder: '#27272a',
    placeholderIcon: '#71717a',

    // Bottom sheet
    handleIndicator: '#52525b',
    sheetItemBackground: '#27272a',

    // Chat colors
    chatBubbleMine: '#0A84FF',
    chatBubbleOther: '#3a3a3c',
    chatTextMine: '#ffffff',
    chatTextOther: '#ffffff',
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
