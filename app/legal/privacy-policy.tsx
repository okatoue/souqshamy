import { SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SectionProps {
    title: string;
    children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
    const textColor = useThemeColor({}, 'text');

    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
            {children}
        </View>
    );
}

export default function PrivacyPolicyScreen() {
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({}, 'textMuted');
    const iconColor = useThemeColor({}, 'icon');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'border');

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={iconColor} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: textColor }]}>
                    Privacy Policy
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.lastUpdated, { color: mutedColor }]}>
                    Last updated: December 2024
                </Text>

                <Section title="Introduction">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        SouqJari ("we", "our", or "us") is committed to protecting your privacy.
                        This Privacy Policy explains how we collect, use, and share your personal
                        information when you use our mobile application.
                    </Text>
                </Section>

                <Section title="Information We Collect">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        {'\u2022'} Account information (email, name, phone number){'\n'}
                        {'\u2022'} Profile information (avatar, bio){'\n'}
                        {'\u2022'} Listing content (photos, descriptions, prices){'\n'}
                        {'\u2022'} Location data (for listing location){'\n'}
                        {'\u2022'} Messages between users{'\n'}
                        {'\u2022'} Device information and usage data
                    </Text>
                </Section>

                <Section title="How We Use Your Information">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        We use your information to:{'\n\n'}
                        {'\u2022'} Provide and improve our services{'\n'}
                        {'\u2022'} Enable communication between buyers and sellers{'\n'}
                        {'\u2022'} Personalize your experience{'\n'}
                        {'\u2022'} Send important notifications{'\n'}
                        {'\u2022'} Ensure safety and security
                    </Text>
                </Section>

                <Section title="Data Sharing">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        We may share your information with:{'\n\n'}
                        {'\u2022'} Other users (public profile and listings){'\n'}
                        {'\u2022'} Service providers who help us operate the app{'\n'}
                        {'\u2022'} Law enforcement when required by law{'\n\n'}
                        We do not sell your personal information to third parties.
                    </Text>
                </Section>

                <Section title="Data Retention">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        We retain your data while your account is active. When you delete your
                        account, your data is removed within 30 days in accordance with GDPR
                        requirements.
                    </Text>
                </Section>

                <Section title="Your Rights">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        You have the right to:{'\n\n'}
                        {'\u2022'} Access your personal data{'\n'}
                        {'\u2022'} Correct inaccurate data{'\n'}
                        {'\u2022'} Delete your account and data{'\n'}
                        {'\u2022'} Export your data{'\n'}
                        {'\u2022'} Opt out of marketing communications
                    </Text>
                </Section>

                <Section title="Data Security">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        We implement appropriate technical and organizational measures to protect
                        your personal information against unauthorized access, alteration, disclosure,
                        or destruction.
                    </Text>
                </Section>

                <Section title="Contact Us">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        If you have questions about this Privacy Policy or wish to exercise your
                        rights, please contact us at:{'\n\n'}
                        privacy@souqjari.com
                    </Text>
                </Section>
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
    backButton: {
        padding: SPACING.xs,
        marginLeft: -SPACING.xs,
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
        padding: SPACING.lg,
    },
    lastUpdated: {
        fontSize: 13,
        marginBottom: SPACING.xl,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: SPACING.sm,
    },
    paragraph: {
        fontSize: 15,
        lineHeight: 22,
    },
});
