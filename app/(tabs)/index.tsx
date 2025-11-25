import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoriesList } from '@/components/ui/CategoriesList';
import { Location } from '@/components/ui/location';
import { RecentlyViewedSection } from '@/components/ui/recentlyViewedSection';
import { SearchBar } from '@/components/ui/SearchBar';
import { UserIcon } from '@/components/ui/userIcon';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const backgroundColor = useThemeColor({}, 'background');
  const searchContainerBg = useThemeColor({ light: '#f0f0f0', dark: '#1a1a1a' }, 'background');
  const searchContainerBorder = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'icon');

  // Recently viewed listings
  const {
    listings: recentlyViewed,
    isLoading: isLoadingRecent,
    clearRecentlyViewed,
    refresh: refreshRecentlyViewed
  } = useRecentlyViewed();

  // Reload recently viewed whenever this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshRecentlyViewed();
    }, [refreshRecentlyViewed])
  );

  const handleSearch = () => {
    if (searchQuery.trim()) {
      Keyboard.dismiss();
      router.push({
        pathname: '/search',
        params: { q: searchQuery.trim() }
      });
    }
  };

  const handleSearchBarFocus = () => {
    // Navigate to search page immediately on focus (optional - uncomment if you want this behavior)
    // router.push('/search');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <UserIcon />
          <Location />
        </View>

        <ThemedView style={[styles.searchContainer, { backgroundColor: searchContainerBg, borderColor: searchContainerBorder }]}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            onFocus={handleSearchBarFocus}
            placeholder="Search all listings..."
            showIcon={true}
            showClearButton={true}
            style={styles.searchBarContent}
          />
        </ThemedView>

        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Popular Categories</ThemedText>
        </ThemedView>

        <CategoriesList />

        {/* Recently Viewed Section - Below Categories */}
        <RecentlyViewedSection
          listings={recentlyViewed}
          isLoading={isLoadingRecent}
          onClear={clearRecentlyViewed}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    marginTop: 5,
    marginBottom: 25,
    marginLeft: 20,
    marginRight: 20,
    height: 50,
    borderWidth: 1,
    paddingHorizontal: 16,
    borderRadius: 30,
    justifyContent: 'center',
  },
  searchBarContent: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 16,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  imageButton: {
    padding: 10,
  },
  image: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});