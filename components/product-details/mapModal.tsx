import { BRAND_COLOR, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { useLocationSearch, useReverseGeocode } from '@/components/ui/locationPickerModal/hooks';
import { MAP_HTML } from './mapHtml';

interface MapModalProps {
    visible: boolean;
    currentLocation: string | null;
    onSelectLocation: (location: string, coordinates: { latitude: number; longitude: number }) => void;
    onClose: () => void;
}

export default function MapModal({
    visible,
    currentLocation,
    onSelectLocation,
    onClose
}: MapModalProps) {
    const insets = useSafeAreaInsets();
    const webViewRef = useRef<WebView>(null);
    const searchInputRef = useRef<TextInput>(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);

    const [selectedCoordinate, setSelectedCoordinate] = useState({
        latitude: 33.5138,
        longitude: 36.2765,
    });
    const [selectedLocationName, setSelectedLocationName] = useState(currentLocation || 'دمشق');

    // Use shared hooks
    const { reverseGeocode } = useReverseGeocode();
    const {
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        showSearchResults,
        setShowSearchResults,
        searchLocation,
        clearSearch,
    } = useLocationSearch();

    // Theme colors
    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');
    const cardBg = useThemeColor({ light: 'rgba(255, 255, 255, 0.95)', dark: 'rgba(28, 28, 30, 0.95)' }, 'background');
    const textColor = useThemeColor({}, 'text');
    const borderColor = useThemeColor({ light: 'rgba(0,0,0,0.1)', dark: 'rgba(255,255,255,0.1)' }, 'text');

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setSelectedLocationName(currentLocation || 'دمشق');
            setIsMapReady(false);
            clearSearch();
            setIsSearchFocused(false);
        }
    }, [visible, currentLocation, clearSearch]);

    // Initialize map when ready
    useEffect(() => {
        if (isMapReady && webViewRef.current) {
            webViewRef.current.injectJavaScript(`
                initMap(${selectedCoordinate.latitude}, ${selectedCoordinate.longitude});
                true;
            `);
        }
    }, [isMapReady]);

    const handleWebViewMessage = useCallback(async (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === 'mapReady') {
                setIsMapReady(true);
            } else if (data.type === 'locationTapped') {
                setSelectedCoordinate({ latitude: data.lat, longitude: data.lng });
                setSelectedLocationName('جاري التحميل...');
                const locationName = await reverseGeocode(data.lat, data.lng);
                setSelectedLocationName(locationName);
            }
        } catch (error) {
            console.error('Error parsing WebView message:', error);
        }
    }, [reverseGeocode]);

    const selectSearchResult = useCallback((result: { place_id: string; display_name: string; lat: string; lon: string }) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        setSelectedCoordinate({ latitude: lat, longitude: lon });
        setSelectedLocationName(result.display_name.split(',')[0]);
        setShowSearchResults(false);
        clearSearch();
        setIsSearchFocused(false);

        webViewRef.current?.injectJavaScript(`
            moveToLocation(${lat}, ${lon}, 12);
            true;
        `);
    }, [setShowSearchResults, clearSearch]);

    const handleSearchFocus = () => {
        setIsSearchFocused(true);
    };

    const handleSearchBlur = () => {
        if (!searchQuery) {
            setIsSearchFocused(false);
        }
    };

    const handleClearSearch = () => {
        clearSearch();
        setIsSearchFocused(false);
        Keyboard.dismiss();
    };

    const handleConfirm = () => {
        onSelectLocation(selectedLocationName, selectedCoordinate);
        onClose();
    };

    const handleUseCurrentLocation = useCallback(async () => {
        setIsFetchingLocation(true);

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please allow location access to use this feature',
                    [{ text: 'OK' }]
                );
                setIsFetchingLocation(false);
                return;
            }

            const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const { latitude, longitude } = position.coords;
            setSelectedCoordinate({ latitude, longitude });

            webViewRef.current?.injectJavaScript(`
                moveToLocation(${latitude}, ${longitude}, 14);
                true;
            `);

            const locationName = await reverseGeocode(latitude, longitude);
            setSelectedLocationName(locationName);
        } catch (error) {
            console.error('Error getting current location:', error);
            Alert.alert('Error', 'Could not get your current location. Please try again.');
        } finally {
            setIsFetchingLocation(false);
        }
    }, [reverseGeocode]);

    const showingSearch = isSearchFocused || searchQuery.length > 0;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Full Screen Map */}
                <WebView
                    ref={webViewRef}
                    source={{ html: MAP_HTML }}
                    style={styles.map}
                    onMessage={handleWebViewMessage}
                    scrollEnabled={false}
                    javaScriptEnabled={true}
                    onLoad={() => setIsMapReady(true)}
                />

                {/* Top Bar */}
                <View style={[styles.topBar, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
                    <View style={styles.topBarRow}>
                        {/* Close Button */}
                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: cardBg }]}
                            onPress={onClose}
                        >
                            <Ionicons name="close" size={24} color={textColor} />
                        </TouchableOpacity>

                        {/* Search Bar / Location Display */}
                        <View style={[styles.searchBar, { backgroundColor: cardBg }]}>
                            <Ionicons
                                name={showingSearch ? "search" : "location"}
                                size={20}
                                color={showingSearch ? iconColor : tintColor}
                            />

                            {showingSearch ? (
                                <TextInput
                                    ref={searchInputRef}
                                    style={[styles.searchInput, { color: textColor, textAlign: 'right' }]}
                                    placeholder="ابحث عن مدينة أو منطقة..."
                                    placeholderTextColor={iconColor}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    onSubmitEditing={searchLocation}
                                    onFocus={handleSearchFocus}
                                    onBlur={handleSearchBlur}
                                    returnKeyType="search"
                                    autoFocus={isSearchFocused && !searchQuery}
                                />
                            ) : (
                                <TouchableOpacity
                                    style={styles.locationDisplay}
                                    onPress={() => {
                                        setIsSearchFocused(true);
                                        setTimeout(() => searchInputRef.current?.focus(), 100);
                                    }}
                                >
                                    <Text style={[styles.locationText, { color: textColor }]} numberOfLines={1}>
                                        {selectedLocationName}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {(showingSearch && searchQuery.length > 0) && (
                                <TouchableOpacity onPress={handleClearSearch}>
                                    <Ionicons name="close-circle" size={20} color={iconColor} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Search Results */}
                    {showSearchResults && (
                        <View style={[styles.searchResultsBubble, { backgroundColor: cardBg }]}>
                            {isSearching ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color={tintColor} />
                                    <Text style={[styles.loadingText, { color: textColor }]}>
                                        جاري البحث...
                                    </Text>
                                </View>
                            ) : searchResults.length > 0 ? (
                                <FlatList
                                    data={searchResults}
                                    keyExtractor={(item) => item.place_id}
                                    keyboardShouldPersistTaps="handled"
                                    renderItem={({ item, index }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.searchResultItem,
                                                index < searchResults.length - 1 && { borderBottomColor: borderColor, borderBottomWidth: 1 }
                                            ]}
                                            onPress={() => selectSearchResult(item)}
                                        >
                                            <Ionicons name="location" size={18} color={tintColor} />
                                            <Text style={[styles.searchResultText, { color: textColor }]} numberOfLines={2}>
                                                {item.display_name}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            ) : (
                                <View style={styles.noResultsContainer}>
                                    <Text style={[styles.noResultsText, { color: iconColor }]}>
                                        لا توجد نتائج
                                    </Text>
                                </View>
                            )}
                            <TouchableOpacity
                                style={[styles.closeSearchButton, { borderTopColor: borderColor }]}
                                onPress={() => {
                                    setShowSearchResults(false);
                                    setIsSearchFocused(false);
                                    clearSearch();
                                }}
                            >
                                <Text style={[styles.closeSearchText, { color: tintColor }]}>
                                    إغلاق
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* My Location Button - floating over map */}
                <TouchableOpacity
                    style={styles.myLocationButton}
                    onPress={handleUseCurrentLocation}
                    disabled={isFetchingLocation}
                >
                    {isFetchingLocation ? (
                        <ActivityIndicator size="small" color={BRAND_COLOR} />
                    ) : (
                        <Ionicons name="locate" size={24} color={BRAND_COLOR} />
                    )}
                </TouchableOpacity>

                {/* Bottom Confirm Button */}
                <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
                    <TouchableOpacity
                        style={[styles.confirmButton, { backgroundColor: tintColor }]}
                        onPress={handleConfirm}
                    >
                        <Ionicons name="checkmark" size={22} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.confirmButtonText}>تأكيد الموقع</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        zIndex: 10,
    },
    topBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    closeButton: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 52,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        height: '100%',
    },
    locationDisplay: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    locationText: {
        fontSize: 16,
        fontWeight: '600',
    },
    searchResultsBubble: {
        marginTop: 12,
        borderRadius: 16,
        maxHeight: 250,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    loadingText: {
        marginLeft: 10,
        fontSize: 14,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    searchResultText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
        textAlign: 'right',
    },
    noResultsContainer: {
        padding: 20,
        alignItems: 'center',
    },
    noResultsText: {
        fontSize: 14,
    },
    closeSearchButton: {
        padding: 14,
        alignItems: 'center',
        borderTopWidth: 1,
    },
    closeSearchText: {
        fontSize: 15,
        fontWeight: '600',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        zIndex: 10,
    },
    confirmButton: {
        flexDirection: 'row',
        height: 54,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    confirmButtonText: {
        color: 'white',
        fontSize: 17,
        fontWeight: '600',
    },
    myLocationButton: {
        position: 'absolute',
        bottom: 100,
        right: SPACING.lg,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
});
