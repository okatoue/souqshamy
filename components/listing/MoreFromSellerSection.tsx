import { FavoriteButton } from '@/components/favorites/favoriteButton';
import { BORDER_RADIUS, BRAND_COLOR, SHADOWS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatPrice } from '@/lib/formatters';
import { getThumbnailUrl } from '@/lib/imageUtils';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
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

export interface MoreFromSellerSectionProps {
    listings: Listing[];
    onListingPress: (listing: Listing) => void;
    onViewAllPress: () => void;
    isLoading?: boolean;
}

export function MoreFromSellerSection({
    listings,
    onListingPress,
    onViewAllPress,
    isLoading,
}: MoreFromSellerSectionProps) {
    const textColor = useThemeColor({}, 'text');
    const secondaryBg = useThemeColor({}, 'backgroundSecondary');
    const cardBg = useThemeColor({}, 'cardBackground');
    const borderColor = useThemeColor({}, 'border');
    const mutedColor = useThemeColor({}, 'textMuted');

    // Loading state
    if (isLoading && listings.length === 0) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: cardBg }]}>
                <ActivityIndicator size="small" color={BRAND_COLOR} />
            </View>
        );
    }

    // Empty state - don't render anything
    if (listings.length === 0) {
        return null;
    }

    return (
        <View style={[styles.container, { backgroundColor: cardBg }]}>
            <View style={styles.header}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                    More from this seller ({listings.length})
                </Text>
                <Pressable onPress={onViewAllPress}>
                    <Text style={[styles.viewAllText, { color: BRAND_COLOR }]}>View all</Text>
                </Pressable>
            </View>

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
                            { backgroundColor: secondaryBg, borderColor },
                            pressed && styles.cardPressed,
                        ]}
                        onPress={() => onListingPress(listing)}
                    >
                        {/* Image with Favorite Button */}
                        <View style={styles.imageContainer}>
                            {listing.images && listing.images.length > 0 ? (
                                <Image
                                    source={{ uri: getThumbnailUrl(listing.images[0], 300, 200, 75) }}
                                    style={styles.image}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={[styles.imagePlaceholder, { backgroundColor: mutedColor }]}>
                                    <MaterialIcons name="image" size={30} color={mutedColor} />
                                </View>
                            )}
                            <View style={styles.favoriteButton}>
                                <FavoriteButton
                                    listingId={listing.id}
                                    size={18}
                                    variant="overlay"
                                />
                            </View>
                        </View>

                        {/* Details */}
                        <View style={styles.details}>
                            <Text style={[styles.price, { color: BRAND_COLOR }]}>
                                {formatPrice(listing.price, listing.currency)}
                            </Text>
                            <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
                                {listing.title}
                            </Text>
                            <Text style={[styles.location, { color: mutedColor }]} numberOfLines={1}>
                                {listing.location}
                            </Text>
                        </View>
                    </Pressable>
                ))}

                {/* View All Card */}
                <Pressable
                    style={[styles.viewAllCard, { backgroundColor: secondaryBg, borderColor }]}
                    onPress={onViewAllPress}
                >
                    <Ionicons name="arrow-forward-circle" size={40} color={BRAND_COLOR} />
                    <Text style={[styles.viewAllCardText, { color: BRAND_COLOR }]}>View all</Text>
                </Pressable>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: SPACING.lg,
        marginTop: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: '500',
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        gap: SPACING.md,
    },
    card: {
        width: 160,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        overflow: 'hidden',
        ...SHADOWS.card,
    },
    cardPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }],
    },
    imageContainer: {
        position: 'relative',
    },
    image: {
        width: '100%',
        height: 110,
    },
    imagePlaceholder: {
        width: '100%',
        height: 110,
        justifyContent: 'center',
        alignItems: 'center',
    },
    favoriteButton: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
    },
    details: {
        padding: SPACING.md,
    },
    price: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    title: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
        lineHeight: 18,
    },
    location: {
        fontSize: 11,
    },
    viewAllCard: {
        width: 100,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    viewAllCardText: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: SPACING.sm,
    },
    loadingContainer: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SPACING.md,
    },
});

export default MoreFromSellerSection;
