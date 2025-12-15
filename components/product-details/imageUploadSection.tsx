import { BORDER_RADIUS, SHADOWS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ImageUploadSectionProps {
  images: string[];
  setImages: (images: string[]) => void;
}

const MAX_IMAGES = 10;
const IMAGE_WIDTH = 160;
const IMAGE_HEIGHT = 200; // 4:5 aspect ratio

export default function ImageUploadSection({ images, setImages }: ImageUploadSectionProps) {
  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const mutedColor = useThemeColor({}, 'textMuted');
  const backgroundColor = useThemeColor({}, 'background');

  // Pick images from library
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Sorry', 'We need camera roll permissions to upload images');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages([...images, ...newImages].slice(0, MAX_IMAGES));
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Sorry', 'We need camera permissions to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setImages([...images, result.assets[0].uri].slice(0, MAX_IMAGES));
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Show image picker options
  const showImageOptions = () => {
    Alert.alert(
      'Add Photos',
      'Choose how you want to add photos',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Empty state - large rectangular placeholder
  if (images.length === 0) {
    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.emptyState, { borderColor }]}
          onPress={showImageOptions}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={48} color={mutedColor} />
          <Text style={[styles.emptyStateText, { color: mutedColor }]}>Add photos</Text>
        </TouchableOpacity>
        <Text style={[styles.helperText, { color: mutedColor }]}>
          Photos: 0/{MAX_IMAGES} Select your cover photo first, include pictures with different angles and details.
        </Text>
      </View>
    );
  }

  // With images - horizontal scroll view
  return (
    <View style={styles.section}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {images.map((image, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.uploadedImage} />

            {/* Cover badge for first image */}
            {index === 0 && (
              <View style={styles.coverBadge}>
                <Text style={styles.coverBadgeText}>Cover</Text>
              </View>
            )}

            {/* Remove button */}
            <TouchableOpacity
              style={[styles.removeButton, SHADOWS.sm]}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add more photos button */}
        {images.length < MAX_IMAGES && (
          <TouchableOpacity
            style={[styles.addMoreButton, { borderColor }]}
            onPress={showImageOptions}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={32} color={mutedColor} />
            <Text style={[styles.addMoreText, { color: mutedColor }]}>Add photos</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <Text style={[styles.helperText, { color: mutedColor }]}>
        Photos: {images.length}/{MAX_IMAGES} Select your cover photo first, include pictures with different angles and details.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  // Empty state styles
  emptyState: {
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: SPACING.sm,
  },
  // Helper text
  helperText: {
    fontSize: 13,
    marginTop: SPACING.md,
    lineHeight: 18,
  },
  // Horizontal scroll styles
  scrollContent: {
    gap: SPACING.md,
  },
  imageContainer: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  // Cover badge
  coverBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.xs,
  },
  coverBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  // Remove button
  removeButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Add more button
  addMoreButton: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreText: {
    fontSize: 14,
    marginTop: SPACING.xs,
  },
});
