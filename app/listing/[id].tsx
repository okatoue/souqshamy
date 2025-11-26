import { useThemeColor } from '@/hooks/use-theme-color';
import { useConversations } from '@/hooks/useConversations';
import { useFavorites } from '@/hooks/useFavorites';
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

    // Favorites
    const { isFavorite, toggleFavorite } = useFavorites();
    const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
    const [localIsFavorite, setLocalIsFavorite] = useState(false);

    // Chat
    const { getOrCreateConversation } = useConversations();
    const [isStartingChat, setIsStartingChat] = useState(false);

    // Animated value for modal swipe
    const translateY = useSharedValue(0);

    // Theme colors
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const secondaryBg = useThemeColor({ light: '#f5f5f5', dark: '#1a1a1a' }, 'background');
    const cardBg = useThemeColor({ light: '#fff', dark: '#1e1e1e' }, 'background');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'text');
    const placeholderColor = useThemeColor({ light: '#999', dark: '#666' }, 'text');

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
                setLocalIsFavorite(isFavorite(data.id));

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
    }, [params.id, isFavorite, user?.id]);

    const handleCall = () => {
        if (listing?.phone_number) {
            const phoneUrl = `tel:${listing.phone_number}`;
            Linking.openURL(phoneUrl).catch(err =>
                Alert.alert('Error', 'Unable to make phone call')
            );
        }
    };

    const handleWhatsApp = () => {
        if (listing?.phone_number) {
            const cleanNumber = listing.phone_number.replace(/\D/g, '');
            const whatsappUrl = `whatsapp://send?phone=${cleanNumber}`;

            Linking.openURL(whatsappUrl).catch(err =>
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

    const handleToggleFavorite = async () => {
        if (!listing || isTogglingFavorite) return;

        setIsTogglingFavorite(true);
        // Optimistic update
        setLocalIsFavorite(!localIsFavorite);

        const success = await toggleFavorite(listing.id);

        if (!success) {
            // Revert on failure
            setLocalIsFavorite(localIsFavorite);
        }

        setIsTogglingFavorite(false);
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
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            </SafeAreaView>
        );
    }

    // Not found state
    if (!listing) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={80} color="#666" />
                    <Text style={[styles.errorText, { color: textColor }]}>Listing not found</Text>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
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
                            {isTogglingFavorite ? (
                                <ActivityIndicator size="small" color="#FF3B30" />
                            ) : (
                                <Ionicons
                                    name={localIsFavorite ? "heart" : "heart-outline"}
                                    size={24}
                                    color={localIsFavorite ? "#FF3B30" : textColor}
                                />
                            )}
                        </Pressable>
                        <Pressable onPress={handleShare} style={styles.headerButton}>
                            <Ionicons name="share-outline" size={24} color={textColor} />
                        </Pressable>
                    </View>
                </View>

                {/* Images */}
                {listing.images && listing.images.length > 0 ? (
                    <View>
                        <FlatList
                            data={listing.images}
                            renderItem={renderImageItem}
                            keyExtractor={(item, index) => index.toString()}
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
                                {listing.images.map((_, index) => (
                                    <View
                                        key={index}
                                        style={[
                                            styles.paginationDot,
                                            index === currentImageIndex && styles.paginationDotActive
                                        ]}
                                    />
                                ))}
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
                            { backgroundColor: listing.status === 'sold' ? '#FF9800' : '#D32F2F' }
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
                        style={[styles.contactButton, styles.chatButton]}
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
                            style={[styles.contactButton, styles.callButton]}
                            onPress={handleCall}
                        >
                            <Ionicons name="call" size={20} color="white" />
                            <Text style={styles.contactButtonText}>Call</Text>
                        </Pressable>
                    )}

                    {/* WhatsApp Button */}
                    {listing.phone_number && (
                        <Pressable
                            style={[styles.contactButton, styles.whatsappButton]}
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
                                keyExtractor={(item, index) => index.toString()}
                                horizontal
                                pagingEnabled
                                initialScrollIndex={modalImageIndex}
                                getItemLayout={(data, index) => ({
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
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        marginTop: 16,
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    headerButton: {
        padding: 8,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 4,
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
        marginTop: 8,
        fontSize: 14,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ccc',
        marginHorizontal: 4,
    },
    paginationDotActive: {
        backgroundColor: '#007AFF',
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    detailsContainer: {
        padding: 16,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: -20,
    },
    titleSection: {
        marginBottom: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
    },
    price: {
        fontSize: 22,
        fontWeight: '700',
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    categoryIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    categoryText: {
        fontSize: 14,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 15,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 14,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginBottom: 16,
        gap: 4,
    },
    statusText: {
        color: 'white',
        fontWeight: '600',
    },
    descriptionSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
    },
    contactBar: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderTopWidth: 1,
        gap: 8,
    },
    contactButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 10,
        gap: 6,
    },
    chatButton: {
        backgroundColor: '#FF6B35',
    },
    callButton: {
        backgroundColor: '#007AFF',
    },
    whatsappButton: {
        backgroundColor: '#25D366',
    },
    contactButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    backButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
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
        padding: 8,
    },
});