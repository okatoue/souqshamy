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

  // Handle form submission
  const handleSubmit = () => {
    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please add a description');
      return;
    }
    
    if (!price.trim()) {
      Alert.alert('Missing Information', 'Please set a price');
      return;
    }

    if (images.length === 0) {
      Alert.alert('Missing Information', 'Please add at least one image');
      return;
    }

    // Here you would typically send the data to your backend
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

  const isFormValid = description && price && images.length > 0;

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