import { ThemedView } from '@/components/themed-view';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ImageUploadSectionProps {
  images: string[];
  setImages: (images: string[]) => void;
}

export default function ImageUploadSection({ images, setImages }: ImageUploadSectionProps) {
  const MAX_IMAGES = 6;

  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const inputBg = useThemeColor({}, 'inputBackground');
  const mutedColor = useThemeColor({}, 'textMuted');

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
      'Add Images',
      'Choose how you want to add images',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <ThemedView variant="card" style={[styles.section, { borderColor }]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Images</Text>
      <Text style={[styles.sectionSubtitle, { color: mutedColor }]}>Add up to {MAX_IMAGES} images</Text>

      <View style={styles.imageGrid}>
        {images.map((image, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.uploadedImage} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close-circle" size={24} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ))}

        {images.length < MAX_IMAGES && (
          <TouchableOpacity
            style={[styles.addImageButton, { backgroundColor: inputBg, borderColor }]}
            onPress={showImageOptions}
          >
            <Ionicons name="camera" size={32} color={mutedColor} />
            <Text style={[styles.addImageText, { color: mutedColor }]}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: SPACING.lg,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  imageContainer: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.sm,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.lg,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    fontSize: 12,
    marginTop: SPACING.xs,
  },
});
