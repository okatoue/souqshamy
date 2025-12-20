/**
 * Shared location utilities for the SouqJari marketplace app.
 * Used by search, category listings, and other location-aware queries.
 */

export interface BoundingBox {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
}

export interface Coordinates {
    latitude: number;
    longitude: number;
}

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

/**
 * Check if location filtering should be active based on the radius.
 * A radius of 100km or more is considered "all of Syria" (no filter).
 *
 * @param radius - Radius in kilometers
 * @returns true if location filtering is active, false otherwise
 */
export function isLocationFilterActive(radius: number): boolean {
    return radius < 100;
}

/**
 * Calculate distance between two coordinates using Haversine formula.
 *
 * @param lat1 - First point latitude
 * @param lon1 - First point longitude
 * @param lat2 - Second point latitude
 * @param lon2 - Second point longitude
 * @returns Distance in kilometers
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
