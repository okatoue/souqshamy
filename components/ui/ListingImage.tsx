import { BORDER_RADIUS } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface ListingImageProps {
  images?: string[];
  size?: number;
  style?: ViewStyle;
}

/**
 * Reusable component for displaying listing images with placeholder fallback.
 * Uses expo-image for better Android compatibility, caching, and performance.
 */
export function ListingImage({ images, size = 80, style }: ListingImageProps) {
  const placeholderBg = useThemeColor({}, 'placeholder');
  const placeholderIconColor = useThemeColor({}, 'placeholderIcon');
  const [hasError, setHasError] = useState(false);

  const imageStyle = {
    width: size,
    height: size,
    borderRadius: BORDER_RADIUS.sm,
  };

  const renderPlaceholder = () => (
    <View style={[styles.placeholder, imageStyle, { backgroundColor: placeholderBg }, style]}>
      <MaterialIcons
        name="image"
        size={size * 0.4}
        color={placeholderIconColor}
      />
    </View>
  );

  if (!images || images.length === 0 || hasError) {
    return renderPlaceholder();
  }

  return (
    <Image
      source={{ uri: images[0] }}
      style={[imageStyle, style]}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk"
      onError={() => setHasError(true)}
      placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
      placeholderContentFit="cover"
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
