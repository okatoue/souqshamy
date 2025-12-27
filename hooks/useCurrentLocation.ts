import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);

    const handleUseCurrentLocation = useCallback(async () => {
        setIsFetchingLocation(true);

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    t('location.permissionRequired'),
                    t('location.pleaseAllowLocation'),
                    [{ text: t('common.ok') }]
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
            Alert.alert(t('alerts.error'), t('location.couldNotGetLocation'));
        } finally {
            setIsFetchingLocation(false);
        }
    }, [onLocationReceived, reverseGeocode, onLocationNameReceived, t]);

    return { isFetchingLocation, handleUseCurrentLocation };
}
