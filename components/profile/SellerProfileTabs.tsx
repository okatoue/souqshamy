/**
 * SellerProfileTabs component for switching between listings and ratings tabs.
 */

import { BRAND_COLOR, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// RATING SYSTEM - COMMENTED OUT FOR FUTURE REUSE
// export type SellerTabType = 'listings' | 'ratings';
export type SellerTabType = 'listings';

interface SellerProfileTabsProps {
    activeTab: SellerTabType;
    onTabChange: (tab: SellerTabType) => void;
    listingsCount?: number;
    // RATING SYSTEM - COMMENTED OUT FOR FUTURE REUSE
    // /** Enable the ratings tab - set to false until rating system is implemented */
    // ratingsEnabled?: boolean;
}

export function SellerProfileTabs({
    activeTab,
    onTabChange,
    listingsCount,
    // RATING SYSTEM - COMMENTED OUT FOR FUTURE REUSE
    // ratingsEnabled = false,
}: SellerProfileTabsProps) {
    const borderColor = useThemeColor({}, 'border');
    // RATING SYSTEM - COMMENTED OUT FOR FUTURE REUSE
    // const mutedColor = useThemeColor({}, 'textMuted');
    const textColor = useThemeColor({}, 'text');

    // Show simplified listings-only header (ratings disabled)
    return (
        <View style={[styles.singleTabContainer, { borderBottomColor: borderColor }]}>
            <Text style={[styles.singleTabText, { color: textColor }]}>
                {listingsCount !== undefined ? listingsCount : 0}{' '}
                {listingsCount === 1 ? 'Listing' : 'Listings'}
            </Text>
        </View>
    );

    /* RATING SYSTEM - COMMENTED OUT FOR FUTURE REUSE
    // If ratings not enabled, show simplified listings-only header
    if (!ratingsEnabled) {
        return (
            <View style={[styles.singleTabContainer, { borderBottomColor: borderColor }]}>
                <Text style={[styles.singleTabText, { color: textColor }]}>
                    {listingsCount !== undefined ? listingsCount : 0}{' '}
                    {listingsCount === 1 ? 'Listing' : 'Listings'}
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { borderBottomColor: borderColor }]}>
            <Pressable
                style={[
                    styles.tab,
                    activeTab === 'listings' && { borderBottomColor: BRAND_COLOR }
                ]}
                onPress={() => onTabChange('listings')}
            >
                <Text style={[
                    styles.tabText,
                    { color: activeTab === 'listings' ? BRAND_COLOR : mutedColor }
                ]}>
                    Listings{listingsCount !== undefined ? ` (${listingsCount})` : ''}
                </Text>
            </Pressable>

            <Pressable
                style={[
                    styles.tab,
                    activeTab === 'ratings' && { borderBottomColor: BRAND_COLOR }
                ]}
                onPress={() => onTabChange('ratings')}
            >
                <Text style={[
                    styles.tabText,
                    { color: activeTab === 'ratings' ? BRAND_COLOR : mutedColor }
                ]}>
                    Ratings
                </Text>
            </Pressable>
        </View>
    );
    */
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        marginHorizontal: SPACING.lg,
    },
    singleTabContainer: {
        borderBottomWidth: 1,
        marginHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    singleTabText: {
        fontSize: 16,
        fontWeight: '600',
    },
    tab: {
        flex: 1,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
