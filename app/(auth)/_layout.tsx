// app/(auth)/_layout.tsx
import { useAuthColors } from '@/components/auth';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  const colors = useAuthColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Log in or Sign up' }} />
      <Stack.Screen name="password" options={{ title: 'Password' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Forgot Password' }} />
    </Stack>
  );
}
