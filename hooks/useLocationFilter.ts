import {
    BoundingBox,
    calculateBoundingBox,
    calculateDistance,
    isLocationFilterActive,
} from '@/lib/location-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

// Re-export types and utilities for backward compatibility
export type { BoundingBox } from '@/lib/location-utils';
export { calculateBoundingBox, isLocationFilterActive } from '@/lib/location-utils';

const LOCATION_STORAGE_KEY = '@3antar_location_filter';

export interface LocationFilter {
    name: string;
    coordinates: { latitude: number; longitude: number };
    radius: number; // in km
}

const DEFAULT_LOCATION: LocationFilter = {
    name: 'دمشق',
    coordinates: { latitude: 33.5138, longitude: 36.2765 },
    radius: 25,
};

export function useLocationFilter() {
    const [locationFilter, setLocationFilter] = useState<LocationFilter>(DEFAULT_LOCATION);
    const [isLoading, setIsLoading] = useState(true);
    const [hasCustomLocation, setHasCustomLocation] = useState(false);
    const hasLoadedCache = useRef(false);

    // Load saved location on mount - instant cache read
    useEffect(() => {
        const loadSavedLocation = async () => {
            // Prevent double loading
            if (hasLoadedCache.current) return;
            hasLoadedCache.current = true;

            try {
                const saved = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // Validate the parsed data has required fields
                    if (parsed.name && parsed.coordinates && typeof parsed.radius === 'number') {
                        setLocationFilter(parsed);
                        setHasCustomLocation(true);
                    }
                }
            } catch (error) {
                console.error('Error loading saved location:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSavedLocation();
    }, []);

    const updateLocationFilter = useCallback(async (
        name: string,
        coordinates: { latitude: number; longitude: number },
        radius: number
    ) => {
        const newFilter: LocationFilter = { name, coordinates, radius };

        // Update state immediately (optimistic)
        setLocationFilter(newFilter);
        setHasCustomLocation(true);

        // Persist to storage in background
        try {
            await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newFilter));
        } catch (error) {
            console.error('Error saving location:', error);
        }
    }, []);

    const clearLocationFilter = useCallback(async () => {
        // Update state immediately (optimistic)
        setLocationFilter(DEFAULT_LOCATION);

        // Clear from storage in background
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
        // If radius is 100km or more, consider it "all of Syria"
        if (!isLocationFilterActive(locationFilter.radius)) return true;

        const { latitude: filterLat, longitude: filterLon } = locationFilter.coordinates;
        const distance = calculateDistance(filterLat, filterLon, listingLat, listingLon);

        return distance <= locationFilter.radius;
    }, [locationFilter]);

    // Get the bounding box for the current location filter
    // Returns null if location filtering should be disabled (large radius)
    const getBoundingBox = useCallback((): BoundingBox | null => {
        // If radius is 100km or more, consider it "all of Syria" - no bounding box needed
        if (!isLocationFilterActive(locationFilter.radius)) return null;

        const { latitude, longitude } = locationFilter.coordinates;
        return calculateBoundingBox(latitude, longitude, locationFilter.radius);
    }, [locationFilter]);

    return {
        locationFilter,
        isLoading,
        hasCustomLocation,
        updateLocationFilter,
        clearLocationFilter,
        isWithinRadius,
        getBoundingBox
    };
}