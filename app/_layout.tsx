import { AuthProvider, useAuth } from '@/lib/auth_context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to sign-in if not authenticated
      router.replace('/(auth)/index');
    } else if (user && inAuthGroup) {
      // Redirect to main app if authenticated
      router.replace('/(tabs)');
    }
  }, [user, segments, loading]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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