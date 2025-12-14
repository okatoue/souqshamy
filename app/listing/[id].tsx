import { FavoriteButton } from '@/components/favorites/favoriteButton';
import { BORDER_RADIUS, BRAND_COLOR, COLORS, SHADOWS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useConversations } from '@/hooks/useConversations';
import { useFavoriteToggle } from '@/hooks/useFavoriteToggle';
import { useAuth } from '@/lib/auth_context';
import { formatDate, formatPrice, formatRelativeTime, getCategoryInfo, getDisplayName, getYearsSince, UserProfile } from '@/lib/formatters';
import { getThumbnailUrl } from '@/lib/imageUtils';
import { addToRecentlyViewed } from '@/lib/recentlyViewed';
import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/listing';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// Placeholder rating - TODO: Replace when rating system is implemented
const PLACEHOLDER_RATING = 5.0;
const PLACEHOLDER_REVIEW_COUNT = 0;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ListingDetailScreen() {
    const params = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalImageIndex, setModalImageIndex] = useState(0);

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

    // Animated value for modal swipe
    const translateY = useSharedValue(0);

    // Theme colors
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const secondaryBg = useThemeColor({}, 'backgroundSecondary');
    const cardBg = useThemeColor({}, 'cardBackground');
    const borderColor = useThemeColor({}, 'border');
    const placeholderColor = useThemeColor({}, 'textSecondary');
    const mutedColor = useThemeColor({}, 'textMuted');

    // Fetch listing data
    useEffect(() => {
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
    }, [params.id, user?.id]);

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
        if (listing?.phone_number) {
            const cleanNumber = listing.phone_number.replace(/\D/g, '');
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

    const handleShare = () => {
        Alert.alert('Share', 'Share functionality coming soon!');
    };

    const handleSellerPress = () => {
        if (listing?.user_id) {
            // Navigate to seller profile - placeholder route for now
            router.push(`/profile/${listing.user_id}`);
        }
    };

    const openImageModal = (index: number) => {
        setModalImageIndex(index);
        setModalVisible(true);
    };

    const closeImageModal = () => {
        setModalVisible(false);
    };

    // Gesture Handler for Swipe Down
    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            translateY.value = e.translationY;
        })
        .onEnd((e) => {
            if (e.translationY > 100 || e.velocityY > 500) {
                runOnJS(closeImageModal)();
            } else {
                translateY.value = withSpring(0);
            }
        });

    const animatedModalStyle = useAnimatedStyle(() => {
        const opacity = 1 - Math.abs(translateY.value) / screenHeight;
        return {
            transform: [{ translateY: translateY.value }],
            backgroundColor: `rgba(0, 0, 0, ${Math.max(0, opacity * 0.95)})`,
        };
    });

    const renderImageItem = ({ item, index }: { item: string; index: number }) => (
        <Pressable onPress={() => openImageModal(index)}>
            <Image
                source={{ uri: item }}
                style={styles.listingImage}
                resizeMode="cover"
            />
        </Pressable>
    );

    const renderModalImageItem = ({ item }: { item: string }) => (
        <View style={styles.modalImageContainer}>
            <Image
                source={{ uri: item }}
                style={styles.modalImage}
                resizeMode="contain"
            />
        </View>
    );

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

    const { categoryName, categoryIcon, subcategoryName } = getCategoryInfo(
        listing.category_id,
        listing.subcategory_id
    );

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

                {/* Seller Header - Compact bar above images */}
                {sellerProfile ? (
                    <Pressable
                        style={styles.sellerHeader}
                        onPress={handleSellerPress}
                    >
                        {/* Seller Avatar */}
                        {sellerProfile.avatar_url ? (
                            <Image
                                source={{ uri: getThumbnailUrl(sellerProfile.avatar_url, 80, 80) }}
                                style={styles.sellerHeaderAvatar}
                            />
                        ) : (
                            <View style={[styles.sellerHeaderAvatarPlaceholder, { backgroundColor: secondaryBg }]}>
                                <MaterialCommunityIcons name="account" size={20} color={placeholderColor} />
                            </View>
                        )}

                        {/* Seller Name and Rating */}
                        <View style={styles.sellerHeaderInfo}>
                            <Text style={[styles.sellerHeaderName, { color: textColor }]} numberOfLines={1}>
                                {getDisplayName(sellerProfile)}
                            </Text>
                            <View style={styles.sellerHeaderRating}>
                                <Text style={[styles.sellerHeaderRatingText, { color: mutedColor }]}>
                                    {PLACEHOLDER_RATING.toFixed(1)} ★
                                </Text>
                            </View>
                        </View>

                        {/* Posted time */}
                        <Text style={[styles.sellerHeaderTime, { color: mutedColor }]}>
                            {formatRelativeTime(listing.created_at)}
                        </Text>

                        <Ionicons name="chevron-forward" size={18} color={mutedColor} />
                    </Pressable>
                ) : (
                    /* Seller Header Loading Skeleton */
                    <View style={styles.sellerHeader}>
                        <View style={[styles.sellerHeaderAvatarPlaceholder, styles.skeletonPulse, { backgroundColor: borderColor }]} />
                        <View style={styles.sellerHeaderInfo}>
                            <View style={[styles.skeletonText, styles.skeletonPulse, { backgroundColor: borderColor, width: 100 }]} />
                            <View style={[styles.skeletonTextSmall, styles.skeletonPulse, { backgroundColor: borderColor, width: 50, marginTop: 4 }]} />
                        </View>
                        <View style={[styles.skeletonTextSmall, styles.skeletonPulse, { backgroundColor: borderColor, width: 80 }]} />
                    </View>
                )}

                {/* Images */}
                {listing.images && listing.images.length > 0 ? (
                    <View style={styles.imageCarouselContainer}>
                        <FlatList
                            data={listing.images}
                            renderItem={renderImageItem}
                            keyExtractor={(_, index) => index.toString()}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={(e) => {
                                const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                                setCurrentImageIndex(index);
                            }}
                        />
                        {listing.images.length > 1 && (
                            <View style={styles.pagination}>
                                <View style={styles.paginationPill}>
                                    {listing.images.map((_, index) => (
                                        <View
                                            key={index}
                                            style={[
                                                styles.paginationDot,
                                                index === currentImageIndex
                                                    ? styles.paginationDotActive
                                                    : styles.paginationDotInactive
                                            ]}
                                        />
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={[styles.imagePlaceholder, { backgroundColor: secondaryBg }]}>
                        <MaterialIcons name="image" size={80} color={placeholderColor} />
                        <Text style={[styles.placeholderText, { color: placeholderColor }]}>No images</Text>
                    </View>
                )}

                {/* Details Section */}
                <View style={[styles.detailsContainer, { backgroundColor: cardBg }]}>
                    {/* Title and Price */}
                    <View style={styles.titleSection}>
                        <Text style={[styles.title, { color: textColor }]}>{listing.title}</Text>
                        <Text style={[styles.price, { color: textColor }]}>
                            {formatPrice(listing.price, listing.currency)}
                        </Text>
                    </View>

                    {/* Category */}
                    <View style={styles.categoryRow}>
                        <Text style={styles.categoryIcon}>{categoryIcon}</Text>
                        <Text style={[styles.categoryText, { color: placeholderColor }]}>
                            {categoryName} › {subcategoryName}
                        </Text>
                    </View>

                    {/* Location and Date */}
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="location-outline" size={16} color={placeholderColor} />
                            <Text style={[styles.metaText, { color: placeholderColor }]}>
                                {listing.location}
                            </Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={16} color={placeholderColor} />
                            <Text style={[styles.metaText, { color: placeholderColor }]}>
                                {formatDate(listing.created_at)}
                            </Text>
                        </View>
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
                    </View>

                    {/* Listed By Section */}
                    {sellerProfile && (
                        <Pressable
                            style={[styles.listedBySection, { borderColor }]}
                            onPress={handleSellerPress}
                        >
                            <Text style={[styles.sectionTitle, { color: textColor, marginBottom: SPACING.md }]}>
                                Listed by
                            </Text>
                            <View style={styles.listedByContent}>
                                {/* Large Seller Avatar */}
                                {sellerProfile.avatar_url ? (
                                    <Image
                                        source={{ uri: getThumbnailUrl(sellerProfile.avatar_url, 140, 140) }}
                                        style={styles.listedByAvatar}
                                    />
                                ) : (
                                    <View style={[styles.listedByAvatarPlaceholder, { backgroundColor: secondaryBg }]}>
                                        <MaterialCommunityIcons name="account" size={36} color={placeholderColor} />
                                    </View>
                                )}

                                {/* Seller Details */}
                                <View style={styles.listedByInfo}>
                                    <Text style={[styles.listedByName, { color: textColor }]} numberOfLines={1}>
                                        {getDisplayName(sellerProfile)}
                                    </Text>

                                    {/* Star Rating */}
                                    <View style={styles.listedByRating}>
                                        <Text style={styles.listedByStars}>★★★★★</Text>
                                        <Text style={[styles.listedByRatingValue, { color: textColor }]}>
                                            {PLACEHOLDER_RATING.toFixed(1)}
                                        </Text>
                                        <Text style={[styles.listedByReviewCount, { color: mutedColor }]}>
                                            ({PLACEHOLDER_REVIEW_COUNT} reviews)
                                        </Text>
                                    </View>

                                    {/* Years on platform and listings count */}
                                    <View style={styles.listedByStats}>
                                        {sellerProfile.created_at && (
                                            <Text style={[styles.listedByStat, { color: mutedColor }]}>
                                                {getYearsSince(sellerProfile.created_at)} yr{getYearsSince(sellerProfile.created_at) > 1 ? 's' : ''} on SouqJari
                                            </Text>
                                        )}
                                        <Text style={[styles.listedByStatDot, { color: mutedColor }]}>•</Text>
                                        <Text style={[styles.listedByStat, { color: mutedColor }]}>
                                            {sellerListings.length + 1} listing{sellerListings.length + 1 > 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                </View>

                                <Ionicons name="chevron-forward" size={20} color={mutedColor} />
                            </View>
                        </Pressable>
                    )}
                </View>

                {/* More from this seller Section */}
                {sellerListings.length > 0 && (
                    <View style={[styles.moreFromSellerSection, { backgroundColor: cardBg }]}>
                        <View style={styles.moreFromSellerHeader}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>
                                More from this seller ({sellerListings.length})
                            </Text>
                            <Pressable onPress={handleSellerPress}>
                                <Text style={[styles.viewAllText, { color: BRAND_COLOR }]}>View all</Text>
                            </Pressable>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.moreFromSellerScroll}
                        >
                            {sellerListings.map((sellerListing) => (
                                <Pressable
                                    key={sellerListing.id}
                                    style={({ pressed }) => [
                                        styles.sellerListingCard,
                                        { backgroundColor: secondaryBg, borderColor },
                                        pressed && styles.sellerListingCardPressed,
                                    ]}
                                    onPress={() => router.push(`/listing/${sellerListing.id}`)}
                                >
                                    {/* Image with Favorite Button */}
                                    <View style={styles.sellerListingImageContainer}>
                                        {sellerListing.images && sellerListing.images.length > 0 ? (
                                            <Image
                                                source={{ uri: getThumbnailUrl(sellerListing.images[0], 300, 200, 75) }}
                                                style={styles.sellerListingImage}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={[styles.sellerListingImagePlaceholder, { backgroundColor: placeholderColor }]}>
                                                <MaterialIcons name="image" size={30} color={mutedColor} />
                                            </View>
                                        )}
                                        <View style={styles.sellerListingFavorite}>
                                            <FavoriteButton
                                                listingId={sellerListing.id}
                                                size={18}
                                                variant="overlay"
                                            />
                                        </View>
                                    </View>

                                    {/* Details */}
                                    <View style={styles.sellerListingDetails}>
                                        <Text style={[styles.sellerListingPrice, { color: BRAND_COLOR }]}>
                                            {formatPrice(sellerListing.price, sellerListing.currency)}
                                        </Text>
                                        <Text style={[styles.sellerListingTitle, { color: textColor }]} numberOfLines={2}>
                                            {sellerListing.title}
                                        </Text>
                                        <Text style={[styles.sellerListingLocation, { color: mutedColor }]} numberOfLines={1}>
                                            {sellerListing.location}
                                        </Text>
                                    </View>
                                </Pressable>
                            ))}

                            {/* View All Card */}
                            <Pressable
                                style={[styles.viewAllCard, { backgroundColor: secondaryBg, borderColor }]}
                                onPress={handleSellerPress}
                            >
                                <Ionicons name="arrow-forward-circle" size={40} color={BRAND_COLOR} />
                                <Text style={[styles.viewAllCardText, { color: BRAND_COLOR }]}>View all</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                )}

                {/* Loading state for seller listings */}
                {sellerListingsLoading && sellerListings.length === 0 && (
                    <View style={[styles.sellerListingsLoading, { backgroundColor: cardBg }]}>
                        <ActivityIndicator size="small" color={BRAND_COLOR} />
                    </View>
                )}
            </ScrollView>

            {/* Contact Buttons - Fixed at bottom */}
            {listing.status !== 'sold' && !isOwnListing && (
                <View style={[styles.contactBar, { backgroundColor: cardBg, borderTopColor: borderColor }]}>
                    {/* Chat Button */}
                    <Pressable
                        style={[styles.contactButton, { backgroundColor: COLORS.chatButton }]}
                        onPress={handleChat}
                        disabled={isStartingChat}
                    >
                        {isStartingChat ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <>
                                <Ionicons name="chatbubble" size={20} color="white" />
                                <Text style={styles.contactButtonText}>Chat</Text>
                            </>
                        )}
                    </Pressable>

                    {/* Call Button */}
                    {listing.phone_number && (
                        <Pressable
                            style={[styles.contactButton, { backgroundColor: COLORS.callButton }]}
                            onPress={handleCall}
                        >
                            <Ionicons name="call" size={20} color="white" />
                            <Text style={styles.contactButtonText}>Call</Text>
                        </Pressable>
                    )}

                    {/* WhatsApp Button */}
                    {listing.phone_number && (
                        <Pressable
                            style={[styles.contactButton, { backgroundColor: COLORS.whatsappButton }]}
                            onPress={handleWhatsApp}
                        >
                            <Ionicons name="logo-whatsapp" size={20} color="white" />
                            <Text style={styles.contactButtonText}>WhatsApp</Text>
                        </Pressable>
                    )}
                </View>
            )}

            {/* Image Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={closeImageModal}
            >
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <GestureDetector gesture={panGesture}>
                        <Animated.View style={[styles.modalContainer, animatedModalStyle]}>
                            <Pressable style={styles.closeButton} onPress={closeImageModal}>
                                <Ionicons name="close" size={30} color="white" />
                            </Pressable>
                            <FlatList
                                data={listing.images || []}
                                renderItem={renderModalImageItem}
                                keyExtractor={(_, index) => index.toString()}
                                horizontal
                                pagingEnabled
                                initialScrollIndex={modalImageIndex}
                                getItemLayout={(_, index) => ({
                                    length: screenWidth,
                                    offset: screenWidth * index,
                                    index,
                                })}
                            />
                        </Animated.View>
                    </GestureDetector>
                </GestureHandlerRootView>
            </Modal>
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
    listingImage: {
        width: screenWidth,
        height: 300,
    },
    imagePlaceholder: {
        width: screenWidth,
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        marginTop: SPACING.sm,
        fontSize: 14,
    },
    imageCarouselContainer: {
        position: 'relative',
    },
    pagination: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    paginationPill: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.lg,
        gap: SPACING.xs,
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    paginationDotActive: {
        backgroundColor: BRAND_COLOR,
    },
    paginationDotInactive: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
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
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    categoryIcon: {
        fontSize: 18,
        marginRight: SPACING.sm,
    },
    categoryText: {
        fontSize: 14,
    },
    metaRow: {
        flexDirection: 'row',
        gap: SPACING.xl,
        marginBottom: SPACING.lg,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    metaText: {
        fontSize: 14,
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: SPACING.sm,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
    },
    contactBar: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        borderTopWidth: 1,
        gap: SPACING.sm,
    },
    contactButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
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
    // Modal styles
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    modalImageContainer: {
        width: screenWidth,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalImage: {
        width: screenWidth,
        height: screenHeight * 0.8,
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: SPACING.sm,
    },
    // Header divider
    headerDivider: {
        height: 1,
        marginHorizontal: SPACING.lg,
    },
    // Seller Header styles (compact bar above images)
    sellerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    sellerHeaderAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    sellerHeaderAvatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sellerHeaderInfo: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    sellerHeaderName: {
        fontSize: 15,
        fontWeight: '600',
    },
    sellerHeaderRating: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    sellerHeaderRatingText: {
        fontSize: 13,
    },
    sellerHeaderTime: {
        fontSize: 12,
        marginRight: SPACING.sm,
    },
    // Skeleton loading styles
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
    // Listed By section styles
    listedBySection: {
        paddingTop: SPACING.lg,
        borderTopWidth: 1,
        marginTop: SPACING.md,
    },
    listedByContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    listedByAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    listedByAvatarPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listedByInfo: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    listedByName: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
    },
    listedByRating: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    listedByStars: {
        fontSize: 14,
        color: '#FFB800',
        marginRight: SPACING.xs,
    },
    listedByRatingValue: {
        fontSize: 14,
        fontWeight: '600',
        marginRight: SPACING.xs,
    },
    listedByReviewCount: {
        fontSize: 13,
    },
    listedByStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    listedByStat: {
        fontSize: 13,
    },
    listedByStatDot: {
        marginHorizontal: SPACING.sm,
    },
    // More from this seller section styles
    moreFromSellerSection: {
        paddingVertical: SPACING.lg,
        marginTop: SPACING.md,
    },
    moreFromSellerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: '500',
    },
    moreFromSellerScroll: {
        paddingHorizontal: SPACING.lg,
        gap: SPACING.md,
    },
    sellerListingCard: {
        width: 160,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        overflow: 'hidden',
        ...SHADOWS.card,
    },
    sellerListingCardPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }],
    },
    sellerListingImageContainer: {
        position: 'relative',
    },
    sellerListingImage: {
        width: '100%',
        height: 110,
    },
    sellerListingImagePlaceholder: {
        width: '100%',
        height: 110,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sellerListingFavorite: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
    },
    sellerListingDetails: {
        padding: SPACING.md,
    },
    sellerListingPrice: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    sellerListingTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
        lineHeight: 18,
    },
    sellerListingLocation: {
        fontSize: 11,
    },
    viewAllCard: {
        width: 100,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    viewAllCardText: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: SPACING.sm,
    },
    sellerListingsLoading: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SPACING.md,
    },
});
