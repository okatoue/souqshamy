// app/_layout.tsx
import { AuthLogo } from '@/components/auth/AuthLogo';
import { Colors, BRAND_COLOR } from '@/constants/theme';
import { AppDataProvider, useAppData } from '@/lib/app_data_context';
import { AuthProvider, useAuth } from '@/lib/auth_context';
import { FavoritesProvider, useFavoritesContext } from '@/lib/favorites_context';
import { ThemeProvider, useAppColorScheme } from '@/lib/theme_context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootLayoutNav() {
  const { user, loading: authLoading, isPasswordResetInProgress } = useAuth();
  const { isGlobalLoading } = useAppData();
  const { isLoading: favoritesLoading } = useFavoritesContext();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];

  // Determine if we should show loading overlay
  // Only show loading during auth initialization, not during data loading.
  // Individual screens will handle their own loading states for data.
  // This prevents the infinite loading issue where Supabase queries hang after OAuth.
  const showLoadingOverlay = authLoading;

  // DEBUG: Log all relevant state on every render
  console.log('[Layout] Render state:', {
    authLoading,
    hasUser: !!user,
    isGlobalLoading,
    favoritesLoading,
    showLoadingOverlay,
    segments: segments.join('/'),
  });

  // Handle auth state changes and navigation
  // NOTE: Navigation happens immediately based on auth state, independent of data loading.
  // The loading overlay will show on the destination route while data loads.
  useEffect(() => {
    console.log('[Layout] useEffect triggered');

    // Don't navigate until auth is initialized
    if (authLoading) {
      console.log('[Layout] useEffect: authLoading is true, returning early');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    // Check if user is on the OAuth callback route (auth/callback)
    const isOAuthCallback = segments[0] === 'auth' && segments[1] === 'callback';

    console.log('[Layout] useEffect: checking navigation', {
      hasUser: !!user,
      inAuthGroup,
      isOAuthCallback,
      segment0: segments[0],
      segment1: segments[1],
    });

    if (!user && !inAuthGroup && !isOAuthCallback) {
      // Redirect to auth screen if not authenticated
      console.log('[Layout] useEffect: No user, redirecting to /(auth)');
      router.replace('/(auth)');
    } else if (user && (inAuthGroup || isOAuthCallback)) {
      // CRITICAL: Check if we're in password reset flow BEFORE redirecting
      if (isPasswordResetInProgress) {
        // User is in password reset flow - DO NOT redirect to main app
        console.log('[Auth] Password reset in progress, staying in auth group');
        return;
      }

      // Not in password reset flow, safe to redirect to main app
      console.log('[Layout] useEffect: User authenticated, redirecting to /(tabs)');
      router.replace('/(tabs)');
    } else {
      console.log('[Layout] useEffect: No navigation needed (user on correct route)');
    }
  }, [user, segments, authLoading, isPasswordResetInProgress]);

  // Always render the Stack navigator so navigation actions always have a target.
  // The loading overlay renders ON TOP of the Stack when needed, hiding content
  // until auth and data loading are complete. This eliminates the race condition
  // where navigation was attempted before the Stack was mounted.
  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="(test)/test-supabase" options={{
          title: 'Test',
          headerShown: true
        }} />
        <Stack.Screen name="category/[id]" />
        <Stack.Screen name="listing/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="search" />
        <Stack.Screen name="product-details" />
        <Stack.Screen name="user" />
        <Stack.Screen name="personal-details" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>

      {/* Loading overlay - covers the entire screen while loading */}
      {showLoadingOverlay && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
          <AuthLogo size="large" containerStyle={{ marginBottom: 24 }} />
          <ActivityIndicator size="large" color={BRAND_COLOR} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <BottomSheetModalProvider>
          <AuthProvider>
            <FavoritesProvider>
              <AppDataProvider>
                <RootLayoutNav />
              </AppDataProvider>
            </FavoritesProvider>
          </AuthProvider>
        </BottomSheetModalProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
