import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENTLY_VIEWED_KEY = '@recently_viewed_listings';
const MAX_RECENTLY_VIEWED = 20;

/**
 * Get the storage key for a specific user
 */
const getStorageKey = (userId?: string): string => {
    return userId ? `${RECENTLY_VIEWED_KEY}_${userId}` : RECENTLY_VIEWED_KEY;
};

/**
 * Add a listing ID to recently viewed storage.
 * Call this when a user views a listing detail page.
 * @param listingId - The ID of the listing to add
 * @param userId - The current user's ID (optional but recommended)
 */
export async function addToRecentlyViewed(listingId: number, userId?: string): Promise<void> {
    try {
        const storageKey = getStorageKey(userId);
        const storedIds = await AsyncStorage.getItem(storageKey);
        let ids: number[] = storedIds ? JSON.parse(storedIds) : [];

        // Remove if already exists (to move to front)
        ids = ids.filter(id => id !== listingId);

        // Add to front
        ids.unshift(listingId);

        // Keep only the most recent
        ids = ids.slice(0, MAX_RECENTLY_VIEWED);

        // Save back to storage
        await AsyncStorage.setItem(storageKey, JSON.stringify(ids));
    } catch (err) {
        console.error('Error adding to recently viewed:', err);
    }
}

/**
 * Clear recently viewed items for a specific user
 * @param userId - The user's ID (optional)
 */
export async function clearRecentlyViewed(userId?: string): Promise<void> {
    try {
        const storageKey = getStorageKey(userId);
        const cacheKey = `@recently_viewed_cache${userId ? `_${userId}` : ''}`;
        await AsyncStorage.removeItem(storageKey);
        await AsyncStorage.removeItem(cacheKey);
    } catch (err) {
        console.error('Error clearing recently viewed:', err);
    }
}