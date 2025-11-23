import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import 'react-native-url-polyfill/auto'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// Create storage based on platform
const createStorage = () => {
  if (Platform.OS === 'web') {
    // Use no custom storage for web (defaults to localStorage)
    return undefined;
  } else {
    // Use AsyncStorage for mobile
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage;
  }
};

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    ...(Platform.OS !== 'web' && { storage: createStorage() }),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})