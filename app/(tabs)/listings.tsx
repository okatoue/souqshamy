import { useAuth } from '@/lib/auth_context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListingItem } from '@/components/listings/ListingItem';
import { ThemedText } from '@/components/themed-text';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BRAND_COLOR, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAppData } from '@/lib/app_data_context';
import { navigateToListing } from '@/app/listing/[id]';
import { Listing } from '@/types/listing';

export default function ListingsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // Consume pre-fetched data from global context
  const {
    userListings: listings,
    userListingsRefreshing: isRefreshing,
    fetchUserListings,
    softDeleteListing,
    permanentDeleteListing,
    updateListingStatus,
    restoreListing,
  } = useAppData();

  const backgroundColor = useThemeColor({}, 'background');
  const iconMutedColor = useThemeColor({}, 'iconMuted');

  // Refresh when screen comes into focus (background refresh only)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchUserListings(false);
      }
    }, [user, fetchUserListings])
  );

  // Handle refresh
  const onRefresh = () => {
    fetchUserListings(true);
  };

  // Handle navigation to detail page
  const handleListingPress = (listing: Listing) => {
    navigateToListing(listing);
  };

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="package-variant" size={80} color={iconMutedColor} />
      <ThemedText style={styles.emptyTitle}>No Listings Yet</ThemedText>
      <ThemedText style={styles.emptySubtext}>
        Your posted items will appear here
      </ThemedText>
      <Pressable
        style={[styles.createButton, { backgroundColor: BRAND_COLOR }]}
        onPress={() => router.push('/(tabs)/post')}
      >
        <MaterialIcons name="add" size={20} color="white" />
        <Text style={styles.createButtonText}>Create Your First Listing</Text>
      </Pressable>
    </View>
  );

  // Not authenticated state
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="account-lock" size={80} color={iconMutedColor} />
          <ThemedText style={styles.emptyTitle}>Sign In Required</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Please sign in to view your listings
          </ThemedText>
          <Pressable
            style={[styles.createButton, { backgroundColor: BRAND_COLOR }]}
            onPress={() => router.push('/(auth)')}
          >
            <Text style={styles.createButtonText}>Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const itemLabel = listings.length === 1 ? 'item' : 'items';

  const AddButton = (
    <Pressable
      style={[styles.addButton, { backgroundColor: BRAND_COLOR }]}
      onPress={() => router.push('/(tabs)/post')}
    >
      <MaterialIcons name="add" size={24} color="white" />
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <ScreenHeader
        title="My Listings"
        subtitle={`${listings.length} ${itemLabel}`}
        rightAction={AddButton}
      />

      <FlatList
        data={listings}
        renderItem={({ item }) => (
          <ListingItem
            item={item}
            onPress={handleListingPress}
            onUpdateStatus={updateListingStatus}
            onSoftDelete={softDeleteListing}
            onPermanentDelete={permanentDeleteListing}
            onRestore={restoreListing}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
});