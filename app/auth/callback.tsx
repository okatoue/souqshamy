// app/auth/callback.tsx
// This route handles OAuth redirects from providers like Google and Facebook
// It prevents the "Unmatched Route" error when Supabase redirects back to the app

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND_COLOR } from '@/constants/theme';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // The OAuth tokens are already being handled by WebBrowser.openAuthSessionAsync
    // in auth_context.tsx. This route exists primarily to:
    // 1. Prevent the "Unmatched Route" error when the deep link arrives
    // 2. Provide a smooth transition back to the main app
    //
    // The auth state change listener in auth_context.tsx will handle
    // updating the user session, so we just need to redirect.

    // Small delay to ensure auth state has time to propagate
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={BRAND_COLOR} />
    </View>
  );
}
