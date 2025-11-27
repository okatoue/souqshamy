import { useThemeColor } from '@/hooks/use-theme-color';
import { getThumbnailUrl } from '@/lib/imageUtils';
import { BORDER_RADIUS, COLORS } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';

interface ListingImageProps {
  images?: string[];
  size?: number;
  style?: ViewStyle;
}

/**
 * Reusable component for displaying listing images with placeholder fallback.
 * Handles loading states and missing images gracefully.
 */
export function ListingImage({ images, size = 80, style }: ListingImageProps) {
  const placeholderBg = useThemeColor(
    { light: '#f0f0f0', dark: '#2a2a2a' },
    'background'
  );

  const imageStyle = {
    width: size,
    height: size,
    borderRadius: BORDER_RADIUS.sm,
  };

  if (images && images.length > 0) {
    return (
      <Image
        source={{ uri: getThumbnailUrl(images[0]) }}
        style={[imageStyle, style]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.placeholder, imageStyle, { backgroundColor: placeholderBg }, style]}>
      <MaterialIcons
        name="image"
        size={size * 0.4}
        color={COLORS.mutedLight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
