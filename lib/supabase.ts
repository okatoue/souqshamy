// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Custom storage adapter for React Native
// This properly implements the storage interface that Supabase expects
const SupabaseAsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value;
    } catch (error) {
      console.error('[Supabase Storage] getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('[Supabase Storage] setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
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
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    logger: (type: string, msg: string, data?: unknown) => {
      console.log(`[Supabase Realtime] ${type}: ${msg}`, data ? JSON.stringify(data) : '');
    },
  },
});

// Debug: Log the Supabase URL being used
console.log('[Supabase] Initialized with URL:', supabaseUrl);