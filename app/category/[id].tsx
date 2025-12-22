// app/category/[id].tsx
import { Category, Subcategory } from '@/assets/categories';
import categoriesData from '@/assets/categories.json';
import { ListingCard } from '@/components/listings/listingCard';
import { BackButton } from '@/components/ui/BackButton';
import { SearchBar } from '@/components/ui/SearchBar';
import { BRAND_COLOR, Colors } from '@/constants/theme';
import { useThemeColor, useTheme } from '@/hooks/use-theme-color';
import { useCategoryListings } from '@/hooks/useCategoryListings';
import { navigateToListing } from '@/app/listing/[id]';
import { Listing } from '@/types/listing';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
  const theme = useTheme();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const chipBg = useThemeColor({}, 'backgroundSecondary');
  const iconMutedColor = useThemeColor({}, 'iconMuted');

  // Get categoryId safely - params.id could be string or string[]
  const categoryId = Array.isArray(params.id) ? params.id[0] : params.id;

  // Use the category listings hook with pagination
  const { listings, isLoading, error, refetch, loadMore, hasMore, isLoadingMore } = useCategoryListings({
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

  const handleItemPress = (item: Listing) => {
    navigateToListing(item);
  };

  const handleSubcategoryPress = (subcategory: Subcategory) => {
    const newSelection = selectedSubcategory === subcategory.id.toString()
      ? null
      : subcategory.id.toString();
    setSelectedSubcategory(newSelection);
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
              { backgroundColor: selectedSubcategory === null ? BRAND_COLOR : chipBg },
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
                    selectedSubcategory === sub.id.toString() ? BRAND_COLOR : chipBg,
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
    <ListingCard item={item} onPress={handleItemPress} />
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="inbox" size={64} color={iconMutedColor} />
      <Text style={[styles.emptyText, { color: textColor }]}>
        {searchQuery
          ? 'No listings match your search'
          : 'No listings in this category yet'}
      </Text>
      <Text style={[styles.emptySubtext, { color: textMutedColor }]}>
        {searchQuery ? 'Try different keywords' : 'Be the first to post something!'}
      </Text>

      {!searchQuery && (
        <Pressable style={[styles.postButton, { backgroundColor: BRAND_COLOR }]} onPress={() => router.push('/post')}>
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
      <Text style={[styles.emptySubtext, { color: textMutedColor }]}>{error?.message}</Text>
      <Pressable style={[styles.postButton, { backgroundColor: BRAND_COLOR }]} onPress={refetch}>
        <MaterialIcons name="refresh" size={20} color="white" />
        <Text style={styles.postButtonText}>Try Again</Text>
      </Pressable>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={BRAND_COLOR} />
      <Text style={[styles.loadingText, { color: textColor }]}>Loading listings...</Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={BRAND_COLOR} />
      </View>
    );
  };

  const handleLoadMore = () => {
    // Don't trigger load more if searching (client-side filtering)
    if (searchQuery.trim()) return;
    loadMore();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: BRAND_COLOR }]}>
        <BackButton variant="arrow" size={24} light />
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

      {/* Content */}
      {isLoading ? (
        renderLoading()
      ) : error ? (
        renderError()
      ) : (
        <FlatList
          data={displayedListings}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor={BRAND_COLOR} />
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
  listContent: {
    padding: 16,
    paddingTop: 8,
    flexGrow: 1,
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
    marginTop: 8,
    textAlign: 'center',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});