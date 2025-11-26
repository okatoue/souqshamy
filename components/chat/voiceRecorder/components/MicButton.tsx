import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

interface MicButtonProps {
    onPress: () => void;
    accentColor: string;
}

export function MicButton({ onPress, accentColor }: MicButtonProps) {
    return (
        <Pressable
            style={[styles.button, { backgroundColor: accentColor }]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="Start recording"
        >
            <Ionicons name="mic" size={22} color="white" />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
});
