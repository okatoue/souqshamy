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

export default function TermsOfUseScreen() {
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
                    {t('legal.termsOfUse')}
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.lastUpdated, rtlTextAlign(isRTL), { color: mutedColor }]}>
                    {t('legal.lastUpdated', { date: 'December 2024' })}
                </Text>

                <Section title={t('legal.termsAcceptanceTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.termsAcceptanceContent')}
                    </Text>
                </Section>

                <Section title={t('legal.termsAccountsTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.termsAccountsContent')}
                    </Text>
                </Section>

                <Section title={t('legal.termsListingRulesTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.termsListingRulesContent')}
                    </Text>
                </Section>

                <Section title={t('legal.termsProhibitedTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.termsProhibitedContent')}
                    </Text>
                </Section>

                <Section title={t('legal.termsUserConductTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.termsUserConductContent')}
                    </Text>
                </Section>

                <Section title={t('legal.termsIPTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.termsIPContent')}
                    </Text>
                </Section>

                <Section title={t('legal.termsDisclaimersTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.termsDisclaimersContent')}
                    </Text>
                </Section>

                <Section title={t('legal.termsLiabilityTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.termsLiabilityContent')}
                    </Text>
                </Section>

                <Section title={t('legal.termsTerminationTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.termsTerminationContent')}
                    </Text>
                </Section>

                <Section title={t('legal.termsChangesTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.termsChangesContent')}
                    </Text>
                </Section>

                <Section title={t('legal.termsContactTitle')}>
                    <Text style={[styles.paragraph, rtlTextAlign(isRTL), { color: textColor }]}>
                        {t('legal.termsContactContent')}
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
