// app/auth/callback.tsx
// This route handles OAuth redirects and email verification deep links
// It extracts tokens from the URL fragment and sets the Supabase session

import { supabase } from '@/lib/supabase';
import { BRAND_COLOR } from '@/constants/theme';
import { useURL } from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

export default function AuthCallback() {
  const url = useURL();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      console.log('[AuthCallback] No URL yet, waiting...');
      return;
    }

    console.log('[AuthCallback] Processing URL:', url);

    const handleCallback = async () => {
      try {
        // Parse the URL to extract the fragment (hash)
        const urlObj = new URL(url);
        const fragment = urlObj.hash.substring(1); // Remove the # prefix

        if (!fragment) {
          console.log('[AuthCallback] No fragment in URL, checking for error...');
          // Check for error in query params
          const errorParam = urlObj.searchParams.get('error');
          const errorDescription = urlObj.searchParams.get('error_description');
          if (errorParam) {
            throw new Error(errorDescription || errorParam);
          }
          // No tokens and no error - might be initial load
          return;
        }

        // Parse the fragment as URL search params
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        console.log('[AuthCallback] Tokens found:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
        });

        if (accessToken && refreshToken) {
          // Set the session with the tokens
          console.log('[AuthCallback] Setting session with tokens...');
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('[AuthCallback] Session error:', sessionError);
            throw sessionError;
          }

          console.log('[AuthCallback] Session set successfully:', data.user?.email);

          // The _layout.tsx will detect the user and navigate to (tabs)
          // But we can also explicitly navigate to ensure it happens
          router.replace('/(tabs)');
        } else {
          console.log('[AuthCallback] No tokens in fragment');
          // Check for error in fragment
          const errorParam = params.get('error');
          const errorDescription = params.get('error_description');
          if (errorParam) {
            throw new Error(errorDescription || errorParam);
          }
        }
      } catch (err: any) {
        console.error('[AuthCallback] Error:', err);
        setError(err.message || 'An error occurred during authentication');

        // Redirect to auth screen after a delay
        setTimeout(() => {
          router.replace('/(auth)');
        }, 3000);
      }
    };

    handleCallback();
  }, [url, router]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Authentication Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text style={styles.redirectText}>Redirecting to sign in...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={BRAND_COLOR} />
      <Text style={styles.loadingText}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  redirectText: {
    fontSize: 12,
    color: '#999',
  },
});
