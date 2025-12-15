import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export interface ContactBarProps {
    onChat: () => void;
    isStartingChat?: boolean;
    isVisible: boolean;
}

export function ContactBar({
    onChat,
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
            {/* Chat Button - Full Width */}
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
                        <Text style={styles.buttonText}>Chat with Seller</Text>
                    </>
                )}
            </Pressable>
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
