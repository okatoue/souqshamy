import { BORDER_RADIUS, BRAND_COLOR, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface ImageCarouselProps {
    images: string[];
}

export function ImageCarousel({ images }: ImageCarouselProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalImageIndex, setModalImageIndex] = useState(0);

    const secondaryBg = useThemeColor({}, 'backgroundSecondary');
    const placeholderColor = useThemeColor({}, 'textSecondary');

    // Animated value for modal swipe
    const translateY = useSharedValue(0);

    const openImageModal = (index: number) => {
        setModalImageIndex(index);
        setModalVisible(true);
    };

    const closeImageModal = () => {
        setModalVisible(false);
        translateY.value = 0;
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
                style={styles.image}
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

    // Empty state
    if (!images || images.length === 0) {
        return (
            <View style={[styles.placeholder, { backgroundColor: secondaryBg }]}>
                <MaterialIcons name="image" size={80} color={placeholderColor} />
                <Text style={[styles.placeholderText, { color: placeholderColor }]}>No images</Text>
            </View>
        );
    }

    return (
        <>
            <View style={styles.container}>
                <FlatList
                    data={images}
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
                {images.length > 1 && (
                    <View style={styles.pagination}>
                        <View style={styles.paginationPill}>
                            {images.map((_, index) => (
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

            {/* Fullscreen Modal */}
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
                                data={images}
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
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    image: {
        width: screenWidth,
        height: 300,
    },
    placeholder: {
        width: screenWidth,
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        marginTop: SPACING.sm,
        fontSize: 14,
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

export default ImageCarousel;
