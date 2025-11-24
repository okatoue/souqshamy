import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Category, Subcategory } from '@/assets/categories';
import CategoryBottomSheet, { CategoryBottomSheetRefProps } from '@/components/ui/bottomSheet';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { UserIcon } from '../../components/ui/userIcon';

export default function PostListingScreen() {
  const [listingTitle, setListingTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);

  const categorySheetRef = useRef<CategoryBottomSheetRefProps>(null);
  const router = useRouter();

  const handleOpenPress = () => {
    categorySheetRef.current?.open();
  };

  const handleCategorySelect = (category: Category, subcategory: Subcategory) => {
    console.log('Selected:', {
      category: category.name,
      categoryId: category.id,
      subcategory: subcategory.name,
      subcategoryId: subcategory.id
    });

    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
  };

  const handleContinue = () => {
    // Validate that required fields are filled
    if (!listingTitle.trim()) {
      Alert.alert('Missing Information', 'Please enter a title for your listing');
      return;
    }

    if (!selectedCategory || !selectedSubcategory) {
      Alert.alert('Missing Information', 'Please select a category');
      return;
    }

    // Navigate to product details page with numeric IDs!
    router.push({
      pathname: '/product-details',
      params: {
        title: listingTitle,
        categoryId: selectedCategory.id,         // Numeric ID
        subcategoryId: selectedSubcategory.id,   // Numeric ID
        categoryName: selectedCategory.name,     // For display
        subcategoryName: selectedSubcategory.name, // For display
        categoryIcon: selectedCategory.icon
      }
    });
  };

  // Format the selected category for display
  const getCategoryDisplayText = () => {
    if (selectedCategory && selectedSubcategory) {
      return `${selectedCategory.icon} ${selectedCategory.name} › ${selectedSubcategory.name}`;
    }
    return 'Select a Category';
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
          >
            <View style={styles.headerRow}>
              <UserIcon />
            </View>

            <ThemedView style={styles.titleContainer}>
              <ThemedText type="title">Post a Listing</ThemedText>
            </ThemedView>

            <ThemedView style={styles.listingContainer}>
              <TextInput
                placeholder="Title..."
                value={listingTitle}
                onChangeText={setListingTitle}
                style={styles.listingTitleContent}
                placeholderTextColor="#888"
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={Keyboard.dismiss}
              />
            </ThemedView>

            <TouchableOpacity
              style={styles.categoryButton}
              onPress={handleOpenPress}
              activeOpacity={0.8}
            >
              <View style={styles.categoryButtonContent}>
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory && styles.categoryButtonTextSelected
                ]}>
                  {getCategoryDisplayText()}
                </Text>
                <Text style={styles.categoryButtonIcon}>›</Text>
              </View>
            </TouchableOpacity>

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                (!listingTitle || !selectedCategory) && styles.continueButtonDisabled
              ]}
              onPress={handleContinue}
              activeOpacity={0.8}
              disabled={!listingTitle || !selectedCategory}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>

            <CategoryBottomSheet
              ref={categorySheetRef}
              onCategorySelect={handleCategorySelect}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  listingContainer: {
    marginTop: 100,
    marginBottom: 25,
    marginLeft: 20,
    marginRight: 20,
    height: 50,
    borderColor: 'white',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 8,
    justifyContent: 'center',
  },
  listingTitleContent: {
    fontSize: 18,
    color: 'white',
    paddingHorizontal: 12,
  },
  container: {
    flex: 1,
  },
  titleContainer: {
    marginTop: 100,
    marginLeft: 16,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
  },
  categoryButton: {
    marginTop: 50,
    marginBottom: 25,
    marginLeft: 20,
    marginRight: 20,
    height: 50,
    borderColor: 'white',
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  categoryButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryButtonText: {
    fontSize: 16,
    color: '#888',
    flex: 1,
  },
  categoryButtonTextSelected: {
    color: 'white',
  },
  categoryButtonIcon: {
    fontSize: 24,
    color: '#888',
    marginLeft: 8,
  },
  continueButton: {
    marginTop: 30,
    marginHorizontal: 20,
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
});