import { SettingsMenuItem, SettingsSection, ThemePicker, ThemePickerRefProps } from '@/components/settings';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackButton } from '@/components/ui/BackButton';
import { COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useProfile } from '@/hooks/userProfile';
import { getAppInfo } from '@/lib/appInfo';
import { useAuth } from '@/lib/auth_context';
import { useNotifications } from '@/lib/notifications/useNotifications';
import { useThemeContext } from '@/lib/theme_context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef } from 'react';
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Theme labels for display
const THEME_LABELS: Record<string, string> = {
    light: 'Light',
    dark: 'Dark',
    system: 'System Settings',
};

export default function UserScreen() {
    const { user, signOut } = useAuth();
    const { profile, getDisplayName, fetchProfile } = useProfile();
    const { unreadCount } = useNotifications();
    const router = useRouter();
    const backgroundColor = useThemeColor({}, 'background');
    const iconColor = useThemeColor({}, 'icon');
    const textColor = useThemeColor({}, 'text');
    const subtitleColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');
    const cardBackground = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
    const chevronColor = useThemeColor({ light: '#999', dark: '#666' }, 'icon');

    // Theme context and picker ref
    const { themePreference } = useThemeContext();
    const themePickerRef = useRef<ThemePickerRefProps>(null);

    // Refresh profile when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            // Background refresh - no loading spinner, just update data
            fetchProfile(false, false);
        }, [fetchProfile])
    );

    // Open theme picker
    const handleOpenThemePicker = useCallback(() => {
        themePickerRef.current?.open();
    }, []);

    const handleLogout = () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                            router.replace('/(auth)');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to log out. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleComingSoon = (feature: string) => {
        Alert.alert('Coming Soon', `${feature} will be available in a future update.`);
    };

    // If not logged in, show sign in prompt
    if (!user) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.notLoggedInContainer}>
                    <MaterialCommunityIcons name="account-circle-outline" size={100} color={iconColor} />
                    <ThemedText style={styles.notLoggedInSubtitle}>
                        Sign in to access your account settings
                    </ThemedText>
                    <Pressable
                        style={styles.signInButton}
                        onPress={() => router.push('/(auth)')}
                    >
                        <Text style={styles.signInButtonText}>Sign In</Text>
                    </Pressable>
                    <Pressable
                        style={styles.signUpLink}
                        onPress={() => router.push('/(auth)')}
                    >
                        <Text style={styles.signUpLinkText}>Don't have an account? Sign Up</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            {/* Header - Sticky */}
            <ThemedView style={styles.header}>
                <BackButton />
                <ThemedText type="title" style={styles.headerTitle}>Account</ThemedText>
                <Pressable
                    style={styles.notificationButton}
                    onPress={() => router.push('/notifications')}
                >
                    <Ionicons name="notifications-outline" size={24} color={iconColor} />
                    {unreadCount > 0 && (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationBadgeText}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </Text>
                        </View>
                    )}
                </Pressable>
            </ThemedView>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* User Info Card */}
                <Pressable
                    style={({ pressed }) => [
                        styles.userCard,
                        { backgroundColor: cardBackground },
                        pressed && styles.userCardPressed
                    ]}
                    onPress={() => router.push('/personal-details')}
                >
                    <View style={styles.avatarContainer}>
                        {profile?.avatar_url ? (
                            <Image
                                source={{ uri: profile.avatar_url }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <MaterialCommunityIcons name="account-circle" size={70} color={iconColor} />
                        )}
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: textColor }]}>
                            {getDisplayName()}
                        </Text>
                        {(profile?.email || profile?.phone_number) && (
                            <Text style={[styles.userContact, { color: subtitleColor }]}>
                                {profile.email || profile.phone_number}
                            </Text>
                        )}
                        <Text style={[styles.userSince, { color: subtitleColor }]}>
                            Member since {new Date(user.created_at || Date.now()).toLocaleDateString()}
                        </Text>
                    </View>
                    <Ionicons
                        name="chevron-forward"
                        size={22}
                        color={chevronColor}
                        style={styles.userCardChevron}
                    />
                </Pressable>

                {/* Account Settings Section */}
                <SettingsSection title="ACCOUNT SETTINGS">
                    <SettingsMenuItem
                        icon="settings-outline"
                        title="Manage Account"
                        subtitle="Password, delete account"
                        onPress={() => router.push('/manage-account')}
                    />
                </SettingsSection>

                {/* App Settings Section */}
                <SettingsSection title="APP SETTINGS">
                    <SettingsMenuItem
                        icon="notifications-outline"
                        title="Notifications"
                        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'View all notifications'}
                        onPress={() => router.push('/notifications')}
                    />
                    <SettingsMenuItem
                        icon="options-outline"
                        title="Notification Settings"
                        subtitle="Push notifications, alerts"
                        onPress={() => router.push('/notification-settings')}
                    />
                    <SettingsMenuItem
                        icon="color-palette-outline"
                        title="App Theme"
                        subtitle={THEME_LABELS[themePreference] || 'System Settings'}
                        onPress={handleOpenThemePicker}
                    />
                </SettingsSection>

                {/* Support & Legal Section */}
                <SettingsSection title="SUPPORT & LEGAL">
                    <SettingsMenuItem
                        icon="help-circle-outline"
                        title="Help"
                        subtitle="FAQs and support"
                        onPress={() => router.push('/help')}
                    />
                    <SettingsMenuItem
                        icon="document-text-outline"
                        title="Privacy Policy"
                        onPress={() => router.push('/legal/privacy-policy')}
                    />
                    <SettingsMenuItem
                        icon="document-outline"
                        title="Terms of Use"
                        onPress={() => router.push('/legal/terms-of-use')}
                    />
                </SettingsSection>

                {/* Logout Section */}
                <SettingsSection>
                    <SettingsMenuItem
                        icon="log-out-outline"
                        title="Log Out"
                        onPress={handleLogout}
                        showArrow={false}
                        destructive
                    />
                </SettingsSection>

                {/* App Version */}
                <View style={styles.versionContainer}>
                    <Text style={[styles.versionText, { color: subtitleColor }]}>
                        {getAppInfo().name} v{getAppInfo().version}
                    </Text>
                </View>
            </ScrollView>

            {/* Theme Picker */}
            <ThemePicker ref={themePickerRef} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 30,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 28 + SPACING.xs * 2,
    },
    notificationButton: {
        padding: SPACING.xs,
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: COLORS.favorite,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    notificationBadgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '600',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginHorizontal: 15,
        marginBottom: 24,
    },
    userCardPressed: {
        opacity: 0.7,
    },
    userCardChevron: {
        marginLeft: 'auto',
    },
    avatarContainer: {
        marginRight: 15,
    },
    avatarImage: {
        width: 70,
        height: 70,
        borderRadius: 35,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontWeight: '600',
    },
    userContact: {
        fontSize: 14,
        marginTop: 2,
    },
    userSince: {
        fontSize: 14,
    },
    versionContainer: {
        alignItems: 'center',
        marginTop: 10,
        paddingBottom: 20,
    },
    versionText: {
        fontSize: 13,
    },
    // Not logged in styles
    notLoggedInContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    notLoggedInTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        textAlign: 'center',
    },
    notLoggedInSubtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
        opacity: 0.7,
    },
    signInButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 14,
        paddingHorizontal: 50,
        borderRadius: 10,
        marginBottom: 15,
    },
    signInButtonText: {
        color: 'white',
        fontSize: 17,
        fontWeight: '600',
    },
    signUpLink: {
        padding: 10,
    },
    signUpLinkText: {
        color: '#007AFF',
        fontSize: 15,
    },
});
