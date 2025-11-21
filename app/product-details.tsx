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

export default function ProductDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  // Extract params
  const { title, category, subcategory, categoryIcon } = params;
  
  // State for product details
  const [images, setImages] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('SYP');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // Handle form submission
  const handleSubmit = () => {
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

    // Here you would typically send the data to your backend
    const listingData = {
      title,
      category,
      subcategory,
      description,
      price,
      currency,
      phoneNumber,
      whatsappNumber,
      images, // Images are optional
    };

    console.log('Submitting listing:', listingData);

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
          <ScrollView showsVerticalScrollIndicator={false}>
            <ProductHeader onBack={() => router.back()} />
            
            <CategoryInfo 
              categoryIcon={categoryIcon as string}
              category={category as string}
              subcategory={subcategory as string}
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
              setPrice={setPrice}
              currency={currency}
              setCurrency={setCurrency}
            />

            <ContactSection 
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
              whatsappNumber={whatsappNumber}
              setWhatsappNumber={setWhatsappNumber}
            />

            <SubmitButton 
              onPress={handleSubmit}
              disabled={!isFormValid}
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
});