/**
 * Theme constants for 3ANTAR Marketplace
 * Updated brand color: #18AEF2
 */

import { Platform } from 'react-native';

// Brand Colors
export const BRAND_COLOR = '#18AEF2';
export const BRAND_COLOR_DARK = '#0d9fe0';
export const BRAND_COLOR_LIGHT = '#5cc5f5';

const tintColorLight = BRAND_COLOR;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    // Additional colors for consistency
    primary: BRAND_COLOR,
    primaryDark: BRAND_COLOR_DARK,
    border: '#e2e8f0',
    cardBackground: '#fff',
    inputBackground: '#f8fafc',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    // Additional colors for consistency
    primary: BRAND_COLOR,
    primaryDark: BRAND_COLOR_DARK,
    border: '#333',
    cardBackground: '#1e1e1e',
    inputBackground: '#1a1a1a',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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