import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const LOCATION_STORAGE_KEY = '@3antar_location_filter';

export interface LocationFilter {
    name: string;
    coordinates: { latitude: number; longitude: number };
    radius: number; // in km
}

export interface BoundingBox {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
}

const DEFAULT_LOCATION: LocationFilter = {
    name: 'دمشق',
    coordinates: { latitude: 33.5138, longitude: 36.2765 },
    radius: 25,
};

/**
 * Calculate a bounding box from a center point and radius.
 * This is used for efficient database queries (bounding box pre-filtering).
 *
 * @param latitude - Center latitude in degrees
 * @param longitude - Center longitude in degrees
 * @param radiusKm - Radius in kilometers
 * @returns BoundingBox with min/max lat/lon
 */
export function calculateBoundingBox(
    latitude: number,
    longitude: number,
    radiusKm: number
): BoundingBox {
    // Earth's radius in km
    const EARTH_RADIUS_KM = 6371;

    // 1 degree of latitude is approximately 111.32 km
    const KM_PER_DEGREE_LAT = 111.32;

    // Calculate latitude delta
    const latDelta = radiusKm / KM_PER_DEGREE_LAT;

    // Calculate longitude delta (varies by latitude)
    // At higher latitudes, 1 degree of longitude covers less distance
    const latRadians = latitude * (Math.PI / 180);
    const kmPerDegreeLon = KM_PER_DEGREE_LAT * Math.cos(latRadians);
    const lonDelta = kmPerDegreeLon > 0 ? radiusKm / kmPerDegreeLon : radiusKm / KM_PER_DEGREE_LAT;

    return {
        minLat: latitude - latDelta,
        maxLat: latitude + latDelta,
        minLon: longitude - lonDelta,
        maxLon: longitude + lonDelta,
    };
}

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
        if (locationFilter.radius >= 100) return true;

        const { latitude: filterLat, longitude: filterLon } = locationFilter.coordinates;

        // Haversine formula for distance calculation
        const R = 6371; // Earth's radius in km
        const dLat = (listingLat - filterLat) * Math.PI / 180;
        const dLon = (listingLon - filterLon) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(filterLat * Math.PI / 180) * Math.cos(listingLat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance <= locationFilter.radius;
    }, [locationFilter]);

    // Get the bounding box for the current location filter
    // Returns null if location filtering should be disabled (large radius)
    const getBoundingBox = useCallback((): BoundingBox | null => {
        // If radius is 100km or more, consider it "all of Syria" - no bounding box needed
        if (locationFilter.radius >= 100) return null;

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