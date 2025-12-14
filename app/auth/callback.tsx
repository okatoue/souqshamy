// app/auth/callback.tsx
// This route handles OAuth redirects and email verification deep links
// It extracts tokens from the URL fragment and sets the Supabase session

import { supabase } from '@/lib/supabase';
import { BRAND_COLOR } from '@/constants/theme';
import { getCapturedInitialUrl, waitForCapturedUrl, clearCapturedUrl } from '@/lib/initialUrl';
import * as Linking from 'expo-linking';
import { useRouter, useLocalSearchParams, useGlobalSearchParams } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

export default function AuthCallback() {
  const router = useRouter();
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const [error, setError] = useState<string | null>(null);
  const hasProcessedUrl = useRef(false);

  // Check for captured URL on mount
  useEffect(() => {
    // Check for captured URL from initialUrl module
    getCapturedInitialUrl();
  }, []);

  // Process the auth callback URL or tokens
  const processAuthTokens = async (accessToken: string, refreshToken: string) => {
    if (hasProcessedUrl.current) {
      return;
    }
    hasProcessedUrl.current = true;

    try {
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        throw sessionError;
      }

      // Clear the captured URL since we've processed it
      clearCapturedUrl();

      // Reload the app to properly initialize Supabase client with new session
      try {
        const Updates = require('expo-updates');
        if (Updates.reloadAsync) {
          await Updates.reloadAsync();
        }
      } catch (reloadError) {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.error('[AuthCallback] Error:', err);
      setError(err.message || 'An error occurred during authentication');
      hasProcessedUrl.current = false;

      setTimeout(() => {
        router.replace('/(auth)');
      }, 3000);
    }
  };

  // Process URL string to extract tokens
  const processAuthUrl = async (authUrl: string): Promise<boolean> => {
    try {
      const urlObj = new URL(authUrl);
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
        await processAuthTokens(accessToken, refreshToken);
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('[AuthCallback] Error processing URL:', err);
      return false;
    }
  };

  // Try multiple methods to get the URL on mount
  useEffect(() => {
    const initializeAuth = async () => {
      // Method 1: Check if tokens are in expo-router params (query string)
      const accessTokenFromParams = localParams.access_token || globalParams.access_token;
      const refreshTokenFromParams = localParams.refresh_token || globalParams.refresh_token;

      if (accessTokenFromParams && refreshTokenFromParams) {
        await processAuthTokens(
          accessTokenFromParams as string,
          refreshTokenFromParams as string
        );
        return;
      }

      // Method 2: Check captured URL from initialUrl module
      const capturedUrl = await waitForCapturedUrl();

      if (capturedUrl && capturedUrl.includes('auth/callback')) {
        const processed = await processAuthUrl(capturedUrl);
        if (processed) return;
      }

      // Method 3: Try getInitialURL (for cold start)
      try {
        const initialUrl = await Linking.getInitialURL();

        if (initialUrl && initialUrl.includes('auth/callback')) {
          const processed = await processAuthUrl(initialUrl);
          if (processed) return;
        }
      } catch (e) {
        // Silently handle getInitialURL errors
      }

      // Method 4: Parse current URL from Linking
      try {
        const parsedUrl = await Linking.parseInitialURLAsync();

        if (parsedUrl?.queryParams) {
          const accessToken = parsedUrl.queryParams.access_token;
          const refreshToken = parsedUrl.queryParams.refresh_token;
          if (accessToken && refreshToken) {
            await processAuthTokens(accessToken as string, refreshToken as string);
            return;
          }
        }
      } catch (e) {
        // Silently handle parseInitialURLAsync errors
      }
    };

    initializeAuth();
  }, []);

  // Listen for URL events (app already open / foreground)
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      if (event.url && event.url.includes('auth/callback')) {
        processAuthUrl(event.url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Timeout fallback
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasProcessedUrl.current) {
        setError('Timed out waiting for authentication data. Please try again.');
        setTimeout(() => router.replace('/(auth)'), 2000);
      }
    }, 15000);

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
