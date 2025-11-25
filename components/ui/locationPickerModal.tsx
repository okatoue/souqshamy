import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
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

interface LocationPickerModalProps {
    visible: boolean;
    currentLocation: string;
    currentRadius: number;
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

const RADIUS_MIN = 1;
const RADIUS_MAX = 200;

// KEY FIX: zoomSnap: 0 enables fractional zoom levels
// Without this, Leaflet snaps to integers (zoom 7, 8, 9...) 
// which creates huge gaps (e.g., zoom 8 = 71km, zoom 7 = 143km, nothing in between)
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
    
    .center-marker {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
      pointer-events: none;
    }
    .center-marker-dot {
      width: 16px;
      height: 16px;
      background: #007AFF;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    
    .radius-circle-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 70vmin;
      height: 70vmin;
      border: 2px solid #007AFF;
      border-radius: 50%;
      background: rgba(0, 122, 255, 0.12);
      z-index: 999;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="radius-circle-overlay"></div>
  <div class="center-marker">
    <div class="center-marker-dot"></div>
  </div>
  <script>
    var map;
    var isInitialized = false;
    var MIN_ZOOM = 5;
    var moveDebounceTimer = null;
    var sliderActive = false;
    
    function getCircleRadiusPx() {
      var containerSize = Math.min(window.innerWidth, window.innerHeight);
      return containerSize * 0.35;
    }
    
    // Calculate meters per pixel at a given zoom and latitude
    function getMetersPerPixel(zoom, lat) {
      return 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);
    }
    
    // Calculate what radius (in km) the circle represents at a given zoom
    function getRadiusAtZoom(zoom, lat) {
      var metersPerPx = getMetersPerPixel(zoom, lat);
      var radiusMeters = getCircleRadiusPx() * metersPerPx;
      return radiusMeters / 1000;
    }
    
    // Calculate the zoom level needed for a target radius
    function getZoomForRadius(targetRadiusKm, lat) {
      // Solve for zoom: radius = circleRadiusPx * 156543.03392 * cos(lat) / 2^zoom
      // 2^zoom = circleRadiusPx * 156543.03392 * cos(lat) / (radius * 1000)
      // zoom = log2(circleRadiusPx * 156543.03392 * cos(lat) / (radius * 1000))
      
      var circleRadiusPx = getCircleRadiusPx();
      var targetRadiusMeters = targetRadiusKm * 1000;
      var cosLat = Math.cos(lat * Math.PI / 180);
      
      var zoom = Math.log2(circleRadiusPx * 156543.03392 * cosLat / targetRadiusMeters);
      
      return zoom;
    }
    
    // Calculate max zoom where circle = 1km
    function calculateMaxZoomFor1km(lat) {
      return getZoomForRadius(1, lat);
    }
    
    function updateMaxZoom() {
      if (!map) return;
      var center = map.getCenter();
      var maxZoom = calculateMaxZoomFor1km(center.lat);
      map.setMaxZoom(maxZoom);
    }
    
    function initMap(lat, lng, radiusKm) {
      if (isInitialized) return;
      isInitialized = true;
      
      var initialMaxZoom = calculateMaxZoomFor1km(lat);
      
      map = L.map('map', { 
        zoomControl: false,
        attributionControl: false,
        minZoom: MIN_ZOOM,
        maxZoom: initialMaxZoom,
        // THIS IS THE KEY FIX: Enable fractional zoom levels
        zoomSnap: 0,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 120,
        bounceAtZoomLimits: false
      }).setView([lat, lng], 10);
      
      L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        maxZoom: 19,
        minZoom: MIN_ZOOM
      }).addTo(map);
      
      // Set initial zoom for the radius
      var initialZoom = getZoomForRadius(radiusKm, lat);
      initialZoom = Math.max(MIN_ZOOM, Math.min(initialMaxZoom, initialZoom));
      map.setZoom(initialZoom, { animate: false });
      
      // Update max zoom when map moves (latitude changes affect the calculation)
      map.on('moveend', function() {
        updateMaxZoom();
        
        if (moveDebounceTimer) clearTimeout(moveDebounceTimer);
        moveDebounceTimer = setTimeout(function() {
          var center = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapMoved',
            lat: center.lat,
            lng: center.lng
          }));
        }, 300);
      });
      
      // Send radius updates when user zooms (not from slider)
      map.on('zoomend', function() {
        if (sliderActive) return;
        sendRadiusUpdate();
      });
      
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
    }
    
    function getVisibleRadiusKm() {
      if (!map) return 25;
      
      var center = map.getCenter();
      var zoom = map.getZoom();
      var radiusKm = getRadiusAtZoom(zoom, center.lat);
      
      return Math.max(1, Math.min(200, radiusKm));
    }
    
    function sendRadiusUpdate() {
      if (sliderActive) return;
      var radiusKm = getVisibleRadiusKm();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'radiusChanged',
        radius: radiusKm
      }));
    }
    
    function setZoomForRadius(targetRadiusKm) {
      if (!map) return;
      
      var center = map.getCenter();
      var maxZoom = calculateMaxZoomFor1km(center.lat);
      var targetZoom = getZoomForRadius(targetRadiusKm, center.lat);
      
      // Clamp to valid range
      targetZoom = Math.max(MIN_ZOOM, Math.min(maxZoom, targetZoom));
      
      map.setZoom(targetZoom, { animate: false });
    }
    
    function onSliderStart() {
      sliderActive = true;
    }
    
    function onSliderChange(radiusKm) {
      setZoomForRadius(radiusKm);
    }
    
    function onSliderEnd(radiusKm) {
      setZoomForRadius(radiusKm);
      
      setTimeout(function() {
        sliderActive = false;
      }, 300);
    }
    
    function moveToLocation(lat, lng) {
      if (!map) return;
      // Update max zoom for new latitude before moving
      var maxZoom = calculateMaxZoomFor1km(lat);
      map.setMaxZoom(maxZoom);
      
      // If current zoom exceeds new max, adjust it
      var currentZoom = map.getZoom();
      if (currentZoom > maxZoom) {
        map.setView([lat, lng], maxZoom, { animate: true, duration: 0.3 });
      } else {
        map.setView([lat, lng], currentZoom, { animate: true, duration: 0.3 });
      }
    }
  </script>
</body>
</html>
`;

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

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [isMapReady, setIsMapReady] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const [selectedCoordinate, setSelectedCoordinate] = useState({
        latitude: currentCoordinates?.latitude || 33.5138,
        longitude: currentCoordinates?.longitude || 36.2765,
    });
    const [selectedLocationName, setSelectedLocationName] = useState(currentLocation || 'دمشق');
    const [radius, setRadius] = useState(currentRadius || 25);
    const [sliderValue, setSliderValue] = useState(currentRadius || 25);

    const isSlidingRef = useRef(false);

    // Theme colors
    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');
    const cardBg = useThemeColor({ light: 'rgba(255, 255, 255, 0.95)', dark: 'rgba(28, 28, 30, 0.95)' }, 'background');
    const textColor = useThemeColor({}, 'text');
    const borderColor = useThemeColor({ light: 'rgba(0,0,0,0.1)', dark: 'rgba(255,255,255,0.1)' }, 'text');
    const subtleTextColor = useThemeColor({ light: '#666666', dark: '#999999' }, 'text');

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setSelectedLocationName(currentLocation || 'دمشق');
            setRadius(currentRadius || 25);
            setSliderValue(currentRadius || 25);
            isSlidingRef.current = false;
            setIsMapReady(false);
            setSearchQuery('');
            setShowSearchResults(false);
            setIsSearchFocused(false);
            if (currentCoordinates) {
                setSelectedCoordinate(currentCoordinates);
            }
        }
    }, [visible]);

    // Initialize map when ready
    useEffect(() => {
        if (isMapReady && webViewRef.current) {
            const lat = currentCoordinates?.latitude || 33.5138;
            const lng = currentCoordinates?.longitude || 36.2765;
            const rad = currentRadius || 25;

            webViewRef.current.injectJavaScript(`
                initMap(${lat}, ${lng}, ${rad});
                true;
            `);
        }
    }, [isMapReady]);

    // Reverse geocode function
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
            } else if (data.type === 'mapMoved') {
                setSelectedCoordinate({ latitude: data.lat, longitude: data.lng });
                reverseGeocode(data.lat, data.lng);
            } else if (data.type === 'radiusChanged') {
                if (!isSlidingRef.current) {
                    const newRadius = Math.max(RADIUS_MIN, Math.min(RADIUS_MAX, data.radius));
                    setRadius(Math.round(newRadius));
                    setSliderValue(newRadius);
                }
            }
        } catch (error) {
            console.error('Error parsing WebView message:', error);
        }
    }, [reverseGeocode]);

    const handleSliderStart = useCallback(() => {
        isSlidingRef.current = true;
        webViewRef.current?.injectJavaScript(`onSliderStart(); true;`);
    }, []);

    const handleSliderChange = useCallback((value: number) => {
        setSliderValue(value);
        setRadius(Math.round(value));
        webViewRef.current?.injectJavaScript(`onSliderChange(${value}); true;`);
    }, []);

    const handleSliderComplete = useCallback((value: number) => {
        const finalValue = Math.round(value);
        setRadius(finalValue);
        setSliderValue(finalValue);
        webViewRef.current?.injectJavaScript(`onSliderEnd(${finalValue}); true;`);

        setTimeout(() => {
            isSlidingRef.current = false;
        }, 400);
    }, []);

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
            moveToLocation(${lat}, ${lon});
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
        onConfirm(selectedLocationName, selectedCoordinate, Math.round(radius));
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
                                name="search"
                                size={20}
                                color={iconColor}
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
                                    <Text style={[styles.locationText, { color: subtleTextColor }]} numberOfLines={1}>
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

                {/* Bottom Floating Elements */}
                <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">

                    {/* Radius Slider Bubble */}
                    <View style={[styles.bubble, styles.radiusBubble, { backgroundColor: cardBg }]}>
                        <View style={styles.radiusHeader}>
                            <Text style={[styles.radiusLabel, { color: textColor }]}>نطاق البحث</Text>
                            <View style={[styles.radiusBadge, { backgroundColor: `${tintColor}20` }]}>
                                <Text style={[styles.radiusValue, { color: tintColor }]}>
                                    {Math.round(sliderValue)} كم
                                </Text>
                            </View>
                        </View>

                        <Slider
                            style={styles.slider}
                            minimumValue={RADIUS_MIN}
                            maximumValue={RADIUS_MAX}
                            value={sliderValue}
                            onSlidingStart={handleSliderStart}
                            onValueChange={handleSliderChange}
                            onSlidingComplete={handleSliderComplete}
                            minimumTrackTintColor={tintColor}
                            maximumTrackTintColor={`${iconColor}40`}
                            thumbTintColor={tintColor}
                        />

                        <View style={styles.radiusMarkers}>
                            <Text style={[styles.radiusMarkerText, { color: iconColor }]}>{RADIUS_MIN} كم</Text>
                            <Text style={[styles.radiusMarkerText, { color: iconColor }]}>{RADIUS_MAX} كم</Text>
                        </View>
                    </View>

                    {/* Confirm Button */}
                    <TouchableOpacity
                        style={[styles.confirmButton, { backgroundColor: tintColor }]}
                        onPress={handleConfirm}
                    >
                        <Ionicons name="checkmark" size={22} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.confirmButtonText}>تطبيق الموقع</Text>
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
        fontWeight: '500',
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
    bubble: {
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    radiusBubble: {
        padding: 16,
        marginBottom: 12,
    },
    radiusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    radiusLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    radiusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
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