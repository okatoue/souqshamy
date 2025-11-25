import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const LOCATION_STORAGE_KEY = '@3antar_location_filter';

interface LocationFilter {
    name: string;
    coordinates: { latitude: number; longitude: number };
    radius: number; // in km
}

const DEFAULT_LOCATION: LocationFilter = {
    name: 'Damascus',
    coordinates: { latitude: 33.5138, longitude: 36.2765 },
    radius: 25,
};

export function useLocationFilter() {
    const [locationFilter, setLocationFilter] = useState<LocationFilter>(DEFAULT_LOCATION);
    const [isLoading, setIsLoading] = useState(true);

    // Load saved location on mount
    useEffect(() => {
        loadSavedLocation();
    }, []);

    const loadSavedLocation = async () => {
        try {
            const saved = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setLocationFilter(parsed);
            }
        } catch (error) {
            console.error('Error loading saved location:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateLocationFilter = useCallback(async (
        name: string,
        coordinates: { latitude: number; longitude: number },
        radius: number
    ) => {
        const newFilter: LocationFilter = { name, coordinates, radius };
        setLocationFilter(newFilter);

        try {
            await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newFilter));
        } catch (error) {
            console.error('Error saving location:', error);
        }
    }, []);

    const clearLocationFilter = useCallback(async () => {
        setLocationFilter(DEFAULT_LOCATION);
        try {
            await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing location:', error);
        }
    }, []);

    // Calculate if a listing is within the radius
    const isWithinRadius = useCallback((
        listingLat: number,
        listingLon: number
    ): boolean => {
        const { coordinates, radius } = locationFilter;

        // Haversine formula to calculate distance
        const R = 6371; // Earth's radius in km
        const dLat = toRad(listingLat - coordinates.latitude);
        const dLon = toRad(listingLon - coordinates.longitude);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(coordinates.latitude)) * Math.cos(toRad(listingLat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance <= radius;
    }, [locationFilter]);

    return {
        locationFilter,
        updateLocationFilter,
        clearLocationFilter,
        isWithinRadius,
        isLoading,
    };
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}