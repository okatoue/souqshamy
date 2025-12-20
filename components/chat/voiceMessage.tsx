import { Ionicons } from '@expo/vector-icons';
import { AudioPlayer, useAudioPlayer } from 'expo-audio';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';

// Seeded random number generator for consistent waveform per message
const seededRandom = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    return () => {
        hash = (hash * 1103515245 + 12345) & 0x7fffffff;
        return (hash % 1000) / 1000;
    };
};

const generateWaveform = (messageId: string, barCount: number): number[] => {
    const rng = seededRandom(messageId);
    return Array.from({ length: barCount }, () => 6 + rng() * 18);
};

const PLAYBACK_RATES = [1, 1.5, 2] as const;
const BAR_COUNT = 28;
const BAR_COUNT_WITH_SPEED = 20;

interface VoiceMessageProps {
    messageId: string;
    audioUrl: string;
    duration: number;
    isOwnMessage: boolean;
    bubbleColor: string;
    textColor: string;
    playingMessageId: string | null;
    onPlay: (messageId: string | null) => void;
}

export function VoiceMessage({
    messageId,
    audioUrl,
    duration,
    isOwnMessage,
    bubbleColor,
    textColor,
    playingMessageId,
    onPlay
}: VoiceMessageProps) {
    const [isLoading, setIsLoading] = useState(false);
    // Reactive state for player status - updated via event listener
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(duration);
    const [playbackRate, setPlaybackRate] = useState<number>(1);

    const player = useAudioPlayer(audioUrl);

    // Generate unique waveform heights based on messageId
    const waveformHeights = useMemo(() => generateWaveform(messageId, BAR_COUNT), [messageId]);

    // Subscribe to player status updates for reactive UI
    useEffect(() => {
        const subscription = player.addListener('playbackStatusUpdate', (status: AudioPlayer) => {
            const wasPlaying = isPlaying;
            const nowPlaying = status.playing;

            setIsPlaying(nowPlaying);
            setCurrentTime(status.currentTime || 0);
            if (status.duration && status.duration > 0) {
                setAudioDuration(status.duration);
            }

            // Clear loading state when player starts playing
            if (nowPlaying) {
                setIsLoading(false);
            }

            // Notify parent when playback starts (for exclusive playback)
            if (!wasPlaying && nowPlaying) {
                onPlay(messageId);
            }

            // Notify parent when playback stops naturally
            if (wasPlaying && !nowPlaying) {
                // Only clear if we're still the active player
                if (playingMessageId === messageId) {
                    onPlay(null);
                }
                // Reset playback rate when playback finishes
                setPlaybackRate(1);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [player, messageId, isPlaying, playingMessageId, onPlay]);

    // Pause this player if another message starts playing
    useEffect(() => {
        if (playingMessageId !== null && playingMessageId !== messageId && isPlaying) {
            player.pause();
        }
    }, [playingMessageId, messageId, isPlaying, player]);

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

    const cyclePlaybackRate = () => {
        const currentIndex = PLAYBACK_RATES.indexOf(playbackRate as 1 | 1.5 | 2);
        const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
        const newRate = PLAYBACK_RATES[nextIndex];
        setPlaybackRate(newRate);
        player.setPlaybackRate(newRate);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

    // Show speed button when playing, paused mid-playback, or rate !== 1
    const showSpeedButton = isPlaying || currentTime > 0 || playbackRate !== 1;
    const visibleBarCount = showSpeedButton ? BAR_COUNT_WITH_SPEED : BAR_COUNT;
    const visibleBars = waveformHeights.slice(0, visibleBarCount);

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
                    {visibleBars.map((height, i) => {
                        const isActive = (i / visibleBarCount) * 100 <= progress;
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

            {/* Speed Control Button */}
            {showSpeedButton && (
                <Pressable
                    style={[
                        styles.speedButton,
                        { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)' }
                    ]}
                    onPress={cyclePlaybackRate}
                >
                    <Text style={[styles.speedButtonText, { color: textColor }]}>
                        {playbackRate}x
                    </Text>
                </Pressable>
            )}
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
        minWidth: 220,
        maxWidth: 300,
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    waveformContainer: {
        flex: 1,
        marginLeft: 10,
        marginRight: 4,
    },
    waveform: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 24,
        gap: 2,
        overflow: 'hidden',
    },
    waveformBar: {
        width: 3.5,
        borderRadius: 1.75,
    },
    speedButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        marginLeft: 8,
        minWidth: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    speedButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
    durationText: {
        fontSize: 11,
        marginTop: 4,
        opacity: 0.8,
        fontVariant: ['tabular-nums'],
    },
});