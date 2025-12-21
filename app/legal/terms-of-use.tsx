import { BackButton } from '@/components/ui/BackButton';
import { SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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

export default function TermsOfUseScreen() {
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({}, 'textMuted');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'border');

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: textColor }]}>
                    Terms of Use
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.lastUpdated, { color: mutedColor }]}>
                    Last updated: December 2024
                </Text>

                <Section title="Acceptance of Terms">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        By accessing or using SouqJari ("the App"), you agree to be bound by these
                        Terms of Use. If you do not agree to these terms, please do not use the App.
                    </Text>
                </Section>

                <Section title="User Accounts">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        {'\u2022'} You must be at least 18 years old to use the App{'\n'}
                        {'\u2022'} You are responsible for maintaining the confidentiality of your account{'\n'}
                        {'\u2022'} You are responsible for all activities under your account{'\n'}
                        {'\u2022'} You must provide accurate and complete information{'\n'}
                        {'\u2022'} One person may only maintain one account
                    </Text>
                </Section>

                <Section title="Listing Rules">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        When creating listings, you agree to:{'\n\n'}
                        {'\u2022'} Only list items you own or are authorized to sell{'\n'}
                        {'\u2022'} Provide accurate descriptions and photos{'\n'}
                        {'\u2022'} Set fair and honest prices{'\n'}
                        {'\u2022'} Respond to buyer inquiries in a timely manner{'\n'}
                        {'\u2022'} Complete transactions in good faith
                    </Text>
                </Section>

                <Section title="Prohibited Content">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        The following are strictly prohibited:{'\n\n'}
                        {'\u2022'} Illegal or stolen items{'\n'}
                        {'\u2022'} Counterfeit or pirated goods{'\n'}
                        {'\u2022'} Weapons, drugs, or dangerous materials{'\n'}
                        {'\u2022'} Adult content or services{'\n'}
                        {'\u2022'} Fraudulent or misleading listings{'\n'}
                        {'\u2022'} Spam or unsolicited advertising{'\n'}
                        {'\u2022'} Content that violates intellectual property rights
                    </Text>
                </Section>

                <Section title="User Conduct">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        You agree not to:{'\n\n'}
                        {'\u2022'} Harass, threaten, or abuse other users{'\n'}
                        {'\u2022'} Attempt to circumvent our fees or systems{'\n'}
                        {'\u2022'} Use the App for any illegal purpose{'\n'}
                        {'\u2022'} Interfere with the App's operation{'\n'}
                        {'\u2022'} Create multiple accounts
                    </Text>
                </Section>

                <Section title="Intellectual Property">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        The App and its original content, features, and functionality are owned by
                        SouqJari and are protected by international copyright, trademark, and other
                        intellectual property laws.
                    </Text>
                </Section>

                <Section title="Disclaimers">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        {'\u2022'} SouqJari is a platform for connecting buyers and sellers{'\n'}
                        {'\u2022'} We do not verify listings or guarantee transactions{'\n'}
                        {'\u2022'} We are not responsible for the quality of items listed{'\n'}
                        {'\u2022'} Users transact at their own risk{'\n'}
                        {'\u2022'} The App is provided "as is" without warranties
                    </Text>
                </Section>

                <Section title="Limitation of Liability">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        To the maximum extent permitted by law, SouqJari shall not be liable for
                        any indirect, incidental, special, consequential, or punitive damages arising
                        out of your use of the App.
                    </Text>
                </Section>

                <Section title="Account Termination">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        We reserve the right to suspend or terminate accounts that violate these
                        terms. Users may delete their accounts at any time through the App settings.
                    </Text>
                </Section>

                <Section title="Changes to Terms">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        We may update these Terms of Use from time to time. Continued use of the
                        App after changes constitutes acceptance of the new terms.
                    </Text>
                </Section>

                <Section title="Contact">
                    <Text style={[styles.paragraph, { color: textColor }]}>
                        For questions about these Terms of Use, please contact:{'\n\n'}
                        legal@souqjari.com
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
