import { useFavoriteToggle } from '@/hooks/useFavoriteToggle';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';

interface FavoriteButtonProps {
  listingId: string;
  size?: number;
  style?: ViewStyle;
  variant?: 'elevated' | 'overlay';
}

/**
 * Reusable favorite/heart button component with toggle functionality.
 * Supports two variants: 'elevated' (default with shadow) and 'overlay' (for use on images).
 */
export function FavoriteButton({
  listingId,
  size = 24,
  style,
  variant = 'elevated',
}: FavoriteButtonProps) {
  const { isFavorite, isToggling, handleToggle } = useFavoriteToggle({ listingId });

  const buttonStyle = variant === 'overlay' ? styles.overlayButton : styles.elevatedButton;
  const inactiveColor = variant === 'overlay' ? '#fff' : COLORS.muted;

  return (
    <Pressable
      onPress={handleToggle}
      style={({ pressed }) => [
        buttonStyle,
        pressed && styles.pressed,
        style,
      ]}
      disabled={isToggling}
    >
      {isToggling ? (
        <ActivityIndicator size="small" color={COLORS.favorite} />
      ) : (
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={size}
          color={isFavorite ? COLORS.favorite : inactiveColor}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  elevatedButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.overlayLight,
    ...SHADOWS.button,
  },
  overlayButton: {
    backgroundColor: COLORS.overlayDark,
    borderRadius: BORDER_RADIUS.xl,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});
