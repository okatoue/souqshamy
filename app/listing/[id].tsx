import {
    ContactBar,
    ImageCarousel,
    ListedBySection,
    MoreFromSellerSection,
    SellerHeader,
} from '@/components/listing';
import LocationPreviewCard from '@/components/product-details/LocationPreviewCard';
import { BORDER_RADIUS, BRAND_COLOR, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useConversations } from '@/hooks/useConversations';
import { useFavoriteToggle } from '@/hooks/useFavoriteToggle';
import { useAuth } from '@/lib/auth_context';
import { formatPrice, UserProfile } from '@/lib/formatters';
import { addToRecentlyViewed } from '@/lib/recentlyViewed';
import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Helper to navigate to listing detail with pre-loaded data.
 * This allows instant rendering without waiting for a fetch.
 */
export function navigateToListing(listing: Listing) {
    router.push({
        pathname: '/listing/[id]',
        params: {
            id: listing.id.toString(),
            listingData: JSON.stringify(listing),
        },
    });
}

export default function ListingDetailScreen() {
    const params = useLocalSearchParams<{ id: string; listingData?: string }>();
    const { user } = useAuth();

    // Parse listing data from params if available (instant load)
    const initialListing = useMemo(() => {
        if (params.listingData) {
            try {
                return JSON.parse(params.listingData) as Listing;
            } catch {
                return null;
            }
        }
        return null;
    }, [params.listingData]);

    const [listing, setListing] = useState<Listing | null>(initialListing);
    const [loading, setLoading] = useState(!initialListing);

    // Seller info state
    const [sellerProfile, setSellerProfile] = useState<UserProfile | null>(null);
    const [sellerListings, setSellerListings] = useState<Listing[]>([]);
    const [sellerListingsLoading, setSellerListingsLoading] = useState(false);

    // Favorites - instant toggle, no loading spinner
    const { isFavorite, handleToggle: handleToggleFavorite } = useFavoriteToggle({
        listingId: params.id || ''
    });

    // Chat
    const { getOrCreateConversation } = useConversations();
    const [isStartingChat, setIsStartingChat] = useState(false);

    // Theme colors
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const cardBg = useThemeColor({}, 'cardBackground');
    const borderColor = useThemeColor({}, 'border');
    const placeholderColor = useThemeColor({}, 'textSecondary');
    const mutedColor = useThemeColor({}, 'textMuted');

    // Fetch listing data only if not provided via params
    useEffect(() => {
        // Skip fetch if we already have listing data from params
        if (initialListing) {
            // Track recently viewed
            if (initialListing.user_id !== user?.id) {
                addToRecentlyViewed(initialListing.id, user?.id);
            }
            return;
        }

        const fetchListing = async () => {
            if (!params.id) return;

            try {
                const { data, error } = await supabase
                    .from('listings')
                    .select('*')
                    .eq('id', params.id)
                    .single();

                if (error) throw error;

                setListing(data);

                if (data.user_id !== user?.id) {
                    addToRecentlyViewed(data.id, user?.id);
                }
            } catch (error) {
                console.error('Error fetching listing:', error);
                Alert.alert('Error', 'Failed to load listing');
            } finally {
                setLoading(false);
            }
        };

        fetchListing();
    }, [params.id, user?.id, initialListing]);

    // Fetch seller profile and their other listings
    useEffect(() => {
        const fetchSellerData = async () => {
            if (!listing?.user_id) return;

            setSellerListingsLoading(true);

            try {
                // Fetch seller profile and their other listings in parallel
                const [profileResult, listingsResult] = await Promise.all([
                    supabase
                        .from('profiles')
                        .select('id, display_name, email, phone_number, avatar_url, created_at')
                        .eq('id', listing.user_id)
                        .single(),
                    supabase
                        .from('listings')
                        .select('*')
                        .eq('user_id', listing.user_id)
                        .eq('status', 'active')
                        .neq('id', listing.id)
                        .limit(10)
                ]);

                if (profileResult.data) {
                    setSellerProfile(profileResult.data);
                }

                if (listingsResult.data) {
                    setSellerListings(listingsResult.data);
                }
            } catch (error) {
                console.error('Error fetching seller data:', error);
            } finally {
                setSellerListingsLoading(false);
            }
        };

        fetchSellerData();
    }, [listing?.user_id, listing?.id]);

    const handleCall = () => {
        if (listing?.phone_number) {
            const phoneUrl = `tel:${listing.phone_number}`;
            Linking.openURL(phoneUrl).catch(() =>
                Alert.alert('Error', 'Unable to make phone call')
            );
        }
    };

    const handleWhatsApp = () => {
        // Use whatsapp_number if available, fall back to phone_number
        const whatsappNum = listing?.whatsapp_number || listing?.phone_number;
        if (whatsappNum) {
            const cleanNumber = whatsappNum.replace(/\D/g, '');
            const whatsappUrl = `whatsapp://send?phone=${cleanNumber}`;

            Linking.openURL(whatsappUrl).catch(() =>
                Alert.alert('Error', 'WhatsApp is not installed')
            );
        }
    };

    const handleChat = async () => {
        if (!listing) return;

        // Check if user is logged in
        if (!user) {
            Alert.alert(
                'Sign In Required',
                'Please sign in to chat with the seller',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign In', onPress: () => router.push('/(auth)') }
                ]
            );
            return;
        }

        // Check if user is trying to chat with themselves
        if (user.id === listing.user_id) {
            Alert.alert('Info', "You can't chat with yourself on your own listing");
            return;
        }

        setIsStartingChat(true);

        try {
            const conversationId = await getOrCreateConversation(listing.id, listing.user_id);

            if (conversationId) {
                router.push({
                    pathname: '/chat/[id]',
                    params: { id: conversationId }
                });
            } else {
                Alert.alert('Error', 'Failed to start conversation');
            }
        } catch (error) {
            console.error('Error starting chat:', error);
            Alert.alert('Error', 'Failed to start conversation');
        } finally {
            setIsStartingChat(false);
        }
    };

    const handleShare = async () => {
        if (!listing) return;

        try {
            const shareUrl = `https://souqjari.com/listing/${listing.id}`;
            await Share.share({
                message: `Check out this listing: ${listing.title}\n${shareUrl}`,
                url: shareUrl,
                title: listing.title,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleSellerPress = () => {
        if (listing?.user_id) {
            router.push(`/profile/${listing.user_id}`);
        }
    };

    const handleListingPress = (selectedListing: Listing) => {
        navigateToListing(selectedListing);
    };

    const handleOpenMaps = () => {
        if (!listing?.location_lat || !listing?.location_lon) return;

        const lat = listing.location_lat;
        const lon = listing.location_lon;
        const label = encodeURIComponent(listing.location || 'Location');

        // Platform-specific URL
        const url = Platform.select({
            ios: `maps://app?daddr=${lat},${lon}&q=${label}`,
            android: `geo:${lat},${lon}?q=${lat},${lon}(${label})`,
            default: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
        });

        if (url) {
            Linking.openURL(url).catch(() => {
                // Fallback to Google Maps web URL if native fails
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`);
            });
        }
    };

    // Loading state
    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={BRAND_COLOR} />
                </View>
            </SafeAreaView>
        );
    }

    // Not found state
    if (!listing) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={80} color={mutedColor} />
                    <Text style={[styles.errorText, { color: textColor }]}>Listing not found</Text>
                    <Pressable style={[styles.backButton, { backgroundColor: BRAND_COLOR }]} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    const isOwnListing = user?.id === listing.user_id;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor }]}>
                    <Pressable onPress={() => router.back()} style={styles.headerButton}>
                        <Ionicons name="chevron-back" size={28} color={textColor} />
                    </Pressable>
                    <View style={styles.headerRight}>
                        <Pressable onPress={handleToggleFavorite} style={styles.headerButton}>
                            <Ionicons
                                name={isFavorite ? "heart" : "heart-outline"}
                                size={24}
                                color={isFavorite ? COLORS.favorite : textColor}
                            />
                        </Pressable>
                        <Pressable onPress={handleShare} style={styles.headerButton}>
                            <Ionicons name="share-outline" size={24} color={textColor} />
                        </Pressable>
                    </View>
                </View>

                {/* Divider line */}
                <View style={[styles.headerDivider, { backgroundColor: borderColor }]} />

                {/* Seller Header */}
                <SellerHeader
                    seller={sellerProfile}
                    createdAt={listing.created_at}
                    onPress={handleSellerPress}
                />

                {/* Image Carousel */}
                <ImageCarousel images={listing.images || []} />

                {/* Details Section */}
                <View style={[styles.detailsContainer, { backgroundColor: cardBg }]}>
                    {/* Title and Price */}
                    <View style={styles.titleSection}>
                        <Text style={[styles.title, { color: textColor }]}>{listing.title}</Text>
                        <Text style={[styles.price, { color: textColor }]}>
                            {formatPrice(listing.price, listing.currency)}
                        </Text>
                    </View>

                    {/* Status Badge */}
                    {listing.status !== 'active' && (
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: listing.status === 'sold' ? COLORS.statusSold : COLORS.statusInactive }
                        ]}>
                            <MaterialIcons
                                name={listing.status === 'sold' ? 'check-circle' : 'remove-circle'}
                                size={16}
                                color="white"
                            />
                            <Text style={styles.statusText}>
                                {listing.status === 'sold' ? 'Sold' : 'Unavailable'}
                            </Text>
                        </View>
                    )}

                    {/* Description */}
                    <View style={styles.descriptionSection}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Description</Text>
                        <Text style={[styles.description, { color: textColor }]}>
                            {listing.description}
                        </Text>

                        {/* WhatsApp & Call Buttons - shown if contact info exists */}
                        {(listing.phone_number || listing.whatsapp_number) && listing.status !== 'sold' && !isOwnListing && (
                            <View style={styles.contactButtonsRow}>
                                {(listing.whatsapp_number || listing.phone_number) && (
                                    <Pressable
                                        style={[styles.contactButton, { backgroundColor: COLORS.whatsappButton }]}
                                        onPress={handleWhatsApp}
                                    >
                                        <Ionicons name="logo-whatsapp" size={20} color="white" />
                                        <Text style={styles.contactButtonText}>WhatsApp</Text>
                                    </Pressable>
                                )}
                                {listing.phone_number && (
                                    <Pressable
                                        style={[styles.contactButton, { backgroundColor: COLORS.callButton }]}
                                        onPress={handleCall}
                                    >
                                        <Ionicons name="call" size={20} color="white" />
                                        <Text style={styles.contactButtonText}>Call</Text>
                                    </Pressable>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Location Section - with map if coordinates exist */}
                    {listing.location_lat && listing.location_lon && (
                        <View style={styles.locationSection}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Location</Text>
                            <LocationPreviewCard
                                location={listing.location}
                                coordinates={{
                                    latitude: listing.location_lat,
                                    longitude: listing.location_lon
                                }}
                                radius={1000}
                                onPress={handleOpenMaps}
                                tapHintText="Open in Maps"
                            />
                        </View>
                    )}

                    {/* Location Section - text only if no coordinates */}
                    {!listing.location_lat && listing.location && (
                        <View style={styles.locationSection}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Location</Text>
                            <View style={styles.locationTextOnly}>
                                <Ionicons name="location-outline" size={18} color={placeholderColor} />
                                <Text style={[styles.locationAddress, { color: textColor }]}>
                                    {listing.location}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Listed By Section */}
                    {sellerProfile && (
                        <ListedBySection
                            seller={sellerProfile}
                            activeListingsCount={sellerListings.length + 1}
                            onPress={handleSellerPress}
                        />
                    )}
                </View>

                {/* More from this seller Section */}
                <MoreFromSellerSection
                    listings={sellerListings}
                    onListingPress={handleListingPress}
                    onViewAllPress={handleSellerPress}
                    isLoading={sellerListingsLoading}
                />
            </ScrollView>

            {/* Contact Bar - Chat Only */}
            <ContactBar
                onChat={handleChat}
                isStartingChat={isStartingChat}
                isVisible={listing.status !== 'sold' && !isOwnListing}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.sm,
    },
    headerButton: {
        padding: SPACING.sm,
    },
    headerRight: {
        flexDirection: 'row',
        gap: SPACING.xs,
    },
    headerDivider: {
        height: 1,
        marginHorizontal: SPACING.lg,
    },
    detailsContainer: {
        padding: SPACING.lg,
        borderTopLeftRadius: BORDER_RADIUS.round,
        borderTopRightRadius: BORDER_RADIUS.round,
        marginTop: -20,
    },
    titleSection: {
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: SPACING.sm,
    },
    price: {
        fontSize: 22,
        fontWeight: '700',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.lg,
        gap: SPACING.xs,
    },
    statusText: {
        color: 'white',
        fontWeight: '600',
    },
    descriptionSection: {
        marginBottom: SPACING.xl,
    },
    locationSection: {
        marginBottom: SPACING.xl,
    },
    locationTextOnly: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    locationAddress: {
        fontSize: 16,
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: SPACING.sm,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
    },
    contactButtonsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.lg,
    },
    contactButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: BORDER_RADIUS.md,
        gap: 6,
    },
    contactButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    backButton: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xxl,
        borderRadius: BORDER_RADIUS.sm,
    },
    backButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
