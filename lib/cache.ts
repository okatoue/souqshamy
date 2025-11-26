/**
 * Centralized caching utilities for the SouqShamy marketplace app.
 * Provides a consistent interface for AsyncStorage caching with TTL support.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// Types
// ============================================================================

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    userId?: string;
}

export interface CacheConfig {
    /** Time-to-live in milliseconds. Default: no expiry */
    ttlMs?: number;
    /** User ID for user-specific cache validation */
    userId?: string;
}

// ============================================================================
// Cache Keys
// ============================================================================

export const CACHE_KEYS = {
    FAVORITES: '@favorites_cache',
    FAVORITE_IDS: '@favorite_ids_cache',
    USER_LISTINGS: '@user_listings_cache',
    CONVERSATIONS: '@conversations_cache',
    RECENTLY_VIEWED: '@recently_viewed_cache',
    CATEGORY_LISTINGS: (categoryId: string, subcategoryId?: string | null) => {
        const base = `@category_listings_${categoryId}`;
        return subcategoryId ? `${base}_${subcategoryId}` : base;
    },
    PROFILE: (userId: string) => `@profile_cache_${userId}`,
} as const;

// Default TTL values
export const CACHE_TTL = {
    /** 5 minutes - for frequently changing data like category listings */
    SHORT: 5 * 60 * 1000,
    /** 15 minutes - for moderately changing data */
    MEDIUM: 15 * 60 * 1000,
    /** 1 hour - for rarely changing data */
    LONG: 60 * 60 * 1000,
    /** No expiry - for user-specific persistent data */
    NONE: undefined,
} as const;

// ============================================================================
// Core Cache Functions
// ============================================================================

/**
 * Reads data from the cache with optional TTL and user validation.
 * @param key - The cache key
 * @param config - Cache configuration options
 * @returns The cached data or null if not found/expired/invalid
 */
export async function readCache<T>(
    key: string,
    config: CacheConfig = {}
): Promise<T | null> {
    try {
        const cached = await AsyncStorage.getItem(key);
        if (!cached) return null;

        const entry: CacheEntry<T> = JSON.parse(cached);

        // Check TTL
        if (config.ttlMs && Date.now() - entry.timestamp > config.ttlMs) {
            return null;
        }

        // Check user ID
        if (config.userId && entry.userId && entry.userId !== config.userId) {
            return null;
        }

        return entry.data;
    } catch (error) {
        console.error(`Cache read error for key ${key}:`, error);
        return null;
    }
}

/**
 * Writes data to the cache.
 * @param key - The cache key
 * @param data - The data to cache
 * @param userId - Optional user ID for user-specific caching
 */
export async function writeCache<T>(
    key: string,
    data: T,
    userId?: string
): Promise<void> {
    try {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            userId,
        };
        await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
        console.error(`Cache write error for key ${key}:`, error);
    }
}

/**
 * Removes a specific cache entry.
 * @param key - The cache key to remove
 */
export async function clearCache(key: string): Promise<void> {
    try {
        await AsyncStorage.removeItem(key);
    } catch (error) {
        console.error(`Cache clear error for key ${key}:`, error);
    }
}

/**
 * Clears all app caches.
 */
export async function clearAllCaches(): Promise<void> {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith('@'));
        await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
        console.error('Clear all caches error:', error);
    }
}

// ============================================================================
// Cache Strategy Helpers
// ============================================================================

/**
 * Implements a cache-first strategy with background refresh.
 * Returns cached data immediately if available, then fetches fresh data.
 *
 * @param options - Configuration for the cache-first strategy
 * @returns Object with cached data (if any) and a promise for fresh data
 */
export async function cacheFirstStrategy<T>(options: {
    cacheKey: string;
    fetcher: () => Promise<T>;
    cacheConfig?: CacheConfig;
    onCacheHit?: (data: T) => void;
    onFetchSuccess?: (data: T) => void;
    onFetchError?: (error: Error) => void;
}): Promise<{ cached: T | null; fresh: Promise<T | null> }> {
    const { cacheKey, fetcher, cacheConfig, onCacheHit, onFetchSuccess, onFetchError } = options;

    // Try to get cached data
    const cached = await readCache<T>(cacheKey, cacheConfig);
    if (cached && onCacheHit) {
        onCacheHit(cached);
    }

    // Fetch fresh data in parallel
    const fresh = fetcher()
        .then(async (data) => {
            await writeCache(cacheKey, data, cacheConfig?.userId);
            if (onFetchSuccess) {
                onFetchSuccess(data);
            }
            return data;
        })
        .catch((error) => {
            if (onFetchError) {
                onFetchError(error);
            }
            return null;
        });

    return { cached, fresh };
}

// ============================================================================
// Batch Cache Operations
// ============================================================================

/**
 * Reads multiple cache entries at once.
 * @param keys - Array of cache keys
 * @returns Object mapping keys to their cached values (or null)
 */
export async function readMultipleCache<T>(
    keys: string[]
): Promise<Record<string, T | null>> {
    try {
        const pairs = await AsyncStorage.multiGet(keys);
        const result: Record<string, T | null> = {};

        for (const [key, value] of pairs) {
            if (value) {
                try {
                    const entry: CacheEntry<T> = JSON.parse(value);
                    result[key] = entry.data;
                } catch {
                    result[key] = null;
                }
            } else {
                result[key] = null;
            }
        }

        return result;
    } catch (error) {
        console.error('Multi-read cache error:', error);
        return {};
    }
}

/**
 * Clears cache entries matching a prefix pattern.
 * Useful for clearing all category listings or conversation caches.
 * @param prefix - The prefix to match (e.g., '@category_listings_')
 */
export async function clearCacheByPrefix(prefix: string): Promise<void> {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const matchingKeys = keys.filter(key => key.startsWith(prefix));
        if (matchingKeys.length > 0) {
            await AsyncStorage.multiRemove(matchingKeys);
        }
    } catch (error) {
        console.error(`Clear cache by prefix ${prefix} error:`, error);
    }
}
