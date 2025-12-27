import { SettingsMenuItem, SettingsSection } from '@/components/settings';
import { BackButton } from '@/components/ui/BackButton';
import { SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRTL } from '@/lib/rtl_context';
import { rtlRow } from '@/lib/rtlStyles';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HelpScreen() {
    const { t } = useTranslation();
    const { isRTL } = useRTL();
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({}, 'textMuted');
    const iconColor = useThemeColor({}, 'icon');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'border');

    // FAQ Items with translations
    const faqItems = useMemo(() => [
        {
            questionKey: 'help.faqPostListing',
            answerKey: 'help.faqPostListingAnswer',
        },
        {
            questionKey: 'help.faqEditListing',
            answerKey: 'help.faqEditListingAnswer',
        },
        {
            questionKey: 'help.faqContactSeller',
            answerKey: 'help.faqContactSellerAnswer',
        },
        {
            questionKey: 'help.faqDeleteAccount',
            answerKey: 'help.faqDeleteAccountAnswer',
        },
        {
            questionKey: 'help.faqDataSafety',
            answerKey: 'help.faqDataSafetyAnswer',
        },
        {
            questionKey: 'help.faqReportListing',
            answerKey: 'help.faqReportListingAnswer',
        },
    ], []);

    const handleEmailSupport = () => {
        Linking.openURL('mailto:support@souqjari.com?subject=SouqJari App Support');
    };

    const handleWhatsAppSupport = () => {
        // Placeholder WhatsApp number - should be configured
        Alert.alert(
            t('help.whatsappSupport'),
            t('help.whatsappComingSoon'),
            [{ text: t('common.ok') }]
        );
    };

    const handleFAQ = (questionKey: string, answerKey: string) => {
        Alert.alert(t(questionKey), t(answerKey), [{ text: t('common.ok') }]);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, rtlRow(isRTL), { borderBottomColor: borderColor }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: textColor }]}>
                    {t('help.title')}
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Contact Support */}
                <SettingsSection title={t('help.contactSupport')}>
                    <SettingsMenuItem
                        icon="mail-outline"
                        title={t('help.emailSupport')}
                        subtitle={t('help.emailSupportSubtitle')}
                        onPress={handleEmailSupport}
                    />
                    <SettingsMenuItem
                        icon="logo-whatsapp"
                        iconColor="#25D366"
                        title={t('help.whatsappSupport')}
                        subtitle={t('help.whatsappSupportSubtitle')}
                        onPress={handleWhatsAppSupport}
                    />
                </SettingsSection>

                {/* FAQ */}
                <SettingsSection title={t('help.faq')}>
                    {faqItems.map((item, index) => (
                        <SettingsMenuItem
                            key={index}
                            icon="help-circle-outline"
                            title={t(item.questionKey)}
                            onPress={() => handleFAQ(item.questionKey, item.answerKey)}
                        />
                    ))}
                </SettingsSection>

                {/* Support Info */}
                <View style={[styles.supportInfo, rtlRow(isRTL)]}>
                    <Ionicons name="information-circle-outline" size={20} color={mutedColor} />
                    <Text style={[styles.supportInfoText, { color: mutedColor }]}>
                        {t('help.responseTime')}
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
    supportInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.xl,
        gap: SPACING.sm,
        paddingHorizontal: SPACING.lg,
    },
    supportInfoText: {
        fontSize: 13,
    },
});
