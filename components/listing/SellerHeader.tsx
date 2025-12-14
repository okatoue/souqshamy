import { BORDER_RADIUS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatRelativeTime, getDisplayName, UserProfile } from '@/lib/formatters';
import { getThumbnailUrl } from '@/lib/imageUtils';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

// Placeholder rating - TODO: Replace when rating system is implemented
const PLACEHOLDER_RATING = 5.0;

export interface SellerHeaderProps {
    seller: UserProfile | null;
    createdAt: string;
    onPress?: () => void;
    isLoading?: boolean;
}

export function SellerHeader({ seller, createdAt, onPress, isLoading }: SellerHeaderProps) {
    const textColor = useThemeColor({}, 'text');
    const secondaryBg = useThemeColor({}, 'backgroundSecondary');
    const borderColor = useThemeColor({}, 'border');
    const placeholderColor = useThemeColor({}, 'textSecondary');
    const mutedColor = useThemeColor({}, 'textMuted');

    if (!seller) {
        // Loading skeleton
        return (
            <View style={styles.container}>
                <View style={[styles.avatarPlaceholder, styles.skeletonPulse, { backgroundColor: borderColor }]} />
                <View style={styles.info}>
                    <View style={[styles.skeletonText, styles.skeletonPulse, { backgroundColor: borderColor, width: 100 }]} />
                    <View style={[styles.skeletonTextSmall, styles.skeletonPulse, { backgroundColor: borderColor, width: 50, marginTop: 4 }]} />
                </View>
                <View style={[styles.skeletonTextSmall, styles.skeletonPulse, { backgroundColor: borderColor, width: 80 }]} />
            </View>
        );
    }

    return (
        <Pressable style={styles.container} onPress={onPress}>
            {/* Avatar */}
            {seller.avatar_url ? (
                <Image
                    source={{ uri: getThumbnailUrl(seller.avatar_url, 80, 80) }}
                    style={styles.avatar}
                />
            ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: secondaryBg }]}>
                    <MaterialCommunityIcons name="account" size={20} color={placeholderColor} />
                </View>
            )}

            {/* Name and Rating */}
            <View style={styles.info}>
                <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
                    {getDisplayName(seller)}
                </Text>
                <View style={styles.rating}>
                    <Text style={[styles.ratingText, { color: mutedColor }]}>
                        {PLACEHOLDER_RATING.toFixed(1)} ★
                    </Text>
                </View>
            </View>

            {/* Posted time */}
            <Text style={[styles.time, { color: mutedColor }]}>
                {formatRelativeTime(createdAt)}
            </Text>

            <Ionicons name="chevron-forward" size={18} color={mutedColor} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    avatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
    },
    rating: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    ratingText: {
        fontSize: 13,
    },
    time: {
        fontSize: 12,
        marginRight: SPACING.sm,
    },
    // Skeleton styles
    skeletonPulse: {
        opacity: 0.5,
    },
    skeletonText: {
        height: 14,
        borderRadius: BORDER_RADIUS.xs,
    },
    skeletonTextSmall: {
        height: 10,
        borderRadius: BORDER_RADIUS.xs,
    },
});

export default SellerHeader;
