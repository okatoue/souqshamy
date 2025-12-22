// lib/auth_context.tsx
import {
    extractAuthTokensFromUrl,
    handleAuthError,
    isAuthCallbackUrl,
    safeReloadApp,
} from '@/lib/auth-utils';
import { clearUserCaches } from '@/lib/cache';
import NotificationService from '@/lib/notifications/NotificationService';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

// Required for web browser auth session
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// Facebook OAuth configuration
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;

// Get the appropriate redirect URI for the platform
// Use 'native' option to ensure proper redirect for standalone builds with custom scheme
const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'souqjari',
    path: 'auth/callback',
    // 'native' ensures the custom scheme is used in standalone builds
    // For Expo Go, this returns exp:// based URI
    native: 'souqjari://auth/callback',
});


type AuthContextType = {
    user: User | null;
    session: Session | null;
    signUp: (emailOrPhone: string | undefined, password: string, phoneNumber?: string, displayName?: string) => Promise<void>;
    signIn: (emailOrPhone: string | undefined, password: string, phoneNumber?: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signInWithFacebook: () => Promise<void>;
    signOut: () => Promise<void>;
    loading: boolean;
    isPasswordResetInProgress: boolean;
    setPasswordResetInProgress: (value: boolean) => Promise<void>;
    profileVersion: number;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PASSWORD_RESET_FLAG = '@password_reset_in_progress';
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL for password reset flag

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPasswordResetInProgress, setIsPasswordResetInProgressState] = useState(false);
    const [profileVersion, setProfileVersion] = useState(0);
    const hasProcessedDeepLink = useRef(false);

    // Process auth callback URL and extract tokens using shared utility
    const processAuthCallbackUrl = async (url: string): Promise<boolean> => {
        if (!isAuthCallbackUrl(url)) {
            return false;
        }

        if (hasProcessedDeepLink.current) {
            return false;
        }

        try {
            const { accessToken, refreshToken, error: urlError } = extractAuthTokensFromUrl(url);

            // Check for error in URL
            if (urlError) {
                console.error('[Auth] Error in callback URL:', urlError);
                return false;
            }

            if (accessToken && refreshToken) {
                hasProcessedDeepLink.current = true;
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (sessionError) {
                    console.error('[Auth] Session error from deep link:', sessionError);
                    hasProcessedDeepLink.current = false;
                    return false;
                }

                // Reload the app to properly initialize Supabase client
                await safeReloadApp();
                return true;
            }

            return false;
        } catch (error) {
            console.error('[Auth] Error processing auth callback URL:', error);
            return false;
        }
    };

    // Global deep link handler - captures auth callback URLs before expo-router consumes them
    useEffect(() => {
        // Check for initial URL immediately (cold start)
        const checkInitialUrl = async () => {
            try {
                const initialUrl = await Linking.getInitialURL();

                if (initialUrl) {
                    await processAuthCallbackUrl(initialUrl);
                }
            } catch (error) {
                console.error('[Auth] Error checking initial URL:', error);
            }
        };

        checkInitialUrl();

        // Listen for URL events (warm start / app already open)
        const subscription = Linking.addEventListener('url', async (event) => {
            if (event.url) {
                await processAuthCallbackUrl(event.url);
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // Load initial password reset state with TTL check
    useEffect(() => {
        const loadPasswordResetState = async () => {
            try {
                const value = await AsyncStorage.getItem(PASSWORD_RESET_FLAG);
                if (value) {
                    // Parse stored timestamp
                    const timestamp = parseInt(value, 10);
                    const now = Date.now();

                    if (isNaN(timestamp) || now - timestamp > PASSWORD_RESET_TTL_MS) {
                        // Flag is expired or invalid - clear it
                        await AsyncStorage.removeItem(PASSWORD_RESET_FLAG);
                        setIsPasswordResetInProgressState(false);
                    } else {
                        // Flag is still valid
                        setIsPasswordResetInProgressState(true);
                    }
                } else {
                    setIsPasswordResetInProgressState(false);
                }
            } catch (error) {
                console.error('Error loading password reset state:', error);
            }
        };
        loadPasswordResetState();
    }, []);

    // Function to set password reset state (stores timestamp for TTL)
    const setPasswordResetInProgress = async (value: boolean) => {
        try {
            if (value) {
                // Store current timestamp for TTL tracking
                await AsyncStorage.setItem(PASSWORD_RESET_FLAG, Date.now().toString());
            } else {
                await AsyncStorage.removeItem(PASSWORD_RESET_FLAG);
            }
            setIsPasswordResetInProgressState(value);
        } catch (error) {
            console.error('Error setting password reset state:', error);
        }
    };

    useEffect(() => {
        // Initialize auth - check for existing session
        const initializeAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('[Auth] getSession error:', error);
                }

                setSession(session);
                setUser(session?.user ?? null);

                // If we have a valid session on startup, clear any stuck password reset flag
                // A valid session means the user is logged in and not mid-reset
                if (session?.user) {
                    const isResetting = await AsyncStorage.getItem(PASSWORD_RESET_FLAG);
                    if (isResetting === 'true') {
                        await AsyncStorage.removeItem(PASSWORD_RESET_FLAG);
                        setIsPasswordResetInProgressState(false);
                    }

                    // Extract OAuth-specific metadata fields with fallback chain
                    // Google/Facebook use 'full_name' or 'name', regular signup uses 'display_name'
                    const displayName = session.user.user_metadata?.full_name
                        || session.user.user_metadata?.name
                        || session.user.user_metadata?.display_name
                        || null;

                    // Avatar fallback: avatar_url → picture → null
                    const avatarUrl = session.user.user_metadata?.avatar_url
                        || session.user.user_metadata?.picture
                        || null;

                    // Create/update profile and signal when complete
                    createOrUpdateProfile(
                        session.user.id,
                        session.user.email,
                        session.user.user_metadata?.phone_number,
                        displayName,
                        avatarUrl
                    ).then((success) => {
                        if (success) {
                            setProfileVersion(v => v + 1);
                        }
                    });
                }
            } catch (error) {
                console.error('[Auth] Error initializing auth:', error);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session);
                setUser(session?.user ?? null);

                // Check if we're in password reset flow (with TTL check)
                const resetTimestamp = await AsyncStorage.getItem(PASSWORD_RESET_FLAG);
                let isResetting = false;

                if (resetTimestamp) {
                    const timestamp = parseInt(resetTimestamp, 10);
                    const now = Date.now();
                    isResetting = !isNaN(timestamp) && now - timestamp <= PASSWORD_RESET_TTL_MS;

                    // Auto-clear expired flag
                    if (!isResetting) {
                        await AsyncStorage.removeItem(PASSWORD_RESET_FLAG);
                    }
                }

                // Only update profile on sign in if NOT resetting password
                if (event === 'SIGNED_IN' && session?.user && !isResetting) {
                    // Extract OAuth-specific metadata fields with fallback chain
                    const displayName = session.user.user_metadata?.full_name
                        || session.user.user_metadata?.name
                        || session.user.user_metadata?.display_name
                        || null;

                    const avatarUrl = session.user.user_metadata?.avatar_url
                        || session.user.user_metadata?.picture
                        || null;

                    const success = await createOrUpdateProfile(
                        session.user.id,
                        session.user.email,
                        session.user.user_metadata?.phone_number,
                        displayName,
                        avatarUrl
                    );

                    // Signal that profile was updated so useProfile can refetch
                    if (success) {
                        setProfileVersion(v => v + 1);
                    }
                }

                // Update the in-memory state
                setIsPasswordResetInProgressState(isResetting);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const createOrUpdateProfile = async (
        userId: string,
        email?: string,
        phoneNumber?: string,
        displayName?: string,
        avatarUrl?: string
    ): Promise<boolean> => {
        try {
            // First check if profile exists
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id, display_name, avatar_url')
                .eq('id', userId)
                .single();

            if (!existingProfile) {
                // Create new profile
                const { error } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        email: email,
                        phone_number: phoneNumber,
                        display_name: displayName,
                        avatar_url: avatarUrl,
                    });

                if (error) {
                    console.error('Profile creation error:', error);
                    return false;
                }
                return true;
            } else {
                // Update existing profile - only update display_name/avatar_url if provided and not already set
                const updates: any = {};
                if (email) updates.email = email;
                if (phoneNumber) updates.phone_number = phoneNumber;
                if (displayName && !existingProfile.display_name) {
                    updates.display_name = displayName;
                }
                if (avatarUrl && !existingProfile.avatar_url) {
                    updates.avatar_url = avatarUrl;
                }

                if (Object.keys(updates).length > 0) {
                    const { error } = await supabase
                        .from('profiles')
                        .update(updates)
                        .eq('id', userId);

                    if (error) {
                        console.error('Profile update error:', error);
                        return false;
                    }
                }
                return true;
            }
        } catch (error) {
            console.error('Profile error:', error);
            return false;
        }
    };

    const signUp = async (
        emailOrPhone: string | undefined,
        password: string,
        phoneNumber?: string,
        displayName?: string
    ) => {
        try {
            if (emailOrPhone) {
                // Sign up with email
                const { data, error } = await supabase.auth.signUp({
                    email: emailOrPhone,
                    password,
                    options: {
                        data: {
                            phone_number: phoneNumber,
                            display_name: displayName,
                        },
                    },
                });
                if (error) throw error;

                // Profile will be created in onAuthStateChange
            } else if (phoneNumber) {
                // For phone-based signup, create a placeholder email
                const placeholderEmail = `${phoneNumber}@phone.local`;

                const { data, error } = await supabase.auth.signUp({
                    email: placeholderEmail,
                    password,
                    options: {
                        data: {
                            phone_number: phoneNumber,
                            display_name: displayName,
                        },
                    },
                });
                if (error) throw error;
            } else {
                throw new Error('Email or phone number is required');
            }
        } catch (error: any) {
            Alert.alert('Sign Up Error', error.message);
            throw error;
        }
    };

    const signIn = async (
        emailOrPhone: string | undefined,
        password: string,
        phoneNumber?: string
    ) => {
        try {
            if (emailOrPhone) {
                // Sign in with email
                const { error } = await supabase.auth.signInWithPassword({
                    email: emailOrPhone,
                    password
                });
                if (error) throw error;
            } else if (phoneNumber) {
                // For phone-based signin, use the placeholder email format
                const placeholderEmail = `${phoneNumber}@phone.local`;

                const { error } = await supabase.auth.signInWithPassword({
                    email: placeholderEmail,
                    password
                });
                if (error) throw error;
            } else {
                throw new Error('Email or phone number is required');
            }
        } catch (error: any) {
            // Check if error is due to email not being confirmed
            const errorMessage = error.message?.toLowerCase() || '';
            if (errorMessage.includes('email not confirmed') || errorMessage.includes('email_not_confirmed')) {
                // Don't show alert - let the caller handle navigation to verification screen
                throw error;
            }
            Alert.alert('Sign In Error', error.message);
            throw error;
        }
    };

    const signInWithGoogle = async () => {
        try {
            // Use Supabase's signInWithOAuth which handles the OAuth flow
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUri,
                    skipBrowserRedirect: true,
                    queryParams: {
                        prompt: 'select_account',
                    },
                },
            });

            if (error) throw error;

            if (data?.url) {
                // Dismiss any existing browser session to prevent invalid state
                await WebBrowser.coolDownAsync();

                // Open the browser for authentication
                const result = await WebBrowser.openAuthSessionAsync(
                    data.url,
                    redirectUri,
                );

                if (result.type === 'success' && result.url) {
                    // Extract tokens using shared utility
                    const { accessToken, refreshToken, error: urlError } = extractAuthTokensFromUrl(result.url);

                    if (urlError) {
                        throw new Error(urlError);
                    }

                    if (accessToken && refreshToken) {
                        // Set the session with the tokens
                        const { error: sessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });

                        if (sessionError) {
                            throw sessionError;
                        }

                        // Reload the app to properly initialize the Supabase client with the new session
                        await safeReloadApp();
                    } else {
                        // Check if we got a code instead (authorization code flow)
                        const url = new URL(result.url);
                        const code = url.searchParams.get('code');
                        if (code) {
                            // Exchange the code for a session
                            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                            if (exchangeError) {
                                throw exchangeError;
                            }
                        } else {
                            throw new Error('No authentication data received from Google');
                        }
                    }
                } else if (result.type === 'cancel' || result.type === 'dismiss') {
                    return;
                }
            } else {
                throw new Error('Failed to get authentication URL');
            }
        } catch (error: any) {
            // Use shared error handler for OAuth errors
            const handled = handleAuthError(error, 'oauth', {
                customMessage: error.message || 'Failed to sign in with Google'
            });
            if (!handled) {
                throw error;
            }
        }
    };

    const signInWithFacebook = async () => {
        try {
            // Use Supabase's signInWithOAuth which handles the OAuth flow
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'facebook',
                options: {
                    redirectTo: redirectUri,
                    skipBrowserRedirect: true,
                    scopes: 'email,public_profile',
                },
            });

            if (error) throw error;

            if (data?.url) {
                // Dismiss any existing browser session to prevent invalid state
                await WebBrowser.coolDownAsync();

                // Open the browser for authentication
                const result = await WebBrowser.openAuthSessionAsync(
                    data.url,
                    redirectUri,
                );

                if (result.type === 'success' && result.url) {
                    // Extract tokens using shared utility
                    const { accessToken, refreshToken, error: urlError } = extractAuthTokensFromUrl(result.url);

                    if (urlError) {
                        throw new Error(urlError);
                    }

                    if (accessToken && refreshToken) {
                        // Set the session with the tokens
                        const { error: sessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });

                        if (sessionError) {
                            throw sessionError;
                        }

                        // Reload the app to properly initialize the Supabase client with the new session
                        await safeReloadApp();
                    } else {
                        // Check if we got a code instead (authorization code flow)
                        const url = new URL(result.url);
                        const code = url.searchParams.get('code');
                        if (code) {
                            // Exchange the code for a session
                            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                            if (exchangeError) {
                                throw exchangeError;
                            }
                        } else {
                            throw new Error('No authentication data received from Facebook');
                        }
                    }
                } else if (result.type === 'cancel' || result.type === 'dismiss') {
                    return;
                }
            } else {
                throw new Error('Failed to get authentication URL');
            }
        } catch (error: any) {
            // Use shared error handler for OAuth errors
            const handled = handleAuthError(error, 'oauth', {
                customMessage: error.message || 'Failed to sign in with Facebook'
            });
            if (!handled) {
                throw error;
            }
        }
    };

    const signOut = async () => {
        try {
            // Deactivate push token before signing out
            await NotificationService.deactivatePushToken();

            // Clear user-specific caches before signing out
            if (user?.id) {
                await clearUserCaches(user.id);
            }

            // Clear password reset flag on sign out
            await AsyncStorage.removeItem(PASSWORD_RESET_FLAG);
            setIsPasswordResetInProgressState(false);

            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error: any) {
            Alert.alert('Sign Out Error', error.message);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            signUp,
            signIn,
            signInWithGoogle,
            signInWithFacebook,
            signOut,
            loading,
            isPasswordResetInProgress,
            setPasswordResetInProgress,
            profileVersion
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
