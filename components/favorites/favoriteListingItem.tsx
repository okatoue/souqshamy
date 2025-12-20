import { BaseListingCard } from '@/components/ui/BaseListingCard';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

// =============================================================================
// Types
// =============================================================================

interface FavoriteListingItemProps {
  item: Listing;
  onPress: (item: Listing) => void;
  onRemoveFavorite: (listingId: string) => void;
}

// =============================================================================
// Status Badge Component
// =============================================================================

interface StatusBadgeProps {
  status: 'sold' | 'inactive';
}

function StatusBadge({ status }: StatusBadgeProps) {
  const isSold = status === 'sold';

  return (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: isSold ? COLORS.statusSold : COLORS.statusInactive },
      ]}
    >
      <MaterialIcons
        name={isSold ? 'check-circle' : 'remove-circle'}
        size={12}
        color="white"
      />
      <Text style={styles.statusText}>
        {isSold ? 'Sold' : 'Unavailable'}
      </Text>
    </View>
  );
}

// =============================================================================
// Remove Button Component
// =============================================================================

interface RemoveButtonProps {
  onPress: () => void;
}

function RemoveButton({ onPress }: RemoveButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.removeButton,
        pressed && styles.removeButtonPressed,
      ]}
      onPress={onPress}
      accessibilityLabel="Remove from favorites"
      accessibilityRole="button"
    >
      <Ionicons name="heart-dislike-outline" size={18} color={COLORS.favorite} />
      <Text style={styles.removeButtonText}>Remove</Text>
    </Pressable>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Card component for displaying favorite listings with remove action.
 * Uses the shared BaseListingCard for consistent visual layout with My Listings.
 *
 * Shows visual indicators for sold/inactive listings and prevents navigation
 * to unavailable listings.
 */
function FavoriteListingItemComponent({
  item,
  onPress,
  onRemoveFavorite,
}: FavoriteListingItemProps) {
  const isInactive = item.status !== 'active';

  const handlePress = (listing: Listing) => {
    if (isInactive) {
      Alert.alert(
        listing.status === 'sold' ? 'Item Sold' : 'Item Unavailable',
        'This listing is no longer available. Would you like to remove it from your favorites?',
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => onRemoveFavorite(String(listing.id)),
          },
        ]
      );
      return;
    }
    onPress(listing);
  };

  return (
    <View style={isInactive && styles.inactiveContainer}>
      <BaseListingCard
        listing={item}
        onPress={handlePress}
        statusBadge={
          isInactive ? <StatusBadge status={item.status as 'sold' | 'inactive'} /> : undefined
        }
        actionButtons={
          <RemoveButton onPress={() => onRemoveFavorite(String(item.id))} />
        }
      />
    </View>
  );
}

// Memoize to prevent unnecessary re-renders in FlatList
export const FavoriteListingItem = memo(FavoriteListingItemComponent);

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  inactiveContainer: {
    opacity: 0.6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.xs,
    gap: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  removeButtonPressed: {
    backgroundColor: COLORS.pressedOverlay,
  },
  removeButtonText: {
    fontSize: 14,
    color: COLORS.favorite,
    marginLeft: 6,
    fontWeight: '500',
  },
});
