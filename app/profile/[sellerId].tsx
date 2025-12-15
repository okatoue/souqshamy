import { ListingGridCard } from '@/components/listing/ListingGridCard';
import { BORDER_RADIUS, BRAND_COLOR, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getDisplayName, getTimeOnPlatform, UserProfile } from '@/lib/formatters';
import { getThumbnailUrl } from '@/lib/imageUtils';
import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Pressable,
    Share,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Placeholder rating - TODO: Replace when rating system is implemented
const PLACEHOLDER_RATING = 5.0;
const PLACEHOLDER_REVIEW_COUNT = 2;

interface SellerProfile extends UserProfile {
    id: string;
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
    created_at: string;
}

interface SellerStats {
    totalListings: number;
    replyRate: number | null;
    avgReplyTimeHours: number | null;
}

type TabType = 'listings' | 'ratings';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_PADDING = SPACING.lg * 2;
const CARD_GAP = SPACING.sm;
const CARD_WIDTH = (SCREEN_WIDTH - SCREEN_PADDING - CARD_GAP) / 2;

export default function SellerProfileScreen() {
    const params = useLocalSearchParams<{ sellerId: string }>();

    // State
    const [profile, setProfile] = useState<SellerProfile | null>(null);
    const [listings, setListings] = useState<Listing[]>([]);
    const [stats, setStats] = useState<SellerStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('listings');

    // Theme colors
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const cardBg = useThemeColor({}, 'cardBackgroundSecondary');
    const borderColor = useThemeColor({}, 'border');
    const mutedColor = useThemeColor({}, 'textMuted');
    const secondaryBg = useThemeColor({}, 'backgroundSecondary');
    const placeholderColor = useThemeColor({}, 'textSecondary');

    // Fetch seller data
    useEffect(() => {
        const fetchSellerData = async () => {
            if (!params.sellerId) return;

            try {
                // Parallel fetch: profile + listings
                const [profileResult, listingsResult] = await Promise.all([
                    supabase
                        .from('profiles')
                        .select('id, display_name, email, avatar_url, created_at')
                        .eq('id', params.sellerId)
                        .single(),
                    supabase
                        .from('listings')
                        .select('*')
                        .eq('user_id', params.sellerId)
                        .eq('status', 'active')
                        .order('created_at', { ascending: false })
                ]);

                if (profileResult.data) {
                    setProfile(profileResult.data);
                }

                if (listingsResult.data) {
                    setListings(listingsResult.data);
                    setStats({
                        totalListings: listingsResult.data.length,
                        replyRate: null,        // TODO: implement
                        avgReplyTimeHours: null // TODO: implement
                    });
                }
            } catch (error) {
                console.error('Error fetching seller data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSellerData();
    }, [params.sellerId]);

    const handleShare = async () => {
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
    };

    const handleListingPress = (listing: Listing) => {
        router.push({
            pathname: '/listing/[id]',
            params: {
                id: listing.id.toString(),
                listingData: JSON.stringify(listing),
            },
        });
    };

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

    // Loading state
    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.headerButton}>
                        <Ionicons name="chevron-back" size={28} color={textColor} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: textColor }]}>Profile</Text>
                    <View style={styles.headerButton} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={BRAND_COLOR} />
                </View>
            </SafeAreaView>
        );
    }

    // Not found state
    if (!profile) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.headerButton}>
                        <Ionicons name="chevron-back" size={28} color={textColor} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: textColor }]}>Profile</Text>
                    <View style={styles.headerButton} />
                </View>
                <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="account-question-outline" size={80} color={mutedColor} />
                    <Text style={[styles.errorText, { color: textColor }]}>User not found</Text>
                    <Pressable
                        style={[styles.backButtonLarge, { backgroundColor: BRAND_COLOR }]}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    const renderListingItem = ({ item }: { item: Listing }) => (
        <View style={styles.gridItem}>
            <ListingGridCard
                listing={item}
                onPress={handleListingPress}
                cardWidth={CARD_WIDTH}
            />
        </View>
    );

    const renderEmptyListings = () => (
        <View style={styles.emptyState}>
            <MaterialCommunityIcons name="package-variant" size={60} color={mutedColor} />
            <Text style={[styles.emptyText, { color: textColor }]}>No listings yet</Text>
            <Text style={[styles.emptySubtext, { color: mutedColor }]}>
                This seller hasn't posted any listings
            </Text>
        </View>
    );

    const renderRatingsTab = () => (
        <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={60} color={mutedColor} />
            <Text style={[styles.emptyText, { color: textColor }]}>No ratings yet</Text>
            <Text style={[styles.emptySubtext, { color: mutedColor }]}>
                Ratings feature coming soon
            </Text>
        </View>
    );

    const renderListHeader = () => (
        <>
            {/* User Info Section */}
            <View style={styles.userInfoSection}>
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

                {/* Right side info */}
                <View style={styles.userInfo}>
                    <Text style={[styles.displayName, { color: textColor }]} numberOfLines={1}>
                        {getDisplayName(profile)}
                    </Text>

                    {/* Rating */}
                    <View style={styles.ratingRow}>
                        <Text style={styles.stars}>★★★★★</Text>
                        <Text style={[styles.ratingValue, { color: textColor }]}>
                            {PLACEHOLDER_RATING.toFixed(1)}
                        </Text>
                        <Text style={[styles.reviewCount, { color: mutedColor }]}>
                            ({PLACEHOLDER_REVIEW_COUNT})
                        </Text>
                    </View>

                    {/* Time on platform */}
                    <Text style={[styles.platformTime, { color: mutedColor }]}>
                        Personal • {profile.created_at ? getTimeOnPlatform(profile.created_at) : ''}
                    </Text>
                </View>
            </View>

            {/* Stats Card */}
            <View style={[styles.statsCard, { backgroundColor: cardBg }]}>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: textColor }]}>
                        {formatStatValue(stats?.replyRate ?? null, '%')}
                    </Text>
                    <Text style={[styles.statLabel, { color: mutedColor }]}>Reply rate</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: borderColor }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: textColor }]}>
                        {formatReplyTime(stats?.avgReplyTimeHours ?? null)}
                    </Text>
                    <Text style={[styles.statLabel, { color: mutedColor }]}>Avg reply time</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: borderColor }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: textColor }]}>
                        {stats?.totalListings ?? 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: mutedColor }]}>Listings</Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={[styles.tabsContainer, { borderBottomColor: borderColor }]}>
                <Pressable
                    style={[
                        styles.tab,
                        activeTab === 'listings' && styles.tabActive,
                        activeTab === 'listings' && { borderBottomColor: BRAND_COLOR }
                    ]}
                    onPress={() => setActiveTab('listings')}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'listings' ? BRAND_COLOR : mutedColor }
                    ]}>
                        Listings
                    </Text>
                </Pressable>
                <Pressable
                    style={[
                        styles.tab,
                        activeTab === 'ratings' && styles.tabActive,
                        activeTab === 'ratings' && { borderBottomColor: BRAND_COLOR }
                    ]}
                    onPress={() => setActiveTab('ratings')}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'ratings' ? BRAND_COLOR : mutedColor }
                    ]}>
                        Ratings
                    </Text>
                </Pressable>
            </View>

            {/* Tab Content Header (for listings) */}
            {activeTab === 'listings' && listings.length > 0 && (
                <View style={styles.listingsHeader}>
                    <Text style={[styles.listingsCount, { color: textColor }]}>
                        {listings.length} {listings.length === 1 ? 'listing' : 'listings'}
                    </Text>
                </View>
            )}
        </>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.headerButton}>
                    <Ionicons name="chevron-back" size={28} color={textColor} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: textColor }]}>Profile</Text>
                <Pressable onPress={handleShare} style={styles.headerButton}>
                    <Ionicons name="share-outline" size={24} color={textColor} />
                </Pressable>
            </View>

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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    errorText: {
        fontSize: 18,
        marginTop: SPACING.lg,
        marginBottom: SPACING.xl,
    },
    backButtonLarge: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xxl,
        borderRadius: BORDER_RADIUS.sm,
    },
    backButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: SPACING.xxxl,
    },
    userInfoSection: {
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
    userInfo: {
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
    platformTime: {
        fontSize: 13,
    },
    statsCard: {
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
    statDivider: {
        width: 1,
        height: '80%',
        alignSelf: 'center',
    },
    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        marginHorizontal: SPACING.lg,
    },
    tab: {
        flex: 1,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomWidth: 3,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
    },
    listingsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    listingsCount: {
        fontSize: 14,
        fontWeight: '500',
    },
    gridRow: {
        paddingHorizontal: SPACING.lg,
        gap: CARD_GAP,
        marginBottom: CARD_GAP,
    },
    gridItem: {
        // Each item container
    },
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
