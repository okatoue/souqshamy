import { SettingsMenuItem, SettingsSection, ThemePicker, ThemePickerRefProps } from '@/components/settings';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackButton } from '@/components/ui/BackButton';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useProfile } from '@/hooks/userProfile';
import { getAppInfo } from '@/lib/appInfo';
import { useAuth } from '@/lib/auth_context';
import { useRTL } from '@/lib/rtl_context';
import { rtlIcon, rtlMarginEnd, rtlMarginStart, rtlRow } from '@/lib/rtlStyles';
import { useThemeContext } from '@/lib/theme_context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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

export default function UserScreen() {
    const { t } = useTranslation();
    const { isRTL } = useRTL();
    const { user, signOut } = useAuth();
    const { profile, getDisplayName, fetchProfile } = useProfile();
    const router = useRouter();
    const backgroundColor = useThemeColor({}, 'background');

    // Theme labels for display - using translations
    const THEME_LABELS: Record<string, string> = {
        light: t('settings.themeLight'),
        dark: t('settings.themeDark'),
        system: t('settings.themeSystem'),
    };
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
            t('settings.logOut'),
            t('settings.logOutConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('settings.logOut'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                            router.replace('/(auth)');
                        } catch (error) {
                            Alert.alert(t('alerts.error'), t('settings.logOutFailed'));
                        }
                    },
                },
            ]
        );
    };

    const handleComingSoon = (feature: string) => {
        Alert.alert(t('common.comingSoon'), t('common.comingSoonMessage', { feature }));
    };

    // If not logged in, show sign in prompt
    if (!user) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.notLoggedInContainer}>
                    <MaterialCommunityIcons name="account-circle-outline" size={100} color={iconColor} />
                    <ThemedText style={styles.notLoggedInSubtitle}>
                        {t('settings.signInPrompt')}
                    </ThemedText>
                    <Pressable
                        style={styles.signInButton}
                        onPress={() => router.push('/(auth)')}
                    >
                        <Text style={styles.signInButtonText}>{t('auth.signIn')}</Text>
                    </Pressable>
                    <Pressable
                        style={styles.signUpLink}
                        onPress={() => router.push('/(auth)')}
                    >
                        <Text style={styles.signUpLinkText}>{t('auth.noAccountSignUp')}</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            {/* Header - Sticky */}
            <ThemedView style={[styles.header, rtlRow(isRTL)]}>
                <BackButton />
                <ThemedText type="title" style={styles.headerTitle}>{t('settings.account')}</ThemedText>
                <View style={styles.headerSpacer} />
            </ThemedView>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* User Info Card */}
                <Pressable
                    style={({ pressed }) => [
                        styles.userCard,
                        rtlRow(isRTL),
                        { backgroundColor: cardBackground },
                        pressed && styles.userCardPressed
                    ]}
                    onPress={() => router.push('/personal-details')}
                >
                    <View style={[styles.avatarContainer, rtlMarginEnd(isRTL, 15)]}>
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
                            {t('profile.memberSince', { date: new Date(user.created_at || Date.now()).toLocaleDateString() })}
                        </Text>
                    </View>
                    <Ionicons
                        name={rtlIcon(isRTL, 'chevron-forward', 'chevron-back')}
                        size={22}
                        color={chevronColor}
                        style={styles.userCardChevron}
                    />
                </Pressable>

                {/* Account Settings Section */}
                <SettingsSection title={t('settings.accountSettings')}>
                    <SettingsMenuItem
                        icon="settings-outline"
                        title={t('settings.manageAccount')}
                        subtitle={t('settings.manageAccountSubtitle')}
                        onPress={() => router.push('/manage-account')}
                    />
                </SettingsSection>

                {/* App Settings Section */}
                <SettingsSection title={t('settings.appSettings')}>
                    <SettingsMenuItem
                        icon="color-palette-outline"
                        title={t('settings.appTheme')}
                        subtitle={THEME_LABELS[themePreference] || t('settings.themeSystem')}
                        onPress={handleOpenThemePicker}
                    />
                    <View style={[styles.languageRow, { backgroundColor: cardBackground }]}>
                        <View style={[styles.languageRowLeft, rtlRow(isRTL)]}>
                            <Ionicons
                                name="language-outline"
                                size={22}
                                color={iconColor}
                                style={rtlMarginEnd(isRTL, 12)}
                            />
                            <Text style={[styles.languageLabel, { color: textColor }]}>
                                {t('settings.language')}
                            </Text>
                        </View>
                        <LanguageSwitcher />
                    </View>
                    <SettingsMenuItem
                        icon="notifications-outline"
                        title={t('settings.notifications')}
                        subtitle={t('settings.notificationsSubtitle')}
                        onPress={() => router.push('/notification-settings')}
                    />
                </SettingsSection>

                {/* Support & Legal Section */}
                <SettingsSection title={t('settings.supportLegal')}>
                    <SettingsMenuItem
                        icon="help-circle-outline"
                        title={t('settings.help')}
                        subtitle={t('settings.helpSubtitle')}
                        onPress={() => router.push('/help')}
                    />
                    <SettingsMenuItem
                        icon="document-text-outline"
                        title={t('settings.privacyPolicy')}
                        onPress={() => router.push('/legal/privacy-policy')}
                    />
                    <SettingsMenuItem
                        icon="document-outline"
                        title={t('settings.termsOfUse')}
                        onPress={() => router.push('/legal/terms-of-use')}
                    />
                </SettingsSection>

                {/* Logout Section */}
                <SettingsSection>
                    <SettingsMenuItem
                        icon="log-out-outline"
                        title={t('settings.logOut')}
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
        // RTL margin applied dynamically
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
    languageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginHorizontal: 15,
        borderRadius: 12,
        marginBottom: 8,
    },
    languageRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    languageLabel: {
        fontSize: 16,
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
