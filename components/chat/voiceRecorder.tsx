import { Ionicons } from '@expo/vector-icons';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';

interface VoiceRecorderProps {
    onSend: (uri: string, duration: number) => Promise<boolean>;
    onCancel: () => void;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'sending';

export function VoiceRecorder({
    onSend,
    onCancel,
    accentColor = '#007AFF',
    backgroundColor = '#f5f5f5',
    textColor = '#000'
}: VoiceRecorderProps) {
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [duration, setDuration] = useState(0);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [pendingSend, setPendingSend] = useState(false);

    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const durationInterval = useRef<NodeJS.Timeout | null>(null);
    const savedDuration = useRef(0);

    // Request permissions on mount
    useEffect(() => {
        requestPermissions();
        return () => {
            if (durationInterval.current) {
                clearInterval(durationInterval.current);
            }
        };
    }, []);

    // Debug: Monitor audioRecorder state changes
    useEffect(() => {
        console.log('audioRecorder state changed:', {
            isRecording: audioRecorder.isRecording,
            uri: audioRecorder.uri,
            recordingState: recordingState
        });
    }, [audioRecorder.isRecording, audioRecorder.uri]);

    // Watch for URI to become available after stopping (reactive approach)
    useEffect(() => {
        const handleUri = async () => {
            if (pendingSend && audioRecorder.uri && !audioRecorder.isRecording) {
                const tempUri = audioRecorder.uri;
                console.log('Recording URI available:', tempUri);

                // Poll for file existence (it might take a moment to be written)
                let fileExists = false;
                let attempts = 0;
                const maxAttempts = 20; // 2 seconds max

                while (!fileExists && attempts < maxAttempts) {
                    const fileInfo = await FileSystem.getInfoAsync(tempUri);
                    console.log(`Attempt ${attempts + 1}: File exists:`, fileInfo.exists);

                    if (fileInfo.exists && fileInfo.size && fileInfo.size > 0) {
                        fileExists = true;
                        console.log('File ready, size:', fileInfo.size);
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        attempts++;
                    }
                }

                if (!fileExists) {
                    console.error('File never became available after', maxAttempts, 'attempts');
                    setPendingSend(false);
                    setRecordingState('paused');
                    return;
                }

                try {
                    // Copy the file to a safe location
                    const safeUri = `${FileSystem.cacheDirectory}voice_${Date.now()}.m4a`;

                    console.log('Copying from:', tempUri, 'to:', safeUri);
                    await FileSystem.copyAsync({
                        from: tempUri,
                        to: safeUri
                    });

                    console.log('File copied successfully to:', safeUri);
                    handleSendWithUri(safeUri);
                } catch (copyError) {
                    console.error('Error copying file:', copyError);
                    // Try to send with original URI as fallback
                    handleSendWithUri(tempUri);
                }
            }
        };

        handleUri();
    }, [audioRecorder.uri, audioRecorder.isRecording, pendingSend]);

    // Pulse animation while recording
    useEffect(() => {
        if (recordingState === 'recording') {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [recordingState]);

    const handleSendWithUri = async (uri: string) => {
        setPendingSend(false);

        try {
            // Upload FIRST, before resetting audio mode (which may delete the temp file)
            const success = await onSend(uri, savedDuration.current);

            // Reset audio mode AFTER upload
            await AudioModule.setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true,
            });

            if (success) {
                setRecordingState('idle');
                setDuration(0);
            } else {
                setRecordingState('paused');
            }
        } catch (error) {
            console.error('Error sending recording:', error);
            // Still try to reset audio mode on error
            try {
                await AudioModule.setAudioModeAsync({
                    allowsRecording: false,
                    playsInSilentMode: true,
                });
            } catch (e) {
                // Ignore
            }
            setRecordingState('paused');
        }
    };

    const requestPermissions = async () => {
        try {
            const status = await AudioModule.requestRecordingPermissionsAsync();
            setPermissionGranted(status.granted);
        } catch (error) {
            console.error('Error requesting permissions:', error);
        }
    };

    const startRecording = async () => {
        if (!permissionGranted) {
            await requestPermissions();
            if (!permissionGranted) return;
        }

        try {
            setDuration(0);
            setPendingSend(false);

            await AudioModule.setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });

            console.log('Starting recording...');
            console.log('audioRecorder state before record:', {
                isRecording: audioRecorder.isRecording,
                uri: audioRecorder.uri
            });

            audioRecorder.record();
            setRecordingState('recording');

            console.log('Recording started, state:', {
                isRecording: audioRecorder.isRecording,
                uri: audioRecorder.uri
            });

            durationInterval.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error starting recording:', error);
        }
    };

    const pauseRecording = async () => {
        try {
            audioRecorder.pause();
            setRecordingState('paused');

            if (durationInterval.current) {
                clearInterval(durationInterval.current);
                durationInterval.current = null;
            }
        } catch (error) {
            console.error('Error pausing recording:', error);
        }
    };

    const resumeRecording = async () => {
        try {
            audioRecorder.record();
            setRecordingState('recording');

            durationInterval.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error resuming recording:', error);
        }
    };

    const cancelRecording = async () => {
        try {
            if (durationInterval.current) {
                clearInterval(durationInterval.current);
                durationInterval.current = null;
            }

            if (audioRecorder.isRecording) {
                audioRecorder.stop();
            }

            await AudioModule.setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true,
            });

            setRecordingState('idle');
            setDuration(0);
            setPendingSend(false);
            onCancel();
        } catch (error) {
            console.error('Error canceling recording:', error);
        }
    };

    const sendRecording = async () => {
        try {
            setRecordingState('sending');

            if (durationInterval.current) {
                clearInterval(durationInterval.current);
                durationInterval.current = null;
            }

            // Save duration before stopping
            savedDuration.current = duration;

            console.log('Stopping recording...');
            console.log('audioRecorder state before stop:', {
                isRecording: audioRecorder.isRecording,
                uri: audioRecorder.uri
            });

            // Set flag to indicate we want to send when URI is ready
            setPendingSend(true);

            // Stop recording - this will trigger the useEffect when uri updates
            audioRecorder.stop();

            console.log('Stop called, audioRecorder state:', {
                isRecording: audioRecorder.isRecording,
                uri: audioRecorder.uri
            });

        } catch (error) {
            console.error('Error stopping recording:', error);
            setRecordingState('paused');
            setPendingSend(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (recordingState === 'idle') {
        return (
            <Pressable
                style={[styles.micButton, { backgroundColor: accentColor }]}
                onPress={startRecording}
            >
                <Ionicons name="mic" size={22} color="white" />
            </Pressable>
        );
    }

    return (
        <View style={[styles.recorderContainer, { backgroundColor }]}>
            <Pressable
                style={styles.actionButton}
                onPress={cancelRecording}
                disabled={recordingState === 'sending'}
            >
                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </Pressable>

            <View style={styles.centerSection}>
                <Animated.View
                    style={[
                        styles.recordingDot,
                        {
                            backgroundColor: recordingState === 'recording' ? '#FF3B30' : '#999',
                            transform: [{ scale: recordingState === 'recording' ? pulseAnim : 1 }]
                        }
                    ]}
                />
                <Text style={[styles.durationText, { color: textColor }]}>
                    {formatDuration(duration)}
                </Text>
                <Text style={[styles.statusText, { color: textColor }]}>
                    {recordingState === 'recording' && 'Recording...'}
                    {recordingState === 'paused' && 'Paused'}
                    {recordingState === 'sending' && 'Sending...'}
                </Text>
            </View>

            <Pressable
                style={styles.actionButton}
                onPress={recordingState === 'recording' ? pauseRecording : resumeRecording}
                disabled={recordingState === 'sending'}
            >
                <Ionicons
                    name={recordingState === 'recording' ? 'pause' : 'play'}
                    size={24}
                    color={recordingState === 'sending' ? '#999' : accentColor}
                />
            </Pressable>

            <Pressable
                style={[styles.sendButton, { backgroundColor: accentColor }]}
                onPress={sendRecording}
                disabled={recordingState === 'sending' || duration === 0}
            >
                {recordingState === 'sending' ? (
                    <ActivityIndicator size="small" color="white" />
                ) : (
                    <Ionicons name="send" size={20} color="white" />
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    micButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    recorderContainer: {
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
    centerSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    durationText: {
        fontSize: 16,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    statusText: {
        fontSize: 12,
        opacity: 0.7,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});