import { useLocalSearchParams, useRouter } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { BORDER_RADIUS, BRAND_COLOR, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useCreateListing } from '@/hooks/useCreateListing';
import { ListingDraft, useDraft } from '@/hooks/useDraft';
import { useAuth } from '@/lib/auth_context';
import { unformatPrice } from '@/lib/formatters';
import { useRTL } from '@/lib/rtl_context';
import { rtlRow } from '@/lib/rtlStyles';
import { useAppColorScheme } from '@/lib/theme_context';
import { Category, Subcategory } from '@/assets/categories';

export default function ProductDetailsScreen() {
  const { t } = useTranslation();
  const { isRTL } = useRTL();
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
  const autoSaveInterval = useRef<NodeJS.Timeout | null>(null);

  const { createListing, isLoading: isSubmitting, uploadProgress } = useCreateListing();
  const { hasDraft, isLoading: isDraftLoading, saveDraft, loadDraft, clearDraft } = useDraft();
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({}, 'cardBackground');
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

  // Check for existing draft on mount
  useEffect(() => {
    if (!isDraftLoading && hasDraft) {
      setShowDraftPrompt(true);
    }
  }, [isDraftLoading, hasDraft]);

  // Build current draft state
  const getCurrentDraft = useCallback((): Omit<ListingDraft, 'savedAt'> => ({
    title,
    description,
    price,
    currency: currency as 'SYP' | 'USD',
    images: images.filter(img => !img.startsWith('http')), // Only local URIs
    location,
    locationCoordinates,
    phoneNumber,
    whatsappNumber,
    sameAsPhone,
    categoryId: currentCategoryId,
    subcategoryId: currentSubcategoryId,
    categoryName: currentCategoryName,
    subcategoryName: currentSubcategoryName,
    categoryIcon: currentCategoryIcon,
  }), [
    title, description, price, currency, images, location, locationCoordinates,
    phoneNumber, whatsappNumber, sameAsPhone, currentCategoryId, currentSubcategoryId,
    currentCategoryName, currentSubcategoryName, currentCategoryIcon
  ]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (isSubmitting || showDraftPrompt) return;

    autoSaveInterval.current = setInterval(() => {
      const draft = getCurrentDraft();
      // Only save if there's meaningful content
      const hasContent =
        draft.title.trim() !== '' ||
        draft.description.trim() !== '' ||
        draft.price !== '' ||
        draft.images.length > 0;

      if (hasContent) {
        saveDraft(draft);
      }
    }, 30000);

    return () => {
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current);
      }
    };
  }, [isSubmitting, showDraftPrompt, getCurrentDraft, saveDraft]);

  // Handle draft restoration
  const handleRestoreDraft = async () => {
    const draft = await loadDraft();
    if (draft) {
      setTitle(draft.title);
      setDescription(draft.description);
      setPrice(draft.price);
      setCurrency(draft.currency);
      // Note: Local image URIs may no longer be valid after app restart
      // Only restore if we have a reasonable expectation they exist
      if (draft.images.length > 0) {
        setImages(draft.images);
      }
      setLocation(draft.location);
      setLocationCoordinates(draft.locationCoordinates);
      setPhoneNumber(draft.phoneNumber);
      setWhatsappNumber(draft.whatsappNumber);
      setSameAsPhone(draft.sameAsPhone);
      setCurrentCategoryId(draft.categoryId);
      setCurrentSubcategoryId(draft.subcategoryId);
      setCurrentCategoryName(draft.categoryName);
      setCurrentSubcategoryName(draft.subcategoryName);
      setCurrentCategoryIcon(draft.categoryIcon);
    }
    setShowDraftPrompt(false);
  };

  const handleDiscardDraft = async () => {
    await clearDraft();
    setShowDraftPrompt(false);
  };

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
        t('alerts.error'),
        `${t('productDetails.createFailed')}: ${error.message}`,
        [{ text: t('common.ok') }]
      );
      return;
    }

    // Clear draft on successful submission
    await clearDraft();

    if (warning) {
      // Show warning but still navigate to success
      Alert.alert(
        t('productDetails.listingCreated'),
        warning + '\n\n' + t('productDetails.addMoreImages'),
        [{ text: t('common.ok'), onPress: () => router.replace('/(tabs)/listings') }]
      );
    } else {
      Alert.alert(
        t('alerts.success'),
        t('productDetails.listingCreatedSuccess'),
        [
          {
            text: t('common.ok'),
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
      Alert.alert(t('productDetails.authRequired'), t('productDetails.signInToPost'));
      router.push('/(auth)');
      return;
    }

    // Required field validation
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

    // Warning for no images (not blocking)
    if (images.length === 0) {
      Alert.alert(
        t('productDetails.noImages'),
        t('productDetails.noImagesWarning'),
        [
          { text: t('productDetails.addImages'), style: 'cancel' },
          { text: t('productDetails.postAnyway'), onPress: () => {
            // Check contact info before submitting
            const hasContact = phoneNumber.trim() !== '' || whatsappNumber.trim() !== '';
            if (!hasContact) {
              Alert.alert(
                t('productDetails.noContact'),
                t('productDetails.noContactWarning'),
                [
                  { text: t('productDetails.addContact'), style: 'cancel' },
                  { text: t('common.continue'), onPress: () => submitListing() }
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
        t('productDetails.noContact'),
        t('productDetails.noContactWarning'),
        [
          { text: t('productDetails.addContact'), style: 'cancel' },
          { text: t('common.continue'), onPress: () => submitListing() }
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

  // Draft restoration prompt
  if (showDraftPrompt) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'left', 'right']}>
          <ProductHeader onBack={() => router.back()} />
          <View style={styles.draftPromptContainer}>
            <View style={[styles.draftPromptCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.draftPromptTitle, { color: textColor }]}>
                {t('productDetails.draftFound')}
              </Text>
              <Text style={[styles.draftPromptText, { color: textColor }]}>
                {t('productDetails.draftRestorePrompt')}
              </Text>
              <View style={[styles.draftPromptButtons, rtlRow(isRTL)]}>
                <Pressable
                  style={[styles.draftButton, styles.draftButtonSecondary]}
                  onPress={handleDiscardDraft}
                >
                  <Text style={styles.draftButtonSecondaryText}>{t('common.discard')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.draftButton, styles.draftButtonPrimary]}
                  onPress={handleRestoreDraft}
                >
                  <Text style={styles.draftButtonPrimaryText}>{t('common.restore')}</Text>
                </Pressable>
              </View>
            </View>
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
  // Draft prompt styles
  draftPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  draftPromptCard: {
    width: '100%',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  draftPromptTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  draftPromptText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
    opacity: 0.8,
  },
  draftPromptButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  draftButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftButtonPrimary: {
    backgroundColor: BRAND_COLOR,
  },
  draftButtonPrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  draftButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BRAND_COLOR,
  },
  draftButtonSecondaryText: {
    color: BRAND_COLOR,
    fontSize: 16,
    fontWeight: '600',
  },
});
