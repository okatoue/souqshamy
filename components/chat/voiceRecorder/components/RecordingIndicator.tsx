import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { RecordingState } from '../types';
import { formatDuration } from '../utils';

interface RecordingIndicatorProps {
    recordingState: RecordingState;
    duration: number;
    pulseAnim: Animated.Value;
    textColor: string;
}

export function RecordingIndicator({
    recordingState,
    duration,
    pulseAnim,
    textColor,
}: RecordingIndicatorProps) {
    const getStatusText = () => {
        switch (recordingState) {
            case 'recording':
                return 'Recording...';
            case 'paused':
                return 'Paused';
            case 'sending':
                return 'Sending...';
            default:
                return '';
        }
    };

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.dot,
                    {
                        backgroundColor: recordingState === 'recording' ? '#FF3B30' : '#999',
                        transform: [{ scale: recordingState === 'recording' ? pulseAnim : 1 }]
                    }
                ]}
            />
            <Text style={[styles.duration, { color: textColor }]}>
                {formatDuration(duration)}
            </Text>
            <Text style={[styles.status, { color: textColor }]}>
                {getStatusText()}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    duration: {
        fontSize: 16,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    status: {
        fontSize: 12,
        opacity: 0.7,
    },
});
