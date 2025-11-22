// app/category/[id].tsx
import { Category } from '@/assets/categories';
import categoriesData from '@/assets/categories.json';
import { SearchBar } from '@/components/ui/SearchBar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Interface for listing items
interface ListingItem {
  id: string;
  title: string;
  price: number;
  currency: 'USD' | 'SYP';
  image?: string;
  location: string;
  createdAt: string;
  categoryId: string;
  subcategoryId?: string;
}

export default function CategoryListingScreen() {
  const params = useLocalSearchParams<{ id: string; name: string }>();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [filteredListings, setFilteredListings] = useState<ListingItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  useEffect(() => {
    // Find the category from the data
    const category = categoriesData.categories.find(cat => cat.id === params.id);
    if (category) {
      setSelectedCategory(category);
    }

    // Initialize with empty array - in production, this would fetch from API
    setFilteredListings([]);
    
    // TODO: Add API call here to fetch actual listings for this category
    // fetchCategoryListings(params.id).then(setFilteredListings);
  }, [params.id]);

  const handleBack = () => {
    router.back();
  };

  const handleItemPress = (item: ListingItem) => {
    Alert.alert('Item Selected', `You selected: ${item.title}`);
    // Navigate to item detail page
    // router.push(`/listing/${item.id}`);
  };

  const handleSubcategoryPress = (subcategoryId: string) => {
    setSelectedSubcategory(subcategoryId === selectedSubcategory ? null : subcategoryId);
    // TODO: Filter listings based on subcategory
    // filterListingsBySubcategory(subcategoryId);
  };

  const renderItem = ({ item }: { item: ListingItem }) => (
    <Pressable
      style={({ pressed }) => [styles.itemCard, pressed && styles.itemCardPressed]}
      onPress={() => handleItemPress(item)}
    >
      {/* Image placeholder - replace with actual image */}
      <View style={styles.itemImage}>
        <MaterialIcons name="image" size={40} color="#666" />
      </View>
      
      <View style={styles.itemDetails}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.itemPrice}>
          {item.currency === 'SYP' ? 'SYP ' : '$'}
          {item.price.toLocaleString()}
        </Text>
        <View style={styles.itemMeta}>
          <Ionicons name="location-outline" size={14} color="#888" />
          <Text style={styles.itemLocation}>{item.location}</Text>
          <Text style={styles.itemDate}> • {item.createdAt}</Text>
        </View>
      </View>
    </Pressable>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="inbox" size={64} color="#666" />
      <Text style={styles.emptyText}>No listings in this category yet</Text>
      <Text style={styles.emptySubtext}>Be the first to post something!</Text>
      
      <Pressable 
        style={styles.postButton}
        onPress={() => router.push('/post')}
      >
        <MaterialIcons name="add" size={20} color="white" />
        <Text style={styles.postButtonText}>Post a Listing</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>{params.name || selectedCategory?.name}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={`Search in ${params.name}...`}
          style={styles.searchBar}
        />
      </View>

      {/* Result Count Bar */}
      <View style={styles.resultBar}>
        <Text style={styles.resultCount}>
          {filteredListings.length} {filteredListings.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      {/* Subcategories */}
      {selectedCategory && selectedCategory.subcategories.length > 0 && (
        <View style={styles.subcategoriesContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={selectedCategory.subcategories}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable 
                style={[
                  styles.subcategoryChip,
                  selectedSubcategory === item.id && styles.subcategoryChipActive
                ]}
                onPress={() => handleSubcategoryPress(item.id)}
              >
                <Text style={[
                  styles.subcategoryText,
                  selectedSubcategory === item.id && styles.subcategoryTextActive
                ]}>
                  {item.name}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}

      {/* Listings */}
      <FlatList
        data={filteredListings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyList}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32, // Balance the header
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBar: {
    fontSize: 16,
  },
  resultBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultCount: {
    color: '#888',
    fontSize: 14,
  },
  subcategoriesContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  subcategoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  subcategoryChipActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: '#4CAF50',
  },
  subcategoryText: {
    color: 'white',
    fontSize: 13,
  },
  subcategoryTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  itemCardPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLocation: {
    fontSize: 13,
    color: '#888',
    marginLeft: 2,
  },
  itemDate: {
    fontSize: 13,
    color: '#888',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    borderColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  postButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});