// lib/auth-utils.ts
// Shared authentication utilities for the SouqJari app
// Consolidates duplicate logic from auth_context, callback, and auth screens

import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

// ============================================================================
// Types
// ============================================================================

export type UserAuthStatus = 'new' | 'unverified' | 'verified' | 'oauth-only';
export type OAuthProvider = 'google' | 'facebook';
export type AuthErrorContext =
  | 'signin'
  | 'signup'
  | 'oauth'
  | 'verification'
  | 'password-reset'
  | 'signout';

export interface AuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
}

export interface UserAuthStatusResult {
  status: UserAuthStatus;
  provider?: OAuthProvider;
}

export interface OAuthOnlyResult {
  isOAuthOnly: boolean;
  provider?: OAuthProvider;
}

// ============================================================================
// Token Extraction
// ============================================================================

/**
 * Extract authentication tokens from an OAuth callback URL.
 * Handles both hash fragment (#access_token=...) and query params (?access_token=...)
 *
 * Consolidates logic from:
 * - lib/auth_context.tsx:82-98
 * - app/auth/callback.tsx:67-96
 */
export function extractAuthTokensFromUrl(url: string): AuthTokens {
  try {
    const urlObj = new URL(url);
    const fragment = urlObj.hash.substring(1);

    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let error: string | null = null;

    // First try hash fragment (Supabase default for implicit flow)
    if (fragment) {
      const params = new URLSearchParams(fragment);
      accessToken = params.get('access_token');
      refreshToken = params.get('refresh_token');
      error = params.get('error') || params.get('error_description');
    }

    // Fallback to query params (used by some flows)
    if (!accessToken || !refreshToken) {
      accessToken = accessToken || urlObj.searchParams.get('access_token');
      refreshToken = refreshToken || urlObj.searchParams.get('refresh_token');
    }

    // Check for error in query params if not found in hash
    if (!error) {
      const errorParam = urlObj.searchParams.get('error');
      const errorDescription = urlObj.searchParams.get('error_description');
      error = errorDescription || errorParam || null;
    }

    return { accessToken, refreshToken, error };
  } catch (err) {
    console.error('[auth-utils] Error parsing URL:', err);
    return {
      accessToken: null,
      refreshToken: null,
      error: 'Invalid callback URL format'
    };
  }
}

/**
 * Check if a URL is an auth callback URL
 */
export function isAuthCallbackUrl(url: string): boolean {
  return url.includes('auth/callback');
}

// ============================================================================
// User Status Checking
// ============================================================================

/**
 * Check user authentication status for routing decisions.
 * Determines if user is new, unverified, verified, or OAuth-only.
 *
 * Extracted from app/(auth)/index.tsx:29-82
 */
export async function checkUserAuthStatus(email: string): Promise<UserAuthStatusResult> {
  try {
    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email_verified')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (profileError) {
      console.error('[auth-utils] Error checking user status:', profileError);
      return { status: 'new' };
    }

    if (!profile) {
      // No profile exists - new user
      return { status: 'new' };
    }

    // Check if user has OAuth identity only (no password)
    const { data: identities, error: identitiesError } = await supabase.rpc(
      'get_user_auth_providers',
      { user_email: email.toLowerCase() }
    );

    if (identitiesError) {
      console.error('[auth-utils] Error fetching auth providers:', identitiesError);
    }

    if (!identitiesError && identities && identities.length > 0) {
      const hasEmailProvider = identities.some(
        (i: { provider: string }) => i.provider === 'email'
      );

      if (!hasEmailProvider) {
        // User only has OAuth providers - find which one
        const oauthProvider = identities.find((i: { provider: string }) =>
          ['google', 'facebook'].includes(i.provider)
        );
        return {
          status: 'oauth-only',
          provider: oauthProvider?.provider as OAuthProvider | undefined,
        };
      }
    }

    // Profile exists with email provider - check if verified
    return { status: profile.email_verified ? 'verified' : 'unverified' };
  } catch (error) {
    console.error('[auth-utils] Error checking user status:', error);
    return { status: 'new' };
  }
}

/**
 * Check if a user is OAuth-only (signed up with Google/Facebook, no password).
 * Uses the RPC approach for consistent detection.
 *
 * Standardizes detection from:
 * - app/(auth)/index.tsx:50-74 (RPC approach)
 * - app/manage-account.tsx:120 (app_metadata approach - less reliable)
 */
export async function isOAuthOnlyUser(email: string): Promise<OAuthOnlyResult> {
  try {
    const { data: identities, error } = await supabase.rpc(
      'get_user_auth_providers',
      { user_email: email.toLowerCase() }
    );

    if (error) {
      console.error('[auth-utils] Error checking OAuth status:', error);
      return { isOAuthOnly: false };
    }

    if (!identities || identities.length === 0) {
      return { isOAuthOnly: false };
    }

    const hasEmailProvider = identities.some(
      (i: { provider: string }) => i.provider === 'email'
    );

    if (!hasEmailProvider) {
      // Find which OAuth provider they used
      const oauthProvider = identities.find((i: { provider: string }) =>
        ['google', 'facebook'].includes(i.provider)
      );
      return {
        isOAuthOnly: true,
        provider: oauthProvider?.provider as OAuthProvider | undefined,
      };
    }

    return { isOAuthOnly: false };
  } catch (error) {
    console.error('[auth-utils] Error checking OAuth status:', error);
    return { isOAuthOnly: false };
  }
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * User-friendly error messages for common auth errors
 */
const AUTH_ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  // Sign in errors
  'invalid_credentials': {
    title: 'Invalid Credentials',
    message: 'The email or password you entered is incorrect.',
  },
  'invalid_grant': {
    title: 'Invalid Credentials',
    message: 'The email or password you entered is incorrect.',
  },
  'email_not_confirmed': {
    title: 'Email Not Verified',
    message: 'Please verify your email address before signing in.',
  },

  // Sign up errors
  'user_already_exists': {
    title: 'Account Exists',
    message: 'An account with this email already exists. Please sign in instead.',
  },
  'weak_password': {
    title: 'Weak Password',
    message: 'Password must be at least 6 characters long.',
  },

  // OAuth errors
  'access_denied': {
    title: 'Access Denied',
    message: 'You denied access to your account. Please try again if this was a mistake.',
  },
  'oauth_error': {
    title: 'Sign In Failed',
    message: 'There was a problem signing in with this provider. Please try again.',
  },

  // Verification errors
  'otp_expired': {
    title: 'Code Expired',
    message: 'This verification code has expired. Please request a new one.',
  },
  'invalid_otp': {
    title: 'Invalid Code',
    message: 'The verification code you entered is incorrect. Please try again.',
  },

  // Password reset errors
  'same_password': {
    title: 'Same Password',
    message: 'New password must be different from your current password.',
  },

  // Network errors
  'network_error': {
    title: 'Connection Error',
    message: 'Please check your internet connection and try again.',
  },

  // Generic fallback
  'unknown': {
    title: 'Error',
    message: 'Something went wrong. Please try again.',
  },
};

/**
 * Get the error code from various error formats
 */
function getErrorCode(error: unknown): string {
  if (!error) return 'unknown';

  const err = error as any;

  // Supabase error format
  if (err.code) return err.code.toLowerCase();

  // Check message for known patterns
  const message = (err.message || '').toLowerCase();

  if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
    return 'email_not_confirmed';
  }
  if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
    return 'invalid_credentials';
  }
  if (message.includes('already registered') || message.includes('already exists') || message.includes('user_already_exists')) {
    return 'user_already_exists';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'network_error';
  }
  if (message.includes('expired')) {
    return 'otp_expired';
  }
  if (message.includes('cancel') || message.includes('dismiss')) {
    return 'cancelled';
  }

  return 'unknown';
}

/**
 * Handle authentication errors consistently across the app.
 * Shows appropriate alerts based on error type and context.
 *
 * @param error - The error to handle
 * @param context - The auth operation context (signin, signup, oauth, etc.)
 * @param options - Additional options
 * @returns true if error was handled (alert shown), false if it should be re-thrown
 */
export function handleAuthError(
  error: unknown,
  context: AuthErrorContext,
  options?: {
    silent?: boolean;  // Don't show alert, just log
    customMessage?: string;
  }
): boolean {
  const errorCode = getErrorCode(error);

  // User cancelled - don't show any error
  if (errorCode === 'cancelled') {
    return true;
  }

  // Email not confirmed is a special case - usually handled by caller for navigation
  if (errorCode === 'email_not_confirmed' && context === 'signin') {
    // Don't show alert - caller should navigate to verification screen
    return false;
  }

  console.error(`[auth-utils] Auth error (${context}):`, error);

  if (options?.silent) {
    return true;
  }

  // Get error message
  const errorInfo = AUTH_ERROR_MESSAGES[errorCode] || AUTH_ERROR_MESSAGES['unknown'];
  const title = errorInfo.title;
  const message = options?.customMessage || errorInfo.message;

  Alert.alert(title, message);
  return true;
}

/**
 * Get a friendly provider name for display
 */
export function getProviderDisplayName(provider?: OAuthProvider | string): string {
  switch (provider) {
    case 'google':
      return 'Google';
    case 'facebook':
      return 'Facebook';
    default:
      return 'social login';
  }
}

// ============================================================================
// App Reload Utility
// ============================================================================

/**
 * Safely reload the app (works in both dev and production).
 * In development, falls back gracefully since expo-updates isn't available.
 */
export async function safeReloadApp(): Promise<void> {
  try {
    // Only attempt to use expo-updates in production builds
    // In development (Expo Go), this module doesn't exist
    const Updates = require('expo-updates');
    if (Updates.reloadAsync) {
      await Updates.reloadAsync();
    }
  } catch (error) {
    // expo-updates not available (development mode)
    // The session is already set, so navigation will handle the redirect
    console.log('[auth-utils] App reload skipped (dev mode)');
  }
}
