import { BackButton } from '@/components/ui/BackButton';
import { BORDER_RADIUS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface NotificationToggleProps {
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
}

function NotificationToggle({
    title,
    subtitle,
    value,
    onValueChange,
    disabled = false,
}: NotificationToggleProps) {
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({}, 'textMuted');

    return (
        <View style={[styles.toggleRow, disabled && styles.disabled]}>
            <View style={styles.toggleText}>
                <Text style={[styles.toggleTitle, { color: textColor }]}>{title}</Text>
                <Text style={[styles.toggleSubtitle, { color: mutedColor }]}>{subtitle}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                disabled={disabled}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={value ? '#18AEF2' : '#f4f3f4'}
            />
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
    const iconColor = useThemeColor({}, 'icon');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'border');

    // TODO: Connect to actual notification preferences storage
    const [pushEnabled, setPushEnabled] = useState(true);
    const [messageNotifs, setMessageNotifs] = useState(true);
    const [listingNotifs, setListingNotifs] = useState(true);
    const [priceDropNotifs, setPriceDropNotifs] = useState(true);
    const [promoNotifs, setPromoNotifs] = useState(false);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: textColor }]}>
                    Notifications
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
                        onValueChange={setPushEnabled}
                    />
                </Section>

                {/* Notification Types */}
                <Section title="NOTIFICATION TYPES">
                    <NotificationToggle
                        title="Messages"
                        subtitle="When someone sends you a message"
                        value={messageNotifs}
                        onValueChange={setMessageNotifs}
                        disabled={!pushEnabled}
                    />
                    <View style={[styles.divider, { backgroundColor: borderColor }]} />
                    <NotificationToggle
                        title="Listing Activity"
                        subtitle="When your listing gets views or favorites"
                        value={listingNotifs}
                        onValueChange={setListingNotifs}
                        disabled={!pushEnabled}
                    />
                    <View style={[styles.divider, { backgroundColor: borderColor }]} />
                    <NotificationToggle
                        title="Price Drops"
                        subtitle="When favorited items drop in price"
                        value={priceDropNotifs}
                        onValueChange={setPriceDropNotifs}
                        disabled={!pushEnabled}
                    />
                    <View style={[styles.divider, { backgroundColor: borderColor }]} />
                    <NotificationToggle
                        title="Promotions & Updates"
                        subtitle="Special offers and app updates"
                        value={promoNotifs}
                        onValueChange={setPromoNotifs}
                        disabled={!pushEnabled}
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
