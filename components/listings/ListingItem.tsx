import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatDate, formatPrice, getCategoryInfo } from '@/lib/formatters';
import { getThumbnailUrl } from '@/lib/imageUtils';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface ListingItemProps {
    item: Listing;
    onPress: (item: Listing) => void;
    onUpdateStatus: (listing: Listing, newStatus: 'active' | 'sold') => void;
    onSoftDelete: (listingId: number) => void;
    onPermanentDelete: (listingId: number) => void;
}

export function ListingItem({
    item,
    onPress,
    onUpdateStatus,
    onSoftDelete,
    onPermanentDelete
}: ListingItemProps) {
    // Theme colors
    const textColor = useThemeColor({}, 'text');
    const borderColor = useThemeColor({}, 'border');
    const cardBg = useThemeColor({}, 'cardBackground');
    const placeholderBg = useThemeColor({}, 'placeholder');
    const placeholderIconColor = useThemeColor({}, 'placeholderIcon');
    const mutedColor = useThemeColor({}, 'textMuted');

    const { categoryName, categoryIcon, subcategoryName } = getCategoryInfo(
        item.category_id,
        item.subcategory_id
    );

    // Determine badge style based on status using semantic colors
    let badgeColor = COLORS.statusActive;
    let statusText = 'Active';
    let showRemovedIcon = false;

    if (item.status === 'sold') {
        badgeColor = COLORS.statusSold;
        statusText = 'Sold';
    } else if (item.status === 'inactive') {
        badgeColor = COLORS.statusInactive;
        statusText = 'Removed';
        showRemovedIcon = true;
    }

    return (
        <Pressable
            onPress={() => onPress(item)}
            style={({ pressed }) => [
                styles.listingCard,
                { borderColor, backgroundColor: cardBg },
                pressed && styles.listingCardPressed
            ]}
        >
            {/* Clickable content area */}
            <View style={styles.mainContent}>
                <View style={styles.listingHeader}>
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryIcon}>{categoryIcon}</Text>
                        <Text style={[styles.categoryText, { color: textColor }]} numberOfLines={1}>
                            {categoryName} › {subcategoryName}
                        </Text>
                    </View>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: badgeColor, flexDirection: 'row', alignItems: 'center', gap: 4 }
                    ]}>
                        {showRemovedIcon && <MaterialIcons name="delete" size={12} color="white" />}
                        <Text style={styles.statusText}>
                            {statusText}
                        </Text>
                    </View>
                </View>

                <View style={styles.listingContent}>
                    {item.images && item.images.length > 0 ? (
                        <Image source={{ uri: getThumbnailUrl(item.images[0]) }} style={styles.listingImage} />
                    ) : (
                        <View style={[styles.imagePlaceholder, { backgroundColor: placeholderBg }]}>
                            <MaterialIcons name="image" size={30} color={placeholderIconColor} />
                        </View>
                    )}

                    <View style={styles.listingDetails}>
                        <Text style={[styles.listingTitle, { color: textColor }]} numberOfLines={2}>
                            {item.title}
                        </Text>

                        <Text style={[styles.listingPrice, { color: textColor }]}>
                            {formatPrice(item.price, item.currency)}
                        </Text>

                        <View style={styles.listingMeta}>
                            <Ionicons name="location-outline" size={14} color={mutedColor} />
                            <Text style={[styles.locationText, { color: mutedColor }]}>{item.location}</Text>
                            <Text style={[styles.dateText, { color: mutedColor }]}>• {formatDate(item.created_at)}</Text>
                        </View>
                    </View>

                    {/* View Details Arrow */}
                    <View style={styles.viewArrow}>
                        <Ionicons name="chevron-forward" size={20} color={mutedColor} />
                    </View>
                </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actionButtons}>
                {/* ACTIVE LISTING BUTTONS */}
                {item.status === 'active' && (
                    <>
                        <Pressable
                            style={[styles.actionButton, styles.editButton]}
                            onPress={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(item, 'sold');
                            }}
                        >
                            <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
                            <Text style={[styles.actionButtonText, { color: COLORS.success }]}>Mark Sold</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.actionButton, styles.deleteButton]}
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
                            onPress={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(item, 'active');
                            }}
                        >
                            <MaterialCommunityIcons name="replay" size={20} color={COLORS.success} />
                            <Text style={[styles.actionButtonText, { color: COLORS.success }]}>Reactivate</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.actionButton, styles.deleteButton]}
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
                            style={[styles.actionButton, styles.editButton]}
                            onPress={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(item, 'active');
                            }}
                        >
                            <MaterialCommunityIcons name="replay" size={20} color={COLORS.success} />
                            <Text style={[styles.actionButtonText, { color: COLORS.success }]}>Restore</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.actionButton, styles.deleteButton]}
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
        </Pressable>
    );
}

const styles = StyleSheet.create({
    listingCard: {
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.md,
        overflow: 'hidden',
    },
    listingCardPressed: {
        opacity: 0.7,
    },
    mainContent: {
        padding: SPACING.md,
    },
    listingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: SPACING.sm,
    },
    categoryIcon: {
        fontSize: 14,
        marginRight: SPACING.xs,
    },
    categoryText: {
        fontSize: 12,
        opacity: 0.7,
    },
    statusBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.lg,
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
        borderRadius: BORDER_RADIUS.sm,
        marginRight: SPACING.md,
    },
    imagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: BORDER_RADIUS.sm,
        marginRight: SPACING.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listingDetails: {
        flex: 1,
    },
    listingTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: SPACING.xs,
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
        marginLeft: 2,
    },
    dateText: {
        fontSize: 12,
        marginLeft: SPACING.xs,
    },
    viewArrow: {
        justifyContent: 'center',
        paddingLeft: SPACING.sm,
    },
    actionButtons: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
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
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
    },
    deleteButton: {
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
    },
    actionButtonText: {
        fontSize: 14,
        marginLeft: SPACING.xs,
    },
});
