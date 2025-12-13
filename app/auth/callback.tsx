// app/auth/callback.tsx
// This route handles OAuth redirects and email verification deep links
// It extracts tokens from the URL fragment and sets the Supabase session

import { supabase } from '@/lib/supabase';
import { BRAND_COLOR } from '@/constants/theme';
import * as Linking from 'expo-linking';
import { useURL } from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

export default function AuthCallback() {
  const url = useURL();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const hasProcessedUrl = useRef(false); // Prevent double processing

  // Process the auth callback URL
  const processAuthUrl = async (authUrl: string) => {
    // Prevent processing the same URL twice
    if (hasProcessedUrl.current) {
      console.log('[AuthCallback] URL already processed, skipping');
      return;
    }
    hasProcessedUrl.current = true;

    console.log('[AuthCallback] Processing URL:', authUrl);

    try {
      const urlObj = new URL(authUrl);
      const fragment = urlObj.hash.substring(1);

      if (!fragment) {
        console.log('[AuthCallback] No fragment in URL, checking for error...');
        const errorParam = urlObj.searchParams.get('error');
        const errorDescription = urlObj.searchParams.get('error_description');
        if (errorParam) {
          throw new Error(errorDescription || errorParam);
        }
        // No tokens and no error - redirect to auth
        console.log('[AuthCallback] No tokens found, redirecting to auth');
        router.replace('/(auth)');
        return;
      }

      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      console.log('[AuthCallback] Tokens found:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
      });

      if (accessToken && refreshToken) {
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

        // Reload the app to properly initialize Supabase client with new session
        // This is the same approach used by Google OAuth
        try {
          const Updates = require('expo-updates');
          if (Updates.reloadAsync) {
            console.log('[AuthCallback] Reloading app via expo-updates...');
            await Updates.reloadAsync();
          }
        } catch (reloadError) {
          // expo-updates not available (dev mode) - use navigation instead
          console.log('[AuthCallback] expo-updates not available, using navigation');
          router.replace('/(tabs)');
        }
      } else {
        console.log('[AuthCallback] Missing tokens in fragment');
        throw new Error('Authentication tokens not found');
      }
    } catch (err: any) {
      console.error('[AuthCallback] Error:', err);
      setError(err.message || 'An error occurred during authentication');
      hasProcessedUrl.current = false; // Allow retry

      setTimeout(() => {
        router.replace('/(auth)');
      }, 3000);
    }
  };

  // Check for initial URL on mount (cold start)
  useEffect(() => {
    const checkInitialUrl = async () => {
      console.log('[AuthCallback] Checking for initial URL...');
      const initialUrl = await Linking.getInitialURL();
      console.log('[AuthCallback] Initial URL:', initialUrl);

      if (initialUrl && initialUrl.includes('auth/callback')) {
        await processAuthUrl(initialUrl);
      }
    };

    checkInitialUrl();
  }, []);

  // Listen for URL changes (app already open)
  useEffect(() => {
    if (url) {
      console.log('[AuthCallback] useURL received:', url);
      processAuthUrl(url);
    }
  }, [url]);

  // Timeout fallback
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasProcessedUrl.current) {
        console.log('[AuthCallback] Timeout - no URL received after 10s');
        setError('Timed out waiting for authentication data');
        setTimeout(() => router.replace('/(auth)'), 2000);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, []);

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
