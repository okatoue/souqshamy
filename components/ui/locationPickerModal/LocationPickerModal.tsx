import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Keyboard,
    Modal,
    Platform,
    StyleSheet,
    TextInput,
    View
} from 'react-native';
import MapView, { Circle, PROVIDER_DEFAULT, Region, UrlTile } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    CloseButton,
    ConfirmButton,
    RadiusSlider,
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
import { Coordinates, LocationPickerModalProps, SearchResult } from './types';

// OpenStreetMap tile URL template
const OSM_TILE_URL = 'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';

// Calculate the latitude delta needed to show a given radius in km
function getLatitudeDeltaForRadius(radiusKm: number): number {
    // 1 degree of latitude ≈ 111 km
    // We want the radius to fit comfortably in the view (roughly 35% of view height)
    // So total view should be about radius * 2 / 0.35 ≈ radius * 5.7
    const kmPerDegree = 111;
    return (radiusKm * 5.7) / kmPerDegree;
}

export default function LocationPickerModal({
    visible,
    currentLocation,
    currentRadius,
    currentCoordinates,
    onConfirm,
    onClose
}: LocationPickerModalProps) {
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);
    const searchInputRef = useRef<TextInput>(null);

    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const [selectedCoordinate, setSelectedCoordinate] = useState<Coordinates>({
        latitude: currentCoordinates?.latitude || DEFAULT_COORDINATES.latitude,
        longitude: currentCoordinates?.longitude || DEFAULT_COORDINATES.longitude,
    });
    const [selectedLocationName, setSelectedLocationName] = useState(currentLocation || DEFAULT_LOCATION_NAME);
    const [radius, setRadius] = useState(currentRadius || DEFAULT_RADIUS);
    const [sliderValue, setSliderValue] = useState(currentRadius || DEFAULT_RADIUS);

    const isSlidingRef = useRef(false);
    const isAnimatingRef = useRef(false);

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

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setSelectedLocationName(currentLocation || DEFAULT_LOCATION_NAME);
            setRadius(currentRadius || DEFAULT_RADIUS);
            setSliderValue(currentRadius || DEFAULT_RADIUS);
            isSlidingRef.current = false;
            isAnimatingRef.current = false;
            clearSearch();
            setIsSearchFocused(false);
            if (currentCoordinates) {
                setSelectedCoordinate(currentCoordinates);
            }
        }
    }, [visible, currentLocation, currentRadius, currentCoordinates, clearSearch]);

    // Calculate initial region
    const initialRegion: Region = {
        latitude: currentCoordinates?.latitude || DEFAULT_COORDINATES.latitude,
        longitude: currentCoordinates?.longitude || DEFAULT_COORDINATES.longitude,
        latitudeDelta: getLatitudeDeltaForRadius(currentRadius || DEFAULT_RADIUS),
        longitudeDelta: getLatitudeDeltaForRadius(currentRadius || DEFAULT_RADIUS),
    };

    // Handle map region change (when user pans/zooms)
    const handleRegionChangeComplete = useCallback(async (region: Region) => {
        if (isAnimatingRef.current) {
            isAnimatingRef.current = false;
            return;
        }

        setSelectedCoordinate({
            latitude: region.latitude,
            longitude: region.longitude,
        });

        // Reverse geocode to get location name
        const locationName = await reverseGeocode(region.latitude, region.longitude);
        setSelectedLocationName(locationName);
    }, [reverseGeocode]);

    const handleSliderStart = useCallback(() => {
        isSlidingRef.current = true;
    }, []);

    const handleSliderChange = useCallback((value: number) => {
        setSliderValue(value);
        setRadius(Math.round(value));
    }, []);

    const handleSliderComplete = useCallback((value: number) => {
        const finalValue = Math.round(value);
        setRadius(finalValue);
        setSliderValue(finalValue);

        setTimeout(() => {
            isSlidingRef.current = false;
        }, 400);
    }, []);

    const selectSearchResult = useCallback((result: SearchResult) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        setSelectedCoordinate({ latitude: lat, longitude: lon });
        setSelectedLocationName(result.display_name.split(',')[0]);
        setShowSearchResults(false);
        clearSearch();
        setIsSearchFocused(false);

        // Animate map to new location
        isAnimatingRef.current = true;
        mapRef.current?.animateToRegion({
            latitude: lat,
            longitude: lon,
            latitudeDelta: getLatitudeDeltaForRadius(radius),
            longitudeDelta: getLatitudeDeltaForRadius(radius),
        }, 300);
    }, [setShowSearchResults, clearSearch, radius]);

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
        onConfirm(selectedLocationName, selectedCoordinate, Math.round(radius));
        onClose();
    }, [selectedLocationName, selectedCoordinate, radius, onConfirm, onClose]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Full Screen Map */}
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={PROVIDER_DEFAULT}
                    initialRegion={initialRegion}
                    onRegionChangeComplete={handleRegionChangeComplete}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    showsCompass={false}
                    showsScale={false}
                    toolbarEnabled={false}
                    mapType={Platform.OS === 'android' ? 'none' : 'standard'}
                >
                    {/* OpenStreetMap tiles */}
                    <UrlTile
                        urlTemplate={OSM_TILE_URL}
                        maximumZ={19}
                        minimumZ={5}
                        flipY={false}
                        zIndex={-1}
                    />

                    {/* Radius circle */}
                    <Circle
                        center={selectedCoordinate}
                        radius={radius * 1000} // Convert km to meters
                        strokeColor={tintColor}
                        strokeWidth={2}
                        fillColor="rgba(0, 122, 255, 0.12)"
                    />
                </MapView>

                {/* Fixed Center Pin Overlay */}
                <View style={styles.centerPinContainer} pointerEvents="none">
                    <View style={[styles.centerPinDot, { backgroundColor: tintColor }]} />
                </View>

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
                    <RadiusSlider
                        value={sliderValue}
                        onSlidingStart={handleSliderStart}
                        onValueChange={handleSliderChange}
                        onSlidingComplete={handleSliderComplete}
                    />

                    <ConfirmButton onPress={handleConfirm} />
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
    centerPinContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -8,
        marginTop: -8,
        zIndex: 5,
    },
    centerPinDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
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
    },
});
