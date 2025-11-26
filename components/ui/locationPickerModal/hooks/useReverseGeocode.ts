import { useCallback } from 'react';

interface UseReverseGeocodeResult {
    reverseGeocode: (lat: number, lng: number) => Promise<string>;
}

export function useReverseGeocode(): UseReverseGeocodeResult {
    const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
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
                return locationName;
            }
        } catch (error) {
            console.error('Reverse geocode error:', error);
        }

        return 'الموقع المحدد';
    }, []);

    return { reverseGeocode };
}
