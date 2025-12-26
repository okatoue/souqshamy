import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Keyboard,
    Modal,
    StyleSheet,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import {
    CloseButton,
    ConfirmButton,
    CurrentLocationButton,
    SearchBar,
    SearchResults
} from './components';
import {
    DEFAULT_COORDINATES,
    DEFAULT_LOCATION_NAME,
    DEFAULT_RADIUS,
    RADIUS_MAX,
    RADIUS_MIN
} from './constants';
import { useLocationSearch, useReverseGeocode } from './hooks';
import { MAP_HTML } from './mapHtml';
import { Coordinates, LocationPickerModalProps, MapMessage, SearchResult } from './types';

export default function LocationPickerModal({
    visible,
    currentLocation,
    currentRadius,
    currentCoordinates,
    onConfirm,
    onClose
}: LocationPickerModalProps) {
    const insets = useSafeAreaInsets();
    const webViewRef = useRef<WebView>(null);
    const searchInputRef = useRef<TextInput>(null);

    const [isMapReady, setIsMapReady] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

    const [selectedCoordinate, setSelectedCoordinate] = useState<Coordinates>({
        latitude: currentCoordinates?.latitude || DEFAULT_COORDINATES.latitude,
        longitude: currentCoordinates?.longitude || DEFAULT_COORDINATES.longitude,
    });
    const [selectedLocationName, setSelectedLocationName] = useState(currentLocation || DEFAULT_LOCATION_NAME);
    const [radius, setRadius] = useState(currentRadius || DEFAULT_RADIUS);

    const { reverseGeocode } = useReverseGeocode();

    // Handle current location with shared hook
    const handleLocationReceived = useCallback((latitude: number, longitude: number) => {
        setSelectedCoordinate({ latitude, longitude });
        webViewRef.current?.injectJavaScript(`
            moveToLocation(${latitude}, ${longitude}, 14);
            true;
        `);
    }, []);

    const { isFetchingLocation, handleUseCurrentLocation } = useCurrentLocation({
        onLocationReceived: handleLocationReceived,
        reverseGeocode,
        onLocationNameReceived: setSelectedLocationName,
    });
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

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setSelectedLocationName(currentLocation || DEFAULT_LOCATION_NAME);
            setRadius(currentRadius || DEFAULT_RADIUS);
            setIsMapReady(false);
            setIsConfirming(false);
            clearSearch();
            setIsSearchFocused(false);
            if (currentCoordinates) {
                setSelectedCoordinate(currentCoordinates);
            }
        }
    }, [visible, currentLocation, currentRadius, currentCoordinates, clearSearch]);

    // Initialize map when ready
    useEffect(() => {
        if (isMapReady && webViewRef.current) {
            const lat = currentCoordinates?.latitude || DEFAULT_COORDINATES.latitude;
            const lng = currentCoordinates?.longitude || DEFAULT_COORDINATES.longitude;
            const rad = currentRadius || DEFAULT_RADIUS;

            webViewRef.current.injectJavaScript(`
                initMap(${lat}, ${lng}, ${rad});
                true;
            `);
        }
    }, [isMapReady, currentCoordinates, currentRadius]);

    const handleWebViewMessage = useCallback(async (event: { nativeEvent: { data: string } }) => {
        try {
            const data: MapMessage = JSON.parse(event.nativeEvent.data);

            // Log debug messages from WebView
            if (data.type === 'debug') {
                console.log('[WebView Debug]', data.message, data.data || '');
                return;
            }

            if (data.type === 'mapReady') {
                setIsMapReady(true);
            } else if (data.type === 'mapMoved' && data.lat !== undefined && data.lng !== undefined) {
                setSelectedCoordinate({ latitude: data.lat, longitude: data.lng });
                const locationName = await reverseGeocode(data.lat, data.lng);
                setSelectedLocationName(locationName);
            } else if (data.type === 'radiusChanged' && data.radius !== undefined) {
                const newRadius = Math.max(RADIUS_MIN, Math.min(RADIUS_MAX, data.radius));
                setRadius(Math.round(newRadius));
            } else if (data.type === 'centerResponse' && data.lat !== undefined && data.lng !== undefined) {
                // Received fresh coordinates from map - complete the confirm action
                const freshCoordinates = { latitude: data.lat, longitude: data.lng };
                setIsConfirming(false);
                onConfirm(selectedLocationName, freshCoordinates, Math.round(radius));
                onClose();
            }
        } catch (error) {
            console.error('Error parsing WebView message:', error);
            setIsConfirming(false);
        }
    }, [reverseGeocode, selectedLocationName, radius, onConfirm, onClose]);

    const selectSearchResult = useCallback((result: SearchResult) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        setSelectedCoordinate({ latitude: lat, longitude: lon });
        setSelectedLocationName(result.display_name.split(',')[0]);
        setShowSearchResults(false);
        clearSearch();
        setIsSearchFocused(false);

        webViewRef.current?.injectJavaScript(`
            moveToLocation(${lat}, ${lon});
            true;
        `);
    }, [setShowSearchResults, clearSearch]);

    const handleSearchFocus = useCallback(() => {
        setIsSearchFocused(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
    }, []);

    const handleSearchBlur = useCallback(() => {
        if (!searchQuery) {
            setIsSearchFocused(false);
        }
    }, [searchQuery]);

    const handleClearSearch = useCallback(() => {
        clearSearch();
        setIsSearchFocused(false);
        Keyboard.dismiss();
    }, [clearSearch]);

    const handleCloseSearchResults = useCallback(() => {
        setShowSearchResults(false);
        setIsSearchFocused(false);
        clearSearch();
    }, [setShowSearchResults, clearSearch]);

    const handleConfirm = useCallback(() => {
        // Request fresh coordinates from the map to avoid race condition with debounced updates
        setIsConfirming(true);
        webViewRef.current?.injectJavaScript(`getCenter(); true;`);
    }, []);

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
                    domStorageEnabled={true}
                    originWhitelist={['*']}
                    allowFileAccess={true}
                    allowUniversalAccessFromFileURLs={true}
                    mixedContentMode="always"
                    onLoad={() => setIsMapReady(true)}
                    onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('[WebView Error]', nativeEvent);
                    }}
                />

                {/* Top Bar */}
                <View style={[styles.topBar, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
                    <View style={styles.topBarRow}>
                        <CloseButton onPress={onClose} />

                        <SearchBar
                            searchQuery={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmit={searchLocation}
                            onFocus={handleSearchFocus}
                            onBlur={handleSearchBlur}
                            onClear={handleClearSearch}
                            isSearchFocused={isSearchFocused}
                            selectedLocationName={selectedLocationName}
                            inputRef={searchInputRef}
                        />
                    </View>

                    {showSearchResults && (
                        <SearchResults
                            results={searchResults}
                            isSearching={isSearching}
                            onSelectResult={selectSearchResult}
                            onClose={handleCloseSearchResults}
                        />
                    )}
                </View>

                {/* Bottom Floating Elements */}
                <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
                    <CurrentLocationButton
                        onPress={handleUseCurrentLocation}
                        loading={isFetchingLocation}
                    />

                    <ConfirmButton onPress={handleConfirm} loading={isConfirming} />
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
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        zIndex: 10,
        gap: 12,
    },
});
