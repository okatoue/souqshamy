import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

type AuthContextType = {
    user: User | null;
    session: Session | null;
    signUp: (emailOrPhone: string | undefined, password: string, phoneNumber?: string) => Promise<void>;
    signIn: (emailOrPhone: string | undefined, password: string, phoneNumber?: string) => Promise<void>;
    signOut: () => Promise<void>;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            
            // Create/update profile if user exists
            if (session?.user) {
                createOrUpdateProfile(session.user.id, session.user.email);
            }
            
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);

                // Create/update profile on sign in
                if (_event === 'SIGNED_IN' && session?.user) {
                    await createOrUpdateProfile(
                        session.user.id,
                        session.user.email,
                        session.user.user_metadata?.phone_number
                    );
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const createOrUpdateProfile = async (userId: string, email?: string, phoneNumber?: string) => {
        try {
            // First check if profile exists
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', userId)
                .single();

            if (!existingProfile) {
                // Create new profile with email and phone
                const { error } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        email: email,
                        phone_number: phoneNumber,
                    });

                if (error) console.error('Profile creation error:', error);
            } else {
                // Update existing profile with email if not already set
                const updates: any = {};
                if (email) updates.email = email;
                if (phoneNumber) updates.phone_number = phoneNumber;

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

    const signUp = async (emailOrPhone: string | undefined, password: string, phoneNumber?: string) => {
        try {
            if (emailOrPhone) {
                // Sign up with email
                const { data, error } = await supabase.auth.signUp({
                    email: emailOrPhone,
                    password,
                    options: {
                        data: {
                            phone_number: phoneNumber,
                        }
                    }
                });

                if (error) throw error;
            } else if (phoneNumber) {
                // For phone-based signup, we'll use phone as a unique identifier
                // Note: Supabase requires email for auth, so we generate a placeholder email
                const placeholderEmail = `${phoneNumber}@phone.local`;
                
                const { data, error } = await supabase.auth.signUp({
                    email: placeholderEmail,
                    password,
                    options: {
                        data: {
                            phone_number: phoneNumber,
                            is_phone_user: true,
                        }
                    }
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

    const signIn = async (emailOrPhone: string | undefined, password: string, phoneNumber?: string) => {
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
            Alert.alert('Sign In Error', error.message);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error: any) {
            Alert.alert('Sign Out Error', error.message);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, signUp, signIn, signOut, loading }}>
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