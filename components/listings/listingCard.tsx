import { useThemeColor } from '@/hooks/use-theme-color';
import { useFavorites } from '@/hooks/useFavorites';
import { formatDate, formatPrice, getCategoryInfo } from '@/lib/formatters';
import { getThumbnailUrl } from '@/lib/imageUtils';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface ListingCardProps {
    item: Listing;
    onPress: (item: Listing) => void;
}

export function ListingCard({ item, onPress }: ListingCardProps) {
    const { isFavorite, toggleFavorite } = useFavorites();
    const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
    const [localIsFavorite, setLocalIsFavorite] = useState(false);

    // Theme colors
    const textColor = useThemeColor({}, 'text');
    const cardBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'text');
    const placeholderBg = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');

    // Sync favorite state
    useEffect(() => {
        setLocalIsFavorite(isFavorite(item.id));
    }, [isFavorite, item.id]);

    const handleToggleFavorite = async () => {
        if (isTogglingFavorite) return;

        setIsTogglingFavorite(true);
        setLocalIsFavorite(!localIsFavorite);

        const success = await toggleFavorite(item.id);

        if (!success) {
            setLocalIsFavorite(localIsFavorite);
        }

        setIsTogglingFavorite(false);
    };

    const { categoryIcon, categoryName, subcategoryName } = getCategoryInfo(
        item.category_id,
        item.subcategory_id
    );

    return (
        <View style={[styles.cardContainer, { backgroundColor: cardBg, borderColor }]}>
            <Pressable
                style={({ pressed }) => [
                    styles.cardContent,
                    pressed && styles.cardPressed,
                ]}
                onPress={() => onPress(item)}
            >
                {/* Image Container with Favorite Button */}
                <View style={styles.imageContainer}>
                    {item.images && item.images.length > 0 ? (
                        <Image
                            source={{ uri: getThumbnailUrl(item.images[0]) }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.imagePlaceholder, { backgroundColor: placeholderBg }]}>
                            <MaterialIcons name="image" size={40} color="#666" />
                        </View>
                    )}

                    {/* Favorite Button */}
                    <Pressable
                        style={styles.favoriteButton}
                        onPress={handleToggleFavorite}
                        disabled={isTogglingFavorite}
                    >
                        {isTogglingFavorite ? (
                            <ActivityIndicator size="small" color="#FF3B30" />
                        ) : (
                            <Ionicons
                                name={localIsFavorite ? "heart" : "heart-outline"}
                                size={22}
                                color={localIsFavorite ? "#FF3B30" : "#fff"}
                            />
                        )}
                    </Pressable>
                </View>

                {/* Details */}
                <View style={styles.details}>
                    <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
                        {item.title}
                    </Text>
                    <Text style={styles.price}>
                        {formatPrice(item.price, item.currency)}
                    </Text>

                    {/* Category Badge */}
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryIcon}>{categoryIcon}</Text>
                        <Text style={styles.categoryText} numberOfLines={1}>
                            {categoryName}
                            {subcategoryName ? ` › ${subcategoryName}` : ''}
                        </Text>
                    </View>

                    {/* Location & Date */}
                    <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={14} color="#888" />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {item.location}
                        </Text>
                    </View>
                    <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                </View>

                {/* Arrow */}
                <View style={styles.arrow}>
                    <Ionicons name="chevron-forward" size={20} color="#888" />
                </View>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        padding: 12,
    },
    cardPressed: {
        opacity: 0.7,
    },
    imageContainer: {
        position: 'relative',
    },
    image: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    imagePlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    favoriteButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    details: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    price: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 4,
    },
    categoryBadge: {
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
        color: '#888',
        flex: 1,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        fontSize: 13,
        color: '#888',
        marginLeft: 4,
        flex: 1,
    },
    dateText: {
        fontSize: 12,
        color: '#888',
    },
    arrow: {
        justifyContent: 'center',
        paddingLeft: 8,
    },
});