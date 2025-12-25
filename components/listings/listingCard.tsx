import { FavoriteButton } from '@/components/favorites/favoriteButton';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { ListingImage } from '@/components/ui/ListingImage';
import { ListingMeta } from '@/components/ui/ListingMeta';
import { BORDER_RADIUS, BRAND_COLOR, COLORS, SHADOWS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatPrice } from '@/lib/formatters';
import { Listing } from '@/types/listing';
import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ListingCardProps {
  item: Listing;
  onPress: (item: Listing) => void;
}

const IMAGE_SIZE = 100;

/**
 * Card component for displaying a listing in list views.
 * Uses shared UI components for consistent styling.
 * Memoized for FlatList performance optimization.
 */
export const ListingCard = memo(function ListingCard({ item, onPress }: ListingCardProps) {
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'text');

  return (
    <View style={[styles.cardContainer, SHADOWS.card, { backgroundColor: cardBg, borderColor }]}>
      <Pressable
        style={({ pressed }) => [
          styles.cardContent,
          pressed && styles.cardPressed,
        ]}
        onPress={() => onPress(item)}
      >
        {/* Image Container with Favorite Button */}
        <View style={styles.imageContainer}>
          <ListingImage images={item.images} size={IMAGE_SIZE} />
          <FavoriteButton
            listingId={item.id}
            sellerId={item.user_id}
            size={22}
            variant="overlay"
            style={styles.favoriteButton}
          />
        </View>

        {/* Details */}
        <View style={styles.details}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.price}>
            {formatPrice(item.price, item.currency)}
          </Text>

          <CategoryBadge
            categoryId={item.category_id}
            subcategoryId={item.subcategory_id}
          />

          <ListingMeta
            location={item.location}
            createdAt={item.created_at}
            layout="stacked"
          />
        </View>

        {/* Arrow */}
        <View style={styles.arrow}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </View>
      </Pressable>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.title === nextProps.item.title &&
    prevProps.item.price === nextProps.item.price &&
    prevProps.item.updated_at === nextProps.item.updated_at &&
    prevProps.item.status === nextProps.item.status
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: SPACING.md,
  },
  cardPressed: {
    opacity: 0.7,
  },
  imageContainer: {
    position: 'relative',
  },
  favoriteButton: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
  },
  details: {
    flex: 1,
    marginLeft: SPACING.md,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLOR,
    marginBottom: SPACING.xs,
  },
  arrow: {
    justifyContent: 'center',
    paddingLeft: SPACING.sm,
  },
});
