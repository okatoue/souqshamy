import categoriesData from '@/assets/categories.json';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface ListingItemProps {
    item: Listing;
    onUpdateStatus: (listing: Listing, newStatus: 'active' | 'sold') => void;
    onSoftDelete: (listingId: number) => void;
    onPermanentDelete: (listingId: number) => void;
}

export function ListingItem({ item, onUpdateStatus, onSoftDelete, onPermanentDelete }: ListingItemProps) {
    const textColor = useThemeColor({}, 'text');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'text');
    const placeholderColor = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');

    const getCategoryInfo = (categoryId: number, subcategoryId: number) => {
        const category = categoriesData.categories.find(c => c.id === categoryId);
        const subcategory = category?.subcategories.find(s => s.id === subcategoryId);

        return {
            categoryName: category?.name,
            categoryIcon: category?.icon,
            subcategoryName: subcategory?.name
        };
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
        return date.toLocaleDateString();
    };

    const { categoryName, categoryIcon, subcategoryName } = getCategoryInfo(
        item.category_id,
        item.subcategory_id
    );

    // Determine badge style based on status
    let badgeColor = '#4CAF50'; // Active (Green)
    let statusText = 'Active';
    let showRemovedIcon = false;

    if (item.status === 'sold') {
        badgeColor = '#FF9800'; // Sold (Orange)
        statusText = 'Sold';
    } else if (item.status === 'inactive') {
        badgeColor = '#D32F2F'; // Removed (Red)
        statusText = 'Removed';
        showRemovedIcon = true;
    }

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
                    <Image source={{ uri: item.images[0] }} style={styles.listingImage} />
                ) : (
                    <View style={[styles.imagePlaceholder, { backgroundColor: placeholderColor }]}>
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
                {/* ACTIVE LISTING BUTTONS */}
                {item.status === 'active' && (
                    <>
                        <Pressable
                            style={[styles.actionButton, styles.editButton]}
                            onPress={() => onUpdateStatus(item, 'sold')}
                        >
                            <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                            <Text style={styles.actionButtonText}>Mark Sold</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={() => onSoftDelete(item.id)}
                        >
                            <MaterialIcons name="remove-circle-outline" size={20} color="#f44336" />
                            <Text style={[styles.actionButtonText, { color: '#f44336' }]}>Remove</Text>
                        </Pressable>
                    </>
                )}

                {/* SOLD LISTING BUTTONS */}
                {item.status === 'sold' && (
                    <Pressable
                        style={[styles.actionButton, styles.deleteButton, { flex: 1, justifyContent: 'center' }]}
                        onPress={() => onPermanentDelete(item.id)}
                    >
                        <MaterialIcons name="delete-forever" size={20} color="#f44336" />
                        <Text style={[styles.actionButtonText, { color: '#f44336' }]}>Delete</Text>
                    </Pressable>
                )}

                {/* REMOVED (INACTIVE) LISTING BUTTONS */}
                {item.status === 'inactive' && (
                    <>
                        <Pressable
                            style={[styles.actionButton, styles.editButton]}
                            onPress={() => onUpdateStatus(item, 'active')}
                        >
                            <MaterialCommunityIcons name="restore" size={20} color="#4CAF50" />
                            <Text style={styles.actionButtonText}>Reactivate</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={() => onPermanentDelete(item.id)}
                        >
                            <MaterialIcons name="delete-forever" size={20} color="#f44336" />
                            <Text style={[styles.actionButtonText, { color: '#f44336' }]}>Delete</Text>
                        </Pressable>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
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
});
