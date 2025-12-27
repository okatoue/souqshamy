import { BORDER_RADIUS, BRAND_COLOR, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { WebView } from 'react-native-webview';

interface LocationPreviewCardProps {
    location: string;
    coordinates: {
        latitude: number;
        longitude: number;
    } | null;
    radius?: number; // Optional radius in meters
    onPress: () => void;
    tapHintText?: string; // Custom hint text (default: "Tap to edit")
}

/**
 * Generates static map HTML with a radius circle overlay
 */
function generateStaticMapHtml(
    lat: number,
    lng: number,
    radius: number,
    brandColor: string
): string {
    // Fixed zoom level to show ~5km area
    const zoom = 13;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/protomaps-leaflet@latest/dist/protomaps-leaflet.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; padding: 0; overflow: hidden; font-family: 'Noto Sans Arabic', sans-serif; }
    #map { height: 100vh; width: 100vw; }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-control-zoom { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // Debug logging function
    function debugLog(message, data) {
      console.log('[MapDebug]', message, data || '');
    }

    // Capture and report errors
    window.addEventListener('error', function(e) {
      debugLog('JavaScript Error', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno
      });
    });

    debugLog('Initializing static preview map', { lat: ${lat}, lng: ${lng}, zoom: ${zoom} });

    try {
      // No bounds restrictions - dual layer approach eliminates grey areas
      var map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false
        // maxBounds REMOVED - no longer needed with dual layer system
      }).setView([${lat}, ${lng}], ${zoom});

      debugLog('Leaflet map created successfully');

      // LAYER 1: World base layer (low detail, renders everywhere)
      var worldBaseUrl = 'https://images.souqjari.com/maps/world-base.pmtiles';
      debugLog('Adding world base layer', { url: worldBaseUrl });

      var worldBaseLayer = protomapsL.leafletLayer({
        url: worldBaseUrl,
        flavor: 'light',
        maxZoom: 6,
        minZoom: 0
      });
      worldBaseLayer.addTo(map);

      debugLog('World base layer added');

      // LAYER 2: Syria detail layer (high detail, Arabic labels)
      // Only renders within coverage bounds to avoid grey overlay on world base
      var syriaDetailUrl = 'https://images.souqjari.com/maps/middle-east-arabic.pmtiles';
      debugLog('Adding Syria detail layer', { url: syriaDetailUrl });

      // Syria/Lebanon/Jordan coverage bounds
      var coverageBounds = L.latLngBounds(
        [29.0, 34.5],  // SW: Southern Jordan
        [37.5, 43.0]   // NE: Northern Syria
      );

      var syriaDetailLayer = protomapsL.leafletLayer({
        url: syriaDetailUrl,
        lang: 'ar',
        flavor: 'light',
        maxZoom: 18,
        minZoom: 5,
        bounds: coverageBounds
      });
      syriaDetailLayer.addTo(map);

      debugLog('Syria detail layer added');

      // Add tile loading event listeners
      map.on('tileload', function() {
        debugLog('Tile loaded successfully');
      });

      map.on('tileerror', function(e) {
        debugLog('Tile load error', { error: e });
      });

      // Add radius circle overlay (no center marker)
      L.circle([${lat}, ${lng}], {
        radius: ${radius},
        color: '${brandColor}',
        weight: 2,
        fillColor: '${brandColor}',
        fillOpacity: 0.2
      }).addTo(map);

      debugLog('Map initialization complete');

    } catch (error) {
      debugLog('Error initializing map', {
        message: error.message,
        stack: error.stack
      });
    }
  </script>
</body>
</html>
`;
}

export default function LocationPreviewCard({
    location,
    coordinates,
    radius = 1000, // Default 1km radius
    onPress,
    tapHintText = 'Tap to edit'
}: LocationPreviewCardProps) {
    // Theme colors
    const cardBg = useThemeColor({}, 'cardBackground');
    const borderColor = useThemeColor({}, 'border');
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({}, 'textMuted');

    // Generate map HTML with memoization to prevent unnecessary re-renders
    // Use safe defaults if coordinates is somehow null (defensive programming)
    const lat = coordinates?.latitude ?? 33.5138;
    const lng = coordinates?.longitude ?? 36.2765;

    const mapHtml = useMemo(
        () => generateStaticMapHtml(lat, lng, radius, BRAND_COLOR),
        [lat, lng, radius]
    );

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: cardBg, borderColor }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {/* Map Preview */}
            <View style={styles.mapContainer}>
                <WebView
                    source={{ html: mapHtml }}
                    style={styles.map}
                    scrollEnabled={false}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    originWhitelist={['*']}
                    allowFileAccess={true}
                    allowUniversalAccessFromFileURLs={true}
                    mixedContentMode="always"
                    pointerEvents="none"
                    onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('[WebView Error]', nativeEvent);
                    }}
                />
                {/* Overlay to capture touches and show tap hint */}
                <View style={styles.mapOverlay} pointerEvents="box-only">
                    <View style={styles.tapHint}>
                        <Ionicons name="expand-outline" size={16} color="white" />
                        <Text style={styles.tapHintText}>{tapHintText}</Text>
                    </View>
                </View>
            </View>

            {/* Address Section */}
            <View style={[styles.addressContainer, { borderTopColor: borderColor }]}>
                <Ionicons name="location" size={18} color={BRAND_COLOR} />
                <Text style={[styles.addressText, { color: textColor }]} numberOfLines={2}>
                    {location}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={mutedColor} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    mapContainer: {
        height: 160,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    mapOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: SPACING.sm,
    },
    tapHint: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
        gap: 4,
    },
    tapHintText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '500',
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderTopWidth: 1,
        gap: SPACING.sm,
    },
    addressText: {
        flex: 1,
        fontSize: 16,
    },
});
