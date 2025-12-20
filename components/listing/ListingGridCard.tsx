import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { BORDER_RADIUS, SHADOWS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatPrice } from '@/lib/formatters';
import { getThumbnailUrl } from '@/lib/imageUtils';
import { Listing } from '@/types/listing';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export interface ListingGridCardProps {
    listing: Listing;
    onPress: (listing: Listing) => void;
    cardWidth: number;
}

export function ListingGridCard({ listing, onPress, cardWidth }: ListingGridCardProps) {
    const textColor = useThemeColor({}, 'text');
    const cardBg = useThemeColor({}, 'cardBackground');
    const borderColor = useThemeColor({}, 'border');
    const placeholderBg = useThemeColor({}, 'placeholder');
    const placeholderIconColor = useThemeColor({}, 'placeholderIcon');
    const secondaryText = useThemeColor({}, 'textSecondary');

    const imageSize = cardWidth;

    return (
        <Pressable
            style={({ pressed }) => [
                styles.card,
                { backgroundColor: cardBg, borderColor, width: cardWidth },
                pressed && styles.cardPressed,
            ]}
            onPress={() => onPress(listing)}
        >
            {/* Image Container */}
            <View style={[styles.imageContainer, { width: imageSize, height: imageSize }]}>
                {listing.images && listing.images.length > 0 ? (
                    <Image
                        source={{ uri: getThumbnailUrl(listing.images[0], 400, 400, 75) }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.imagePlaceholder, { backgroundColor: placeholderBg }]}>
                        <MaterialIcons name="image" size={40} color={placeholderIconColor} />
                    </View>
                )}

                {/* Favorite Button */}
                <View style={styles.favoriteButton}>
                    <FavoriteButton
                        listingId={listing.id}
                        size={18}
                        showBackground
                        inactiveColor="white"
                    />
                </View>
            </View>

            {/* Details */}
            <View style={styles.details}>
                <Text style={[styles.price, { color: textColor }]}>
                    {listing.price === 0 ? 'Contact' : formatPrice(listing.price, listing.currency)}
                </Text>
                <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
                    {listing.title}
                </Text>
                {listing.location && (
                    <Text style={[styles.location, { color: secondaryText }]} numberOfLines={1}>
                        {listing.location}
                    </Text>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: BORDER_RADIUS.md,
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
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    favoriteButton: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
    },
    details: {
        padding: SPACING.sm,
    },
    price: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    title: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
        marginBottom: 2,
    },
    location: {
        fontSize: 11,
    },
});

export default ListingGridCard;
