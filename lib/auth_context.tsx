// lib/auth_context.tsx
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

// Safe reload function that works in both development and production
const safeReloadApp = async () => {
    try {
        // Only attempt to use expo-updates in production builds
        // In development (Expo Go), this module doesn't exist
        const Updates = require('expo-updates');
        if (Updates.reloadAsync) {
            await Updates.reloadAsync();
        }
    } catch (error) {
        // expo-updates not available (development mode)
        // The session is already set, so navigation will handle the redirect
    }
};

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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PASSWORD_RESET_FLAG = '@password_reset_in_progress';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPasswordResetInProgress, setIsPasswordResetInProgressState] = useState(false);
    const hasProcessedDeepLink = useRef(false);

    // Process auth callback URL and extract tokens
    const processAuthCallbackUrl = async (url: string): Promise<boolean> => {
        if (!url.includes('auth/callback')) {
            return false;
        }

        if (hasProcessedDeepLink.current) {
            return false;
        }

        try {
            const urlObj = new URL(url);
            const fragment = urlObj.hash.substring(1);

            let accessToken: string | null = null;
            let refreshToken: string | null = null;

            if (fragment) {
                const params = new URLSearchParams(fragment);
                accessToken = params.get('access_token');
                refreshToken = params.get('refresh_token');
            }

            // Also check query params (some flows use this)
            if (!accessToken || !refreshToken) {
                accessToken = accessToken || urlObj.searchParams.get('access_token');
                refreshToken = refreshToken || urlObj.searchParams.get('refresh_token');
            }

            if (accessToken && refreshToken) {
                hasProcessedDeepLink.current = true;
                const { data, error: sessionError } = await supabase.auth.setSession({
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

            // Check for error in URL
            const errorParam = urlObj.searchParams.get('error');
            if (errorParam) {
                console.error('[Auth] Error in callback URL:', errorParam);
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

    // Load initial password reset state
    useEffect(() => {
        const loadPasswordResetState = async () => {
            try {
                const value = await AsyncStorage.getItem(PASSWORD_RESET_FLAG);
                setIsPasswordResetInProgressState(value === 'true');
            } catch (error) {
                console.error('Error loading password reset state:', error);
            }
        };
        loadPasswordResetState();
    }, []);

    // Function to set password reset state
    const setPasswordResetInProgress = async (value: boolean) => {
        try {
            if (value) {
                await AsyncStorage.setItem(PASSWORD_RESET_FLAG, 'true');
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

                    // Create/update profile
                    createOrUpdateProfile(
                        session.user.id,
                        session.user.email,
                        session.user.user_metadata?.phone_number,
                        session.user.user_metadata?.display_name
                    );
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

                // Check if we're in password reset flow
                const isResetting = await AsyncStorage.getItem(PASSWORD_RESET_FLAG);

                // Only update profile on sign in if NOT resetting password
                if (event === 'SIGNED_IN' && session?.user && isResetting !== 'true') {
                    await createOrUpdateProfile(
                        session.user.id,
                        session.user.email,
                        session.user.user_metadata?.phone_number,
                        session.user.user_metadata?.display_name
                    );
                }

                // Update the in-memory state
                setIsPasswordResetInProgressState(isResetting === 'true');
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const createOrUpdateProfile = async (
        userId: string,
        email?: string,
        phoneNumber?: string,
        displayName?: string
    ) => {
        try {
            // First check if profile exists
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id, display_name')
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
                    });

                if (error) console.error('Profile creation error:', error);
            } else {
                // Update existing profile - only update display_name if provided and not already set
                const updates: any = {};
                if (email) updates.email = email;
                if (phoneNumber) updates.phone_number = phoneNumber;
                if (displayName && !existingProfile.display_name) {
                    updates.display_name = displayName;
                }

                if (Object.keys(updates).length > 0) {
                    const { error } = await supabase
                        .from('profiles')
                        .update(updates)
                        .eq('id', userId);

                    if (error) console.error('Profile update error:', error);
                }
            }
        } catch (error) {
            console.error('Profile error:', error);
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
                },
            });

            if (error) throw error;

            if (data?.url) {
                // Open the browser for authentication
                const result = await WebBrowser.openAuthSessionAsync(
                    data.url,
                    redirectUri,
                );

                if (result.type === 'success' && result.url) {

                    // Extract the access token and refresh token from the URL
                    const url = new URL(result.url);

                    // Check for hash fragment (Supabase returns tokens in hash)
                    const hashParams = new URLSearchParams(url.hash.substring(1));
                    const accessToken = hashParams.get('access_token');
                    const refreshToken = hashParams.get('refresh_token');

                    if (accessToken && refreshToken) {
                        // Set the session with the tokens
                        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });

                        if (sessionError) {
                            throw sessionError;
                        }

                        // Reload the app to properly initialize the Supabase client with the new session
                        await safeReloadApp();
                    } else {
                        // Check for error in URL
                        const errorParam = url.searchParams.get('error');
                        const errorDescription = url.searchParams.get('error_description');

                        if (errorParam) {
                            throw new Error(errorDescription || errorParam);
                        }

                        // Check if we got a code instead (authorization code flow)
                        const code = url.searchParams.get('code');
                        if (code) {
                            // Exchange the code for a session
                            const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

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
            console.error('[Auth] Google Sign-In error:', error);

            // Handle specific error cases
            const errorMessage = error.message?.toLowerCase() || '';

            if (
                errorMessage.includes('already registered') ||
                errorMessage.includes('already exists') ||
                errorMessage.includes('user_already_exists')
            ) {
                Alert.alert(
                    'Account Already Exists',
                    'An account with this email already exists. Please sign in with your password, then link your Google account from Settings.',
                    [{ text: 'OK' }]
                );
                return;
            }

            if (errorMessage.includes('cancel') || errorMessage.includes('dismiss')) {
                // User cancelled - don't show error
                return;
            }

            Alert.alert('Sign In Error', error.message || 'Failed to sign in with Google');
            throw error;
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
                // Open the browser for authentication
                const result = await WebBrowser.openAuthSessionAsync(
                    data.url,
                    redirectUri,
                );

                if (result.type === 'success' && result.url) {

                    // Extract the access token and refresh token from the URL
                    const url = new URL(result.url);

                    // Check for hash fragment (Supabase returns tokens in hash)
                    const hashParams = new URLSearchParams(url.hash.substring(1));
                    const accessToken = hashParams.get('access_token');
                    const refreshToken = hashParams.get('refresh_token');

                    if (accessToken && refreshToken) {
                        // Set the session with the tokens
                        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });

                        if (sessionError) {
                            throw sessionError;
                        }

                        // The Supabase client doesn't properly initialize after manual setSession().
                        // Reload the app to force a fresh initialization where getSession() works normally.
                        await safeReloadApp();
                    } else {
                        // Check for error in URL
                        const errorParam = url.searchParams.get('error');
                        const errorDescription = url.searchParams.get('error_description');

                        if (errorParam) {
                            throw new Error(errorDescription || errorParam);
                        }

                        // Check if we got a code instead (authorization code flow)
                        const code = url.searchParams.get('code');
                        if (code) {
                            // Exchange the code for a session
                            const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

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
            console.error('[Auth] Facebook Sign-In error:', error);

            // Handle specific error cases
            const errorMessage = error.message?.toLowerCase() || '';

            if (
                errorMessage.includes('already registered') ||
                errorMessage.includes('already exists') ||
                errorMessage.includes('user_already_exists')
            ) {
                Alert.alert(
                    'Account Already Exists',
                    'An account with this email already exists. Please sign in with your password, then link your Facebook account from Settings.',
                    [{ text: 'OK' }]
                );
                return;
            }

            if (errorMessage.includes('cancel') || errorMessage.includes('dismiss')) {
                // User cancelled - don't show error
                return;
            }

            Alert.alert('Sign In Error', error.message || 'Failed to sign in with Facebook');
            throw error;
        }
    };

    const signOut = async () => {
        try {
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
            setPasswordResetInProgress
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
