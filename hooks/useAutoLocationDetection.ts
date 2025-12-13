import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';
import { useLocationFilter } from './useLocationFilter';

const AUTO_DETECT_RADIUS = 10; // km

/**
 * Reverse geocode coordinates to get a readable location name using OpenStreetMap Nominatim.
 * Returns Arabic location names when available.
 */
async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ar`
        );

        if (response.ok) {
            const data = await response.json();
            const locationName = data.address?.city ||
                data.address?.town ||
                data.address?.village ||
                data.address?.suburb ||
                data.address?.county ||
                data.display_name?.split(',')[0] ||
                'موقعك الحالي';
            return locationName;
        }
    } catch (error) {
        console.error('Reverse geocode error:', error);
    }

    return 'موقعك الحالي';
}

/**
 * Hook that auto-detects user's GPS location on first app launch.
 *
 * Behavior:
 * - Only runs when no saved location preference exists
 * - Requests foreground location permission
 * - If granted: Gets current position, reverse geocodes, and updates location filter with 10km radius
 * - If denied: Falls back to default location (Damascus, 25km)
 * - Respects user's manual location selection (doesn't override)
 */
export function useAutoLocationDetection() {
    const { isLoading, hasCustomLocation, updateLocationFilter } = useLocationFilter();
    const hasAttemptedDetection = useRef(false);

    useEffect(() => {
        // Wait for location filter to finish loading
        if (isLoading) return;

        // Don't override user's saved location preference
        if (hasCustomLocation) return;

        // Only attempt detection once per session
        if (hasAttemptedDetection.current) return;
        hasAttemptedDetection.current = true;

        const detectLocation = async () => {
            try {
                // Request foreground location permission
                const { status } = await Location.requestForegroundPermissionsAsync();

                if (status !== 'granted') {
                    // Permission denied - keep default location
                    console.log('Location permission denied, using default location');
                    return;
                }

                // Get current position with reasonable accuracy settings
                const position = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                const { latitude, longitude } = position.coords;

                // Reverse geocode to get readable location name
                const locationName = await reverseGeocode(latitude, longitude);

                // Update location filter with detected location and 10km radius
                updateLocationFilter(locationName, { latitude, longitude }, AUTO_DETECT_RADIUS);

                console.log(`Auto-detected location: ${locationName} (${latitude}, ${longitude})`);
            } catch (error) {
                // If location detection fails, keep default location
                console.error('Auto location detection failed:', error);
            }
        };

        detectLocation();
    }, [isLoading, hasCustomLocation, updateLocationFilter]);
}
