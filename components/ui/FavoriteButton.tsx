import { COLORS } from '@/constants/theme';
import { useFavoriteToggle } from '@/hooks/useFavoriteToggle';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, ViewStyle } from 'react-native';

interface FavoriteButtonProps {
  listingId: string | number;
  sellerId?: string;
  size?: number;
  style?: ViewStyle;
  /** Color when not favorited (default: #888) */
  inactiveColor?: string;
  /** Whether to show a background circle */
  showBackground?: boolean;
  /** Background color for the circle (default: rgba(0,0,0,0.4)) */
  backgroundColor?: string;
}

/**
 * Animated favorite/heart button with haptic feedback.
 * Bounces when toggled for satisfying UX.
 * Hidden for user's own listings.
 */
export function FavoriteButton({
  listingId,
  sellerId,
  size = 24,
  style,
  inactiveColor = '#888',
  showBackground = false,
  backgroundColor = 'rgba(0, 0, 0, 0.4)',
}: FavoriteButtonProps) {
  const { isFavorite, isOwnListing, handleToggle } = useFavoriteToggle({ listingId, sellerId });

  // Don't render for user's own listings
  if (isOwnListing) {
    return null;
  }

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevFavorite = useRef(isFavorite);

  // Animate when favorite state changes
  useEffect(() => {
    if (prevFavorite.current !== isFavorite) {
      // Bounce animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: isFavorite ? 1.3 : 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      prevFavorite.current = isFavorite;
    }
  }, [isFavorite, scaleAnim]);

  const content = (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Ionicons
        name={isFavorite ? 'heart' : 'heart-outline'}
        size={size}
        color={isFavorite ? COLORS.favorite : inactiveColor}
      />
    </Animated.View>
  );

  return (
    <Pressable
      onPress={handleToggle}
      style={[styles.button, style]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      accessibilityRole="button"
    >
      {showBackground ? (
        <Animated.View
          style={[
            styles.backgroundCircle,
            {
              backgroundColor,
              width: size + 14,
              height: size + 14,
              borderRadius: (size + 14) / 2,
            },
          ]}
        >
          {content}
        </Animated.View>
      ) : (
        content
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 4,
  },
  backgroundCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
