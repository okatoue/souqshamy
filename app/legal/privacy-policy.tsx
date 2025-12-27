import { BackButton } from '@/components/ui/BackButton';
import { SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRTL } from '@/lib/rtl_context';
import { rtlRow, rtlTextAlign } from '@/lib/rtlStyles';
import { Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
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

export default function PrivacyPolicyScreen() {
    const { t } = useTranslation();
    const { isRTL } = useRTL();
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({}, 'textMuted');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'border');

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, rtlRow(isRTL), { borderBottomColor: borderColor }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: textColor }]}>
                    {t('legal.privacyPolicy')}
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.lastUpdated, rtlTextAlign(isRTL), { color: mutedColor }]}>
                    {t('legal.lastUpdated', { date: 'December 2024' })}
                </Text>

                <Section title={t('legal.privacyIntroTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.privacyIntroContent')}
                    </Text>
                </Section>

                <Section title={t('legal.privacyInfoCollectTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.privacyInfoCollectContent')}
                    </Text>
                </Section>

                <Section title={t('legal.privacyHowUseTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.privacyHowUseContent')}
                    </Text>
                </Section>

                <Section title={t('legal.privacyDataSharingTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.privacyDataSharingContent')}
                    </Text>
                </Section>

                <Section title={t('legal.privacyDataRetentionTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.privacyDataRetentionContent')}
                    </Text>
                </Section>

                <Section title={t('legal.privacyYourRightsTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.privacyYourRightsContent')}
                    </Text>
                </Section>

                <Section title={t('legal.privacySecurityTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.privacySecurityContent')}
                    </Text>
                </Section>

                <Section title={t('legal.privacyContactTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.privacyContactContent')}
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
