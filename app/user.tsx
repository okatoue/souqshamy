import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/lib/auth_context';
import {
    Feather,
    Ionicons,
    MaterialCommunityIcons,
    MaterialIcons
} from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MenuItemProps = {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress: () => void;
    showChevron?: boolean;
    danger?: boolean;
};

function MenuItem({ icon, title, subtitle, onPress, showChevron = true, danger = false }: MenuItemProps) {
    const textColor = useThemeColor({}, 'text');
    const subtitleColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'icon');
    const pressedBg = useThemeColor({ light: '#f0f0f0', dark: '#1a1a1a' }, 'background');
    const chevronColor = useThemeColor({ light: '#999', dark: '#666' }, 'icon');

    return (
        <Pressable
            style={({ pressed }) => [
                styles.menuItem,
                { borderBottomColor: borderColor },
                pressed && { backgroundColor: pressedBg },
            ]}
            onPress={onPress}
        >
            <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                    {icon}
                </View>
                <View style={styles.menuItemText}>
                    <Text style={[styles.menuItemTitle, { color: danger ? '#FF3B30' : textColor }]}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Text style={[styles.menuItemSubtitle, { color: subtitleColor }]}>
                            {subtitle}
                        </Text>
                    )}
                </View>
            </View>
            {showChevron && (
                <Ionicons name="chevron-forward" size={20} color={chevronColor} />
            )}
        </Pressable>
    );
}

type SectionProps = {
    title?: string;
    children: React.ReactNode;
};

function Section({ title, children }: SectionProps) {
    const sectionBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
    const titleColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');

    return (
        <View style={styles.section}>
            {title && (
                <Text style={[styles.sectionTitle, { color: titleColor }]}>{title}</Text>
            )}
            <View style={[styles.sectionContent, { backgroundColor: sectionBg }]}>
                {children}
            </View>
        </View>
    );
}

export default function UserScreen() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const backgroundColor = useThemeColor({}, 'background');
    const iconColor = useThemeColor({}, 'icon');
    const textColor = useThemeColor({}, 'text');
    const subtitleColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');

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
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header */}
                <ThemedView style={styles.header}>
                    <ThemedText type="title">Account</ThemedText>
                </ThemedView>

                {/* User Info Card */}
                <View style={styles.userCard}>
                    <View style={styles.avatarContainer}>
                        <MaterialCommunityIcons name="account-circle" size={70} color={iconColor} />
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={[styles.userEmail, { color: textColor }]}>
                            {user.email || 'User'}
                        </Text>
                        <Text style={[styles.userSince, { color: subtitleColor }]}>
                            Member since {new Date(user.created_at || Date.now()).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                {/* Account Settings Section */}
                <Section title="ACCOUNT SETTINGS">
                    <MenuItem
                        icon={<Ionicons name="person-outline" size={22} color={iconColor} />}
                        title="Personal Details"
                        subtitle="Name, email, phone number"
                        onPress={() => handleComingSoon('Personal Details')}
                    />
                    <MenuItem
                        icon={<MaterialIcons name="manage-accounts" size={22} color={iconColor} />}
                        title="Manage Account"
                        subtitle="Password, security settings"
                        onPress={() => handleComingSoon('Manage Account')}
                    />
                    <MenuItem
                        icon={<Ionicons name="notifications-outline" size={22} color={iconColor} />}
                        title="Notification Preferences"
                        subtitle="Push notifications, email alerts"
                        onPress={() => handleComingSoon('Notification Preferences')}
                    />
                </Section>

                {/* App Settings Section */}
                <Section title="APP SETTINGS">
                    <MenuItem
                        icon={<Ionicons name="color-palette-outline" size={22} color={iconColor} />}
                        title="App Theme"
                        subtitle="Light, dark, or system"
                        onPress={() => handleComingSoon('App Theme')}
                    />
                </Section>

                {/* Support & Legal Section */}
                <Section title="SUPPORT & LEGAL">
                    <MenuItem
                        icon={<Feather name="help-circle" size={22} color={iconColor} />}
                        title="Help"
                        subtitle="FAQs and support"
                        onPress={() => handleComingSoon('Help')}
                    />
                    <MenuItem
                        icon={<Ionicons name="document-text-outline" size={22} color={iconColor} />}
                        title="Privacy Policy"
                        onPress={() => handleComingSoon('Privacy Policy')}
                    />
                    <MenuItem
                        icon={<Ionicons name="document-outline" size={22} color={iconColor} />}
                        title="Terms of Use"
                        onPress={() => handleComingSoon('Terms of Use')}
                    />
                </Section>

                {/* Logout Section */}
                <Section>
                    <MenuItem
                        icon={<MaterialIcons name="logout" size={22} color="#FF3B30" />}
                        title="Log Out"
                        onPress={handleLogout}
                        showChevron={false}
                        danger
                    />
                </Section>

                {/* App Version */}
                <View style={styles.versionContainer}>
                    <Text style={[styles.versionText, { color: subtitleColor }]}>
                        Katoo v1.0.0
                    </Text>
                </View>
            </ScrollView>
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
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        marginBottom: 20,
    },
    avatarContainer: {
        marginRight: 15,
    },
    userInfo: {
        flex: 1,
    },
    userEmail: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    userSince: {
        fontSize: 14,
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 20,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    sectionContent: {
        marginHorizontal: 15,
        borderRadius: 12,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 32,
        alignItems: 'center',
        marginRight: 12,
    },
    menuItemText: {
        flex: 1,
    },
    menuItemTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    menuItemSubtitle: {
        fontSize: 13,
        marginTop: 2,
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