import { navigateToListing } from '@/app/listing/[id]';
import { BORDER_RADIUS, BRAND_COLOR, SHADOWS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatPrice } from '@/lib/formatters';
import { getThumbnailUrl } from '@/lib/imageUtils';
import { useRTL } from '@/lib/rtl_context';
import { rtlRow, rtlTextAlign } from '@/lib/rtlStyles';
import { useTranslation } from '@/localization';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
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

// Skeleton card component for loading state
function SkeletonCard({ skeletonBg }: { skeletonBg: string }) {
    return (
        <View style={[styles.card, styles.skeletonCard]}>
            <View style={[styles.skeletonImage, { backgroundColor: skeletonBg }]} />
            <View style={styles.details}>
                <View style={[styles.skeletonTitle, { backgroundColor: skeletonBg }]} />
                <View style={[styles.skeletonPrice, { backgroundColor: skeletonBg }]} />
                <View style={[styles.skeletonLocation, { backgroundColor: skeletonBg }]} />
            </View>
        </View>
    );
}

export function RecentlyViewedSection({ listings, isLoading, onClear }: RecentlyViewedSectionProps) {
    const { t } = useTranslation();
    const { isRTL } = useRTL();
    // Theme colors
    const textColor = useThemeColor({}, 'text');
    const cardBg = useThemeColor({}, 'cardBackgroundSecondary');
    const borderColor = useThemeColor({}, 'border');
    const placeholderBg = useThemeColor({}, 'placeholder');
    const placeholderIconColor = useThemeColor({}, 'placeholderIcon');
    const secondaryText = useThemeColor({}, 'textSecondary');
    const skeletonBg = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'background');

    const handleItemPress = (listing: Listing) => {
        navigateToListing(listing);
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <View style={[styles.header, rtlRow(isRTL)]}>
                    <Text style={[styles.title, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('home.recentlyViewed')}
                    </Text>
                </View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    scrollEnabled={false}
                >
                    {[1, 2, 3].map((i) => (
                        <SkeletonCard key={i} skeletonBg={skeletonBg} />
                    ))}
                </ScrollView>
            </View>
        );
    }

    // Empty state - show helpful message when no recently viewed items
    if (listings.length === 0) {
        return (
            <View style={styles.container}>
                <View style={[styles.header, rtlRow(isRTL)]} accessibilityRole="header">
                    <Text style={[styles.title, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('home.recentlyViewed')}
                    </Text>
                </View>
                <View style={styles.emptyState} accessibilityLabel={t('home.noRecentlyViewedSubtext')}>
                    <Ionicons name="time-outline" size={48} color={secondaryText} />
                    <Text style={[styles.emptyTitle, { color: textColor }]}>
                        {t('home.noRecentlyViewed')}
                    </Text>
                    <Text style={[styles.emptySubtext, { color: secondaryText }]}>
                        {t('home.noRecentlyViewedSubtext')}
                    </Text>
                </View>
            </View>
        );
    }

    // Listings exist - render the list
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, rtlRow(isRTL)]} accessibilityRole="header">
                <Text style={[styles.title, rtlTextAlign(isRTL), { color: textColor }]}>
                    {t('home.recentlyViewed')}
                </Text>
                {onClear && listings.length > 0 && (
                    <Pressable
                        onPress={onClear}
                        style={styles.clearButton}
                        accessibilityLabel={t('home.clearRecentlyViewed')}
                        accessibilityRole="button"
                        accessibilityHint="Removes all items from your recently viewed history"
                    >
                        <Text style={[styles.clearButtonText, { color: BRAND_COLOR }]}>
                            {t('home.clearRecentlyViewed')}
                        </Text>
                    </Pressable>
                )}
            </View>

            {/* Horizontal Scroll */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                accessibilityRole="list"
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
                        accessibilityLabel={`${listing.title}, ${formatPrice(listing.price, listing.currency)}. Located in ${listing.location}. Tap to view details.`}
                        accessibilityRole="button"
                    >
                        {/* Image */}
                        {listing.images && listing.images.length > 0 ? (
                            <Image
                                source={{ uri: getThumbnailUrl(listing.images[0], 300, 300, 75) }}
                                style={styles.image}
                                resizeMode="cover"
                                accessibilityIgnoresInvertColors
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
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING.xxl,
        paddingHorizontal: SPACING.lg,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: SPACING.md,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
    // Skeleton styles
    skeletonCard: {
        borderWidth: 0,
        backgroundColor: 'transparent',
    },
    skeletonImage: {
        width: '100%',
        height: 100,
        borderTopLeftRadius: BORDER_RADIUS.lg,
        borderTopRightRadius: BORDER_RADIUS.lg,
    },
    skeletonTitle: {
        height: 14,
        width: '90%',
        borderRadius: 4,
        marginBottom: SPACING.xs,
    },
    skeletonPrice: {
        height: 14,
        width: '60%',
        borderRadius: 4,
        marginBottom: 4,
    },
    skeletonLocation: {
        height: 10,
        width: '70%',
        borderRadius: 4,
    },
});
