import { FavoriteListingItem } from '@/components/favorites/favoriteListingItem';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/EmptyState';
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
  Text,
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
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <Header count={favorites.length} textColor={textColor} borderColor={borderColor} />
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

interface HeaderProps {
  count: number;
  textColor: string;
  borderColor: string;
}

function Header({ count, textColor, borderColor }: HeaderProps) {
  const itemLabel = count === 1 ? 'item' : 'items';

  return (
    <View style={[styles.header, { borderBottomColor: borderColor }]}>
      <View style={styles.headerLeft}>
        <ThemedText type="title" style={styles.headerTitle}>
          Favorites
        </ThemedText>
        <Text style={[styles.countText, { color: textColor }]}>
          {count} {itemLabel}
        </Text>
      </View>
      <UserIcon />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    marginBottom: SPACING.xs,
  },
  countText: {
    fontSize: 14,
    opacity: 0.7,
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
