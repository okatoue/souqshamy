import { FavoriteListingItem } from '@/components/favorites/favoriteListingItem';
import { CARD_IMAGE_SIZE } from '@/components/ui/BaseListingCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { UserIcon } from '@/components/ui/userIcon';
import { BORDER_RADIUS, BRAND_COLOR, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/lib/auth_context';
import { navigateToListing } from '@/app/listing/[id]';
import { Listing } from '@/types/listing';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Approximate height of FavoriteListingItem for getItemLayout optimization
const ITEM_HEIGHT = 140;

export default function FavoritesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    favorites,
    favoriteIds,
    isLoading,
    isRefreshing,
    fetchFavorites,
    removeFavorite,
  } = useFavorites();

  const backgroundColor = useThemeColor({}, 'background');
  const skeletonBg = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'background');

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchFavorites(false);
      }
    }, [user, fetchFavorites])
  );

  const handleRefresh = useCallback(() => {
    fetchFavorites(true);
  }, [fetchFavorites]);

  const handleListingPress = useCallback((listing: Listing) => {
    navigateToListing(listing);
  }, []);

  const handleRemoveFavorite = useCallback((listingId: string) => {
    removeFavorite(listingId);
  }, [removeFavorite]);

  const renderItem = useCallback(({ item }: { item: Listing }) => (
    <FavoriteListingItem
      item={item}
      onPress={handleListingPress}
      onRemoveFavorite={handleRemoveFavorite}
    />
  ), [handleListingPress, handleRemoveFavorite]);

  const keyExtractor = useCallback((item: Listing) => String(item.id), []);

  // Optimization: Calculate item layout for faster scrolling
  const getItemLayout = useCallback(
    (_: ArrayLike<Listing> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
        <ScreenHeader
          title="Favorites"
          rightAction={<UserIcon />}
        />
        <FavoritesSkeleton skeletonBg={skeletonBg} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <EmptyState
          icon="account-heart-outline"
          title="Sign In Required"
          subtitle="Please sign in to save and view your favorites"
          action={{
            label: 'Sign In',
            onPress: () => router.push('/(auth)'),
          }}
        />
      </SafeAreaView>
    );
  }

  const itemLabel = favorites.length === 1 ? 'item' : 'items';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <ScreenHeader
        title="Favorites"
        subtitle={`${favorites.length} ${itemLabel}`}
        rightAction={<UserIcon />}
      />
      <FlatList
        data={favorites}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          favorites.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="No Favorites Yet"
            subtitle="Listings you save will appear here"
            action={{
              label: 'Browse Listings',
              icon: 'search',
              onPress: () => router.push('/(tabs)'),
            }}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={BRAND_COLOR}
          />
        }
        showsVerticalScrollIndicator={false}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={8}
        getItemLayout={getItemLayout}
        // Re-render when favorites change
        extraData={favoriteIds}
      />
    </SafeAreaView>
  );
}

/**
 * Skeleton loading component for smoother loading experience.
 */
function FavoritesSkeleton({ skeletonBg }: { skeletonBg: string }) {
  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={[styles.skeletonImage, { backgroundColor: skeletonBg }]} />
          <View style={styles.skeletonContent}>
            <View style={[styles.skeletonTitle, { backgroundColor: skeletonBg }]} />
            <View style={[styles.skeletonPrice, { backgroundColor: skeletonBg }]} />
            <View style={[styles.skeletonMeta, { backgroundColor: skeletonBg }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
  },
  // Skeleton styles
  skeletonContainer: {
    padding: SPACING.lg,
  },
  skeletonCard: {
    flexDirection: 'row',
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  skeletonImage: {
    width: CARD_IMAGE_SIZE,
    height: CARD_IMAGE_SIZE,
    borderRadius: BORDER_RADIUS.md,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: SPACING.sm,
    justifyContent: 'center',
  },
  skeletonTitle: {
    height: 16,
    width: '70%',
    borderRadius: 4,
    marginBottom: SPACING.sm,
  },
  skeletonPrice: {
    height: 14,
    width: '40%',
    borderRadius: 4,
    marginBottom: SPACING.sm,
  },
  skeletonMeta: {
    height: 12,
    width: '50%',
    borderRadius: 4,
  },
});
