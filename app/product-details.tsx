import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import CategoryInfo from '@/components/product-details/categoryInfo';
import ContactSection from '@/components/product-details/contactSection';
import DescriptionSection from '@/components/product-details/descriptionSection';
import ImageUploadSection from '@/components/product-details/imageUploadSection';
import LocationSection from '@/components/product-details/locationSection';
import MapModal from '@/components/product-details/mapModal';
import PriceSection from '@/components/product-details/priceSection';
import ProductHeader from '@/components/product-details/productHeader';
import SubmitButton from '@/components/product-details/submitButton';
import TitleSection from '@/components/product-details/titleSection';
import CategoryBottomSheet, { CategoryBottomSheetRefProps } from '@/components/ui/bottomSheet';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useCreateListing } from '@/hooks/useCreateListing';
import { useAuth } from '@/lib/auth_context';
import { Category, Subcategory } from '@/assets/categories';

export default function ProductDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // Extract params - NOW WITH NUMERIC IDS!
  const {
    title: initialTitle,
    categoryId,
    subcategoryId,
    categoryName,
    subcategoryName,
    categoryIcon
  } = params;

  // Category state (editable - initialized from params)
  const [currentCategoryId, setCurrentCategoryId] = useState(Number(categoryId));
  const [currentSubcategoryId, setCurrentSubcategoryId] = useState(Number(subcategoryId));
  const [currentCategoryName, setCurrentCategoryName] = useState(categoryName as string);
  const [currentSubcategoryName, setCurrentSubcategoryName] = useState(subcategoryName as string);
  const [currentCategoryIcon, setCurrentCategoryIcon] = useState(categoryIcon as string);

  // State for product details
  const [title, setTitle] = useState(initialTitle as string || '');
  const [images, setImages] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('SYP');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Location state
  const [location, setLocation] = useState('Damascus'); // Default to Damascus
  const [locationCoordinates, setLocationCoordinates] = useState({
    latitude: 33.5138,
    longitude: 36.2765,
  });
  const [showMapModal, setShowMapModal] = useState(false);

  // Refs
  const categorySheetRef = useRef<CategoryBottomSheetRefProps>(null);

  const { createListing, isLoading: isSubmitting } = useCreateListing();
  const backgroundColor = useThemeColor({}, 'background');

  const handleLocationSelect = (selectedLocation: string, coordinates: { latitude: number; longitude: number }) => {
    setLocation(selectedLocation);
    setLocationCoordinates(coordinates);
  };

  // Handle category change from bottom sheet
  const handleCategoryChange = (category: Category, subcategory: Subcategory) => {
    setCurrentCategoryId(category.id);
    setCurrentSubcategoryId(subcategory.id);
    setCurrentCategoryName(category.name);
    setCurrentSubcategoryName(subcategory.name);
    setCurrentCategoryIcon(category.icon);
  };

  // Open category bottom sheet
  const handleOpenCategorySheet = () => {
    Keyboard.dismiss();
    categorySheetRef.current?.open();
  };

  // Much simpler handleSubmit - no lookups needed!
  const handleSubmit = async () => {
    // Check if user is authenticated
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to post a listing');
      router.push('/(auth)');
      return;
    }

    // Validation
    if (!title.trim()) {
      Alert.alert('Missing Information', 'Please add a title');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please add a description');
      return;
    }

    if (price === '') {
      Alert.alert('Missing Information', 'Please set a price (can be 0)');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Missing Information', 'Please add either a phone number or WhatsApp number');
      return;
    }

    if (!location) {
      Alert.alert('Missing Information', 'Please select a location');
      return;
    }

    const listingData = {
      user_id: user.id,
      title: title.trim(),
      category_id: currentCategoryId,
      subcategory_id: currentSubcategoryId,
      description: description.trim(),
      price: parseFloat(price),
      currency,
      phone_number: phoneNumber.trim() || null,
      images: images.length > 0 ? images : null,
      status: 'active' as const,
      location,
      location_lat: locationCoordinates.latitude,
      location_lon: locationCoordinates.longitude,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await createListing(listingData);

    if (error) {
      Alert.alert(
        'Error',
        `Failed to create listing: ${error.message}`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Success!',
      'Your listing has been created',
      [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/listings')
        }
      ]
    );
  };

  const isFormValid =
    title.trim() !== '' &&
    description.trim() !== '' &&
    price !== '' &&
    phoneNumber.trim() !== '' &&
    location !== '';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ProductHeader onBack={() => router.back()} />

          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <CategoryInfo
              category={currentCategoryName}
              subcategory={currentSubcategoryName}
              categoryIcon={currentCategoryIcon}
              onChangePress={handleOpenCategorySheet}
            />

            <ImageUploadSection
              images={images}
              setImages={setImages}
            />

            <TitleSection
              title={title}
              setTitle={setTitle}
            />

            <PriceSection
              price={price}
              currency={currency}
              setPrice={setPrice}
              setCurrency={setCurrency}
            />

            <DescriptionSection
              description={description}
              setDescription={setDescription}
            />

            <LocationSection
              location={location}
              coordinates={locationCoordinates}
              onPress={() => setShowMapModal(true)}
            />

            <ContactSection
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
            />

            <SubmitButton
              onPress={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              loading={isSubmitting}
            />
          </ScrollView>
        </KeyboardAvoidingView>

        <MapModal
          visible={showMapModal}
          currentLocation={location}
          onSelectLocation={handleLocationSelect}
          onClose={() => setShowMapModal(false)}
        />

        {/* Category Selection Bottom Sheet */}
        <CategoryBottomSheet
          ref={categorySheetRef}
          onCategorySelect={handleCategoryChange}
          showCategories={true}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
});
