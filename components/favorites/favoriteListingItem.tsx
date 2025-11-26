import categoriesData from '@/assets/categories.json';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getThumbnailUrl } from '@/lib/imageUtils';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface FavoriteListingItemProps {
    item: Listing;
    onPress: (item: Listing) => void;
    onRemoveFavorite: (listingId: string) => void;
}

export function FavoriteListingItem({
    item,
    onPress,
    onRemoveFavorite
}: FavoriteListingItemProps) {
    const textColor = useThemeColor({}, 'text');
    const cardBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
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
        const diffInMs = now.getTime() - date.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
        return date.toLocaleDateString();
    };

    const { categoryName, categoryIcon, subcategoryName } = getCategoryInfo(
        item.category_id,
        item.subcategory_id
    );

    return (
        <View style={[styles.cardContainer, { backgroundColor: cardBg, borderColor }]}>
            <Pressable
                onPress={() => onPress(item)}
                style={({ pressed }) => [
                    styles.mainContent,
                    pressed && styles.pressed
                ]}
            >
                {/* Image */}
                {item.images && item.images.length > 0 ? (
                    <Image source={{ uri: getThumbnailUrl(item.images[0]) }} style={styles.image} />
                ) : (
                    <View style={[styles.imagePlaceholder, { backgroundColor: placeholderColor }]}>
                        <MaterialIcons name="image" size={30} color="#666" />
                    </View>
                )}

                {/* Details */}
                <View style={styles.details}>
                    {/* Category */}
                    <View style={styles.categoryRow}>
                        <Text style={styles.categoryIcon}>{categoryIcon}</Text>
                        <Text style={[styles.categoryText, { color: textColor }]} numberOfLines={1}>
                            {categoryName} › {subcategoryName}
                        </Text>
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
                        {item.title}
                    </Text>

                    {/* Price */}
                    <Text style={[styles.price, { color: textColor }]}>
                        {item.currency === 'SYP' ? '£' : 'USD '}
                        {item.price.toLocaleString()}
                    </Text>

                    {/* Location & Date */}
                    <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={14} color="#888" />
                        <Text style={styles.metaText}>{item.location}</Text>
                        <Text style={styles.metaText}>• {formatDate(item.created_at)}</Text>
                    </View>
                </View>

                {/* Chevron */}
                <View style={styles.chevron}>
                    <Ionicons name="chevron-forward" size={20} color="#888" />
                </View>
            </Pressable>

            {/* Remove Favorite Button */}
            <Pressable
                style={({ pressed }) => [
                    styles.removeButton,
                    pressed && styles.removeButtonPressed
                ]}
                onPress={() => onRemoveFavorite(item.id)}
            >
                <Ionicons name="heart-dislike-outline" size={18} color="#FF3B30" />
                <Text style={styles.removeButtonText}>Remove</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        marginHorizontal: 15,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    mainContent: {
        flexDirection: 'row',
        padding: 12,
    },
    pressed: {
        opacity: 0.7,
    },
    image: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    imagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    details: {
        flex: 1,
        marginLeft: 12,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    categoryIcon: {
        fontSize: 12,
        marginRight: 4,
    },
    categoryText: {
        fontSize: 12,
        opacity: 0.7,
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    price: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 12,
        color: '#888',
        marginLeft: 4,
    },
    chevron: {
        justifyContent: 'center',
        paddingLeft: 8,
    },
    removeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(150, 150, 150, 0.3)',
    },
    removeButtonPressed: {
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
    },
    removeButtonText: {
        fontSize: 14,
        color: '#FF3B30',
        marginLeft: 6,
        fontWeight: '500',
    },
});