import { BaseListingCard } from '@/components/ui/BaseListingCard';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        {isSold ? t('listings.statusSold') : t('listings.statusUnavailable')}
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
  const { t } = useTranslation();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.removeButton,
        pressed && styles.removeButtonPressed,
      ]}
      onPress={onPress}
      accessibilityLabel={t('favorites.removeFavorite')}
      accessibilityRole="button"
    >
      <Ionicons name="heart-dislike-outline" size={18} color={COLORS.favorite} />
      <Text style={styles.removeButtonText}>{t('favorites.removeFavorite')}</Text>
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
  const { t } = useTranslation();
  const isInactive = item.status !== 'active';

  const handlePress = (listing: Listing) => {
    if (isInactive) {
      Alert.alert(
        listing.status === 'sold' ? t('favorites.itemSold') : t('favorites.itemUnavailable'),
        t('favorites.removeUnavailableMessage'),
        [
          { text: t('common.keep'), style: 'cancel' },
          {
            text: t('common.remove'),
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
