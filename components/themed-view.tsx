import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  variant?: 'default' | 'card' | 'cardSecondary' | 'secondary' | 'input' | 'transparent';
};

/**
 * A View component that automatically adapts to the current theme.
 *
 * Variants:
 * - 'default': Main background color
 * - 'card': Card/surface background color
 * - 'cardSecondary': Secondary card background
 * - 'secondary': Secondary background (slightly different from main)
 * - 'input': Input field background
 * - 'transparent': No background color
 */
export function ThemedView({
  style,
  lightColor,
  darkColor,
  variant = 'default',
  ...otherProps
}: ThemedViewProps) {
  // Map variant to the appropriate color key
  const colorKey = {
    default: 'background',
    card: 'cardBackground',
    cardSecondary: 'cardBackgroundSecondary',
    secondary: 'backgroundSecondary',
    input: 'inputBackground',
    transparent: 'background',
  }[variant] as 'background' | 'cardBackground' | 'cardBackgroundSecondary' | 'backgroundSecondary' | 'inputBackground';

  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, colorKey);

  // For transparent variant, don't apply any background
  const bgStyle = variant === 'transparent' ? {} : { backgroundColor };

  return <View style={[bgStyle, style]} {...otherProps} />;
}
