import { useAuth } from '@/lib/auth_context';
import { CACHE_KEYS, clearCache as clearCacheUtil, readCache, writeCache } from '@/lib/cache';
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Profile {
    id: string;
    email: string | null;
    phone_number: string | null;
    display_name: string | null;
    avatar_url: string | null;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
}

export function useProfile() {
    const { user, profileVersion } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const isInitialLoad = useRef(true);
    const lastProfileVersion = useRef(profileVersion);

    // Get the cache key for the current user
    const getCacheKey = useCallback(() => {
        return user ? CACHE_KEYS.PROFILE(user.id) : null;
    }, [user]);

    // Load cached profile using shared cache utility
    const loadCachedProfile = useCallback(async (): Promise<Profile | null> => {
        const cacheKey = getCacheKey();
        if (!cacheKey) return null;
        return await readCache<Profile>(cacheKey);
    }, [getCacheKey]);

    // Save profile to cache using shared cache utility
    const saveCachedProfile = useCallback(async (profileToCache: Profile) => {
        const cacheKey = getCacheKey();
        if (!cacheKey) return;
        await writeCache(cacheKey, profileToCache, user?.id);
    }, [getCacheKey, user?.id]);

    // Clear cache (for logout)
    const clearCache = useCallback(async () => {
        const cacheKey = getCacheKey();
        if (!cacheKey) return;
        await clearCacheUtil(cacheKey);
    }, [getCacheKey]);

    // Fetch profile from Supabase
    const fetchProfile = useCallback(async (refresh = false, showLoading = false) => {
        if (!user) {
            setProfile(null);
            setIsLoading(false);
            await clearCache();
            return;
        }

        try {
            if (refresh) {
                setIsRefreshing(true);
            } else if (showLoading) {
                setIsLoading(true);
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                // Profile might not exist yet - create default from user object
                if (error.code === 'PGRST116') {
                    const defaultProfile: Profile = {
                        id: user.id,
                        email: user.email || null,
                        phone_number: user.user_metadata?.phone_number || null,
                        display_name: null,
                        avatar_url: null,
                        email_verified: false,
                        created_at: user.created_at || new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    setProfile(defaultProfile);
                    return;
                }
                throw error;
            }

            const fetchedProfile: Profile = {
                id: data.id,
                email: data.email || user.email || null,
                phone_number: data.phone_number || null,
                display_name: data.display_name || null,
                avatar_url: data.avatar_url || null,
                email_verified: data.email_verified ?? false,
                created_at: data.created_at || user.created_at || new Date().toISOString(),
                updated_at: data.updated_at || new Date().toISOString()
            };

            setProfile(fetchedProfile);
            await saveCachedProfile(fetchedProfile);
        } catch (error) {
            console.error('Error fetching profile:', error);
            // On error, create fallback from user object
            setProfile(prev => {
                if (prev) return prev; // Keep existing profile if we have one
                return {
                    id: user.id,
                    email: user.email || null,
                    phone_number: user.user_metadata?.phone_number || null,
                    display_name: null,
                    avatar_url: null,
                    email_verified: false,
                    created_at: user.created_at || new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
            });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user, saveCachedProfile, clearCache]);

    // Initialize: load cache first, then refresh in background
    useEffect(() => {
        const initialize = async () => {
            if (!user) {
                setProfile(null);
                setIsLoading(false);
                return;
            }

            // Try to load from cache first
            const cachedProfile = await loadCachedProfile();

            if (cachedProfile) {
                // Show cached data immediately - no loading spinner
                setProfile(cachedProfile);
                setIsLoading(false);

                // Then refresh in background
                fetchProfile(false, false);
            } else {
                // No valid cache - show loading and fetch
                await fetchProfile(false, true);
            }

            isInitialLoad.current = false;
        };

        initialize();
    }, [user, loadCachedProfile, fetchProfile]);

    // Refetch when profileVersion changes (indicates profile was created/updated in auth context)
    useEffect(() => {
        if (profileVersion !== lastProfileVersion.current && user) {
            lastProfileVersion.current = profileVersion;
            // Profile was just created/updated, refetch to get the latest data
            fetchProfile(false, false);
        }
    }, [profileVersion, user, fetchProfile]);

    // Update profile
    const updateProfile = useCallback(async (updates: Partial<Profile>) => {
        if (!user) return false;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            // Update local state immediately (optimistic)
            setProfile(prev => {
                if (!prev) return prev;
                const updated = { ...prev, ...updates, updated_at: new Date().toISOString() };
                // Update cache
                saveCachedProfile(updated);
                return updated;
            });

            return true;
        } catch (error) {
            console.error('Error updating profile:', error);
            return false;
        }
    }, [user, saveCachedProfile]);

    // Get display name (fallback chain)
    const getDisplayName = useCallback(() => {
        if (profile?.display_name) return profile.display_name;
        if (profile?.email) {
            // Extract name from email (before @)
            const emailName = profile.email.split('@')[0];
            // Check if it's a phone placeholder email
            if (emailName.match(/^\d+$/)) {
                return profile.phone_number || 'User';
            }
            return emailName;
        }
        if (profile?.phone_number) return profile.phone_number;
        return 'User';
    }, [profile]);

    // Get member since date
    const getMemberSince = useCallback(() => {
        const dateStr = profile?.created_at || user?.created_at;
        if (!dateStr) return 'Unknown';
        return new Date(dateStr).toLocaleDateString();
    }, [profile, user]);

    return {
        profile,
        isLoading,
        isRefreshing,
        fetchProfile,
        updateProfile,
        getDisplayName,
        getMemberSince,
        clearCache
    };
}