/**
 * Global Error Boundary Component
 *
 * Catches unhandled JavaScript errors in the component tree and displays
 * a user-friendly fallback UI instead of crashing the entire app.
 *
 * @module components/GlobalErrorBoundary
 */

import { BORDER_RADIUS, BRAND_COLOR, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary class component that catches errors in child components.
 *
 * Usage:
 * ```tsx
 * <GlobalErrorBoundary>
 *   <App />
 * </GlobalErrorBoundary>
 * ```
 */
export class GlobalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Update state so the next render shows the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo });

        // Log error to console in development
        if (__DEV__) {
            console.error('[GlobalErrorBoundary] Caught error:', error);
            console.error('[GlobalErrorBoundary] Component stack:', errorInfo.componentStack);
        }

        // TODO: Send to error reporting service (Sentry, Crashlytics)
        // Example:
        // errorTracker.captureException(error, {
        //   extra: { componentStack: errorInfo.componentStack },
        // });
    }

    handleRestart = async (): Promise<void> => {
        try {
            // In production, try to reload the app using expo-updates
            if (!__DEV__) {
                try {
                    const Updates = require('expo-updates');
                    if (Updates.reloadAsync) {
                        await Updates.reloadAsync();
                        return;
                    }
                } catch {
                    // expo-updates not available, fall through to state reset
                }
            }

            // In dev or if reload fails, just reset state and try again
            this.setState({ hasError: false, error: null, errorInfo: null });
        } catch {
            // If all else fails, just reset state
            this.setState({ hasError: false, error: null, errorInfo: null });
        }
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Allow custom fallback
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <ErrorFallbackUI
                    onRestart={this.handleRestart}
                    error={this.state.error}
                />
            );
        }

        return this.props.children;
    }
}

/**
 * Fallback UI component shown when an error occurs.
 * This is a functional component to enable using hooks for theming.
 */
function ErrorFallbackUI({
    onRestart,
    error,
}: {
    onRestart: () => void;
    error: Error | null;
}) {
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({}, 'textMuted');

    return (
        <View
            style={[styles.container, { backgroundColor }]}
            accessibilityRole="alert"
            accessibilityLabel="Something went wrong. Tap the restart button to try again."
        >
            <Ionicons name="warning-outline" size={64} color={BRAND_COLOR} />

            <Text style={[styles.title, { color: textColor }]}>
                Something Went Wrong
            </Text>

            <Text style={[styles.message, { color: mutedColor }]}>
                We're sorry, but something unexpected happened.{'\n'}
                Please try restarting the app.
            </Text>

            {__DEV__ && error && (
                <View style={styles.errorDetails}>
                    <Text style={[styles.errorLabel, { color: mutedColor }]}>
                        Error Details:
                    </Text>
                    <Text style={[styles.errorText, { color: mutedColor }]}>
                        {error.message}
                    </Text>
                </View>
            )}

            <Pressable
                style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: BRAND_COLOR },
                    pressed && styles.buttonPressed,
                ]}
                onPress={onRestart}
                accessibilityRole="button"
                accessibilityLabel="Restart App"
                accessibilityHint="Attempts to restart the application"
            >
                <Ionicons name="refresh" size={20} color="white" />
                <Text style={styles.buttonText}>Restart App</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: SPACING.xl,
    },
    errorDetails: {
        marginBottom: SPACING.lg,
        padding: SPACING.md,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: BORDER_RADIUS.sm,
        maxWidth: '100%',
        width: '100%',
    },
    errorLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: SPACING.xs,
    },
    errorText: {
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: BORDER_RADIUS.md,
        gap: SPACING.sm,
    },
    buttonPressed: {
        opacity: 0.8,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default GlobalErrorBoundary;
