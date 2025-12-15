/**
 * SellerStatsCard component - COMMENTED OUT FOR FUTURE IMPLEMENTATION
 * =============================================================================
 * This component displays seller statistics (reply rate, avg reply time, listings)
 * Uncomment and implement when the backend support is ready.
 * =============================================================================
 */

/*
import { BORDER_RADIUS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SellerStats {
    totalListings: number;
    replyRate: number | null;
    avgReplyTimeHours: number | null;
}

interface SellerStatsCardProps {
    stats: SellerStats;
}

const formatStatValue = (value: number | null, suffix: string): string => {
    if (value === null) return '-';
    return `${value}${suffix}`;
};

const formatReplyTime = (hours: number | null): string => {
    if (hours === null) return '-';
    if (hours > 24) return '>24 hrs';
    if (hours < 1) return '< 1 hr';
    return `< ${Math.round(hours)} hrs`;
};

export function SellerStatsCard({ stats }: SellerStatsCardProps) {
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({}, 'textMuted');
    const cardBg = useThemeColor({}, 'cardBackgroundSecondary');
    const borderColor = useThemeColor({}, 'border');

    return (
        <View style={[styles.container, { backgroundColor: cardBg }]}>
            <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: textColor }]}>
                    {formatStatValue(stats.replyRate, '%')}
                </Text>
                <Text style={[styles.statLabel, { color: mutedColor }]}>Reply rate</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: borderColor }]} />

            <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: textColor }]}>
                    {formatReplyTime(stats.avgReplyTimeHours)}
                </Text>
                <Text style={[styles.statLabel, { color: mutedColor }]}>Avg reply time</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: borderColor }]} />

            <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: textColor }]}>
                    {stats.totalListings}
                </Text>
                <Text style={[styles.statLabel, { color: mutedColor }]}>Listings</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        paddingVertical: SPACING.lg,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
    },
    divider: {
        width: 1,
        height: '80%',
        alignSelf: 'center',
    },
});
*/

// Export nothing for now - component is disabled
export {};
