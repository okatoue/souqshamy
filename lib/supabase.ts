// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Debug logging for environment variables
console.log('[Supabase] URL:', supabaseUrl);
console.log('[Supabase] Key exists:', !!supabasePublishableKey);

// Custom storage adapter for React Native
// This properly implements the storage interface that Supabase expects
const SupabaseAsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(key);
      console.log(`[Supabase Storage] getItem(${key}):`, value ? 'found session data' : 'null');
      return value;
    } catch (error) {
      console.error('[Supabase Storage] getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      console.log(`[Supabase Storage] setItem(${key}): saving session`);
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('[Supabase Storage] setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      console.log(`[Supabase Storage] removeItem(${key})`);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('[Supabase Storage] removeItem error:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    // Use custom storage for mobile, undefined for web (uses localStorage)
    storage: Platform.OS === 'web' ? undefined : SupabaseAsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});