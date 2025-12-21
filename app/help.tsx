import { SettingsMenuItem, SettingsSection } from '@/components/settings';
import { BackButton } from '@/components/ui/BackButton';
import { SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router, Stack } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// FAQ Items
const FAQ_ITEMS = [
    {
        question: 'How do I post a listing?',
        answer: 'To post a listing, tap the "+" button in the center of the bottom navigation bar. Fill in the details about your item including photos, title, description, price, and category. Then tap "Post" to publish your listing.',
    },
    {
        question: 'How do I edit my listing?',
        answer: 'Go to your profile and tap on "My Listings". Find the listing you want to edit and tap on it. Then tap the edit icon in the top right corner to modify your listing details.',
    },
    {
        question: 'How do I contact a seller?',
        answer: 'When viewing a listing, you can tap the "Chat" button to start a conversation with the seller. You can also call or WhatsApp them using the buttons below the listing photos if they have provided contact information.',
    },
    {
        question: 'How do I delete my account?',
        answer: 'Go to Settings > Manage Account > Delete Account. You will need to confirm your identity before the account is deleted. Your data will be removed within 30 days.',
    },
    {
        question: 'Is my data safe?',
        answer: 'Yes, we take data security seriously. Your personal information is encrypted and stored securely. We do not sell your data to third parties. Read our Privacy Policy for more details.',
    },
    {
        question: 'How do I report a listing?',
        answer: 'When viewing a listing, tap the three dots icon in the top right corner and select "Report". Choose the reason for reporting and submit. Our team will review the report.',
    },
];

export default function HelpScreen() {
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({}, 'textMuted');
    const iconColor = useThemeColor({}, 'icon');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'border');

    const handleEmailSupport = () => {
        Linking.openURL('mailto:support@souqjari.com?subject=SouqJari App Support');
    };

    const handleWhatsAppSupport = () => {
        // Placeholder WhatsApp number - should be configured
        Alert.alert(
            'WhatsApp Support',
            'WhatsApp support will be available soon. For now, please contact us via email.',
            [{ text: 'OK' }]
        );
    };

    const handleFAQ = (question: string, answer: string) => {
        Alert.alert(question, answer, [{ text: 'OK' }]);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: textColor }]}>
                    Help & Support
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Contact Support */}
                <SettingsSection title="CONTACT SUPPORT">
                    <SettingsMenuItem
                        icon="mail-outline"
                        title="Email Support"
                        subtitle="support@souqjari.com"
                        onPress={handleEmailSupport}
                    />
                    <SettingsMenuItem
                        icon="logo-whatsapp"
                        iconColor="#25D366"
                        title="WhatsApp Support"
                        subtitle="Chat with us directly"
                        onPress={handleWhatsAppSupport}
                    />
                </SettingsSection>

                {/* FAQ */}
                <SettingsSection title="FREQUENTLY ASKED QUESTIONS">
                    {FAQ_ITEMS.map((item, index) => (
                        <SettingsMenuItem
                            key={index}
                            icon="help-circle-outline"
                            title={item.question}
                            onPress={() => handleFAQ(item.question, item.answer)}
                        />
                    ))}
                </SettingsSection>

                {/* Support Info */}
                <View style={styles.supportInfo}>
                    <Ionicons name="information-circle-outline" size={20} color={mutedColor} />
                    <Text style={[styles.supportInfoText, { color: mutedColor }]}>
                        Response time: Usually within 24 hours
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
