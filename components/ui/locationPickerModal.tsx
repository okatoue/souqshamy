import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

interface LocationPickerModalProps {
    visible: boolean;
    currentLocation: string;
    currentRadius: number; // in km
    currentCoordinates?: { latitude: number; longitude: number };
    onConfirm: (location: string, coordinates: { latitude: number; longitude: number }, radius: number) => void;
    onClose: () => void;
}

interface SearchResult {
    place_id: string;
    display_name: string;
    lat: string;
    lon: string;
}

const RADIUS_OPTIONS = [1, 2, 5, 10, 25, 50, 100, 200];

export default function LocationPickerModal({
    visible,
    currentLocation,
    currentRadius,
    currentCoordinates,
    onConfirm,
    onClose
}: LocationPickerModalProps) {
    const webViewRef = useRef<WebView>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [isMapReady, setIsMapReady] = useState(false);

    const [selectedCoordinate, setSelectedCoordinate] = useState({
        latitude: currentCoordinates?.latitude || 33.5138,
        longitude: currentCoordinates?.longitude || 36.2765,
    });
    const [selectedLocationName, setSelectedLocationName] = useState(currentLocation || 'Damascus');
    const [radius, setRadius] = useState(currentRadius || 25);

    // Theme colors
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');
    const overlayBg = useThemeColor({ light: 'rgba(255, 255, 255, 0.98)', dark: 'rgba(28, 28, 30, 0.98)' }, 'background');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'text');
    const searchInputBg = useThemeColor({ light: '#f0f0f0', dark: '#2c2c2e' }, 'background');
    const cardBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');

    // Common Syrian cities
    const quickLocations = [
        { name: 'Damascus', lat: 33.5138, lon: 36.2765 },
        { name: 'Aleppo', lat: 36.2021, lon: 37.1343 },
        { name: 'Homs', lat: 34.7324, lon: 36.7137 },
        { name: 'Latakia', lat: 35.5318, lon: 35.7904 },
        { name: 'Tartus', lat: 34.8846, lon: 35.8866 },
        { name: 'Hama', lat: 35.1318, lon: 36.7518 },
    ];

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setSelectedLocationName(currentLocation || 'Damascus');
            setRadius(currentRadius || 25);
            if (currentCoordinates) {
                setSelectedCoordinate(currentCoordinates);
            }
        }
    }, [visible, currentLocation, currentRadius, currentCoordinates]);

    // Update radius circle when radius changes
    useEffect(() => {
        if (isMapReady && webViewRef.current) {
            webViewRef.current.injectJavaScript(`
                updateRadius(${radius * 1000});
                true;
            `);
        }
    }, [radius, isMapReady]);

    const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { margin: 0; padding: 0; overflow: hidden; }
        #map { height: 100vh; width: 100vw; }
        .leaflet-control-attribution { display: none !important; }
        .custom-marker {
          background: #007AFF;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { 
          zoomControl: false,
          attributionControl: false
        }).setView([${selectedCoordinate.latitude}, ${selectedCoordinate.longitude}], 11);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);
        
        // Custom marker icon
        var markerIcon = L.divIcon({
          className: 'custom-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        
        var marker = L.marker([${selectedCoordinate.latitude}, ${selectedCoordinate.longitude}], {
          icon: markerIcon
        }).addTo(map);
        
        // Radius circle
        var radiusCircle = L.circle([${selectedCoordinate.latitude}, ${selectedCoordinate.longitude}], {
          radius: ${radius * 1000},
          color: '#007AFF',
          fillColor: '#007AFF',
          fillOpacity: 0.15,
          weight: 2
        }).addTo(map);
        
        // Notify React Native that map is ready
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
        
        // Handle map clicks
        map.on('click', function(e) {
          var lat = e.latlng.lat;
          var lng = e.latlng.lng;
          
          marker.setLatLng([lat, lng]);
          radiusCircle.setLatLng([lat, lng]);
          
          // Reverse geocode
          fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lng + '&format=json&accept-language=en')
            .then(response => response.json())
            .then(data => {
              var locationName = data.address.city || 
                                data.address.town || 
                                data.address.village || 
                                data.address.suburb ||
                                data.address.county ||
                                data.display_name.split(',')[0] ||
                                'Selected Location';
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'locationSelected',
                lat: lat,
                lng: lng,
                name: locationName
              }));
            })
            .catch(error => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'locationSelected',
                lat: lat,
                lng: lng,
                name: 'Selected Location'
              }));
            });
        });
        
        function moveToLocation(lat, lng, zoom) {
          map.setView([lat, lng], zoom || 11);
          marker.setLatLng([lat, lng]);
          radiusCircle.setLatLng([lat, lng]);
        }
        
        function updateRadius(radiusMeters) {
          radiusCircle.setRadius(radiusMeters);
          // Fit map to show the circle
          map.fitBounds(radiusCircle.getBounds(), { padding: [20, 20] });
        }
      </script>
    </body>
    </html>
    `;

    const handleWebViewMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'locationSelected') {
                setSelectedCoordinate({ latitude: data.lat, longitude: data.lng });
                setSelectedLocationName(data.name);
            } else if (data.type === 'mapReady') {
                setIsMapReady(true);
            }
        } catch (error) {
            console.error('Error parsing WebView message:', error);
        }
    };

    const searchLocation = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setShowSearchResults(true);
        Keyboard.dismiss();

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `q=${encodeURIComponent(searchQuery)},Syria&` +
                `format=json&limit=5&` +
                `bounded=1&` +
                `viewbox=35.7,32.3,42.4,37.3&` +
                `accept-language=en`
            );

            if (response.ok) {
                const data = await response.json();
                setSearchResults(data);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const selectSearchResult = (result: SearchResult) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        setSelectedCoordinate({ latitude: lat, longitude: lon });
        setSelectedLocationName(result.display_name.split(',')[0]);
        setShowSearchResults(false);
        setSearchQuery('');

        webViewRef.current?.injectJavaScript(`
            moveToLocation(${lat}, ${lon}, 11);
            true;
        `);
    };

    const handleQuickLocation = (location: typeof quickLocations[0]) => {
        setSelectedCoordinate({ latitude: location.lat, longitude: location.lon });
        setSelectedLocationName(location.name);

        webViewRef.current?.injectJavaScript(`
            moveToLocation(${location.lat}, ${location.lon}, 11);
            true;
        `);
    };

    const handleConfirm = () => {
        onConfirm(selectedLocationName, selectedCoordinate, radius);
        onClose();
    };

    const getRadiusLabel = (km: number) => {
        if (km < 1) return `${km * 1000}m`;
        return `${km} km`;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor }]}>
                <SafeAreaView style={styles.container}>
                    <KeyboardAvoidingView
                        style={styles.container}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        {/* Header */}
                        <View style={[styles.header, { borderBottomColor: borderColor }]}>
                            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                                <Ionicons name="close" size={28} color={textColor} />
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: textColor }]}>
                                Set Location
                            </Text>
                            <View style={styles.headerButton} />
                        </View>

                        {/* Search Bar */}
                        <View style={styles.searchWrapper}>
                            <View style={[styles.searchContainer, { backgroundColor: searchInputBg }]}>
                                <Ionicons name="search" size={20} color={iconColor} />
                                <TextInput
                                    style={[styles.searchInput, { color: textColor }]}
                                    placeholder="Search city or area..."
                                    placeholderTextColor={iconColor}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    onSubmitEditing={searchLocation}
                                    returnKeyType="search"
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Ionicons name="close-circle" size={20} color={iconColor} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Quick Locations */}
                        <View style={styles.quickLocationsWrapper}>
                            <FlatList
                                data={quickLocations}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item.name}
                                contentContainerStyle={styles.quickLocationsContent}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.quickLocationChip,
                                            {
                                                backgroundColor: selectedLocationName === item.name ? tintColor : cardBg,
                                                borderColor: selectedLocationName === item.name ? tintColor : borderColor
                                            }
                                        ]}
                                        onPress={() => handleQuickLocation(item)}
                                    >
                                        <Text style={[
                                            styles.quickLocationText,
                                            { color: selectedLocationName === item.name ? 'white' : textColor }
                                        ]}>
                                            {item.name}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>

                        {/* Map */}
                        <View style={styles.mapContainer}>
                            <WebView
                                ref={webViewRef}
                                source={{ html: mapHTML }}
                                style={styles.map}
                                onMessage={handleWebViewMessage}
                                scrollEnabled={false}
                                javaScriptEnabled={true}
                            />

                            {/* Search Results Overlay */}
                            {showSearchResults && (
                                <View style={[styles.searchResultsContainer, { backgroundColor: overlayBg }]}>
                                    {isSearching ? (
                                        <View style={styles.loadingContainer}>
                                            <ActivityIndicator size="small" color={tintColor} />
                                            <Text style={[styles.loadingText, { color: textColor }]}>
                                                Searching...
                                            </Text>
                                        </View>
                                    ) : searchResults.length > 0 ? (
                                        <FlatList
                                            data={searchResults}
                                            keyExtractor={(item) => item.place_id}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    style={[styles.searchResultItem, { borderBottomColor: borderColor }]}
                                                    onPress={() => selectSearchResult(item)}
                                                >
                                                    <Ionicons name="location" size={20} color={tintColor} />
                                                    <Text style={[styles.searchResultText, { color: textColor }]} numberOfLines={2}>
                                                        {item.display_name}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        />
                                    ) : (
                                        <View style={styles.noResultsContainer}>
                                            <Text style={[styles.noResultsText, { color: iconColor }]}>
                                                No results found
                                            </Text>
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={styles.closeSearchButton}
                                        onPress={() => setShowSearchResults(false)}
                                    >
                                        <Text style={[styles.closeSearchText, { color: tintColor }]}>
                                            Close
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Bottom Panel */}
                        <View style={[styles.bottomPanel, { backgroundColor: cardBg, borderTopColor: borderColor }]}>
                            {/* Selected Location */}
                            <View style={styles.selectedLocationRow}>
                                <View style={[styles.locationIconContainer, { backgroundColor: `${tintColor}20` }]}>
                                    <Ionicons name="location" size={24} color={tintColor} />
                                </View>
                                <View style={styles.locationTextContainer}>
                                    <Text style={[styles.locationLabel, { color: iconColor }]}>Selected Location</Text>
                                    <Text style={[styles.selectedLocationText, { color: textColor }]} numberOfLines={1}>
                                        {selectedLocationName}
                                    </Text>
                                </View>
                            </View>

                            {/* Radius Slider */}
                            <View style={styles.radiusSection}>
                                <View style={styles.radiusHeader}>
                                    <Text style={[styles.radiusLabel, { color: textColor }]}>Search Radius</Text>
                                    <View style={[styles.radiusBadge, { backgroundColor: `${tintColor}20` }]}>
                                        <Text style={[styles.radiusValue, { color: tintColor }]}>
                                            {getRadiusLabel(radius)}
                                        </Text>
                                    </View>
                                </View>

                                <Slider
                                    style={styles.slider}
                                    minimumValue={0}
                                    maximumValue={RADIUS_OPTIONS.length - 1}
                                    step={1}
                                    value={RADIUS_OPTIONS.indexOf(radius) !== -1 ? RADIUS_OPTIONS.indexOf(radius) : 4}
                                    onValueChange={(value) => setRadius(RADIUS_OPTIONS[Math.round(value)])}
                                    minimumTrackTintColor={tintColor}
                                    maximumTrackTintColor={borderColor}
                                    thumbTintColor={tintColor}
                                />

                                <View style={styles.radiusMarkers}>
                                    <Text style={[styles.radiusMarkerText, { color: iconColor }]}>1 km</Text>
                                    <Text style={[styles.radiusMarkerText, { color: iconColor }]}>200 km</Text>
                                </View>
                            </View>

                            {/* Confirm Button */}
                            <TouchableOpacity
                                style={[styles.confirmButton, { backgroundColor: tintColor }]}
                                onPress={handleConfirm}
                            >
                                <Ionicons name="checkmark" size={22} color="white" style={{ marginRight: 8 }} />
                                <Text style={styles.confirmButtonText}>Apply Location</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    searchWrapper: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: 48,
        borderRadius: 12,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
    },
    quickLocationsWrapper: {
        paddingBottom: 8,
    },
    quickLocationsContent: {
        paddingHorizontal: 16,
    },
    quickLocationChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
    },
    quickLocationText: {
        fontSize: 14,
        fontWeight: '500',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    searchResultsContainer: {
        position: 'absolute',
        top: 8,
        left: 16,
        right: 16,
        maxHeight: 250,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
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
        borderBottomWidth: 1,
    },
    searchResultText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
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
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    closeSearchText: {
        fontSize: 15,
        fontWeight: '600',
    },
    bottomPanel: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 10 : 20,
        borderTopWidth: 1,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    selectedLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    locationIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    locationTextContainer: {
        flex: 1,
    },
    locationLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    selectedLocationText: {
        fontSize: 17,
        fontWeight: '600',
    },
    radiusSection: {
        marginBottom: 20,
    },
    radiusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    radiusLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    radiusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    radiusValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    slider: {
        width: '100%',
        height: 40,
    },
    radiusMarkers: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -4,
    },
    radiusMarkerText: {
        fontSize: 12,
    },
    confirmButton: {
        flexDirection: 'row',
        height: 54,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButtonText: {
        color: 'white',
        fontSize: 17,
        fontWeight: '600',
    },
});