import { FavoriteListingItem } from '@/components/favorites/favoriteListingItem';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { UserIcon } from '@/components/ui/userIcon';
import { BRAND_COLOR, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/lib/auth_context';
import { Listing } from '@/types/listing';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FavoritesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    favorites,
    isLoading,
    isRefreshing,
    fetchFavorites,
    removeFavorite,
  } = useFavorites();

  const backgroundColor = useThemeColor({}, 'background');

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
    router.push(`/listing/${listing.id}`);
  }, [router]);

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

  const keyExtractor = useCallback((item: Listing) => item.id, []);

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <LoadingState />
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
      />
    </SafeAreaView>
  );
}

function LoadingState() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={BRAND_COLOR} />
      <ThemedText style={styles.loadingText}>Loading favorites...</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  emptyListContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    opacity: 0.7,
  },
});
