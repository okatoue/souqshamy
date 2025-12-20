import { useAuth } from '@/lib/auth_context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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
import { BRAND_COLOR, SPACING, BORDER_RADIUS } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAppData } from '@/lib/app_data_context';
import { navigateToListing } from '@/app/listing/[id]';
import { Listing } from '@/types/listing';

// =============================================================================
// Types
// =============================================================================

type StatusFilter = 'all' | 'active' | 'sold' | 'inactive';

// =============================================================================
// Filter Tab Component
// =============================================================================

interface FilterTabProps {
  label: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
}

function FilterTab({ label, count, isActive, onPress }: FilterTabProps) {
  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterTab,
        isActive && [styles.filterTabActive, { borderBottomColor: primaryColor }],
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${label}, ${count} items`}
    >
      <Text
        style={[
          styles.filterTabText,
          { color: isActive ? primaryColor : mutedColor },
        ]}
      >
        {label}
      </Text>
      {count > 0 && (
        <View
          style={[
            styles.filterBadge,
            { backgroundColor: isActive ? primaryColor : mutedColor },
          ]}
        >
          <Text style={styles.filterBadgeText}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

// =============================================================================
// Empty State Component
// =============================================================================

interface EmptyStateProps {
  statusFilter: StatusFilter;
  totalCount: number;
  onCreatePress: () => void;
}

function EmptyState({ statusFilter, totalCount, onCreatePress }: EmptyStateProps) {
  const iconMutedColor = useThemeColor({}, 'iconMuted');
  const mutedColor = useThemeColor({}, 'textMuted');

  // No listings at all
  if (totalCount === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="package-variant" size={80} color={iconMutedColor} />
        <ThemedText style={styles.emptyTitle}>No Listings Yet</ThemedText>
        <ThemedText style={styles.emptySubtext}>
          Start selling by posting your first listing
        </ThemedText>
        <Pressable
          style={[styles.createButton, { backgroundColor: BRAND_COLOR }]}
          onPress={onCreatePress}
        >
          <MaterialIcons name="add" size={20} color="white" />
          <Text style={styles.createButtonText}>Create Your First Listing</Text>
        </Pressable>
      </View>
    );
  }

  // Has listings but none in this filter
  const messages: Record<StatusFilter, string> = {
    all: "You don't have any listings",
    active: "You don't have any active listings",
    sold: "You haven't sold any items yet",
    inactive: "You don't have any hidden listings",
  };

  const icons: Record<StatusFilter, any> = {
    all: 'package-variant',
    active: 'shopping',
    sold: 'tag-check',
    inactive: 'eye-off',
  };

  return (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name={icons[statusFilter]}
        size={60}
        color={iconMutedColor}
      />
      <ThemedText style={[styles.emptySubtext, { marginTop: SPACING.md, color: mutedColor }]}>
        {messages[statusFilter]}
      </ThemedText>
    </View>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function ListingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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
  const borderColor = useThemeColor({}, 'border');
  const iconMutedColor = useThemeColor({}, 'iconMuted');

  // Filter listings based on selected status
  const filteredListings = useMemo(() => {
    if (statusFilter === 'all') return listings;
    return listings.filter(l => l.status === statusFilter);
  }, [listings, statusFilter]);

  // Count by status for badges
  const statusCounts = useMemo(() => ({
    all: listings.length,
    active: listings.filter(l => l.status === 'active').length,
    sold: listings.filter(l => l.status === 'sold').length,
    inactive: listings.filter(l => l.status === 'inactive').length,
  }), [listings]);

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

  // Handle create listing
  const handleCreateListing = () => {
    router.push('/(tabs)/post');
  };

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
      onPress={handleCreateListing}
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

      {/* Status Filter Tabs */}
      <View style={[styles.filterContainer, { borderBottomColor: borderColor }]}>
        <FilterTab
          label="All"
          count={statusCounts.all}
          isActive={statusFilter === 'all'}
          onPress={() => setStatusFilter('all')}
        />
        <FilterTab
          label="Active"
          count={statusCounts.active}
          isActive={statusFilter === 'active'}
          onPress={() => setStatusFilter('active')}
        />
        <FilterTab
          label="Sold"
          count={statusCounts.sold}
          isActive={statusFilter === 'sold'}
          onPress={() => setStatusFilter('sold')}
        />
        <FilterTab
          label="Hidden"
          count={statusCounts.inactive}
          isActive={statusFilter === 'inactive'}
          onPress={() => setStatusFilter('inactive')}
        />
      </View>

      <FlatList
        data={filteredListings}
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
        contentContainerStyle={filteredListings.length === 0 ? styles.emptyListContent : styles.listContent}
        ListEmptyComponent={
          <EmptyState
            statusFilter={statusFilter}
            totalCount={listings.length}
            onCreatePress={handleCreateListing}
          />
        }
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={8}
        windowSize={10}
        initialNumToRender={6}
      />
    </SafeAreaView>
  );
}

// =============================================================================
// Styles
// =============================================================================

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

  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.xs,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 4,
  },
  filterTabActive: {
    borderBottomWidth: 2,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
    padding: 16,
  },

  // Empty State
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
