import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

type AuthContextType = {
    user: User | null;
    session: Session | null;
    signUp: (email: string, password: string, phone?: string, whatsapp?: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
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
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email: string, password: string, phone?: string, whatsapp?: string) => {
        try {
            // Sign up the user
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        phone_number: phone,
                        whatsapp_number: whatsapp,
                    }
                }
            });

            if (error) throw error;

            // Don't create profile here - let's do it after email verification
            // or on first sign-in

        } catch (error: any) {
            Alert.alert('Sign Up Error', error.message);
            throw error;
        }
    };
    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
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

    // Add this to auth-context.tsx
    const createOrUpdateProfile = async (userId: string, phone?: string, whatsapp?: string) => {
        try {
            // First check if profile exists
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', userId)
                .single();

            if (!existingProfile) {
                // Create new profile
                const { error } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        phone_number: phone,
                        whatsapp_number: whatsapp,
                    });

                if (error) console.error('Profile creation error:', error);
            }
        } catch (error) {
            console.error('Profile error:', error);
        }
    };

    // Update the useEffect in AuthProvider
    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);

            // Create profile if user exists and doesn't have one
            if (session?.user) {
                createOrUpdateProfile(session.user.id);
            }

            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);

                // Create profile on sign in
                if (_event === 'SIGNED_IN' && session?.user) {
                    const metadata = session.user.user_metadata;
                    await createOrUpdateProfile(
                        session.user.id,
                        metadata?.phone_number,
                        metadata?.whatsapp_number
                    );
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

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