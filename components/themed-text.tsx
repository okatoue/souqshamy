import { StyleSheet, Text, type TextProps } from 'react-native';

import { BRAND_COLOR, FONT_SIZES, LINE_HEIGHTS } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'muted' | 'small';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');

  // Use muted color for muted type, otherwise use normal text color
  const textColor = type === 'muted' || type === 'small' ? mutedColor : color;
  // Links use brand color
  const linkColor = BRAND_COLOR;

  return (
    <Text
      style={[
        { color: type === 'link' ? linkColor : textColor },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'muted' ? styles.muted : undefined,
        type === 'small' ? styles.small : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: FONT_SIZES.base,
    lineHeight: FONT_SIZES.base * LINE_HEIGHTS.normal,
  },
  defaultSemiBold: {
    fontSize: FONT_SIZES.base,
    lineHeight: FONT_SIZES.base * LINE_HEIGHTS.normal,
    fontWeight: '600',
  },
  title: {
    fontSize: FONT_SIZES.hero,
    fontWeight: 'bold',
    lineHeight: FONT_SIZES.hero,
  },
  subtitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: FONT_SIZES.base,
  },
  muted: {
    fontSize: FONT_SIZES.md,
    opacity: 0.7,
  },
  small: {
    fontSize: FONT_SIZES.sm,
    opacity: 0.7,
  },
});
