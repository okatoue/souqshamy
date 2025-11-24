import categoriesData from '@/assets/categories.json';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface ListingItemProps {
    item: Listing;
    onToggleStatus: (listing: Listing) => void;
    onDelete: (listingId: number) => void;
}

export function ListingItem({ item, onToggleStatus, onDelete }: ListingItemProps) {
    const textColor = useThemeColor({}, 'text');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'text');
    const placeholderColor = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');

    const getCategoryInfo = (categoryId: number, subcategoryId: number) => {
        const category = categoriesData.categories.find(c => parseInt(c.id) === categoryId);
        const subcategory = category?.subcategories.find(s => parseInt(s.id) === subcategoryId);
        return {
            categoryName: category?.name || 'Unknown',
            categoryIcon: category?.icon || '📦',
            subcategoryName: subcategory?.name || 'Unknown'
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
                    {
                        backgroundColor:
                            item.status === 'active' ? '#4CAF50' :
                                item.status === 'sold' ? '#FF9800' :
                                    '#9E9E9E'
                    }
                ]}>
                    <Text style={styles.statusText}>
                        {item.status === 'active' ? 'Active' :
                            item.status === 'sold' ? 'Sold' :
                                'Inactive'}
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
                <Pressable
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => onToggleStatus(item)}
                >
                    <MaterialCommunityIcons
                        name={
                            item.status === 'active' ? 'check-circle' :
                                item.status === 'sold' ? 'archive' :
                                    'restore'
                        }
                        size={20}
                        color="#4CAF50"
                    />
                    <Text style={styles.actionButtonText}>
                        {item.status === 'active' ? 'Mark Sold' :
                            item.status === 'sold' ? 'Deactivate' :
                                'Reactivate'}
                    </Text>
                </Pressable>

                <Pressable
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => onDelete(item.id)}
                >
                    <MaterialIcons name="remove-circle-outline" size={20} color="#f44336" />
                    <Text style={[styles.actionButtonText, { color: '#f44336' }]}>
                        Remove
                    </Text>
                </Pressable>
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
