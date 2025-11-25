// ... existing imports
import categoriesData from '@/assets/categories.json';
import { useThemeColor } from '@/hooks/use-theme-color';
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
    // ... existing state
    const params = useLocalSearchParams<{ id: string }>();
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalImageIndex, setModalImageIndex] = useState(0);

    // Animation values
    const translateY = useSharedValue(0);

    // Theme colors
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'text');
    const secondaryBg = useThemeColor({ light: '#f5f5f5', dark: '#1a1a1a' }, 'background');
    const placeholderColor = useThemeColor({ light: '#999', dark: '#666' }, 'text');

    useEffect(() => {
        fetchListingDetails();
    }, [params.id]);

    // Reset animation when modal opens
    useEffect(() => {
        if (modalVisible) {
            translateY.value = 0;
        }
    }, [modalVisible]);

    const fetchListingDetails = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('listings')
                .select('*')
                .eq('id', params.id)
                .single();

            if (error) throw error;

            setListing(data);

            if (data?.id) {
                addToRecentlyViewed(data.id);
            }
        } catch (error) {
            console.error('Error fetching listing:', error);
            Alert.alert('Error', 'Failed to load listing details');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const getCategoryInfo = (categoryId: number, subcategoryId: number) => {
        const category = categoriesData.categories.find(c => c.id === categoryId);
        const subcategory = category?.subcategories.find(s => s.id === subcategoryId);

        return {
            categoryName: category?.name,
            categoryIcon: category?.icon,
            subcategoryName: subcategory?.name
        };
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
        return date.toLocaleDateString();
    };

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
            // Remove any non-digit characters and add country code if needed
            const cleanNumber = listing.phone_number.replace(/\D/g, '');
            const whatsappUrl = `whatsapp://send?phone=${cleanNumber}`;

            Linking.openURL(whatsappUrl).catch(err =>
                Alert.alert('Error', 'WhatsApp is not installed')
            );
        }
    };

    const handleShare = () => {
        // You can implement share functionality here
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
            // Close if swiped down significantly or with velocity
            if (e.translationY > 100 || e.velocityY > 500) {
                runOnJS(closeImageModal)();
            } else {
                // Reset position if not closed
                translateY.value = withSpring(0);
            }
        });

    const animatedModalStyle = useAnimatedStyle(() => {
        // Interpolate opacity based on swipe distance
        const opacity = 1 - Math.abs(translateY.value) / screenHeight;
        return {
            transform: [{ translateY: translateY.value }],
            backgroundColor: `rgba(0, 0, 0, ${Math.max(0, opacity * 0.95)})`,
        };
    });

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            </SafeAreaView>
        );
    }

    if (!listing) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={64} color={placeholderColor} />
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

    const renderImageItem = ({ item, index }: { item: string; index: number }) => (
        <Pressable onPress={() => openImageModal(index)}>
            <Image source={{ uri: item }} style={styles.image} />
        </Pressable>
    );

    const renderModalImage = ({ item }: { item: string }) => (
        <View style={styles.modalImageContainer}>
            <Image
                source={{ uri: item }}
                style={styles.modalImage}
                resizeMode="contain"
            />
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: borderColor }]}>
                    <Pressable onPress={() => router.back()} style={styles.headerButton}>
                        <Ionicons name="arrow-back" size={24} color={textColor} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
                        {listing.title}
                    </Text>
                    <Pressable onPress={handleShare} style={styles.headerButton}>
                        <Ionicons name="share-outline" size={24} color={textColor} />
                    </Pressable>
                </View>

                {/* Images */}
                {listing.images && listing.images.length > 0 ? (
                    <View>
                        <FlatList
                            data={listing.images}
                            renderItem={renderImageItem}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={(event) => {
                                const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                                setCurrentImageIndex(newIndex);
                            }}
                            keyExtractor={(item, index) => index.toString()}
                        />
                        {listing.images.length > 1 && (
                            <View style={styles.imageIndicator}>
                                <Text style={styles.imageIndicatorText}>
                                    {currentImageIndex + 1} / {listing.images.length}
                                </Text>
                            </View>
                        )}
                        {/* Tap to view hint */}
                        <View style={styles.tapHint}>
                            <Ionicons name="expand" size={16} color="white" />
                            <Text style={styles.tapHintText}>Tap image to view full size</Text>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.imagePlaceholder, { backgroundColor: secondaryBg }]}>
                        <MaterialIcons name="image" size={80} color={placeholderColor} />
                        <Text style={[styles.noImageText, { color: placeholderColor }]}>No image available</Text>
                    </View>
                )}

                {/* Main Content */}
                <View style={styles.content}>
                    {/* Title and Price */}
                    <View style={styles.titlePriceSection}>
                        <Text style={[styles.title, { color: textColor }]}>{listing.title}</Text>
                        <Text style={[styles.price, { color: textColor }]}>
                            {listing.currency === 'SYP' ? 'SYP ' : '$'}
                            {listing.price.toLocaleString()}
                        </Text>
                    </View>

                    {/* Category Badge */}
                    <View style={[styles.categoryBadge, { backgroundColor: secondaryBg }]}>
                        <Text style={styles.categoryIcon}>{categoryIcon}</Text>
                        <Text style={[styles.categoryText, { color: textColor }]}>
                            {categoryName} › {subcategoryName}
                        </Text>
                    </View>

                    {/* Location and Date */}
                    <View style={[styles.metaInfo, { borderTopColor: borderColor, borderBottomColor: borderColor }]}>
                        <View style={styles.metaRow}>
                            <Ionicons name="location-outline" size={18} color={placeholderColor} />
                            <Text style={[styles.metaText, { color: textColor }]}>{listing.location}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Ionicons name="time-outline" size={18} color={placeholderColor} />
                            <Text style={[styles.metaText, { color: placeholderColor }]}>
                                Posted {formatDate(listing.created_at)}
                            </Text>
                        </View>
                    </View>

                    {/* Status Badge */}
                    {listing.status === 'sold' && (
                        <View style={[styles.statusBadge, { backgroundColor: '#FF9800' }]}>
                            <MaterialCommunityIcons name="check-circle" size={16} color="white" />
                            <Text style={styles.statusText}>SOLD</Text>
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
            {listing.status === 'active' && listing.phone_number && (
                <View style={[styles.contactButtons, { backgroundColor, borderTopColor: borderColor }]}>
                    <Pressable
                        style={[styles.contactButton, styles.callButton]}
                        onPress={handleCall}
                    >
                        <Ionicons name="call" size={20} color="white" />
                        <Text style={styles.contactButtonText}>Call</Text>
                    </Pressable>

                    <Pressable
                        style={[styles.contactButton, styles.whatsappButton]}
                        onPress={handleWhatsApp}
                    >
                        <Ionicons name="logo-whatsapp" size={20} color="white" />
                        <Text style={styles.contactButtonText}>WhatsApp</Text>
                    </Pressable>
                </View>
            )}

            {/* Full Screen Image Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={closeImageModal}
            >
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <GestureDetector gesture={panGesture}>
                        <Animated.View style={[styles.modalContainer, animatedModalStyle]}>
                            {/* Close Button */}
                            <Pressable style={styles.modalCloseButton} onPress={closeImageModal}>
                                <Ionicons name="close-circle" size={36} color="white" />
                            </Pressable>

                            {/* Image Counter */}
                            {listing.images && listing.images.length > 1 && (
                                <View style={styles.modalCounter}>
                                    <Text style={styles.modalCounterText}>
                                        {modalImageIndex + 1} / {listing.images.length}
                                    </Text>
                                </View>
                            )}

                            {/* Full Screen Images */}
                            {listing.images && (
                                <FlatList
                                    data={listing.images}
                                    renderItem={renderModalImage}
                                    horizontal
                                    pagingEnabled
                                    showsHorizontalScrollIndicator={false}
                                    initialScrollIndex={modalImageIndex}
                                    onMomentumScrollEnd={(event) => {
                                        const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                                        setModalImageIndex(newIndex);
                                    }}
                                    keyExtractor={(item, index) => index.toString()}
                                    getItemLayout={(data, index) => ({
                                        length: screenWidth,
                                        offset: screenWidth * index,
                                        index,
                                    })}
                                />
                            )}

                            {/* Instructions */}
                            <View style={styles.modalInstructions}>
                                <Text style={styles.modalInstructionsText}>Swipe down to close</Text>
                            </View>
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
        marginTop: 10,
        marginBottom: 20,
    },
    backButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#007AFF',
        borderRadius: 8,
    },
    backButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerButton: {
        padding: 4,
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        marginHorizontal: 16,
        textAlign: 'center',
    },
    image: {
        width: screenWidth,
        height: 300,
        resizeMode: 'cover',
    },
    imageIndicator: {
        position: 'absolute',
        bottom: 40,
        right: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    imageIndicatorText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    tapHint: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    tapHintText: {
        color: 'white',
        fontSize: 12,
    },
    imagePlaceholder: {
        width: screenWidth,
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noImageText: {
        marginTop: 10,
        fontSize: 16,
    },
    content: {
        padding: 16,
        paddingBottom: 100, // Add padding for contact buttons
    },
    titlePriceSection: {
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    price: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 16,
        alignSelf: 'flex-start',
    },
    categoryIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    categoryText: {
        fontSize: 14,
    },
    metaInfo: {
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        marginBottom: 16,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
    },
    metaText: {
        fontSize: 14,
        marginLeft: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: 16,
    },
    statusText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    descriptionSection: {
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
    },
    contactButtons: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        gap: 12,
    },
    contactButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 8,
        gap: 8,
    },
    callButton: {
        backgroundColor: '#007AFF',
    },
    whatsappButton: {
        backgroundColor: '#25D366',
    },
    contactButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        // backgroundColor removed to be controlled by Animated
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 1000,
        padding: 10,
    },
    modalCounter: {
        position: 'absolute',
        top: 60,
        left: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 1000,
    },
    modalCounterText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    modalImageContainer: {
        width: screenWidth,
        height: screenHeight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalImage: {
        width: screenWidth,
        height: screenHeight * 0.8,
    },
    modalInstructions: {
        position: 'absolute',
        bottom: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    modalInstructionsText: {
        color: 'white',
        fontSize: 14,
    },
});