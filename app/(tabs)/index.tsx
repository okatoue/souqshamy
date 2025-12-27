import { HomeErrorBoundary } from '@/components/home/HomeErrorBoundary';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoriesList } from '@/components/ui/CategoriesList';
import { Location } from '@/components/ui/location';
import { RecentlyViewedSection } from '@/components/ui/recentlyViewedSection';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { UserIcon } from '@/components/ui/userIcon';
import { SPACING } from '@/constants/theme';
import { useAutoLocationDetection } from '@/hooks/useAutoLocationDetection';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAppData } from '@/lib/app_data_context';
import { useRTL } from '@/lib/rtl_context';
import { rtlRow, rtlMarginStart } from '@/lib/rtlStyles';
import { useTranslation } from '@/localization';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Keyboard, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // i18n verification - temporary test code
  const { t } = useTranslation();
  const { isRTL } = useRTL();

  // Auto-detect location on first launch (when no saved preference exists)
  useAutoLocationDetection();

  const backgroundColor = useThemeColor({}, 'background');
  const searchContainerBg = useThemeColor({ light: '#f0f0f0', dark: '#1a1a1a' }, 'background');
  const searchContainerBorder = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'icon');
  const dividerColor = useThemeColor({}, 'border');
  const tintColor = useThemeColor({}, 'tint');

  // Consume pre-fetched data from global context
  const {
    recentlyViewed,
    recentlyViewedLoading: isLoadingRecent,
    clearRecentlyViewed,
    refreshRecentlyViewed
  } = useAppData();

  // Refresh when screen comes into focus (background refresh only)
  useFocusEffect(
    useCallback(() => {
      refreshRecentlyViewed();
    }, [refreshRecentlyViewed])
  );

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshRecentlyViewed();
    } finally {
      setRefreshing(false);
    }
  }, [refreshRecentlyViewed]);

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
    <HomeErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
        {/* Fixed Header Section - stays at top */}
        <ScreenHeader
          leftAction={<UserIcon />}
          rightAction={<Location />}
          showBorder={false}
        />

        {/* Scrollable Content Section */}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={tintColor}
              colors={[tintColor]} // Android
            />
          }
        >
          <ThemedView style={[styles.searchContainer, { backgroundColor: searchContainerBg, borderColor: searchContainerBorder }]}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              onFocus={handleSearchBarFocus}
              placeholder={t('home.searchPlaceholder')}
              showIcon={true}
              showClearButton={true}
              style={styles.searchBarContent}
            />
          </ThemedView>

          <ThemedView style={[styles.titleContainer, rtlRow(isRTL), rtlMarginStart(isRTL, SPACING.lg)]}>
            <ThemedText type="title">{t('home.categories')}</ThemedText>
          </ThemedView>

          <CategoriesList />

          <View style={[styles.headerDivider, { backgroundColor: dividerColor }]} />

          {/* Recently Viewed Section - Below Categories */}
          <RecentlyViewedSection
            listings={recentlyViewed}
            isLoading={isLoadingRecent}
            onClear={clearRecentlyViewed}
          />
        </ScrollView>
      </SafeAreaView>
    </HomeErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Ensures last items are not cut off by tab bar
  },
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  headerDivider: {
    height: 1,
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.lg,
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
});