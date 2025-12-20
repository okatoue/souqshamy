import { BaseListingCard } from '@/components/ui/BaseListingCard';
import { BRAND_COLOR, COLORS, SPACING, BORDER_RADIUS } from '@/constants/theme';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// =============================================================================
// Types
// =============================================================================

interface ListingItemProps {
  item: Listing;
  onPress: (item: Listing) => void;
  onUpdateStatus: (listing: Listing, newStatus: 'active' | 'sold') => void;
  onSoftDelete: (listingId: number) => void;
  onPermanentDelete: (listingId: number) => void;
}

// =============================================================================
// Status Badge Component
// =============================================================================

interface StatusBadgeProps {
  status: 'active' | 'sold' | 'inactive';
}

function StatusBadge({ status }: StatusBadgeProps) {
  let badgeColor = COLORS.statusActive;
  let statusText = 'Active';
  let showIcon = false;

  if (status === 'sold') {
    badgeColor = COLORS.statusSold;
    statusText = 'Sold';
  } else if (status === 'inactive') {
    badgeColor = COLORS.statusInactive;
    statusText = 'Removed';
    showIcon = true;
  }

  return (
    <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
      {showIcon && <MaterialIcons name="delete" size={12} color="white" />}
      <Text style={styles.statusText}>{statusText}</Text>
    </View>
  );
}

// =============================================================================
// Action Buttons Component
// =============================================================================

interface ActionButtonsProps {
  item: Listing;
  onUpdateStatus: (listing: Listing, newStatus: 'active' | 'sold') => void;
  onSoftDelete: (listingId: number) => void;
  onPermanentDelete: (listingId: number) => void;
}

function ActionButtons({
  item,
  onUpdateStatus,
  onSoftDelete,
  onPermanentDelete,
}: ActionButtonsProps) {
  const router = useRouter();

  const handleEdit = (e: any) => {
    e.stopPropagation();
    router.push(`/listing/edit/${item.id}`);
  };

  return (
    <View style={styles.actionButtons}>
      {/* ACTIVE LISTING BUTTONS */}
      {item.status === 'active' && (
        <>
          <Pressable
            style={[styles.actionButton, styles.editButton]}
            onPress={handleEdit}
          >
            <Ionicons name="pencil" size={18} color={BRAND_COLOR} />
            <Text style={[styles.actionButtonText, { color: BRAND_COLOR }]}>Edit</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.successButton]}
            onPress={(e) => {
              e.stopPropagation();
              onUpdateStatus(item, 'sold');
            }}
          >
            <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
            <Text style={[styles.actionButtonText, { color: COLORS.success }]}>Mark Sold</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.dangerButton]}
            onPress={(e) => {
              e.stopPropagation();
              onSoftDelete(item.id);
            }}
          >
            <MaterialIcons name="delete-outline" size={20} color={COLORS.error} />
            <Text style={[styles.actionButtonText, { color: COLORS.error }]}>Remove</Text>
          </Pressable>
        </>
      )}

      {/* SOLD LISTING BUTTONS */}
      {item.status === 'sold' && (
        <>
          <Pressable
            style={[styles.actionButton, styles.editButton]}
            onPress={handleEdit}
          >
            <Ionicons name="pencil" size={18} color={BRAND_COLOR} />
            <Text style={[styles.actionButtonText, { color: BRAND_COLOR }]}>Edit</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.successButton]}
            onPress={(e) => {
              e.stopPropagation();
              onUpdateStatus(item, 'active');
            }}
          >
            <MaterialCommunityIcons name="replay" size={20} color={COLORS.success} />
            <Text style={[styles.actionButtonText, { color: COLORS.success }]}>Reactivate</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.dangerButton]}
            onPress={(e) => {
              e.stopPropagation();
              onSoftDelete(item.id);
            }}
          >
            <MaterialIcons name="delete-outline" size={20} color={COLORS.error} />
            <Text style={[styles.actionButtonText, { color: COLORS.error }]}>Remove</Text>
          </Pressable>
        </>
      )}

      {/* REMOVED (INACTIVE) LISTING BUTTONS */}
      {item.status === 'inactive' && (
        <>
          <Pressable
            style={[styles.actionButton, styles.successButton]}
            onPress={(e) => {
              e.stopPropagation();
              onUpdateStatus(item, 'active');
            }}
          >
            <MaterialCommunityIcons name="replay" size={20} color={COLORS.success} />
            <Text style={[styles.actionButtonText, { color: COLORS.success }]}>Restore</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.dangerButton]}
            onPress={(e) => {
              e.stopPropagation();
              onPermanentDelete(item.id);
            }}
          >
            <MaterialIcons name="delete-forever" size={20} color={COLORS.error} />
            <Text style={[styles.actionButtonText, { color: COLORS.error }]}>Delete Forever</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Card component for displaying user's own listings with status and action buttons.
 * Uses the shared BaseListingCard for consistent visual layout.
 */
export function ListingItem({
  item,
  onPress,
  onUpdateStatus,
  onSoftDelete,
  onPermanentDelete,
}: ListingItemProps) {
  return (
    <BaseListingCard
      listing={item}
      onPress={onPress}
      statusBadge={<StatusBadge status={item.status} />}
      actionButtons={
        <ActionButtons
          item={item}
          onUpdateStatus={onUpdateStatus}
          onSoftDelete={onSoftDelete}
          onPermanentDelete={onPermanentDelete}
        />
      }
    />
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: 6,
    marginRight: SPACING.md,
  },
  editButton: {
    backgroundColor: 'rgba(31, 111, 235, 0.1)',
  },
  successButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  dangerButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  actionButtonText: {
    fontSize: 14,
    marginLeft: SPACING.xs,
  },
});
