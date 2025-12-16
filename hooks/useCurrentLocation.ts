import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

interface UseCurrentLocationOptions {
    onLocationReceived: (latitude: number, longitude: number) => void;
    reverseGeocode: (lat: number, lng: number) => Promise<string>;
    onLocationNameReceived?: (name: string) => void;
}

interface UseCurrentLocationResult {
    isFetchingLocation: boolean;
    handleUseCurrentLocation: () => Promise<void>;
}

/**
 * Shared hook for getting the user's current GPS location.
 * Used by MapModal and LocationPickerModal.
 */
export function useCurrentLocation({
    onLocationReceived,
    reverseGeocode,
    onLocationNameReceived,
}: UseCurrentLocationOptions): UseCurrentLocationResult {
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);

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

            // Notify parent of new coordinates
            onLocationReceived(latitude, longitude);

            // Reverse geocode to get readable location name
            const locationName = await reverseGeocode(latitude, longitude);
            onLocationNameReceived?.(locationName);
        } catch (error) {
            console.error('Error getting current location:', error);
            Alert.alert('Error', 'Could not get your current location. Please try again.');
        } finally {
            setIsFetchingLocation(false);
        }
    }, [onLocationReceived, reverseGeocode, onLocationNameReceived]);

    return { isFetchingLocation, handleUseCurrentLocation };
}
