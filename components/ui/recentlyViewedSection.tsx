import { useThemeColor } from '@/hooks/use-theme-color';
import { Listing } from '@/types/listing';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface RecentlyViewedSectionProps {
    listings: Listing[];
    isLoading: boolean;
    onClear?: () => void;
}

export function RecentlyViewedSection({ listings, isLoading, onClear }: RecentlyViewedSectionProps) {
    const textColor = useThemeColor({}, 'text');
    const cardBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'text');
    const placeholderBg = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');
    const secondaryText = useThemeColor({ light: '#666', dark: '#999' }, 'text');

    const handleItemPress = (listing: Listing) => {
        router.push(`/listing/${listing.id}`);
    };

    const formatPrice = (price: number, currency: string) => {
        if (currency === 'SYP') {
            return `SYP ${price.toLocaleString()}`;
        }
        return `$${price.toLocaleString()}`;
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: textColor }]}>Recently Viewed</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#007AFF" />
                </View>
            </View>
        );
    }

    if (listings.length > 0) {
        return (
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: textColor }]}>Recently Viewed</Text>
                    {onClear && listings.length > 0 && (
                        <Pressable onPress={onClear} style={styles.clearButton}>
                            <Text style={styles.clearButtonText}>Clear</Text>
                        </Pressable>
                    )}
                </View>

                {/* Horizontal Scroll */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {listings.map((listing) => (
                        <Pressable
                            key={listing.id}
                            style={({ pressed }) => [
                                styles.card,
                                { backgroundColor: cardBg, borderColor },
                                pressed && styles.cardPressed,
                            ]}
                            onPress={() => handleItemPress(listing)}
                        >
                            {/* Image */}
                            {listing.images && listing.images.length > 0 ? (
                                <Image
                                    source={{ uri: listing.images[0] }}
                                    style={styles.image}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={[styles.imagePlaceholder, { backgroundColor: placeholderBg }]}>
                                    <MaterialIcons name="image" size={30} color="#666" />
                                </View>
                            )}

                            {/* Details */}
                            <View style={styles.details}>
                                <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={2}>
                                    {listing.title}
                                </Text>
                                <Text style={styles.price}>
                                    {formatPrice(listing.price, listing.currency)}
                                </Text>
                                <Text style={[styles.location, { color: secondaryText }]} numberOfLines={1}>
                                    {listing.location}
                                </Text>
                            </View>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        marginBottom: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    clearButton: {
        padding: 4,
    },
    clearButtonText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '500',
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    card: {
        width: 150,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cardPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }],
    },
    image: {
        width: '100%',
        height: 100,
    },
    imagePlaceholder: {
        width: '100%',
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    details: {
        padding: 10,
    },
    itemTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
        lineHeight: 18,
    },
    price: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 2,
    },
    location: {
        fontSize: 11,
    },
    loadingContainer: {
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    emptyText: {
        fontSize: 14,
    },
});