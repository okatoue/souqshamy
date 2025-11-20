import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Category, Subcategory } from '@/assets/categories';
import CategoryBottomSheet, { CategoryBottomSheetRefProps } from '@/components/ui/bottomSheet';
import { useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { UserIcon } from '../../components/ui/userIcon';

export default function PostListingScreen() {
  const [listingTitle, setListingTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  
  const categorySheetRef = useRef<CategoryBottomSheetRefProps>(null);

  const handleOpenPress = () => {
    categorySheetRef.current?.open();
  };

  const handleCategorySelect = (category: Category, subcategory: Subcategory) => {
    console.log('Selected:', {
      category: category.name,
      subcategory: subcategory.name
    });
    
    // Store the selected category and subcategory
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
    
    // You can add your navigation or other logic here
    // For example:
    // navigation.navigate('CategoryScreen', { 
    //   categoryId: category.id,
    //   subcategoryId: subcategory.id 
    // });
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
      <SafeAreaView style={styles.container}>
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

        {/* Alternative: If you prefer the original button style */}
        {/* <View style={styles.browseButton}>
          <Button title={getCategoryDisplayText()} onPress={handleOpenPress} />
        </View> */}

        <CategoryBottomSheet
          ref={categorySheetRef}
          onCategorySelect={handleCategorySelect}
        />
      </SafeAreaView>
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
  browseButton: {
    marginTop: 50,
    marginBottom: 25,
    marginLeft: 20,
    marginRight: 20,
    height: 50,
    borderColor: 'white',
    borderWidth: 1,
    paddingLeft: 8,
    justifyContent: 'center',
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
});
