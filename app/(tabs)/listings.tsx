import { useAuth } from '@/lib/auth_context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
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
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useUserListings } from '@/hooks/useUserListings';
import { Listing } from '@/types/listing';

export default function ListingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    listings,
    isLoading,
    isRefreshing,
    fetchUserListings,
    handleSoftDelete,
    handlePermanentDelete,
    handleUpdateStatus
  } = useUserListings();

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

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
    router.push(`/listing/${listing.id}`);
  };

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="package-variant" size={80} color="#666" />
      <ThemedText style={styles.emptyTitle}>No Listings Yet</ThemedText>
      <ThemedText style={styles.emptySubtext}>
        Your posted items will appear here
      </ThemedText>
      <Pressable
        style={styles.createButton}
        onPress={() => router.push('/(tabs)/post')}
      >
        <MaterialIcons name="add" size={20} color="white" />
        <Text style={styles.createButtonText}>Create Your First Listing</Text>
      </Pressable>
    </View>
  );

  // Loading state
  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={styles.loadingText}>Loading your listings...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // Not authenticated state
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="account-lock" size={80} color="#666" />
          <ThemedText style={styles.emptyTitle}>Sign In Required</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Please sign in to view your listings
          </ThemedText>
          <Pressable
            style={styles.createButton}
            onPress={() => router.push('/(auth)/sign-in')}
          >
            <Text style={styles.createButtonText}>Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ThemedView style={styles.header}>
        <View style={styles.headerTop}>
          <ThemedText type="title" style={styles.headerTitle}>My Listings</ThemedText>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/(tabs)/post')}
          >
            <MaterialIcons name="add" size={24} color="white" />
          </Pressable>
        </View>
        <Text style={[styles.listingCount, { color: textColor }]}>
          {listings.length} {listings.length === 1 ? 'item' : 'items'}
        </Text>
      </ThemedView>

      <FlatList
        data={listings}
        renderItem={({ item }) => (
          <ListingItem
            item={item}
            onPress={handleListingPress}
            onUpdateStatus={handleUpdateStatus}
            onSoftDelete={handleSoftDelete}
            onPermanentDelete={handlePermanentDelete}
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingCount: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.7,
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
    backgroundColor: '#007AFF',
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