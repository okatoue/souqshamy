// lib/initialUrl.ts
// This module captures the initial deep link URL immediately when the app starts.
// It must be imported as early as possible (before expo-router processes the URL).
// IMPORTANT: Import this module at the very top of your entry file!

import * as Linking from 'expo-linking';
import { Platform, NativeModules } from 'react-native';

// Storage for the captured initial URL
let capturedInitialUrl: string | null = null;
let capturePromise: Promise<string | null> | null = null;
let hasCaptured = false;

/**
 * Captures the initial URL immediately.
 * Call this as early as possible in the app lifecycle.
 */
export function captureInitialUrl(): Promise<string | null> {
  if (capturePromise) {
    return capturePromise;
  }

  capturePromise = (async () => {
    try {
      // Try getInitialURL first
      const initialUrl = await Linking.getInitialURL();

      if (initialUrl) {
        capturedInitialUrl = initialUrl;
        hasCaptured = true;
        return initialUrl;
      }

      // On Android, try to get the Intent URL directly from the LinkingManager
      if (Platform.OS === 'android') {
        try {
          // Access the initial URL from React Native's internal Linking module
          const { Linking: RNLinking } = NativeModules;
          if (RNLinking && RNLinking.getInitialURL) {
            const intentUrl = await RNLinking.getInitialURL();
            if (intentUrl) {
              capturedInitialUrl = intentUrl;
              hasCaptured = true;
              return intentUrl;
            }
          }
        } catch (e) {
          // Android Intent access failed - continue with fallback
        }
      }

      // Also try parseInitialURLAsync
      await Linking.parseInitialURLAsync();

      hasCaptured = true;
      return null;
    } catch (error) {
      console.error('[InitialUrl] Error capturing URL:', error);
      hasCaptured = true;
      return null;
    }
  })();

  return capturePromise;
}

/**
 * Gets the captured initial URL.
 * Returns null if no URL was captured or capture hasn't completed.
 */
export function getCapturedInitialUrl(): string | null {
  return capturedInitialUrl;
}

/**
 * Waits for the capture to complete and returns the URL.
 */
export async function waitForCapturedUrl(): Promise<string | null> {
  if (capturePromise) {
    return capturePromise;
  }
  return capturedInitialUrl;
}

/**
 * Checks if URL capture has been attempted.
 */
export function hasAttemptedCapture(): boolean {
  return hasCaptured;
}

/**
 * Sets the initial URL manually.
 * Used when URL is captured via other means (e.g., native intent handling).
 */
export function setInitialUrl(url: string): void {
  if (!capturedInitialUrl) {  // Only set if not already captured
    capturedInitialUrl = url;
    hasCaptured = true;
  }
}

/**
 * Clears the captured URL (after it's been processed).
 */
export function clearCapturedUrl(): void {
  capturedInitialUrl = null;
}

// Start capturing immediately when this module is imported
// This runs synchronously at module load time
captureInitialUrl();
