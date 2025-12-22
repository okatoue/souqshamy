import { SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getDisplayName, getYearsSince, UserProfile } from '@/lib/formatters';
import { getThumbnailUrl } from '@/lib/imageUtils';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

// Placeholder rating - TODO: Replace when rating system is implemented
const PLACEHOLDER_RATING = 5.0;
const PLACEHOLDER_REVIEW_COUNT = 0;

export interface ListedBySectionProps {
    seller: UserProfile;
    activeListingsCount: number;
    onPress?: () => void;
}

export function ListedBySection({ seller, activeListingsCount, onPress }: ListedBySectionProps) {
    const textColor = useThemeColor({}, 'text');
    const secondaryBg = useThemeColor({}, 'backgroundSecondary');
    const borderColor = useThemeColor({}, 'border');
    const placeholderColor = useThemeColor({}, 'textSecondary');
    const mutedColor = useThemeColor({}, 'textMuted');

    return (
        <Pressable style={[styles.container, { borderColor }]} onPress={onPress}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
                Listed by
            </Text>
            <View style={styles.content}>
                {/* Large Avatar */}
                {seller.avatar_url ? (
                    <Image
                        source={{ uri: getThumbnailUrl(seller.avatar_url, 140, 140) }}
                        style={styles.avatar}
                    />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: secondaryBg }]}>
                        <MaterialCommunityIcons name="account" size={36} color={placeholderColor} />
                    </View>
                )}

                {/* Seller Details */}
                <View style={styles.info}>
                    <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
                        {getDisplayName(seller)}
                    </Text>

                    {/* RATING SYSTEM - COMMENTED OUT FOR FUTURE REUSE
                    <View style={styles.rating}>
                        <Text style={styles.stars}>★★★★★</Text>
                        <Text style={[styles.ratingValue, { color: textColor }]}>
                            {PLACEHOLDER_RATING.toFixed(1)}
                        </Text>
                        <Text style={[styles.reviewCount, { color: mutedColor }]}>
                            ({PLACEHOLDER_REVIEW_COUNT} reviews)
                        </Text>
                    </View>
                    */}

                    {/* Years on platform and listings count */}
                    <View style={styles.stats}>
                        {seller.created_at && (
                            <Text style={[styles.stat, { color: mutedColor }]}>
                                {getYearsSince(seller.created_at)} yr{getYearsSince(seller.created_at) > 1 ? 's' : ''} on SouqJari
                            </Text>
                        )}
                        <Text style={[styles.statDot, { color: mutedColor }]}>•</Text>
                        <Text style={[styles.stat, { color: mutedColor }]}>
                            {activeListingsCount} listing{activeListingsCount > 1 ? 's' : ''}
                        </Text>
                    </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color={mutedColor} />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: SPACING.lg,
        borderTopWidth: 1,
        marginTop: SPACING.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: SPACING.md,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    avatarPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    name: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
    },
    rating: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    stars: {
        fontSize: 14,
        color: '#FFB800',
        marginRight: SPACING.xs,
    },
    ratingValue: {
        fontSize: 14,
        fontWeight: '600',
        marginRight: SPACING.xs,
    },
    reviewCount: {
        fontSize: 13,
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stat: {
        fontSize: 13,
    },
    statDot: {
        marginHorizontal: SPACING.sm,
    },
});

export default ListedBySection;
