import { BORDER_RADIUS, BRAND_COLOR, SHADOWS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatPrice } from '@/lib/formatters';
import { getThumbnailUrl } from '@/lib/imageUtils';
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
    // Theme colors
    const textColor = useThemeColor({}, 'text');
    const cardBg = useThemeColor({}, 'cardBackgroundSecondary');
    const borderColor = useThemeColor({}, 'border');
    const placeholderBg = useThemeColor({}, 'placeholder');
    const placeholderIconColor = useThemeColor({}, 'placeholderIcon');
    const secondaryText = useThemeColor({}, 'textSecondary');

    const handleItemPress = (listing: Listing) => {
        router.push(`/listing/${listing.id}`);
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: textColor }]}>Recently Viewed</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={BRAND_COLOR} />
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
                            <Text style={[styles.clearButtonText, { color: BRAND_COLOR }]}>Clear</Text>
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
                                    source={{ uri: getThumbnailUrl(listing.images[0], 200, 200, 60) }}
                                    style={styles.image}
                                    resizeMode="cover"
                                    onError={(e) => console.log('[RecentlyViewed] Image load error:', e.nativeEvent.error)}
                                />
                            ) : (
                                <View style={[styles.imagePlaceholder, { backgroundColor: placeholderBg }]}>
                                    <MaterialIcons name="image" size={30} color={placeholderIconColor} />
                                </View>
                            )}

                            {/* Details */}
                            <View style={styles.details}>
                                <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={2}>
                                    {listing.title}
                                </Text>
                                <Text style={[styles.price, { color: BRAND_COLOR }]}>
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

    return null;
}

const styles = StyleSheet.create({
    container: {
        marginTop: SPACING.xl,
        marginBottom: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    clearButton: {
        padding: SPACING.xs,
    },
    clearButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        gap: SPACING.md,
    },
    card: {
        width: 150,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        overflow: 'hidden',
        ...SHADOWS.card,
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
        padding: SPACING.md,
    },
    itemTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: SPACING.xs,
        lineHeight: 18,
    },
    price: {
        fontSize: 14,
        fontWeight: 'bold',
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
});
