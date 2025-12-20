import { useLocalSearchParams, useRouter } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { unformatPrice } from '@/lib/formatters';
import { useAppColorScheme } from '@/lib/theme_context';
import { Category, Subcategory } from '@/assets/categories';

export default function ProductDetailsScreen() {
  const params = useLocalSearchParams();

  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

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
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [sameAsPhone, setSameAsPhone] = useState(false);

  // Location state - initially null (no location selected)
  const [location, setLocation] = useState<string | null>(null);
  const [locationCoordinates, setLocationCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  // Refs
  const categorySheetRef = useRef<CategoryBottomSheetRefProps>(null);

  const { createListing, isLoading: isSubmitting, uploadProgress } = useCreateListing();
  const backgroundColor = useThemeColor({}, 'background');
  const colorScheme = useAppColorScheme();

  // Set Android navigation bar to match theme
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Set navigation bar background to match app theme
      NavigationBar.setBackgroundColorAsync(backgroundColor);
      // Set button style: 'dark' = black icons (for light bg), 'light' = white icons (for dark bg)
      NavigationBar.setButtonStyleAsync(colorScheme === 'dark' ? 'light' : 'dark');
      // Remove any border between app content and nav bar
      NavigationBar.setBorderColorAsync('transparent');
    }
  }, [backgroundColor, colorScheme]);

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

  // Submit listing to database
  const submitListing = async () => {
    // Safety check - this function should only be called after validation
    if (!locationCoordinates || !location) {
      console.error('submitListing called without location data');
      return;
    }

    const finalWhatsapp = sameAsPhone ? phoneNumber.trim() : whatsappNumber.trim();

    const listingData = {
      user_id: user!.id,
      title: title.trim() || 'Untitled',
      category_id: currentCategoryId,
      subcategory_id: currentSubcategoryId,
      description: description.trim(),
      price: parseFloat(unformatPrice(price)),
      currency,
      phone_number: phoneNumber.trim() || null,
      whatsapp_number: finalWhatsapp || null,
      images: images.length > 0 ? images : null,
      status: 'active' as const,
      location: location,
      location_lat: locationCoordinates.latitude,
      location_lon: locationCoordinates.longitude,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error, warning } = await createListing(listingData);

    if (error) {
      Alert.alert(
        'Error',
        `Failed to create listing: ${error.message}`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (warning) {
      // Show warning but still navigate to success
      Alert.alert(
        'Listing Created',
        warning + '\n\nYou can add more images by editing the listing.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/listings') }]
      );
    } else {
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
    }
  };

  // Handle form submission with validation
  const handleSubmit = async () => {
    // Check if user is authenticated
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to post a listing');
      router.push('/(auth)');
      return;
    }

    // Required field validation
    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please add a description');
      return;
    }

    if (price === '') {
      Alert.alert('Missing Information', 'Please set a price (can be 0)');
      return;
    }

    if (!location || !locationCoordinates) {
      Alert.alert('Missing Information', 'Please select a location');
      return;
    }

    // Warning for no images (not blocking)
    if (images.length === 0) {
      Alert.alert(
        'No Images Added',
        'Images boost views and drive sales. Are you sure you want to post without images?',
        [
          { text: 'Add Images', style: 'cancel' },
          { text: 'Post Anyway', onPress: () => {
            // Check contact info before submitting
            const hasContact = phoneNumber.trim() !== '' || whatsappNumber.trim() !== '';
            if (!hasContact) {
              Alert.alert(
                'No Contact Information',
                "Buyers won't be able to contact you directly. They can still use in-app chat. Continue?",
                [
                  { text: 'Add Contact', style: 'cancel' },
                  { text: 'Continue', onPress: () => submitListing() }
                ]
              );
            } else {
              submitListing();
            }
          }}
        ]
      );
      return;
    }

    // Warning for no contact info (not blocking)
    const hasContact = phoneNumber.trim() !== '' || whatsappNumber.trim() !== '';
    if (!hasContact) {
      Alert.alert(
        'No Contact Information',
        "Buyers won't be able to contact you directly. They can still use in-app chat. Continue?",
        [
          { text: 'Add Contact', style: 'cancel' },
          { text: 'Continue', onPress: () => submitListing() }
        ]
      );
      return;
    }

    submitListing();
  };

  // Only description, price, and location are required
  const isFormValid =
    description.trim() !== '' &&
    price !== '' &&
    location !== null;

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
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
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
              whatsappNumber={whatsappNumber}
              setWhatsappNumber={setWhatsappNumber}
              sameAsPhone={sameAsPhone}
              setSameAsPhone={setSameAsPhone}
            />

            <SubmitButton
              onPress={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              loading={isSubmitting}
              uploadProgress={uploadProgress}
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
