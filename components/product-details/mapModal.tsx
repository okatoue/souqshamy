import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
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
}

// Using OpenStreetMap.fr HOT tiles with Arabic labels + hard zoom lock
const MAP_HTML = `
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
    var map, marker;
    var isInitialized = false;
    var MAX_ZOOM = 16;
    var MIN_ZOOM = 5;
    
    function initMap(lat, lng) {
      if (isInitialized) return;
      isInitialized = true;
      
      map = L.map('map', { 
        zoomControl: false,
        attributionControl: false,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        bounceAtZoomLimits: false,
        maxBoundsViscosity: 1.0
      }).setView([lat, lng], 12);
      
      // OpenStreetMap French tiles - better international/Arabic label support
      L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        maxZoom: MAX_ZOOM,
        minZoom: MIN_ZOOM
      }).addTo(map);
      
      var markerIcon = L.divIcon({
        className: 'custom-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      
      marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
      
      // Hard zoom lock - prevent any zoom beyond limits
      map.on('zoom', function() {
        if (map.getZoom() > MAX_ZOOM) {
          map.setZoom(MAX_ZOOM);
        }
        if (map.getZoom() < MIN_ZOOM) {
          map.setZoom(MIN_ZOOM);
        }
      });
      
      map.on('click', function(e) {
        var lat = e.latlng.lat;
        var lng = e.latlng.lng;
        
        marker.setLatLng([lat, lng]);
        
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'locationTapped',
          lat: lat,
          lng: lng
        }));
      });
      
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
    }
    
    function moveToLocation(lat, lng, zoom) {
      if (!map) return;
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], Math.min(zoom || 12, MAX_ZOOM), { animate: true, duration: 0.3 });
    }
  </script>
</body>
</html>
`;

export default function MapModal({
    visible,
    currentLocation,
    onSelectLocation,
    onClose
}: MapModalProps) {
    const insets = useSafeAreaInsets();
    const webViewRef = useRef<WebView>(null);
    const searchInputRef = useRef<TextInput>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [isMapReady, setIsMapReady] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const [selectedCoordinate, setSelectedCoordinate] = useState({
        latitude: 33.5138,
        longitude: 36.2765,
    });
    const [selectedLocationName, setSelectedLocationName] = useState(currentLocation || 'دمشق');

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
            setSearchQuery('');
            setShowSearchResults(false);
            setIsSearchFocused(false);
        }
    }, [visible]);

    // Initialize map when ready
    useEffect(() => {
        if (isMapReady && webViewRef.current) {
            webViewRef.current.injectJavaScript(`
                initMap(${selectedCoordinate.latitude}, ${selectedCoordinate.longitude});
                true;
            `);
        }
    }, [isMapReady]);

    // Reverse geocode function - Arabic language
    const reverseGeocode = useCallback(async (lat: number, lng: number) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`
            );
            if (response.ok) {
                const data = await response.json();
                const locationName = data.address?.city ||
                    data.address?.town ||
                    data.address?.village ||
                    data.address?.suburb ||
                    data.address?.county ||
                    data.display_name?.split(',')[0] ||
                    'الموقع المحدد';
                setSelectedLocationName(locationName);
            }
        } catch (error) {
            console.error('Reverse geocode error:', error);
        }
    }, []);

    const handleWebViewMessage = useCallback((event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === 'mapReady') {
                setIsMapReady(true);
            } else if (data.type === 'locationTapped') {
                setSelectedCoordinate({ latitude: data.lat, longitude: data.lng });
                setSelectedLocationName('جاري التحميل...');
                reverseGeocode(data.lat, data.lng);
            }
        } catch (error) {
            console.error('Error parsing WebView message:', error);
        }
    }, [reverseGeocode]);

    // Search with Arabic results
    const searchLocation = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setShowSearchResults(true);
        Keyboard.dismiss();

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `q=${encodeURIComponent(searchQuery)},سوريا&` +
                `format=json&limit=5&` +
                `bounded=1&` +
                `viewbox=35.7,32.3,42.4,37.3&` +
                `accept-language=ar`
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

    const selectSearchResult = useCallback((result: SearchResult) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        setSelectedCoordinate({ latitude: lat, longitude: lon });
        setSelectedLocationName(result.display_name.split(',')[0]);
        setShowSearchResults(false);
        setSearchQuery('');
        setIsSearchFocused(false);

        webViewRef.current?.injectJavaScript(`
            moveToLocation(${lat}, ${lon}, 12);
            true;
        `);
    }, []);

    const handleSearchFocus = () => {
        setIsSearchFocused(true);
    };

    const handleSearchBlur = () => {
        if (!searchQuery) {
            setIsSearchFocused(false);
        }
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setShowSearchResults(false);
        setIsSearchFocused(false);
        Keyboard.dismiss();
    };

    const handleConfirm = () => {
        onSelectLocation(selectedLocationName, selectedCoordinate);
        onClose();
    };

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
                                    setSearchQuery('');
                                }}
                            >
                                <Text style={[styles.closeSearchText, { color: tintColor }]}>
                                    إغلاق
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

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
});