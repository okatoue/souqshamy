import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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

interface MapModalProps {
    visible: boolean;
    currentLocation: string;
    onSelectLocation: (location: string, coordinates: { latitude: number; longitude: number }) => void;
    onClose: () => void;
}

interface SearchResult {
    place_id: string;
    display_name: string;
    lat: string;
    lon: string;
    type?: string;
}

export default function MapModal({
    visible,
    currentLocation,
    onSelectLocation,
    onClose
}: MapModalProps) {
    const webViewRef = useRef<WebView>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [selectedCoordinate, setSelectedCoordinate] = useState({
        latitude: 33.5138, // Damascus center
        longitude: 36.2765,
    });
    const [selectedLocationName, setSelectedLocationName] = useState(currentLocation);

    // Theme colors
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');
    const overlayBg = useThemeColor({ light: 'rgba(255, 255, 255, 0.95)', dark: 'rgba(28, 28, 30, 0.95)' }, 'background');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'text');
    const searchInputBg = useThemeColor({ light: '#f0f0f0', dark: '#2c2c2e' }, 'background');

    // Common Syrian cities for quick access
    const quickLocations = [
        { name: 'Damascus', lat: 33.5138, lon: 36.2765 },
        { name: 'Aleppo', lat: 36.2021, lon: 37.1343 },
        { name: 'Homs', lat: 34.7324, lon: 36.7137 },
        { name: 'Latakia', lat: 35.5318, lon: 35.7904 },
        { name: 'Tartus', lat: 34.8846, lon: 35.8866 },
        { name: 'Deir ez-Zor', lat: 35.3333, lon: 40.1500 },
    ];

    // HTML for the Leaflet map
    const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; }
        .leaflet-control-attribution { display: none; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        // Initialize map centered on Damascus
        var map = L.map('map', { zoomControl: false }).setView([${selectedCoordinate.latitude}, ${selectedCoordinate.longitude}], 12);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);
        
        // Current marker
        var marker = L.marker([${selectedCoordinate.latitude}, ${selectedCoordinate.longitude}]).addTo(map);
        
        // Handle map clicks
        map.on('click', function(e) {
          var lat = e.latlng.lat;
          var lng = e.latlng.lng;
          
          // Update marker position
          marker.setLatLng([lat, lng]);
          
          // Reverse geocode to get location name
          fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lng + '&format=json')
            .then(response => response.json())
            .then(data => {
              var locationName = data.address.city || 
                                data.address.town || 
                                data.address.village || 
                                data.address.suburb ||
                                data.display_name.split(',')[0] ||
                                'Selected Location';
              
              // Send location back to React Native
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
        
        // Function to move to a location (called from React Native)
        function moveToLocation(lat, lng, zoom) {
          map.setView([lat, lng], zoom || 14);
          marker.setLatLng([lat, lng]);
        }
      </script>
    </body>
    </html>
  `;

    const searchLocation = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setShowSearchResults(true);
        Keyboard.dismiss();

        try {
            // Using Nominatim API (free OSM geocoding)
            // Adding Syria bounding box to prioritize Syrian results
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `q=${encodeURIComponent(searchQuery)},Syria&` +
                `format=json&limit=5&` +
                `bounded=1&` +
                `viewbox=35.7,32.3,42.4,37.3` // Syria bounding box
            );

            if (response.ok) {
                const data = await response.json();
                setSearchResults(data);
            } else {
                Alert.alert('Search Error', 'Could not search for locations');
            }
        } catch (error) {
            Alert.alert('Network Error', 'Please check your internet connection');
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

        // Move map to selected location
        webViewRef.current?.injectJavaScript(`
      moveToLocation(${lat}, ${lon}, 14);
      true;
    `);
    };

    const handleQuickLocation = (location: typeof quickLocations[0]) => {
        setSelectedCoordinate({ latitude: location.lat, longitude: location.lon });
        setSelectedLocationName(location.name);

        // Move map to selected location
        webViewRef.current?.injectJavaScript(`
      moveToLocation(${location.lat}, ${location.lon}, 12);
      true;
    `);
    };

    const handleWebViewMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'locationSelected') {
                setSelectedCoordinate({ latitude: data.lat, longitude: data.lng });
                setSelectedLocationName(data.name);
            }
        } catch (error) {
            console.error('Error parsing WebView message:', error);
        }
    };

    const confirmLocation = () => {
        onSelectLocation(selectedLocationName, selectedCoordinate);
        onClose();
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
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        {/* Map View */}
                        <View style={styles.mapContainer}>
                            <WebView
                                ref={webViewRef}
                                style={styles.map}
                                source={{ html: mapHTML }}
                                onMessage={handleWebViewMessage}
                                javaScriptEnabled={true}
                                domStorageEnabled={true}
                                startInLoadingState={true}
                                renderLoading={() => (
                                    <View style={[styles.loadingContainer, { backgroundColor }]}>
                                        <ActivityIndicator size="large" color={tintColor} />
                                        <Text style={[styles.loadingText, { color: textColor }]}>Loading map...</Text>
                                    </View>
                                )}
                            />
                        </View>

                        {/* Top Overlay: Search & Close */}
                        <View style={styles.topOverlay}>
                            <View style={styles.headerRow}>
                                <TouchableOpacity
                                    onPress={onClose}
                                    style={[styles.iconButton, { backgroundColor: overlayBg }]}
                                >
                                    <Ionicons name="close" size={24} color={textColor} />
                                </TouchableOpacity>

                                <View style={[styles.searchContainer, { backgroundColor: overlayBg }]}>
                                    <Ionicons name="search" size={20} color={iconColor} style={styles.searchIcon} />
                                    <TextInput
                                        style={[styles.searchInput, { color: textColor }]}
                                        placeholder="Search location..."
                                        placeholderTextColor="#999"
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        onSubmitEditing={searchLocation}
                                        returnKeyType="search"
                                    />
                                    {isSearching && <ActivityIndicator size="small" color={tintColor} />}
                                </View>
                            </View>

                            {/* Quick Locations */}
                            <View style={styles.quickLocationsWrapper}>
                                <FlatList
                                    horizontal
                                    data={quickLocations}
                                    keyExtractor={(item) => item.name}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.quickLocationsContent}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.quickLocationChip,
                                                { backgroundColor: overlayBg, borderColor: borderColor }
                                            ]}
                                            onPress={() => handleQuickLocation(item)}
                                        >
                                            <Text style={[styles.quickLocationText, { color: tintColor }]}>
                                                {item.name}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>

                            {/* Search Results Dropdown */}
                            {showSearchResults && searchResults.length > 0 && (
                                <View style={[styles.searchResultsContainer, { backgroundColor: overlayBg }]}>
                                    <FlatList
                                        data={searchResults}
                                        keyExtractor={(item) => item.place_id}
                                        keyboardShouldPersistTaps="handled"
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={[styles.searchResultItem, { borderBottomColor: borderColor }]}
                                                onPress={() => selectSearchResult(item)}
                                            >
                                                <Ionicons name="location-outline" size={18} color={iconColor} />
                                                <Text style={[styles.searchResultText, { color: textColor }]} numberOfLines={2}>
                                                    {item.display_name}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    />
                                </View>
                            )}
                        </View>

                        {/* Bottom Overlay: Confirmation */}
                        <View style={[styles.bottomOverlay, { backgroundColor: overlayBg, borderTopColor: borderColor }]}>
                            <View style={styles.locationInfo}>
                                <View style={[styles.locationIconContainer, { backgroundColor: searchInputBg }]}>
                                    <Ionicons name="location" size={24} color={tintColor} />
                                </View>
                                <View style={styles.locationTextContainer}>
                                    <Text style={[styles.locationLabel, { color: iconColor }]}>Selected Location</Text>
                                    <Text style={[styles.selectedLocationText, { color: textColor }]} numberOfLines={1}>
                                        {selectedLocationName}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.confirmButton, { backgroundColor: tintColor }]}
                                onPress={confirmLocation}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.confirmButtonText}>Confirm Location</Text>
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
    mapContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
    map: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
    },
    topOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
        gap: 12,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    quickLocationsWrapper: {
        paddingLeft: 16,
    },
    quickLocationsContent: {
        paddingRight: 16,
        paddingBottom: 8,
    },
    quickLocationChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    quickLocationText: {
        fontSize: 14,
        fontWeight: '600',
    },
    searchResultsContainer: {
        position: 'absolute',
        top: 60, // Below header row
        left: 16,
        right: 16,
        maxHeight: 250,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    searchResultText: {
        fontSize: 15,
        marginLeft: 12,
        flex: 1,
    },
    bottomOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 20 : 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    locationInfo: {
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
        marginRight: 16,
    },
    locationTextContainer: {
        flex: 1,
    },
    locationLabel: {
        fontSize: 12,
        marginBottom: 4,
        fontWeight: '500',
    },
    selectedLocationText: {
        fontSize: 18,
        fontWeight: '700',
    },
    confirmButton: {
        width: '100%',
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});