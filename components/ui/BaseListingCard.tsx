import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { ListingImage } from '@/components/ui/ListingImage';
import { ListingMeta } from '@/components/ui/ListingMeta';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatPrice } from '@/lib/formatters';
import { Listing } from '@/types/listing';
import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// =============================================================================
// DESIGN TOKENS - Source of Truth for Visual Consistency
// =============================================================================

/** Fixed image dimensions for pixel-perfect alignment across screens */
export const CARD_IMAGE_SIZE = 80;

/** Typography standards */
const TITLE_FONT_SIZE = 16;
const PRICE_FONT_SIZE = 14;

// =============================================================================
// Types
// =============================================================================

interface BaseListingCardProps {
  /** The listing data object */
  listing: Listing;
  /** Handler called when the card is pressed */
  onPress: (listing: Listing) => void;
  /** Optional status badge (e.g., "Active", "Sold") - rendered in header */
  statusBadge?: ReactNode;
  /** Action buttons section (e.g., "Edit/Delete" or "Unfavorite") - rendered at bottom */
  actionButtons?: ReactNode;
  /** Whether to show the category badge. Defaults to true */
  showCategory?: boolean;
  /** Whether to show the chevron arrow. Defaults to true */
  showChevron?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Base card component for displaying listings with consistent visual layout.
 *
 * This component serves as the visual "skeleton" used by both the "My Listings"
 * and "Favorites" screens to ensure pixel-perfect alignment. It handles the
 * common layout (Image, Title, Price, Location) while allowing different screens
 * to inject their own status badges and action buttons.
 *
 * @example
 * // My Listings usage
 * <BaseListingCard
 *   listing={item}
 *   onPress={handlePress}
 *   statusBadge={<StatusBadge status="active" />}
 *   actionButtons={<MyListingActions onEdit={...} onDelete={...} />}
 * />
 *
 * @example
 * // Favorites usage
 * <BaseListingCard
 *   listing={item}
 *   onPress={handlePress}
 *   actionButtons={<RemoveFromFavorites onRemove={...} />}
 * />
 */
export function BaseListingCard({
  listing,
  onPress,
  statusBadge,
  actionButtons,
  showCategory = true,
  showChevron = true,
}: BaseListingCardProps) {
  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const cardBg = useThemeColor({}, 'cardBackground');
  const primaryColor = useThemeColor({}, 'primary');

  return (
    <View style={[styles.cardContainer, { backgroundColor: cardBg, borderColor }]}>
      {/* Main pressable content area */}
      <Pressable
        onPress={() => onPress(listing)}
        style={({ pressed }) => [
          styles.mainContent,
          pressed && styles.pressed,
        ]}
      >
        {/* Header with category and optional status badge */}
        {(showCategory || statusBadge) && (
          <View style={styles.header}>
            {showCategory && (
              <View style={styles.categoryContainer}>
                <CategoryBadge
                  categoryId={listing.category_id}
                  subcategoryId={listing.subcategory_id}
                />
              </View>
            )}
            {statusBadge && <View style={styles.statusBadgeContainer}>{statusBadge}</View>}
          </View>
        )}

        {/* Content row: Image + Details + Chevron */}
        <View style={styles.contentRow}>
          {/* Fixed-size image for alignment */}
          <ListingImage
            images={listing.images ?? undefined}
            size={CARD_IMAGE_SIZE}
          />

          {/* Listing details */}
          <View style={styles.details}>
            <Text
              style={[styles.title, { color: textColor }]}
              numberOfLines={2}
            >
              {listing.title}
            </Text>

            <Text style={[styles.price, { color: primaryColor }]}>
              {formatPrice(listing.price, listing.currency)}
            </Text>

            <ListingMeta
              location={listing.location}
              createdAt={listing.created_at}
              layout="inline"
            />
          </View>

          {/* Chevron indicator */}
          {showChevron && (
            <View style={styles.chevron}>
              <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
            </View>
          )}
        </View>
      </Pressable>

      {/* Action buttons section */}
      {actionButtons && (
        <View style={styles.actionButtonsContainer}>
          {actionButtons}
        </View>
      )}
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: SPACING.sm,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mainContent: {
    padding: SPACING.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  categoryContainer: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  statusBadgeContainer: {
    flexShrink: 0,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  details: {
    flex: 1,
    marginLeft: SPACING.sm,
    justifyContent: 'center',
  },
  title: {
    fontSize: TITLE_FONT_SIZE,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    lineHeight: TITLE_FONT_SIZE * 1.3,
  },
  price: {
    fontSize: PRICE_FONT_SIZE,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  chevron: {
    justifyContent: 'center',
    paddingLeft: SPACING.sm,
    alignSelf: 'center',
  },
  actionButtonsContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
  },
});
