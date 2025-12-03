// app/auth/callback.tsx
// This route handles OAuth redirects from providers like Google and Facebook
// It prevents the "Unmatched Route" error when Supabase redirects back to the app
//
// Navigation is handled by _layout.tsx which detects when an authenticated user
// is on this route and redirects them to /(tabs). This component just needs to
// exist and show a loading state while that happens.

import { View, ActivityIndicator } from 'react-native';
import { BRAND_COLOR } from '@/constants/theme';

export default function AuthCallback() {
  // No navigation logic needed here - _layout.tsx handles redirecting
  // authenticated users from this route to /(tabs)
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={BRAND_COLOR} />
    </View>
  );
}
