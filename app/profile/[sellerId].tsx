/**
 * Seller Profile Screen
 * Displays a seller's profile information, listings, and ratings.
 *
 * Refactored for better code organization:
 * - Data fetching extracted to useSellerProfile hook
 * - UI components extracted to components/profile/
 * - Skeleton loading for better perceived performance
 */

import { ListingGridCard } from '@/components/listing/ListingGridCard';
import { SellerNotFound } from '@/components/profile/SellerNotFound';
import { SellerProfileHeader } from '@/components/profile/SellerProfileHeader';
import { SellerProfileSkeleton } from '@/components/profile/SellerProfileSkeleton';
import { SellerProfileTabs, SellerTabType } from '@/components/profile/SellerProfileTabs';
// import { SellerStatsCard } from '@/components/profile/SellerStatsCard';  // TODO: Uncomment when implementing
import { BackButton } from '@/components/ui/BackButton';
import { SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSellerProfile } from '@/hooks/useSellerProfile';
import { getDisplayName } from '@/lib/formatters';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback } from 'react';
// RATING SYSTEM - useState was used for activeTab, commented out for future reuse
// import React, { useCallback, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Pressable,
    Share,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = SPACING.sm;
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - CARD_GAP) / 2;

// Header component
function Header({ textColor, onShare }: { textColor: string; onShare?: () => void }) {
    return (
        <View style={styles.header}>
            <BackButton style={styles.headerButton} />
            <Text style={[styles.headerTitle, { color: textColor }]}>Profile</Text>
            {onShare ? (
                <Pressable onPress={onShare} style={styles.headerButton}>
                    <Ionicons name="share-outline" size={24} color={textColor} />
                </Pressable>
            ) : (
                <View style={styles.headerButton} />
            )}
        </View>
    );
}

export default function SellerProfileScreen() {
    const { sellerId } = useLocalSearchParams<{ sellerId: string }>();
    const { profile, listings, isLoading } = useSellerProfile(sellerId);
    // RATING SYSTEM - COMMENTED OUT FOR FUTURE REUSE
    // const [activeTab, setActiveTab] = useState<SellerTabType>('listings');
    const activeTab: SellerTabType = 'listings'; // Always listings when ratings disabled

    // Theme
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({}, 'textMuted');

    // Handlers
    const handleShare = useCallback(async () => {
        if (!profile) return;
        try {
            await Share.share({
                message: `Check out ${getDisplayName(profile)}'s profile on SouqJari!\nhttps://souqjari.com/profile/${profile.id}`,
                url: `https://souqjari.com/profile/${profile.id}`,
                title: `${getDisplayName(profile)} on SouqJari`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    }, [profile]);

    const handleListingPress = useCallback((listing: Listing) => {
        router.push({
            pathname: '/listing/[id]',
            params: { id: listing.id.toString(), listingData: JSON.stringify(listing) },
        });
    }, []);

    // Render functions
    const renderListingItem = useCallback(({ item }: { item: Listing }) => (
        <View style={styles.gridItem}>
            <ListingGridCard listing={item} onPress={handleListingPress} cardWidth={CARD_WIDTH} />
        </View>
    ), [handleListingPress]);

    const renderEmptyListings = useCallback(() => (
        <View style={styles.emptyState}>
            <MaterialCommunityIcons name="package-variant" size={60} color={mutedColor} />
            <Text style={[styles.emptyText, { color: textColor }]}>No listings yet</Text>
            <Text style={[styles.emptySubtext, { color: mutedColor }]}>
                This seller hasn't posted any listings
            </Text>
        </View>
    ), [mutedColor, textColor]);

    /* RATING SYSTEM - COMMENTED OUT FOR FUTURE REUSE
    const renderRatingsTab = useCallback(() => (
        <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={60} color={mutedColor} />
            <Text style={[styles.emptyText, { color: textColor }]}>No ratings yet</Text>
            <Text style={[styles.emptySubtext, { color: mutedColor }]}>
                Ratings feature coming soon
            </Text>
        </View>
    ), [mutedColor, textColor]);
    */

    const renderListHeader = useCallback(() => (
        <>
            {profile && <SellerProfileHeader profile={profile} />}

            {/* TODO: Uncomment when implementing stats feature */}
            {/* {stats && <SellerStatsCard stats={stats} />} */}

            <SellerProfileTabs
                activeTab={activeTab}
                onTabChange={() => {}} // RATING SYSTEM - no-op since tabs disabled
                listingsCount={listings.length}
            />
        </>
    ), [profile, activeTab, listings.length]);

    // Loading state
    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <Header textColor={textColor} />
                <SellerProfileSkeleton />
            </SafeAreaView>
        );
    }

    // Not found state
    if (!profile) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <Header textColor={textColor} />
                <SellerNotFound />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <Header textColor={textColor} onShare={handleShare} />

            <FlatList
                data={listings}
                renderItem={renderListingItem}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                ListHeaderComponent={renderListHeader}
                ListEmptyComponent={renderEmptyListings}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={listings.length > 0 ? styles.gridRow : undefined}
                showsVerticalScrollIndicator={false}
            />
            {/* RATING SYSTEM - COMMENTED OUT FOR FUTURE REUSE
            {activeTab === 'listings' ? (
                <FlatList
                    data={listings}
                    renderItem={renderListingItem}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    ListHeaderComponent={renderListHeader}
                    ListEmptyComponent={renderEmptyListings}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={listings.length > 0 ? styles.gridRow : undefined}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <FlatList
                    data={[]}
                    renderItem={() => null}
                    ListHeaderComponent={renderListHeader}
                    ListEmptyComponent={renderRatingsTab}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
            */}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.sm,
    },
    headerButton: {
        padding: SPACING.sm,
        width: 44,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: SPACING.xxxl,
    },
    gridRow: {
        paddingHorizontal: SPACING.lg,
        gap: CARD_GAP,
        marginBottom: CARD_GAP,
    },
    gridItem: {},
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING.xxxl,
        paddingHorizontal: SPACING.lg,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: SPACING.lg,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: SPACING.sm,
        textAlign: 'center',
    },
});
