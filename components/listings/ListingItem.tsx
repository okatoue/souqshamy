import { BaseListingCard } from '@/components/ui/BaseListingCard';
import { BRAND_COLOR, COLORS, SPACING, BORDER_RADIUS } from '@/constants/theme';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

// =============================================================================
// Types
// =============================================================================

interface ListingItemProps {
  item: Listing;
  onPress: (item: Listing) => void;
  // Refactored: These now return Promise<boolean> for success/failure
  onUpdateStatus: (listingId: number, newStatus: 'active' | 'sold') => Promise<boolean>;
  onSoftDelete: (listingId: number) => Promise<boolean>;
  onPermanentDelete: (listingId: number) => Promise<boolean>;
  onRestore: (listingId: number) => Promise<boolean>;
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
  let iconName: 'checkmark-circle' | 'pricetag' | 'eye-off' = 'checkmark-circle';

  if (status === 'sold') {
    badgeColor = COLORS.statusSold;
    statusText = 'Sold';
    iconName = 'pricetag';
  } else if (status === 'inactive') {
    badgeColor = COLORS.statusInactive;
    statusText = 'Hidden';
    iconName = 'eye-off';
  }

  return (
    <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
      <Ionicons name={iconName} size={12} color="white" />
      <Text style={styles.statusText}>{statusText}</Text>
    </View>
  );
}

// =============================================================================
// Action Buttons Component
// =============================================================================

interface ActionButtonsProps {
  item: Listing;
  isUpdating: boolean;
  onUpdateStatus: (listingId: number, newStatus: 'active' | 'sold') => Promise<boolean>;
  onSoftDelete: (listingId: number) => Promise<boolean>;
  onPermanentDelete: (listingId: number) => Promise<boolean>;
  onRestore: (listingId: number) => Promise<boolean>;
  setIsUpdating: (updating: boolean) => void;
}

function ActionButtons({
  item,
  isUpdating,
  onUpdateStatus,
  onSoftDelete,
  onPermanentDelete,
  onRestore,
  setIsUpdating,
}: ActionButtonsProps) {
  const router = useRouter();

  const handleEdit = (e: any) => {
    e.stopPropagation();
    if (!isUpdating) {
      router.push(`/listing/edit/${item.id}`);
    }
  };

  // Mark as sold - no confirmation needed
  const handleMarkSold = async (e: any) => {
    e.stopPropagation();
    if (isUpdating) return;

    setIsUpdating(true);
    const success = await onUpdateStatus(item.id, 'sold');
    setIsUpdating(false);

    if (!success) {
      Alert.alert('Error', 'Failed to mark listing as sold. Please try again.');
    }
  };

  // Reactivate - no confirmation needed
  const handleReactivate = async (e: any) => {
    e.stopPropagation();
    if (isUpdating) return;

    setIsUpdating(true);
    const success = await onUpdateStatus(item.id, 'active');
    setIsUpdating(false);

    if (!success) {
      Alert.alert('Error', 'Failed to reactivate listing. Please try again.');
    }
  };

  // Soft delete - with confirmation
  const handleRemove = (e: any) => {
    e.stopPropagation();
    if (isUpdating) return;

    Alert.alert(
      'Remove Listing',
      'This will hide the listing from buyers. You can restore it later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setIsUpdating(true);
            const success = await onSoftDelete(item.id);
            setIsUpdating(false);

            if (!success) {
              Alert.alert('Error', 'Failed to remove listing. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Restore - no confirmation needed
  const handleRestore = async (e: any) => {
    e.stopPropagation();
    if (isUpdating) return;

    setIsUpdating(true);
    const success = await onRestore(item.id);
    setIsUpdating(false);

    if (!success) {
      Alert.alert('Error', 'Failed to restore listing. Please try again.');
    }
  };

  // Permanent delete - with confirmation
  const handlePermanentDelete = (e: any) => {
    e.stopPropagation();
    if (isUpdating) return;

    Alert.alert(
      'Delete Forever',
      'This will permanently delete this listing and all its images. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            setIsUpdating(true);
            const success = await onPermanentDelete(item.id);
            setIsUpdating(false);

            if (!success) {
              Alert.alert('Error', 'Failed to delete listing. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.actionButtons}>
      {/* ACTIVE LISTING BUTTONS */}
      {item.status === 'active' && (
        <>
          <Pressable
            style={[styles.actionButton, styles.editButton, isUpdating && styles.actionButtonDisabled]}
            onPress={handleEdit}
            disabled={isUpdating}
          >
            <Ionicons name="pencil" size={18} color={isUpdating ? '#999' : BRAND_COLOR} />
            <Text style={[styles.actionButtonText, { color: isUpdating ? '#999' : BRAND_COLOR }]}>Edit</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.successButton, isUpdating && styles.actionButtonDisabled]}
            onPress={handleMarkSold}
            disabled={isUpdating}
          >
            <MaterialCommunityIcons name="check-circle" size={20} color={isUpdating ? '#999' : COLORS.success} />
            <Text style={[styles.actionButtonText, { color: isUpdating ? '#999' : COLORS.success }]}>Mark Sold</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.dangerButton, isUpdating && styles.actionButtonDisabled]}
            onPress={handleRemove}
            disabled={isUpdating}
          >
            <MaterialIcons name="delete-outline" size={20} color={isUpdating ? '#999' : COLORS.error} />
            <Text style={[styles.actionButtonText, { color: isUpdating ? '#999' : COLORS.error }]}>Remove</Text>
          </Pressable>
        </>
      )}

      {/* SOLD LISTING BUTTONS */}
      {item.status === 'sold' && (
        <>
          <Pressable
            style={[styles.actionButton, styles.editButton, isUpdating && styles.actionButtonDisabled]}
            onPress={handleEdit}
            disabled={isUpdating}
          >
            <Ionicons name="pencil" size={18} color={isUpdating ? '#999' : BRAND_COLOR} />
            <Text style={[styles.actionButtonText, { color: isUpdating ? '#999' : BRAND_COLOR }]}>Edit</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.successButton, isUpdating && styles.actionButtonDisabled]}
            onPress={handleReactivate}
            disabled={isUpdating}
          >
            <MaterialCommunityIcons name="replay" size={20} color={isUpdating ? '#999' : COLORS.success} />
            <Text style={[styles.actionButtonText, { color: isUpdating ? '#999' : COLORS.success }]}>Reactivate</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.dangerButton, isUpdating && styles.actionButtonDisabled]}
            onPress={handleRemove}
            disabled={isUpdating}
          >
            <MaterialIcons name="delete-outline" size={20} color={isUpdating ? '#999' : COLORS.error} />
            <Text style={[styles.actionButtonText, { color: isUpdating ? '#999' : COLORS.error }]}>Remove</Text>
          </Pressable>
        </>
      )}

      {/* REMOVED (INACTIVE) LISTING BUTTONS */}
      {item.status === 'inactive' && (
        <>
          <Pressable
            style={[styles.actionButton, styles.successButton, isUpdating && styles.actionButtonDisabled]}
            onPress={handleRestore}
            disabled={isUpdating}
          >
            <MaterialCommunityIcons name="replay" size={20} color={isUpdating ? '#999' : COLORS.success} />
            <Text style={[styles.actionButtonText, { color: isUpdating ? '#999' : COLORS.success }]}>Restore</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.dangerButton, isUpdating && styles.actionButtonDisabled]}
            onPress={handlePermanentDelete}
            disabled={isUpdating}
          >
            <MaterialIcons name="delete-forever" size={20} color={isUpdating ? '#999' : COLORS.error} />
            <Text style={[styles.actionButtonText, { color: isUpdating ? '#999' : COLORS.error }]}>Delete Forever</Text>
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
 *
 * Handles:
 * - Status display (Active, Sold, Hidden)
 * - Action buttons based on status
 * - Loading state during actions
 * - Confirmation dialogs for destructive actions
 * - Error alerts on failure
 */
export function ListingItem({
  item,
  onPress,
  onUpdateStatus,
  onSoftDelete,
  onPermanentDelete,
  onRestore,
}: ListingItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  return (
    <View style={[styles.container, isUpdating && styles.containerUpdating]}>
      {/* Loading overlay */}
      {isUpdating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={BRAND_COLOR} size="small" />
        </View>
      )}

      <BaseListingCard
        listing={item}
        onPress={() => !isUpdating && onPress(item)}
        statusBadge={<StatusBadge status={item.status} />}
        actionButtons={
          <ActionButtons
            item={item}
            isUpdating={isUpdating}
            onUpdateStatus={onUpdateStatus}
            onSoftDelete={onSoftDelete}
            onPermanentDelete={onPermanentDelete}
            onRestore={onRestore}
            setIsUpdating={setIsUpdating}
          />
        }
      />
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  // Container
  container: {
    position: 'relative',
  },
  containerUpdating: {
    opacity: 0.7,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: BORDER_RADIUS.md,
  },

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
  actionButtonDisabled: {
    opacity: 0.5,
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
