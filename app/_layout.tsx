// app/_layout.tsx
import { AuthLogo } from '@/components/auth/AuthLogo';
import { Colors, BRAND_COLOR } from '@/constants/theme';
import { AppDataProvider, useAppData } from '@/lib/app_data_context';
import { AuthProvider, useAuth } from '@/lib/auth_context';
import { FavoritesProvider, useFavoritesContext } from '@/lib/favorites_context';
import { ThemeProvider, useAppColorScheme } from '@/lib/theme_context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootLayoutNav() {
  const { user, loading: authLoading, isPasswordResetInProgress } = useAuth();
  const { isGlobalLoading } = useAppData();
  const { isLoading: favoritesLoading } = useFavoritesContext();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];

  // Track previous user to detect user changes
  // This prevents race condition where navigation runs before data providers update
  const previousUserIdRef = useRef<string | undefined>(undefined);
  const userJustChangedRef = useRef(false);
  const dataLoadingStartedRef = useRef(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect user change - set flag immediately (synchronously)
  const currentUserId = user?.id;
  if (previousUserIdRef.current !== currentUserId) {
    // User changed (sign in, sign out, or user switch)
    if (currentUserId && !previousUserIdRef.current) {
      // User just signed in - mark that data needs to load
      userJustChangedRef.current = true;
      dataLoadingStartedRef.current = false; // Reset - wait for loading to start
      console.log('[Nav] User just signed in, waiting for data to load...');

      // Set a timeout failsafe - if loading takes too long, proceed anyway
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      loadingTimeoutRef.current = setTimeout(() => {
        if (userJustChangedRef.current) {
          console.log('[Nav] Loading timeout - proceeding anyway');
          userJustChangedRef.current = false;
          dataLoadingStartedRef.current = false;
        }
      }, 10000); // 10 second timeout
    } else {
      // User signed out - reset flags
      userJustChangedRef.current = false;
      dataLoadingStartedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
    previousUserIdRef.current = currentUserId;
  }

  // Track when data loading actually starts (isGlobalLoading becomes true)
  if (userJustChangedRef.current && !dataLoadingStartedRef.current && isGlobalLoading) {
    dataLoadingStartedRef.current = true;
    console.log('[Nav] Data loading started...');
  }

  // Clear the "user just changed" flag only AFTER:
  // 1. Loading has started (dataLoadingStartedRef is true)
  // 2. AND loading has completed (isGlobalLoading and favoritesLoading are false)
  if (userJustChangedRef.current && dataLoadingStartedRef.current && !isGlobalLoading && !favoritesLoading) {
    userJustChangedRef.current = false;
    dataLoadingStartedRef.current = false;
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    console.log('[Nav] Data loading complete after sign in');
  }

  // Determine if we should show loading screen
  // Show loading until: auth is initialized AND (if authenticated) all global data is loaded
  // Also wait if user just changed and data providers haven't caught up yet
  const shouldShowLoading = authLoading || (user && (isGlobalLoading || favoritesLoading || userJustChangedRef.current));

  console.log('[Nav] Loading state:', {
    authLoading,
    isGlobalLoading,
    favoritesLoading,
    userJustChanged: userJustChangedRef.current,
    shouldShowLoading,
    hasUser: !!user
  });

  // Handle auth state changes
  useEffect(() => {
    // Don't run until auth loading is complete AND navigator is mounted
    // (shouldShowLoading being true means we're showing the loading screen, not the Stack)
    if (authLoading) return;
    if (shouldShowLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inProtectedRoute = inTabsGroup || ['category', 'listing', 'chat', 'search', 'product-details', 'user', 'personal-details'].includes(segments[0] as string);

    console.log('[Nav] Auth state check:', { user: !!user, segments: segments[0], inAuthGroup, inProtectedRoute });

    if (!user && !inAuthGroup) {
      // Redirect to auth screen if not authenticated
      console.log('[Nav] Not authenticated, redirecting to auth');
      router.replace('/(auth)');
    } else if (user && !inProtectedRoute) {
      // User is authenticated but not on a protected route (e.g., on catch-all or auth)
      // CRITICAL: Check if we're in password reset flow BEFORE redirecting
      if (isPasswordResetInProgress) {
        // User is in password reset flow - DO NOT redirect to main app
        console.log('[Nav] Password reset in progress, staying in current route');
        return;
      }

      // Not in password reset flow, safe to redirect to main app
      console.log('[Nav] Authenticated, redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [user, segments, authLoading, isPasswordResetInProgress, shouldShowLoading]);

  // Show loading screen while auth state OR global data is being loaded
  // This eliminates the "waterfall effect" where screens load data individually
  if (shouldShowLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <AuthLogo size="large" containerStyle={{ marginBottom: 24 }} />
        <ActivityIndicator size="large" color={BRAND_COLOR} />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(test)/test-supabase" options={{
        title: 'Test',
        headerShown: true
      }} />
      <Stack.Screen name="category/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="listing/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="product-details" options={{ headerShown: false }} />
      <Stack.Screen name="user" options={{ headerShown: false }} />
      <Stack.Screen name="personal-details" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      <Stack.Screen name="[...unmatched]" options={{ headerShown: false }} />
    </Stack>
  );
}

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