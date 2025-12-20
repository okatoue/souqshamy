import { BRAND_COLOR, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React, { Component, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error boundary component for the Home Screen.
 * Catches JavaScript errors in child components and displays a fallback UI
 * instead of crashing the entire app.
 *
 * Usage:
 * ```tsx
 * <HomeErrorBoundary>
 *   <YourHomeScreenContent />
 * </HomeErrorBoundary>
 * ```
 */
export class HomeErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render shows the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Log error to console (in production, send to error tracking service)
        console.error('Home screen error:', error);
        console.error('Error info:', errorInfo);
        // TODO: Send to analytics/error tracking service (e.g., Sentry, Crashlytics)
    }

    handleRetry = (): void => {
        // Reset the error state to try rendering again
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            return <ErrorFallback onRetry={this.handleRetry} />;
        }

        return this.props.children;
    }
}

/**
 * Fallback UI component shown when an error occurs.
 * This is a functional component to enable using hooks for theming.
 */
function ErrorFallback({ onRetry }: { onRetry: () => void }) {
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const secondaryTextColor = useThemeColor({}, 'textSecondary');
    const iconColor = useThemeColor({}, 'icon');

    return (
        <View
            style={[styles.container, { backgroundColor }]}
            accessibilityRole="alert"
            accessibilityLabel="Something went wrong. Tap the try again button to reload."
        >
            <Ionicons name="alert-circle-outline" size={64} color={iconColor} />
            <Text style={[styles.title, { color: textColor }]}>
                Something went wrong
            </Text>
            <Text style={[styles.message, { color: secondaryTextColor }]}>
                We couldn't load this page. Please try again.
            </Text>
            <Pressable
                style={({ pressed }) => [
                    styles.retryButton,
                    pressed && styles.retryButtonPressed
                ]}
                onPress={onRetry}
                accessibilityRole="button"
                accessibilityLabel="Try Again"
                accessibilityHint="Attempts to reload the home screen"
            >
                <Ionicons name="refresh" size={20} color="#fff" style={styles.retryIcon} />
                <Text style={styles.retryText}>Try Again</Text>
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
        fontSize: 20,
        fontWeight: '600',
        marginTop: SPACING.lg,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        marginTop: SPACING.sm,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: BRAND_COLOR,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: 25,
    },
    retryButtonPressed: {
        opacity: 0.8,
    },
    retryIcon: {
        marginRight: SPACING.sm,
    },
    retryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default HomeErrorBoundary;
