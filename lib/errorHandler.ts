/**
 * Centralized error handling utilities for the SouqShamy marketplace app.
 * Provides consistent error handling, logging, and user feedback.
 */

import { Alert } from 'react-native';

// ============================================================================
// Types
// ============================================================================

export interface AppError {
    code: string;
    message: string;
    context?: string;
    originalError?: unknown;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// Error Codes
// ============================================================================

export const ERROR_CODES = {
    // Network errors
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',

    // Auth errors
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    AUTH_FAILED: 'AUTH_FAILED',
    SESSION_EXPIRED: 'SESSION_EXPIRED',

    // Data errors
    NOT_FOUND: 'NOT_FOUND',
    FETCH_FAILED: 'FETCH_FAILED',
    SAVE_FAILED: 'SAVE_FAILED',
    DELETE_FAILED: 'DELETE_FAILED',
    VALIDATION_ERROR: 'VALIDATION_ERROR',

    // Permission errors
    PERMISSION_DENIED: 'PERMISSION_DENIED',

    // General errors
    UNKNOWN: 'UNKNOWN',
} as const;

// ============================================================================
// User-Friendly Error Messages
// ============================================================================

const ERROR_MESSAGES: Record<string, string> = {
    [ERROR_CODES.NETWORK_ERROR]: 'Please check your internet connection and try again.',
    [ERROR_CODES.TIMEOUT]: 'The request took too long. Please try again.',
    [ERROR_CODES.AUTH_REQUIRED]: 'Please sign in to continue.',
    [ERROR_CODES.AUTH_FAILED]: 'Authentication failed. Please try signing in again.',
    [ERROR_CODES.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
    [ERROR_CODES.NOT_FOUND]: 'The requested item was not found.',
    [ERROR_CODES.FETCH_FAILED]: 'Failed to load data. Please try again.',
    [ERROR_CODES.SAVE_FAILED]: 'Failed to save. Please try again.',
    [ERROR_CODES.DELETE_FAILED]: 'Failed to delete. Please try again.',
    [ERROR_CODES.VALIDATION_ERROR]: 'Please check your input and try again.',
    [ERROR_CODES.PERMISSION_DENIED]: "You don't have permission to perform this action.",
    [ERROR_CODES.UNKNOWN]: 'Something went wrong. Please try again.',
};

// ============================================================================
// Error Handling Functions
// ============================================================================

/**
 * Logs an error to the console (in development) and potentially to a monitoring service.
 * @param error - The error to log
 * @param context - Additional context about where the error occurred
 */
export function logError(error: unknown, context?: string): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : '';

    if (error instanceof Error) {
        console.error(`[${timestamp}]${contextStr} Error:`, error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    } else {
        console.error(`[${timestamp}]${contextStr} Error:`, error);
    }

    // TODO: In production, send to error monitoring service (e.g., Sentry)
}

/**
 * Creates a standardized AppError from various error types.
 * @param error - The original error
 * @param code - Error code (optional, will be inferred if possible)
 * @param context - Context where the error occurred
 */
export function createAppError(
    error: unknown,
    code?: string,
    context?: string
): AppError {
    let errorCode = code || ERROR_CODES.UNKNOWN;
    let message = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN];

    // Try to infer error type from Supabase errors
    if (error && typeof error === 'object' && 'code' in error) {
        const supabaseError = error as { code: string; message?: string };

        if (supabaseError.code === 'PGRST116') {
            errorCode = ERROR_CODES.NOT_FOUND;
            message = ERROR_MESSAGES[ERROR_CODES.NOT_FOUND];
        } else if (supabaseError.code === '23505') {
            // Duplicate key error
            errorCode = ERROR_CODES.VALIDATION_ERROR;
            message = 'This item already exists.';
        } else if (supabaseError.code === 'PGRST301') {
            errorCode = ERROR_CODES.AUTH_REQUIRED;
            message = ERROR_MESSAGES[ERROR_CODES.AUTH_REQUIRED];
        }
    }

    // Check for network errors
    if (error instanceof Error) {
        if (error.message.includes('Network') || error.message.includes('fetch')) {
            errorCode = ERROR_CODES.NETWORK_ERROR;
            message = ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR];
        }
    }

    return {
        code: errorCode,
        message,
        context,
        originalError: error,
    };
}

/**
 * Handles an error by logging it and optionally showing a user alert.
 * @param error - The error to handle
 * @param options - Handling options
 */
export function handleError(
    error: unknown,
    options: {
        context?: string;
        showAlert?: boolean;
        alertTitle?: string;
        severity?: ErrorSeverity;
    } = {}
): AppError {
    const {
        context,
        showAlert = true,
        alertTitle = 'Error',
        severity = 'medium',
    } = options;

    const appError = createAppError(error, undefined, context);

    // Always log errors
    logError(error, context);

    // Show alert for medium+ severity if enabled
    if (showAlert && severity !== 'low') {
        Alert.alert(alertTitle, appError.message);
    }

    return appError;
}

/**
 * Wraps an async function with error handling.
 * @param fn - The async function to wrap
 * @param options - Error handling options
 */
export function withErrorHandling<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    options: {
        context?: string;
        showAlert?: boolean;
        alertTitle?: string;
        fallback?: R;
    } = {}
): (...args: T) => Promise<R | undefined> {
    return async (...args: T): Promise<R | undefined> => {
        try {
            return await fn(...args);
        } catch (error) {
            handleError(error, {
                context: options.context,
                showAlert: options.showAlert,
                alertTitle: options.alertTitle,
            });
            return options.fallback;
        }
    };
}

// ============================================================================
// Specific Error Handlers
// ============================================================================

/**
 * Shows an auth required alert with optional sign-in navigation.
 * @param onSignIn - Callback when user chooses to sign in
 */
export function showAuthRequiredAlert(onSignIn?: () => void): void {
    Alert.alert(
        'Sign In Required',
        'Please sign in to continue.',
        onSignIn
            ? [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign In', onPress: onSignIn },
            ]
            : [{ text: 'OK' }]
    );
}

/**
 * Shows an error alert for failed operations with retry option.
 * @param message - The error message
 * @param onRetry - Callback when user chooses to retry
 */
export function showRetryAlert(message: string, onRetry?: () => void): void {
    Alert.alert(
        'Error',
        message,
        onRetry
            ? [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Retry', onPress: onRetry },
            ]
            : [{ text: 'OK' }]
    );
}

/**
 * Shows a confirmation alert before destructive actions.
 * @param options - Alert configuration
 */
export function showConfirmationAlert(options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    destructive?: boolean;
}): void {
    const {
        title,
        message,
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        onConfirm,
        onCancel,
        destructive = false,
    } = options;

    Alert.alert(title, message, [
        {
            text: cancelText,
            style: 'cancel',
            onPress: onCancel,
        },
        {
            text: confirmText,
            style: destructive ? 'destructive' : 'default',
            onPress: onConfirm,
        },
    ]);
}
