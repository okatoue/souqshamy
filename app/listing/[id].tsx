import categoriesData from '@/assets/categories.json';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useFavorites } from '@/hooks/useFavorites';
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
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalImageIndex, setModalImageIndex] = useState(0);

    // Favorites
    const { isFavorite, toggleFavorite } = useFavorites();
    const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
    const [localIsFavorite, setLocalIsFavorite] = useState(false);

    // Animation values
    const translateY = useSharedValue(0);

    // Theme colors
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'text');
    const cardBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
    const secondaryBg = useThemeColor({ light: '#f5f5f5', dark: '#2a2a2a' }, 'background');
    const placeholderColor = useThemeColor({ light: '#999', dark: '#666' }, 'text');

    useEffect(() => {
        fetchListing();
    }, [params.id]);

    // Sync favorite state when listing loads
    useEffect(() => {
        if (listing) {
            setLocalIsFavorite(isFavorite(listing.id));
        }
    }, [listing, isFavorite]);

    const fetchListing = async () => {
        if (!params.id) return;

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('listings')
                .select('*')
                .eq('id', params.id)
                .single();

            if (error) throw error;

            setListing(data);

            // Track this listing as recently viewed
            if (data?.id) {
                addToRecentlyViewed(data.id);
            }
        } catch (error) {
            console.error('Error fetching listing:', error);
            Alert.alert('Error', 'Failed to load listing');
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
            const cleanNumber = listing.phone_number.replace(/\D/g, '');
            const whatsappUrl = `whatsapp://send?phone=${cleanNumber}`;

            Linking.openURL(whatsappUrl).catch(err =>
                Alert.alert('Error', 'WhatsApp is not installed')
            );
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
                    <View style={styles.headerSide}>
                        <Pressable onPress={() => router.back()} style={styles.headerButton}>
                            <Ionicons name="arrow-back" size={24} color={textColor} />
                        </Pressable>
                    </View>
                    <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
                        {listing.title}
                    </Text>
                    <View style={[styles.headerSide, styles.headerRightButtons]}>
                        <Pressable onPress={handleToggleFavorite} style={styles.headerButton} disabled={isTogglingFavorite}>
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
            {listing.status !== 'sold' && listing.phone_number && (
                <View style={[styles.contactBar, { backgroundColor: cardBg, borderTopColor: borderColor }]}>
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
                                <Ionicons name="close" size={28} color="white" />
                            </Pressable>
                            <FlatList
                                data={listing.images}
                                renderItem={renderModalImage}
                                keyExtractor={(item, index) => index.toString()}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerSide: {
        width: 80,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerButton: {
        padding: 8,
    },
    headerRightButtons: {
        justifyContent: 'flex-end',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
    image: {
        width: screenWidth,
        height: 300,
    },
    imagePlaceholder: {
        width: screenWidth,
        height: 250,
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
        paddingVertical: 10,
        position: 'absolute',
        bottom: 10,
        width: '100%',
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        marginHorizontal: 4,
    },
    paginationDotActive: {
        backgroundColor: 'white',
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
        fontWeight: 'bold',
        marginBottom: 8,
    },
    price: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginBottom: 16,
    },
    categoryIcon: {
        fontSize: 14,
        marginRight: 6,
    },
    categoryText: {
        fontSize: 14,
    },
    metaInfo: {
        paddingVertical: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        marginBottom: 16,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    metaText: {
        marginLeft: 8,
        fontSize: 15,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginBottom: 16,
    },
    statusText: {
        color: 'white',
        fontWeight: '600',
        marginLeft: 4,
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    contactButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 10,
        marginHorizontal: 6,
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
        marginLeft: 8,
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