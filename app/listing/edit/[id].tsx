import { useLocalSearchParams, useRouter } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
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
import { BRAND_COLOR, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/lib/auth_context';
import { formatPrice, unformatPrice } from '@/lib/formatters';
import { uploadListingImages } from '@/lib/imageUpload';
import { supabase } from '@/lib/supabase';
import { useAppColorScheme } from '@/lib/theme_context';
import { Category, Subcategory } from '@/assets/categories';
import categoriesData from '@/assets/categories.json';
import { Listing } from '@/types/listing';
import { useAppData } from '@/lib/app_data_context';

export default function EditListingScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { fetchUserListings } = useAppData();

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [originalListing, setOriginalListing] = useState<Listing | null>(null);

  // Category state
  const [currentCategoryId, setCurrentCategoryId] = useState(0);
  const [currentSubcategoryId, setCurrentSubcategoryId] = useState(0);
  const [currentCategoryName, setCurrentCategoryName] = useState('');
  const [currentSubcategoryName, setCurrentSubcategoryName] = useState('');
  const [currentCategoryIcon, setCurrentCategoryIcon] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]); // Original URLs for comparison
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('SYP');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [sameAsPhone, setSameAsPhone] = useState(false);

  // Location state
  const [location, setLocation] = useState<string | null>(null);
  const [locationCoordinates, setLocationCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  // Refs
  const categorySheetRef = useRef<CategoryBottomSheetRefProps>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const colorScheme = useAppColorScheme();

  // Set Android navigation bar to match theme
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(backgroundColor);
      NavigationBar.setButtonStyleAsync(colorScheme === 'dark' ? 'light' : 'dark');
      NavigationBar.setBorderColorAsync('transparent');
    }
  }, [backgroundColor, colorScheme]);

  // Helper to find category and subcategory names by IDs
  const getCategoryInfo = (categoryId: number, subcategoryId: number) => {
    const category = categoriesData.categories.find(c => c.id === categoryId);
    if (!category) return { categoryName: '', subcategoryName: '', categoryIcon: '' };

    const subcategory = category.subcategories.find(s => s.id === subcategoryId);
    return {
      categoryName: category.name,
      subcategoryName: subcategory?.name || '',
      categoryIcon: category.icon
    };
  };

  // Fetch existing listing data
  useEffect(() => {
    const fetchListing = async () => {
      if (!params.id || !user) {
        Alert.alert(t('alerts.error'), t('errors.invalidRequest'));
        router.back();
        return;
      }

      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('id', params.id)
          .eq('user_id', user.id) // Ensure ownership
          .single();

        if (error) throw error;

        if (!data) {
          Alert.alert(t('alerts.error'), t('errors.listingNotFoundOrNoPermission'));
          router.back();
          return;
        }

        // Store original listing for comparison
        setOriginalListing(data);

        // Populate form state
        setTitle(data.title || '');
        setDescription(data.description || '');
        setPrice(data.price?.toString() || '');
        setCurrency(data.currency || 'SYP');

        // Handle images - store both in state
        const listingImages = data.images || [];
        setImages(listingImages);
        setExistingImages(listingImages);

        setLocation(data.location || null);
        setLocationCoordinates(
          data.location_lat && data.location_lon
            ? { latitude: data.location_lat, longitude: data.location_lon }
            : null
        );
        setPhoneNumber(data.phone_number || '');
        setWhatsappNumber(data.whatsapp_number || '');

        // Check if WhatsApp is same as phone
        if (data.phone_number && data.whatsapp_number && data.phone_number === data.whatsapp_number) {
          setSameAsPhone(true);
        }

        // Set category info
        setCurrentCategoryId(data.category_id);
        setCurrentSubcategoryId(data.subcategory_id);

        const { categoryName, subcategoryName, categoryIcon } = getCategoryInfo(
          data.category_id,
          data.subcategory_id
        );
        setCurrentCategoryName(categoryName);
        setCurrentSubcategoryName(subcategoryName);
        setCurrentCategoryIcon(categoryIcon);

      } catch (error) {
        console.error('Error fetching listing:', error);
        Alert.alert(t('alerts.error'), t('errors.loadListingFailed'));
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [params.id, user]);

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

  // Submit updated listing
  const handleSubmit = async () => {
    // Validation
    if (!user) {
      Alert.alert(t('productDetails.authRequired'), t('productDetails.signInToEdit'));
      router.push('/(auth)');
      return;
    }

    if (!description.trim()) {
      Alert.alert(t('productDetails.missingInfo'), t('productDetails.addDescription'));
      return;
    }

    if (price === '') {
      Alert.alert(t('productDetails.missingInfo'), t('productDetails.setPrice'));
      return;
    }

    if (!location || !locationCoordinates) {
      Alert.alert(t('productDetails.missingInfo'), t('productDetails.selectLocation'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Identify new images (local URIs) vs existing (URLs)
      const newImages = images.filter(img => !img.startsWith('http'));
      const keptExistingImages = images.filter(img => img.startsWith('http'));

      // Upload new images if any
      let uploadedUrls: string[] = [];
      if (newImages.length > 0) {
        try {
          uploadedUrls = await uploadListingImages(newImages, user.id);
        } catch (uploadError: any) {
          Alert.alert(t('productDetails.uploadError'), uploadError.message || t('productDetails.uploadFailed'));
          setIsSubmitting(false);
          return;
        }
      }

      // Combine kept existing images + newly uploaded images
      const finalImages = [...keptExistingImages, ...uploadedUrls];

      // Identify removed images for cleanup (fire and forget)
      const removedImages = existingImages.filter(img => !keptExistingImages.includes(img));

      const finalWhatsapp = sameAsPhone ? phoneNumber.trim() : whatsappNumber.trim();

      // Update listing in database
      const { error } = await supabase
        .from('listings')
        .update({
          title: title.trim() || 'Untitled',
          description: description.trim(),
          price: parseFloat(unformatPrice(price)),
          currency,
          images: finalImages.length > 0 ? finalImages : null,
          location,
          location_lat: locationCoordinates.latitude,
          location_lon: locationCoordinates.longitude,
          phone_number: phoneNumber.trim() || null,
          whatsapp_number: finalWhatsapp || null,
          category_id: currentCategoryId,
          subcategory_id: currentSubcategoryId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Delete removed images from storage (don't await - fire and forget)
      if (removedImages.length > 0) {
        import('@/lib/imageUpload').then(({ deleteListingImages }) => {
          if (deleteListingImages) {
            deleteListingImages(removedImages).catch(err => {
              console.error('[EditListing] Failed to cleanup removed images:', err);
            });
          }
        }).catch(() => {
          // deleteListingImages may not exist yet during Phase 1.1
        });
      }

      // Refresh the user listings
      await fetchUserListings(true);

      Alert.alert(t('alerts.success'), t('productDetails.updateSuccess'), [
        { text: t('common.ok'), onPress: () => router.back() }
      ]);

    } catch (error: any) {
      console.error('Error updating listing:', error);
      Alert.alert(t('alerts.error'), error.message || t('productDetails.updateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form validation - only description, price, and location are required
  const isFormValid =
    description.trim() !== '' &&
    price !== '' &&
    location !== null;

  // Loading state
  if (isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'left', 'right']}>
          <ProductHeader onBack={() => router.back()} title={t('productDetails.editListing')} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND_COLOR} />
            <Text style={[styles.loadingText, { color: textColor }]}>{t('common.loading')}</Text>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ProductHeader onBack={() => router.back()} title={t('productDetails.editListing')} />

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
              buttonText={t('productDetails.updateListing')}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
  },
});
