import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export interface ContactBarProps {
    onChat: () => void;
    onCall?: () => void;
    onWhatsApp?: () => void;
    phoneNumber?: string | null;
    isStartingChat?: boolean;
    isVisible: boolean;
}

export function ContactBar({
    onChat,
    onCall,
    onWhatsApp,
    phoneNumber,
    isStartingChat,
    isVisible,
}: ContactBarProps) {
    const cardBg = useThemeColor({}, 'cardBackground');
    const borderColor = useThemeColor({}, 'border');

    if (!isVisible) {
        return null;
    }

    return (
        <View style={[styles.container, { backgroundColor: cardBg, borderTopColor: borderColor }]}>
            {/* Chat Button */}
            <Pressable
                style={[styles.button, { backgroundColor: COLORS.chatButton }]}
                onPress={onChat}
                disabled={isStartingChat}
            >
                {isStartingChat ? (
                    <ActivityIndicator size="small" color="white" />
                ) : (
                    <>
                        <Ionicons name="chatbubble" size={20} color="white" />
                        <Text style={styles.buttonText}>Chat</Text>
                    </>
                )}
            </Pressable>

            {/* Call Button */}
            {phoneNumber && onCall && (
                <Pressable
                    style={[styles.button, { backgroundColor: COLORS.callButton }]}
                    onPress={onCall}
                >
                    <Ionicons name="call" size={20} color="white" />
                    <Text style={styles.buttonText}>Call</Text>
                </Pressable>
            )}

            {/* WhatsApp Button */}
            {phoneNumber && onWhatsApp && (
                <Pressable
                    style={[styles.button, { backgroundColor: COLORS.whatsappButton }]}
                    onPress={onWhatsApp}
                >
                    <Ionicons name="logo-whatsapp" size={20} color="white" />
                    <Text style={styles.buttonText}>WhatsApp</Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        borderTopWidth: 1,
        gap: SPACING.sm,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: BORDER_RADIUS.md,
        gap: 6,
    },
    buttonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
});

export default ContactBar;
