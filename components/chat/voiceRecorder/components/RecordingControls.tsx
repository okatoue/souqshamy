import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Animated,
    Pressable,
    StyleSheet,
    View
} from 'react-native';
import { RecordingState } from '../types';
import { RecordingIndicator } from './RecordingIndicator';

interface RecordingControlsProps {
    recordingState: RecordingState;
    duration: number;
    pulseAnim: Animated.Value;
    onCancel: () => void;
    onPause: () => void;
    onResume: () => void;
    onSend: () => void;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
}

export function RecordingControls({
    recordingState,
    duration,
    pulseAnim,
    onCancel,
    onPause,
    onResume,
    onSend,
    accentColor,
    backgroundColor,
    textColor,
}: RecordingControlsProps) {
    const isSending = recordingState === 'sending';
    const isRecording = recordingState === 'recording';

    return (
        <View style={[styles.container, { backgroundColor }]}>
            {/* Cancel Button */}
            <Pressable
                style={styles.actionButton}
                onPress={onCancel}
                disabled={isSending}
                accessibilityRole="button"
                accessibilityLabel="Cancel recording"
            >
                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </Pressable>

            {/* Recording Indicator */}
            <RecordingIndicator
                recordingState={recordingState}
                duration={duration}
                pulseAnim={pulseAnim}
                textColor={textColor}
            />

            {/* Pause/Resume Button */}
            <Pressable
                style={styles.actionButton}
                onPress={isRecording ? onPause : onResume}
                disabled={isSending}
                accessibilityRole="button"
                accessibilityLabel={isRecording ? 'Pause recording' : 'Resume recording'}
            >
                <Ionicons
                    name={isRecording ? 'pause' : 'play'}
                    size={24}
                    color={isSending ? '#999' : accentColor}
                />
            </Pressable>

            {/* Send Button */}
            <Pressable
                style={[styles.sendButton, { backgroundColor: accentColor }]}
                onPress={onSend}
                disabled={isSending || duration === 0}
                accessibilityRole="button"
                accessibilityLabel="Send recording"
            >
                {isSending ? (
                    <ActivityIndicator size="small" color="white" />
                ) : (
                    <Ionicons name="send" size={20} color="white" />
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 25,
        paddingHorizontal: 8,
        paddingVertical: 8,
        marginRight: 8,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
