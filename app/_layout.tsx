// app/_layout.tsx
import { AuthProvider, useAuth } from '@/lib/auth_context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Handle auth state changes
  useEffect(() => {
    if (loading) return;

    const checkAuthAndRedirect = async () => {
      const inAuthGroup = segments[0] === '(auth)';

      if (!user && !inAuthGroup) {
        // Redirect to auth screen if not authenticated
        router.replace('/(auth)');
      } else if (user && inAuthGroup) {
        // Check if we're in password reset flow
        const isResettingPassword = await AsyncStorage.getItem('@password_reset_in_progress');

        if (isResettingPassword === 'true') {
          // Don't redirect - user is resetting password
          return;
        }

        // Redirect to main app if authenticated and not resetting password
        router.replace('/(tabs)');
      }
    };

    checkAuthAndRedirect();
  }, [user, segments, loading]);

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
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}