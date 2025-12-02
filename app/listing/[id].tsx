import { BORDER_RADIUS, BRAND_COLOR, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useConversations } from '@/hooks/useConversations';
import { useFavoriteToggle } from '@/hooks/useFavoriteToggle';
import { useAuth } from '@/lib/auth_context';
import { formatDate, formatPrice, getCategoryInfo } from '@/lib/formatters';
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ListingDetailScreen() {
    const params = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalImageIndex, setModalImageIndex] = useState(0);

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
                </View>
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
        backgroundColor: '#FFFFFF',
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
});
