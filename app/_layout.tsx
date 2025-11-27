// app/_layout.tsx
import { AuthLogo } from '@/components/auth/AuthLogo';
import { Colors, BRAND_COLOR } from '@/constants/theme';
import { AppDataProvider, useAppData } from '@/lib/app_data_context';
import { AuthProvider, useAuth } from '@/lib/auth_context';
import { FavoritesProvider } from '@/lib/favorites_context';
import { ThemeProvider, useAppColorScheme } from '@/lib/theme_context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function LoadingScreen() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme];

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

function RootLayoutNav() {
  const { user, loading: authLoading, isPasswordResetInProgress } = useAuth();
  const { isDataLoading } = useAppData();
  const segments = useSegments();
  const router = useRouter();

  // Handle auth state changes
  useEffect(() => {
    // Don't run until auth loading is complete
    if (authLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to auth screen if not authenticated
      router.replace('/(auth)');
    } else if (user && inAuthGroup) {
      // CRITICAL: Check if we're in password reset flow BEFORE redirecting
      // This is now a synchronous check from auth context state
      if (isPasswordResetInProgress) {
        // User is in password reset flow - DO NOT redirect to main app
        // They need to complete the password reset process
        console.log('[Auth] Password reset in progress, staying in auth group');
        return;
      }

      // Not in password reset flow, safe to redirect to main app
      router.replace('/(tabs)');
    }
  }, [user, segments, authLoading, isPasswordResetInProgress]);

  // Show loading screen while auth is loading OR while data is loading for authenticated users
  if (authLoading || (user && isDataLoading)) {
    return <LoadingScreen />;
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
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <BottomSheetModalProvider>
          <AuthProvider>
            <AppDataProvider>
              <FavoritesProvider>
                <RootLayoutNav />
              </FavoritesProvider>
            </AppDataProvider>
          </AuthProvider>
        </BottomSheetModalProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}