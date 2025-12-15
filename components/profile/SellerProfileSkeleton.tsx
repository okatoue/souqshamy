/**
 * SellerProfileSkeleton component provides a skeleton loading state
 * for better perceived performance while data is loading.
 */

import { BORDER_RADIUS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm) / 2;

export function SellerProfileSkeleton() {
    const pulseAnim = useRef(new Animated.Value(0.3)).current;
    const skeletonBg = useThemeColor({ light: '#E0E0E0', dark: '#333' }, 'background');

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [pulseAnim]);

    const SkeletonBox = ({ style }: { style: object }) => (
        <Animated.View
            style={[
                { backgroundColor: skeletonBg, opacity: pulseAnim },
                style,
            ]}
        />
    );

    return (
        <View style={styles.container}>
            {/* Header Skeleton */}
            <View style={styles.headerSection}>
                <SkeletonBox style={styles.avatarSkeleton} />
                <View style={styles.infoSkeleton}>
                    <SkeletonBox style={styles.nameSkeleton} />
                    <SkeletonBox style={styles.ratingSkeleton} />
                    <SkeletonBox style={styles.timeSkeleton} />
                </View>
            </View>

            {/* Tabs Skeleton */}
            <View style={styles.tabsSkeleton}>
                <SkeletonBox style={styles.tabSkeleton} />
                <SkeletonBox style={styles.tabSkeleton} />
            </View>

            {/* Listings Grid Skeleton */}
            <View style={styles.gridSkeleton}>
                {[1, 2, 3, 4].map((i) => (
                    <SkeletonBox key={i} style={styles.cardSkeleton} />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: SPACING.lg,
    },
    headerSection: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    avatarSkeleton: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    infoSkeleton: {
        flex: 1,
        marginLeft: SPACING.lg,
        justifyContent: 'center',
    },
    nameSkeleton: {
        height: 20,
        width: '70%',
        borderRadius: BORDER_RADIUS.sm,
        marginBottom: SPACING.sm,
    },
    ratingSkeleton: {
        height: 14,
        width: '50%',
        borderRadius: BORDER_RADIUS.sm,
        marginBottom: SPACING.sm,
    },
    timeSkeleton: {
        height: 12,
        width: '40%',
        borderRadius: BORDER_RADIUS.sm,
    },
    tabsSkeleton: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
        gap: SPACING.lg,
    },
    tabSkeleton: {
        height: 32,
        flex: 1,
        borderRadius: BORDER_RADIUS.sm,
    },
    gridSkeleton: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: SPACING.lg,
        gap: SPACING.sm,
    },
    cardSkeleton: {
        width: CARD_WIDTH,
        height: CARD_WIDTH * 1.4,
        borderRadius: BORDER_RADIUS.md,
    },
});
