import { BackButton } from '@/components/ui/BackButton';
import { BORDER_RADIUS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useNotifications } from '@/lib/notifications/useNotifications';
import { NotificationPreferences } from '@/types/notifications';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface NotificationToggleProps {
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
    loading?: boolean;
}

function NotificationToggle({
    title,
    subtitle,
    value,
    onValueChange,
    disabled = false,
    loading = false,
}: NotificationToggleProps) {
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({}, 'textMuted');

    return (
        <View style={[styles.toggleRow, disabled && styles.disabled]}>
            <View style={styles.toggleText}>
                <Text style={[styles.toggleTitle, { color: textColor }]}>{title}</Text>
                <Text style={[styles.toggleSubtitle, { color: mutedColor }]}>{subtitle}</Text>
            </View>
            {loading ? (
                <ActivityIndicator size="small" color="#18AEF2" />
            ) : (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    disabled={disabled || loading}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={value ? '#18AEF2' : '#f4f3f4'}
                />
            )}
        </View>
    );
}

interface SectionProps {
    title: string;
    children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
    const sectionBg = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');
    const titleColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');

    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: titleColor }]}>{title}</Text>
            <View style={[styles.sectionContent, { backgroundColor: sectionBg }]}>
                {children}
            </View>
        </View>
    );
}

export default function NotificationSettingsScreen() {
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({}, 'textMuted');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'border');

    const {
        preferences,
        preferencesLoading,
        updatePreferences,
    } = useNotifications();

    // Use preferences from database with defaults
    const pushEnabled = preferences?.push_enabled ?? true;
    const messageNotifs = preferences?.message_notifs ?? true;
    const listingNotifs = preferences?.listing_notifs ?? true;
    const priceDropNotifs = preferences?.price_drop_notifs ?? true;
    const promoNotifs = preferences?.promo_notifs ?? false;

    // Handler to update a single preference
    const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
        await updatePreferences({ [key]: value });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: textColor }]}>
                    Notification Settings
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Master Toggle */}
                <Section title="PUSH NOTIFICATIONS">
                    <NotificationToggle
                        title="Enable Push Notifications"
                        subtitle="Receive notifications on your device"
                        value={pushEnabled}
                        onValueChange={(value) => handleToggle('push_enabled', value)}
                        loading={preferencesLoading}
                    />
                </Section>

                {/* Notification Types */}
                <Section title="NOTIFICATION TYPES">
                    <NotificationToggle
                        title="Messages"
                        subtitle="When someone sends you a message"
                        value={messageNotifs}
                        onValueChange={(value) => handleToggle('message_notifs', value)}
                        disabled={!pushEnabled}
                        loading={preferencesLoading}
                    />
                    <View style={[styles.divider, { backgroundColor: borderColor }]} />
                    <NotificationToggle
                        title="Listing Activity"
                        subtitle="When your listing gets views or favorites"
                        value={listingNotifs}
                        onValueChange={(value) => handleToggle('listing_notifs', value)}
                        disabled={!pushEnabled}
                        loading={preferencesLoading}
                    />
                    <View style={[styles.divider, { backgroundColor: borderColor }]} />
                    <NotificationToggle
                        title="Price Drops"
                        subtitle="When favorited items drop in price"
                        value={priceDropNotifs}
                        onValueChange={(value) => handleToggle('price_drop_notifs', value)}
                        disabled={!pushEnabled}
                        loading={preferencesLoading}
                    />
                    <View style={[styles.divider, { backgroundColor: borderColor }]} />
                    <NotificationToggle
                        title="Promotions & Updates"
                        subtitle="Special offers and app updates"
                        value={promoNotifs}
                        onValueChange={(value) => handleToggle('promo_notifs', value)}
                        disabled={!pushEnabled}
                        loading={preferencesLoading}
                    />
                </Section>

                {/* Notice */}
                <View style={styles.notice}>
                    <Ionicons name="information-circle" size={20} color={mutedColor} />
                    <Text style={[styles.noticeText, { color: mutedColor }]}>
                        Push notifications require permission. You may need to enable them in your
                        device settings if you haven't already.
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: '600',
    },
    headerSpacer: {
        width: 28 + SPACING.xs * 2,
    },
    content: {
        paddingVertical: SPACING.lg,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginLeft: SPACING.xl,
        marginBottom: SPACING.sm,
        letterSpacing: 0.5,
    },
    sectionContent: {
        marginHorizontal: SPACING.lg - 1,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
    },
    toggleText: {
        flex: 1,
        marginRight: SPACING.md,
    },
    toggleTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    toggleSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    disabled: {
        opacity: 0.5,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: SPACING.lg,
    },
    notice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        gap: SPACING.sm,
    },
    noticeText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
});
