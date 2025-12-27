// components/ui/BackButton.tsx
import { SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRTL } from '@/lib/rtl_context';
import { rtlIcon, rtlMarginStart } from '@/lib/rtlStyles';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

interface BackButtonProps {
  /** Custom onPress handler. Defaults to router.back() */
  onPress?: () => void;
  /** Icon variant: 'chevron' or 'arrow'. Default: 'chevron' */
  variant?: 'chevron' | 'arrow';
  /** Icon size. Default: 28 */
  size?: number;
  /** Custom color override. Defaults to theme 'icon' color */
  color?: string;
  /** Force white color (for colored headers like category screen) */
  light?: boolean;
  /** Additional style for the pressable container */
  style?: StyleProp<ViewStyle>;
  /** Accessibility label. Default: 'Go back' */
  accessibilityLabel?: string;
}

export function BackButton({
  onPress,
  variant = 'chevron',
  size = 28,
  color,
  light = false,
  style,
  accessibilityLabel = 'Go back',
}: BackButtonProps) {
  const { isRTL } = useRTL();
  const themeIconColor = useThemeColor({}, 'icon');

  const iconColor = light ? '#FFFFFF' : (color ?? themeIconColor);
  // In RTL mode, back arrow should point right (forward direction)
  const iconName = variant === 'arrow'
    ? rtlIcon(isRTL, 'arrow-back', 'arrow-forward')
    : rtlIcon(isRTL, 'chevron-back', 'chevron-forward');

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.button, rtlMarginStart(isRTL, -SPACING.xs), style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Ionicons name={iconName} size={size} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: SPACING.xs,
  },
});
