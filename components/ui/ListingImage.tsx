import { BORDER_RADIUS } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getThumbnailUrl } from '@/lib/imageUtils';
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
  const placeholderBg = useThemeColor({}, 'placeholder');
  const placeholderIconColor = useThemeColor({}, 'placeholderIcon');

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
        color={placeholderIconColor}
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
