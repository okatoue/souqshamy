import { useAuth } from '@/lib/auth_context';
import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import categoriesData from '@/assets/categories.json';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ListingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'text');

  // Fetch user's listings
  const fetchUserListings = async (refresh = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);

      // Fetch all listings for the user
      // You can add .neq('status', 'sold') to hide "removed" items
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Optional: Filter out listings that were "removed" (marked as sold via the remove button)
      // You could add a metadata field to distinguish between actually sold and removed
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      Alert.alert('Error', 'Failed to load your listings');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load listings on mount and when user changes
  useEffect(() => {
    fetchUserListings();
  }, [user]);

  // Handle refresh
  const onRefresh = () => {
    fetchUserListings(true);
  };

  // Mark listing as inactive (soft delete) - WITH FALLBACK
  const handleDeleteListing = async (listingId: number) => {
    Alert.alert(
      'Remove Listing',
      'This will remove the listing from your active items.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // First attempt: Try to set status to 'inactive'
              const { error: inactiveError } = await supabase
                .from('listings')
                .update({
                  status: 'inactive',
                  updated_at: new Date().toISOString()
                })
                .eq('id', listingId)
                .eq('user_id', user?.id);

              if (inactiveError) {
                console.log('Inactive status failed, trying sold status...');

                // Fallback: Try to set status to 'sold' instead
                const { error: soldError } = await supabase
                  .from('listings')
                  .update({
                    status: 'sold',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', listingId)
                  .eq('user_id', user?.id);

                if (soldError) {
                  // If both fail, show error
                  throw soldError;
                }

                // Successfully marked as sold, remove from view
                setListings(prev => prev.filter(l => l.id !== listingId));
                Alert.alert('Success', 'Listing has been removed');
              } else {
                // Successfully marked as inactive
                setListings(prev => prev.filter(l => l.id !== listingId));
                Alert.alert('Success', 'Listing has been removed');
              }
            } catch (error) {
              console.error('Remove error:', error);

              // Last resort: Just remove from local state
              Alert.alert(
                'Notice',
                'Unable to update listing status in database, but hiding it from your view.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setListings(prev => prev.filter(l => l.id !== listingId));
                    }
                  }
                ]
              );
            }
          }
        }
      ]
    );
  };

  // Toggle listing status (active/sold only due to RLS restrictions)
  const handleToggleStatus = async (listing: Listing) => {
    // Simple toggle between active and sold
    const newStatus = listing.status === 'active' ? 'sold' : 'active';

    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: newStatus })
        .eq('id', listing.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Update local state
      setListings(prev =>
        prev.map(l =>
          l.id === listing.id ? { ...l, status: newStatus } : l
        )
      );

      Alert.alert(
        'Success',
        newStatus === 'active' ? 'Listing reactivated' : 'Listing marked as sold'
      );
    } catch (error) {
      console.error('Status update error:', error);
      Alert.alert('Error', 'Failed to update listing status');
    }
  };

  // Get category info
  const getCategoryInfo = (categoryId: number, subcategoryId: number) => {
    const category = categoriesData.categories.find(c => parseInt(c.id) === categoryId);
    const subcategory = category?.subcategories.find(s => parseInt(s.id) === subcategoryId);
    return {
      categoryName: category?.name || 'Unknown',
      categoryIcon: category?.icon || '📦',
      subcategoryName: subcategory?.name || 'Unknown'
    };
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  // Render listing item
  const renderListingItem = ({ item }: { item: Listing }) => {
    const { categoryName, categoryIcon, subcategoryName } = getCategoryInfo(
      item.category_id,
      item.subcategory_id
    );

    return (
      <View style={[styles.listingCard, { borderColor }]}>
        <View style={styles.listingHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryIcon}>{categoryIcon}</Text>
            <Text style={[styles.categoryText, { color: textColor }]} numberOfLines={1}>
              {categoryName} › {subcategoryName}
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.status === 'active' ? '#4CAF50' : '#FF9800' }
          ]}>
            <Text style={styles.statusText}>
              {item.status === 'active' ? 'Active' : 'Sold'}
            </Text>
          </View>
        </View>

        <View style={styles.listingContent}>
          {item.images && item.images.length > 0 ? (
            <Image source={{ uri: item.images[0] }} style={styles.listingImage} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: borderColor }]}>
              <MaterialIcons name="image" size={30} color="#666" />
            </View>
          )}

          <View style={styles.listingDetails}>
            <Text style={[styles.listingTitle, { color: textColor }]} numberOfLines={2}>
              {item.title}
            </Text>

            <Text style={[styles.listingPrice, { color: textColor }]}>
              {item.currency === 'SYP' ? 'SYP ' : '$'}
              {item.price.toLocaleString()}
            </Text>

            <View style={styles.listingMeta}>
              <Ionicons name="location-outline" size={14} color="#888" />
              <Text style={styles.locationText}>{item.location}</Text>
              <Text style={styles.dateText}>• {formatDate(item.created_at)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleToggleStatus(item)}
          >
            <MaterialCommunityIcons
              name={item.status === 'active' ? 'check-circle' : 'restore'}
              size={20}
              color="#4CAF50"
            />
            <Text style={styles.actionButtonText}>
              {item.status === 'active' ? 'Mark Sold' : 'Reactivate'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteListing(item.id)}
          >
            <MaterialIcons name="remove-circle-outline" size={20} color="#f44336" />
            <Text style={[styles.actionButtonText, { color: '#f44336' }]}>
              Remove
            </Text>
          </Pressable>
        </View>
      </View>
    );
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
        <ThemedText type="title" style={styles.headerTitle}>My Listings</ThemedText>
        <Text style={[styles.listingCount, { color: textColor }]}>
          {listings.length} {listings.length === 1 ? 'item' : 'items'}
        </Text>
      </ThemedView>

      <FlatList
        data={listings}
        renderItem={renderListingItem}
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
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
  listingCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 12,
    opacity: 0.7,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  listingContent: {
    flexDirection: 'row',
  },
  listingImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingDetails: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  listingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  editButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  deleteButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  actionButtonText: {
    fontSize: 14,
    marginLeft: 4,
    color: '#4CAF50',
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