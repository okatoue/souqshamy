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
    };
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
    // Convert radius in meters to a reasonable zoom level
    // Smaller radius = higher zoom
    const zoom = radius <= 500 ? 15 : radius <= 1000 ? 14 : radius <= 2000 ? 13 : 12;

    return `
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
    .leaflet-control-zoom { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
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
    }).setView([${lat}, ${lng}], ${zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 5
    }).addTo(map);

    // Add radius circle overlay
    L.circle([${lat}, ${lng}], {
      radius: ${radius},
      color: '${brandColor}',
      weight: 2,
      fillColor: '${brandColor}',
      fillOpacity: 0.2
    }).addTo(map);

    // Add center marker
    var markerIcon = L.divIcon({
      className: 'center-marker',
      html: '<div style="width: 14px; height: 14px; background: ${brandColor}; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
    L.marker([${lat}, ${lng}], { icon: markerIcon }).addTo(map);
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
    const mapHtml = useMemo(
        () => generateStaticMapHtml(
            coordinates.latitude,
            coordinates.longitude,
            radius,
            BRAND_COLOR
        ),
        [coordinates.latitude, coordinates.longitude, radius]
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
                    pointerEvents="none"
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
