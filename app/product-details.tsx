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
import { useAuth } from '@/lib/auth_context';
import { supabase } from '@/lib/supabase';

export default function ProductDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth(); // Get authenticated user

  // Extract params
  const { title, category, subcategory, categoryIcon } = params;

  // State for product details
  const [images, setImages] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('SYP');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state

  // Function to get category ID from category name
  const getCategoryId = async (categoryName: string) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .single();

      if (error) {
        console.error('Error fetching category ID:', error);
        return null;
      }

      return data?.id;
    } catch (error) {
      console.error('Unexpected error getting category ID:', error);
      return null;
    }
  };

  const getSubcategoryId = async (categoryId: number, subcategoryName: string) => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('id')
        .eq('category_id', categoryId)
        .eq('name', subcategoryName)
        .single();

      if (error) {
        console.error('Error fetching subcategory ID:', error);
        return null;
      }

      return data?.id;
    } catch (error) {
      console.error('Unexpected error getting subcategory ID:', error);
      return null;
    }
  };

  // Updated handleSubmit function:
  const handleSubmit = async () => {
    // Check if user is authenticated
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to post a listing');
      router.push('/(auth)/sign-in');
      return;
    }

    // Check if description is provided
    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please add a description');
      return;
    }

    // Check if price is provided (can be 0)
    if (price === '') {
      Alert.alert('Missing Information', 'Please set a price (can be 0)');
      return;
    }

    // Check if at least one contact method is provided
    if (!phoneNumber.trim() && !whatsappNumber.trim()) {
      Alert.alert('Missing Information', 'Please add either a phone number or WhatsApp number');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the category ID from the category name
      const categoryId = await getCategoryId(category as string);

      if (!categoryId) {
        Alert.alert('Error', 'Invalid category selected. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Get the subcategory ID from the subcategory name and category ID
      const subcategoryId = await getSubcategoryId(categoryId, subcategory as string);

      if (!subcategoryId) {
        Alert.alert('Error', 'Invalid subcategory selected. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Prepare the listing data for Supabase
      const listingData = {
        user_id: user.id,
        title: title as string,
        category_id: categoryId,
        subcategory_id: subcategoryId,  // Using subcategory_id instead of subcategory
        description: description.trim(),
        price: parseFloat(price),
        currency,
        phone_number: phoneNumber.trim() || null,
        whatsapp_number: whatsappNumber.trim() || null,
        images: images.length > 0 ? images : null,
        status: 'active',
        location: 'Damascus',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Submitting listing to Supabase:', listingData);

      // Insert the listing into Supabase
      const { data, error } = await supabase
        .from('listings')
        .insert([listingData])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        Alert.alert(
          'Error',
          `Failed to create listing: ${error.message}`,
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('Listing created successfully:', data);

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
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validation: price must be set (can be 0), description required, and at least one contact method
  const isFormValid =
    description.trim() !== '' &&
    price !== '' &&
    (phoneNumber.trim() !== '' || whatsappNumber.trim() !== '');

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
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
              category={category as string}
              subcategory={subcategory as string}
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
              whatsappNumber={whatsappNumber}
              setPhoneNumber={setPhoneNumber}
              setWhatsappNumber={setWhatsappNumber}
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
    backgroundColor: '#000',
  },
  scrollContainer: {
    flex: 1,
  },
});