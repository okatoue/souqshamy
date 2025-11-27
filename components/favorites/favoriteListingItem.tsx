import { BaseListingCard } from '@/components/ui/BaseListingCard';
import { COLORS, SPACING } from '@/constants/theme';
import { Listing } from '@/types/listing';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

// =============================================================================
// Types
// =============================================================================

interface FavoriteListingItemProps {
  item: Listing;
  onPress: (item: Listing) => void;
  onRemoveFavorite: (listingId: string) => void;
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
 */
export function FavoriteListingItem({
  item,
  onPress,
  onRemoveFavorite,
}: FavoriteListingItemProps) {
  return (
    <BaseListingCard
      listing={item}
      onPress={onPress}
      actionButtons={
        <RemoveButton onPress={() => onRemoveFavorite(item.id)} />
      }
    />
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
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
