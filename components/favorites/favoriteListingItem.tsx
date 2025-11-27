import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { ListingImage } from '@/components/ui/ListingImage';
import { ListingMeta } from '@/components/ui/ListingMeta';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatPrice } from '@/lib/formatters';
import { Listing } from '@/types/listing';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface FavoriteListingItemProps {
  item: Listing;
  onPress: (item: Listing) => void;
  onRemoveFavorite: (listingId: string) => void;
}

const IMAGE_SIZE = 80;

/**
 * Card component for displaying favorite listings with remove action.
 * Uses shared UI components for consistent styling.
 */
export function FavoriteListingItem({
  item,
  onPress,
  onRemoveFavorite,
}: FavoriteListingItemProps) {
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'text');

  return (
    <View style={[styles.cardContainer, { backgroundColor: cardBg, borderColor }]}>
      <Pressable
        onPress={() => onPress(item)}
        style={({ pressed }) => [
          styles.mainContent,
          pressed && styles.pressed,
        ]}
      >
        <ListingImage images={item.images} size={IMAGE_SIZE} />

        <View style={styles.details}>
          <CategoryBadge
            categoryId={item.category_id}
            subcategoryId={item.subcategory_id}
          />

          <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={[styles.price, { color: textColor }]}>
            {formatPrice(item.price, item.currency)}
          </Text>

          <ListingMeta
            location={item.location}
            createdAt={item.created_at}
            layout="inline"
          />
        </View>

        <View style={styles.chevron}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </View>
      </Pressable>

      <RemoveButton onPress={() => onRemoveFavorite(item.id)} />
    </View>
  );
}

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

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 15,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mainContent: {
    flexDirection: 'row',
    padding: SPACING.md,
  },
  pressed: {
    opacity: 0.7,
  },
  details: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  chevron: {
    justifyContent: 'center',
    paddingLeft: SPACING.sm,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
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
