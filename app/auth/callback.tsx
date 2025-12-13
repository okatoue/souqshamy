// app/auth/callback.tsx
// This route handles OAuth redirects and email verification deep links
// It extracts tokens from the URL fragment and sets the Supabase session

import { supabase } from '@/lib/supabase';
import { BRAND_COLOR } from '@/constants/theme';
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

  // Log all available params for debugging
  useEffect(() => {
    console.log('[AuthCallback] Component mounted');
    console.log('[AuthCallback] Local params:', JSON.stringify(localParams));
    console.log('[AuthCallback] Global params:', JSON.stringify(globalParams));
  }, []);

  // Process the auth callback URL or tokens
  const processAuthTokens = async (accessToken: string, refreshToken: string) => {
    if (hasProcessedUrl.current) {
      console.log('[AuthCallback] Already processed, skipping');
      return;
    }
    hasProcessedUrl.current = true;

    console.log('[AuthCallback] Processing tokens...');

    try {
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
      try {
        const Updates = require('expo-updates');
        if (Updates.reloadAsync) {
          console.log('[AuthCallback] Reloading app via expo-updates...');
          await Updates.reloadAsync();
        }
      } catch (reloadError) {
        console.log('[AuthCallback] expo-updates not available, using navigation');
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
  const processAuthUrl = async (authUrl: string) => {
    console.log('[AuthCallback] Processing URL:', authUrl);

    try {
      const urlObj = new URL(authUrl);
      const fragment = urlObj.hash.substring(1);

      if (!fragment) {
        console.log('[AuthCallback] No fragment in URL, checking query params...');
        // Check for tokens in query params (some OAuth flows use this)
        const accessToken = urlObj.searchParams.get('access_token');
        const refreshToken = urlObj.searchParams.get('refresh_token');

        if (accessToken && refreshToken) {
          await processAuthTokens(accessToken, refreshToken);
          return;
        }

        const errorParam = urlObj.searchParams.get('error');
        const errorDescription = urlObj.searchParams.get('error_description');
        if (errorParam) {
          throw new Error(errorDescription || errorParam);
        }
        console.log('[AuthCallback] No tokens found in URL');
        return false;
      }

      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      console.log('[AuthCallback] Tokens found:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
      });

      if (accessToken && refreshToken) {
        await processAuthTokens(accessToken, refreshToken);
        return true;
      } else {
        console.log('[AuthCallback] Missing tokens in fragment');
        return false;
      }
    } catch (err: any) {
      console.error('[AuthCallback] Error processing URL:', err);
      setError(err.message || 'An error occurred during authentication');
      hasProcessedUrl.current = false;

      setTimeout(() => {
        router.replace('/(auth)');
      }, 3000);
      return false;
    }
  };

  // Try multiple methods to get the URL on mount
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AuthCallback] Initializing auth callback...');

      // Method 1: Check if tokens are in expo-router params (query string)
      const accessTokenFromParams = localParams.access_token || globalParams.access_token;
      const refreshTokenFromParams = localParams.refresh_token || globalParams.refresh_token;

      if (accessTokenFromParams && refreshTokenFromParams) {
        console.log('[AuthCallback] Found tokens in router params');
        await processAuthTokens(
          accessTokenFromParams as string,
          refreshTokenFromParams as string
        );
        return;
      }

      // Method 2: Try getInitialURL (for cold start)
      console.log('[AuthCallback] Checking getInitialURL...');
      try {
        const initialUrl = await Linking.getInitialURL();
        console.log('[AuthCallback] getInitialURL result:', initialUrl);

        if (initialUrl && initialUrl.includes('auth/callback')) {
          const processed = await processAuthUrl(initialUrl);
          if (processed) return;
        }
      } catch (e) {
        console.log('[AuthCallback] getInitialURL error:', e);
      }

      // Method 3: Parse current URL from Linking
      console.log('[AuthCallback] Checking Linking.parseInitialURLAsync...');
      try {
        const parsedUrl = await Linking.parseInitialURLAsync();
        console.log('[AuthCallback] parseInitialURLAsync result:', JSON.stringify(parsedUrl));

        if (parsedUrl?.queryParams) {
          const accessToken = parsedUrl.queryParams.access_token;
          const refreshToken = parsedUrl.queryParams.refresh_token;
          if (accessToken && refreshToken) {
            await processAuthTokens(accessToken as string, refreshToken as string);
            return;
          }
        }
      } catch (e) {
        console.log('[AuthCallback] parseInitialURLAsync error:', e);
      }

      console.log('[AuthCallback] No tokens found via any method, waiting for URL event...');
    };

    initializeAuth();
  }, []);

  // Listen for URL events (app already open / foreground)
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('[AuthCallback] URL event received:', event.url);
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
        console.log('[AuthCallback] Timeout - no tokens received after 15s');
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
