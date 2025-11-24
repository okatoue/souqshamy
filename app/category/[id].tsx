// app/category/[id].tsx
import { Category, Subcategory } from '@/assets/categories';
import categoriesData from '@/assets/categories.json';
import { SearchBar } from '@/components/ui/SearchBar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useCategoryListings } from '@/hooks/useCategoryListings';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CategoryListingScreen() {
  const params = useLocalSearchParams<{ id: string; name: string; subcategoryId?: string }>();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(
    params.subcategoryId || null
  );
  const [displayedListings, setDisplayedListings] = useState<Listing[]>([]);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'text');
  const placeholderBg = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');
  const chipBg = useThemeColor({ light: '#f5f5f5', dark: '#2a2a2a' }, 'background');
  const chipActiveBg = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');

  // Get categoryId safely - params.id could be string or string[]
  const categoryId = Array.isArray(params.id) ? params.id[0] : params.id;

  // Use the category listings hook
  const { listings, isLoading, error, refetch } = useCategoryListings({
    categoryId: categoryId,
    subcategoryId: selectedSubcategory,
  });

  // Find category from data
  useEffect(() => {
    if (!categoryId) return;

    const category = categoriesData.categories.find(
      (cat) => cat.id.toString() === categoryId
    );
    if (category) {
      setSelectedCategory(category as Category);
    }
  }, [categoryId]);

  // Update displayed listings when listings or search changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDisplayedListings(listings);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = listings.filter(
        (listing) =>
          listing.title.toLowerCase().includes(query) ||
          listing.description.toLowerCase().includes(query) ||
          listing.location.toLowerCase().includes(query)
      );
      setDisplayedListings(filtered);
    }
  }, [listings, searchQuery]);

  const handleBack = () => {
    router.back();
  };

  const handleItemPress = (item: Listing) => {
    router.push(`/listing/${item.id}`);
  };

  const handleSubcategoryPress = (subcategory: Subcategory) => {
    const newSelection = selectedSubcategory === subcategory.id.toString()
      ? null
      : subcategory.id.toString();
    setSelectedSubcategory(newSelection);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'SYP') {
      return `SYP ${price.toLocaleString()}`;
    }
    return `$${price.toLocaleString()}`;
  };

  const renderSubcategoryChips = () => {
    if (!selectedCategory?.subcategories) return null;

    return (
      <View style={styles.subcategoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subcategoriesContent}
        >
          {/* "All" chip */}
          <Pressable
            style={[
              styles.subcategoryChip,
              { backgroundColor: selectedSubcategory === null ? chipActiveBg : chipBg },
            ]}
            onPress={() => setSelectedSubcategory(null)}
          >
            <Text
              style={[
                styles.subcategoryChipText,
                { color: selectedSubcategory === null ? '#fff' : textColor },
              ]}
            >
              All
            </Text>
          </Pressable>

          {selectedCategory.subcategories.map((sub) => (
            <Pressable
              key={sub.id}
              style={[
                styles.subcategoryChip,
                {
                  backgroundColor:
                    selectedSubcategory === sub.id.toString() ? chipActiveBg : chipBg,
                },
              ]}
              onPress={() => handleSubcategoryPress(sub as Subcategory)}
            >
              <Text
                style={[
                  styles.subcategoryChipText,
                  {
                    color: selectedSubcategory === sub.id.toString() ? '#fff' : textColor,
                  },
                ]}
              >
                {sub.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderItem = ({ item }: { item: Listing }) => (
    <Pressable
      style={({ pressed }) => [
        styles.itemCard,
        { backgroundColor: cardBg, borderColor },
        pressed && styles.itemCardPressed,
      ]}
      onPress={() => handleItemPress(item)}
    >
      {/* Listing Image */}
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.itemImage} resizeMode="cover" />
      ) : (
        <View style={[styles.itemImagePlaceholder, { backgroundColor: placeholderBg }]}>
          <MaterialIcons name="image" size={40} color="#666" />
        </View>
      )}

      {/* Listing Details */}
      <View style={styles.itemDetails}>
        <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.itemPrice}>{formatPrice(item.price, item.currency)}</Text>
        <View style={styles.itemMeta}>
          <Ionicons name="location-outline" size={14} color="#888" />
          <Text style={styles.itemLocation} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
        <Text style={styles.itemDate}>{formatDate(item.created_at)}</Text>
      </View>

      {/* Arrow indicator */}
      <View style={styles.itemArrow}>
        <Ionicons name="chevron-forward" size={20} color="#888" />
      </View>
    </Pressable>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="inbox" size={64} color="#666" />
      <Text style={[styles.emptyText, { color: textColor }]}>
        {searchQuery
          ? 'No listings match your search'
          : 'No listings in this category yet'}
      </Text>
      <Text style={styles.emptySubtext}>
        {searchQuery ? 'Try different keywords' : 'Be the first to post something!'}
      </Text>

      {!searchQuery && (
        <Pressable style={styles.postButton} onPress={() => router.push('/post')}>
          <MaterialIcons name="add" size={20} color="white" />
          <Text style={styles.postButtonText}>Post a Listing</Text>
        </Pressable>
      )}
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="error-outline" size={64} color="#F44336" />
      <Text style={[styles.emptyText, { color: textColor }]}>
        Failed to load listings
      </Text>
      <Text style={styles.emptySubtext}>{error?.message}</Text>
      <Pressable style={styles.postButton} onPress={refetch}>
        <MaterialIcons name="refresh" size={20} color="white" />
        <Text style={styles.postButtonText}>Try Again</Text>
      </Pressable>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={[styles.loadingText, { color: textColor }]}>Loading listings...</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
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
          placeholder={`Search in ${params.name || 'category'}...`}
          style={styles.searchBar}
        />
      </View>

      {/* Subcategory Filter Chips */}
      {renderSubcategoryChips()}

      {/* Result Count Bar */}
      <View style={[styles.resultBar, { borderColor }]}>
        <Text style={[styles.resultCount, { color: textColor }]}>
          {displayedListings.length} {displayedListings.length === 1 ? 'listing' : 'listings'}
          {selectedSubcategory && selectedCategory && (
            <Text style={styles.filterLabel}>
              {' '}
              in{' '}
              {
                selectedCategory.subcategories.find(
                  (s) => s.id.toString() === selectedSubcategory
                )?.name
              }
            </Text>
          )}
        </Text>
      </View>

      {/* Content */}
      {isLoading ? (
        renderLoading()
      ) : error ? (
        renderError()
      ) : (
        <FlatList
          data={displayedListings}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor="#007AFF" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    backgroundColor: 'transparent',
  },
  subcategoriesContainer: {
    paddingVertical: 8,
  },
  subcategoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  subcategoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  subcategoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  resultCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterLabel: {
    color: '#007AFF',
    fontWeight: '400',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  itemCard: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  itemImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemLocation: {
    fontSize: 13,
    color: '#888',
    marginLeft: 4,
    flex: 1,
  },
  itemDate: {
    fontSize: 12,
    color: '#888',
  },
  itemArrow: {
    justifyContent: 'center',
    paddingLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 24,
  },
  postButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});