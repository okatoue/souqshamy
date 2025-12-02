// app/[...unmatched].tsx
// Catch-all route to handle OAuth callbacks and unmatched deep links
// NOTE: This route does NOT navigate - it only processes OAuth tokens.
// Navigation is handled by _layout.tsx based on auth state changes.
import { supabase } from '@/lib/supabase';
import { useGlobalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';

export default function UnmatchedRoute() {
    const params = useGlobalSearchParams();
    const [processed, setProcessed] = useState(false);

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                // Get the current URL to check for OAuth tokens
                const url = await Linking.getInitialURL();
                console.log('[OAuth Callback] Initial URL:', url);
                console.log('[OAuth Callback] Params:', params);

                if (url) {
                    // Parse the URL to extract tokens from hash fragment
                    const parsedUrl = Linking.parse(url);
                    console.log('[OAuth Callback] Parsed URL:', parsedUrl);

                    // Check if we have OAuth tokens in the URL hash
                    // Supabase returns tokens in the hash fragment: #access_token=...&refresh_token=...
                    const hashIndex = url.indexOf('#');
                    if (hashIndex !== -1) {
                        const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
                        const accessToken = hashParams.get('access_token');
                        const refreshToken = hashParams.get('refresh_token');

                        console.log('[OAuth Callback] Found tokens:', {
                            hasAccessToken: !!accessToken,
                            hasRefreshToken: !!refreshToken
                        });

                        if (accessToken && refreshToken) {
                            // Set the session with the tokens
                            // This triggers onAuthStateChange in _layout.tsx which handles navigation
                            const { data, error } = await supabase.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken,
                            });

                            if (error) {
                                console.error('[OAuth Callback] Error setting session:', error);
                            } else {
                                console.log('[OAuth Callback] Session set successfully:', data.user?.email);
                                // Navigation will be handled by _layout.tsx auth listener
                            }

                            setProcessed(true);
                            return;
                        }
                    }

                    // Check for authorization code flow
                    const code = parsedUrl.queryParams?.code as string | undefined;
                    if (code) {
                        console.log('[OAuth Callback] Found authorization code, exchanging...');
                        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

                        if (error) {
                            console.error('[OAuth Callback] Error exchanging code:', error);
                        } else {
                            console.log('[OAuth Callback] Code exchanged successfully:', data.user?.email);
                            // Navigation will be handled by _layout.tsx auth listener
                        }

                        setProcessed(true);
                        return;
                    }
                }

                // No OAuth tokens found - just mark as processed
                // _layout.tsx will handle navigation based on current auth state
                console.log('[OAuth Callback] No OAuth data found, waiting for auth state...');
                setProcessed(true);
            } catch (error) {
                console.error('[OAuth Callback] Error:', error);
                setProcessed(true);
            }
        };

        handleOAuthCallback();
    }, []);

    // Show loading indicator while processing
    // Once processed, _layout.tsx takes over navigation based on auth state
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
        </View>
    );
}
