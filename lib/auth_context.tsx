// lib/auth_context.tsx
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

type AuthContextType = {
    user: User | null;
    session: Session | null;
    signUp: (emailOrPhone: string | undefined, password: string, phoneNumber?: string, displayName?: string) => Promise<void>;
    signIn: (emailOrPhone: string | undefined, password: string, phoneNumber?: string) => Promise<void>;
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
        console.log('[Auth] Initializing auth context...');

        // Initialize auth - check for existing session
        const initializeAuth = async () => {
            try {
                console.log('[Auth] Calling getSession()...');
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('[Auth] getSession error:', error);
                } else {
                    console.log('[Auth] getSession result:', session ? `User: ${session.user.email}` : 'No session');
                }

                setSession(session);
                setUser(session?.user ?? null);

                // If we have a valid session on startup, clear any stuck password reset flag
                // A valid session means the user is logged in and not mid-reset
                if (session?.user) {
                    const isResetting = await AsyncStorage.getItem(PASSWORD_RESET_FLAG);
                    if (isResetting === 'true') {
                        console.log('[Auth] Clearing stuck password reset flag - user has valid session');
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
                console.log('[Auth] Auth state changed:', event, session ? `User: ${session.user.email}` : 'No session');

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
            console.log('[Auth] Attempting sign in...');

            if (emailOrPhone) {
                // Sign in with email
                const { error } = await supabase.auth.signInWithPassword({
                    email: emailOrPhone,
                    password
                });
                if (error) throw error;
                console.log('[Auth] Sign in successful with email');
            } else if (phoneNumber) {
                // For phone-based signin, use the placeholder email format
                const placeholderEmail = `${phoneNumber}@phone.local`;

                const { error } = await supabase.auth.signInWithPassword({
                    email: placeholderEmail,
                    password
                });
                if (error) throw error;
                console.log('[Auth] Sign in successful with phone');
            } else {
                throw new Error('Email or phone number is required');
            }
        } catch (error: any) {
            Alert.alert('Sign In Error', error.message);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            console.log('[Auth] Signing out...');

            // Clear password reset flag on sign out
            await AsyncStorage.removeItem(PASSWORD_RESET_FLAG);
            setIsPasswordResetInProgressState(false);

            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            console.log('[Auth] Sign out successful');
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