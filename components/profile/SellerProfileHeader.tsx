/**
 * SellerProfileHeader component displays the seller's avatar, name, rating, and time on platform.
 */

import { SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getDisplayName, getTimeOnPlatform, UserProfile } from '@/lib/formatters';
import { getThumbnailUrl } from '@/lib/imageUtils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

// TODO: Enable ratings when the rating system is implemented
const RATINGS_ENABLED = false;

interface SellerProfileHeaderProps {
    profile: UserProfile & { created_at: string; bio?: string | null };
}

export function SellerProfileHeader({ profile }: SellerProfileHeaderProps) {
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({}, 'textMuted');
    const secondaryBg = useThemeColor({}, 'backgroundSecondary');
    const placeholderColor = useThemeColor({}, 'textSecondary');

    return (
        <View style={styles.container}>
            {/* Avatar */}
            {profile.avatar_url ? (
                <Image
                    source={{ uri: getThumbnailUrl(profile.avatar_url, 160, 160) }}
                    style={styles.avatar}
                />
            ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: secondaryBg }]}>
                    <MaterialCommunityIcons name="account" size={40} color={placeholderColor} />
                </View>
            )}

            {/* Info */}
            <View style={styles.info}>
                <Text style={[styles.displayName, { color: textColor }]} numberOfLines={1}>
                    {getDisplayName(profile)}
                </Text>

                {/* Rating - shows placeholder until rating system is implemented */}
                {RATINGS_ENABLED ? (
                    <View style={styles.ratingRow}>
                        <Text style={styles.stars}>★★★★★</Text>
                        <Text style={[styles.ratingValue, { color: textColor }]}>5.0</Text>
                        <Text style={[styles.reviewCount, { color: mutedColor }]}>(0)</Text>
                    </View>
                ) : (
                    <Text style={[styles.noRatings, { color: mutedColor }]}>
                        No ratings yet
                    </Text>
                )}

                {/* Time on platform */}
                <Text style={[styles.platformTime, { color: mutedColor }]}>
                    Member for {getTimeOnPlatform(profile.created_at)}
                </Text>

                {/* Bio */}
                {profile.bio && (
                    <Text style={[styles.bio, { color: mutedColor }]} numberOfLines={3}>
                        {profile.bio}
                    </Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.lg,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        flex: 1,
        marginLeft: SPACING.lg,
    },
    displayName: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    ratingRow: {
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
    noRatings: {
        fontSize: 13,
        fontStyle: 'italic',
        marginBottom: 4,
    },
    platformTime: {
        fontSize: 13,
    },
    bio: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: SPACING.sm,
    },
});
