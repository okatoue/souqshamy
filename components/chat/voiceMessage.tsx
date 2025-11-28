import { Ionicons } from '@expo/vector-icons';
import { AudioPlayer, useAudioPlayer } from 'expo-audio';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';

interface VoiceMessageProps {
    audioUrl: string;
    duration: number;
    isOwnMessage: boolean;
    bubbleColor: string;
    textColor: string;
}

export function VoiceMessage({
    audioUrl,
    duration,
    isOwnMessage,
    bubbleColor,
    textColor
}: VoiceMessageProps) {
    const [isLoading, setIsLoading] = useState(false);
    // Reactive state for player status - updated via event listener
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(duration);

    const player = useAudioPlayer(audioUrl);

    // Subscribe to player status updates for reactive UI
    useEffect(() => {
        const subscription = player.addListener('playbackStatusUpdate', (status: AudioPlayer) => {
            setIsPlaying(status.playing);
            setCurrentTime(status.currentTime || 0);
            if (status.duration && status.duration > 0) {
                setAudioDuration(status.duration);
            }
            // Clear loading state when player starts playing
            if (status.playing) {
                setIsLoading(false);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [player]);

    const togglePlayback = async () => {
        if (isLoading) return;

        try {
            if (isPlaying) {
                player.pause();
            } else {
                setIsLoading(true);
                // If at the end, seek to beginning
                if (player.duration > 0 && player.currentTime >= player.duration - 0.1) {
                    await player.seekTo(0);
                }
                player.play();
            }
        } catch (error) {
            console.error('Error toggling playback:', error);
            setIsLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

    return (
        <View style={[styles.container, { backgroundColor: bubbleColor }]}>
            {/* Play/Pause Button */}
            <Pressable
                style={[
                    styles.playButton,
                    { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)' }
                ]}
                onPress={togglePlayback}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color={textColor} />
                ) : (
                    <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={20}
                        color={textColor}
                    />
                )}
            </Pressable>

            {/* Waveform / Progress Bar */}
            <View style={styles.waveformContainer}>
                <View style={styles.waveform}>
                    {/* Background bars (decorative waveform) */}
                    {[...Array(20)].map((_, i) => {
                        const height = 8 + Math.sin(i * 0.8) * 8 + Math.random() * 4;
                        const isActive = (i / 20) * 100 <= progress;
                        return (
                            <View
                                key={i}
                                style={[
                                    styles.waveformBar,
                                    {
                                        height,
                                        backgroundColor: isOwnMessage
                                            ? isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)'
                                            : isActive ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.2)'
                                    }
                                ]}
                            />
                        );
                    })}
                </View>

                {/* Duration */}
                <Text style={[styles.durationText, { color: textColor }]}>
                    {isPlaying || currentTime > 0
                        ? formatTime(currentTime)
                        : formatTime(audioDuration)
                    }
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 18,
        minWidth: 180,
        maxWidth: 250,
    },
    playButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    waveformContainer: {
        flex: 1,
        marginLeft: 10,
    },
    waveform: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 24,
        gap: 2,
    },
    waveformBar: {
        width: 3,
        borderRadius: 1.5,
    },
    durationText: {
        fontSize: 11,
        marginTop: 4,
        opacity: 0.8,
        fontVariant: ['tabular-nums'],
    },
});