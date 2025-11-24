// Simplified product-details.tsx - No more lookups needed!
// This version uses numeric IDs directly from the UI

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CategoryInfo from '@/components/product-details/categoryInfo';
import ContactSection from '@/components/product-details/contactSection';
import DescriptionSection from '@/components/product-details/descriptionSection';
import ImageUploadSection from '@/components/product-details/imageUploadSection';
import PriceSection from '@/components/product-details/priceSection';
import ProductHeader from '@/components/product-details/productHeader';
import SubmitButton from '@/components/product-details/submitButton';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useCreateListing } from '@/hooks/useCreateListing';
import { useAuth } from '@/lib/auth_context';

export default function ProductDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // Extract params - NOW WITH NUMERIC IDS!
  const {
    title,
    categoryId,      // This is now a number (1, 2, 3...)
    subcategoryId,   // This is now a number (1, 2, 3...)
    categoryName,    // Display name
    subcategoryName, // Display name
    categoryIcon
  } = params;

  // State for product details
  const [images, setImages] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('SYP');
  const [phoneNumber, setPhoneNumber] = useState('');

  const { createListing, isLoading: isSubmitting } = useCreateListing();
  const backgroundColor = useThemeColor({}, 'background');

  // Much simpler handleSubmit - no lookups needed!
  const handleSubmit = async () => {
    // Check if user is authenticated
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to post a listing');
      router.push('/(auth)/sign-in');
      return;
    }

    // Validation
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

    const listingData = {
      user_id: user.id,
      title: title as string,
      category_id: Number(categoryId),
      subcategory_id: Number(subcategoryId),
      description: description.trim(),
      price: parseFloat(price),
      currency,
      phone_number: phoneNumber.trim() || null,
      images: images.length > 0 ? images : null,
      status: 'active' as const,
      location: 'Damascus',
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
    description.trim() !== '' &&
    price !== '' &&
    (phoneNumber.trim() !== '');

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ProductHeader onBack={() => router.back()} />

          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <CategoryInfo
              category={categoryName as string || 'Category'}
              subcategory={subcategoryName as string || 'Subcategory'}
              categoryIcon={categoryIcon as string}
              title={title as string}
            />

            <ImageUploadSection
              images={images}
              setImages={setImages}
            />

            <DescriptionSection
              description={description}
              setDescription={setDescription}
            />

            <PriceSection
              price={price}
              currency={currency}
              setPrice={setPrice}
              setCurrency={setCurrency}
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
      </SafeAreaView>
    </TouchableWithoutFeedback>
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