// app/index.tsx
// Root index that redirects to the tabs navigator
// Auth protection is handled by _layout.tsx which will redirect unauthenticated users to (auth)
import { Redirect } from 'expo-router';

export default function RootIndex() {
  return <Redirect href="/(tabs)" />;
}
