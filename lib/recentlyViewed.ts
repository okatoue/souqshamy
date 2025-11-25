import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENTLY_VIEWED_KEY = '@recently_viewed_listings';
const MAX_RECENTLY_VIEWED = 20;

/**
 * Add a listing ID to recently viewed storage.
 * Call this when a user views a listing detail page.
 */
export async function addToRecentlyViewed(listingId: number): Promise<void> {
    try {
        const storedIds = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
        let ids: number[] = storedIds ? JSON.parse(storedIds) : [];

        // Remove if already exists (to move to front)
        ids = ids.filter(id => id !== listingId);

        // Add to front
        ids.unshift(listingId);

        // Keep only the most recent
        ids = ids.slice(0, MAX_RECENTLY_VIEWED);

        // Save back to storage
        await AsyncStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(ids));
    } catch (err) {
        console.error('Error adding to recently viewed:', err);
    }
}