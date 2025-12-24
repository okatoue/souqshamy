import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RecordingState } from '../types';

interface UseVoiceRecordingOptions {
    onSend: (uri: string, duration: number) => Promise<boolean>;
    onCancel: () => void;
}

interface UseVoiceRecordingResult {
    recordingState: RecordingState;
    duration: number;
    maxDuration: number;
    isNearLimit: boolean;
    startRecording: () => Promise<void>;
    pauseRecording: () => Promise<void>;
    resumeRecording: () => Promise<void>;
    cancelRecording: () => Promise<void>;
    sendRecording: () => Promise<void>;
}

const RECORDING_OPTIONS = RecordingPresets.HIGH_QUALITY;

// Maximum recording duration in seconds (5 minutes)
const MAX_RECORDING_SECONDS = 300;

export function useVoiceRecording({
    onSend,
    onCancel,
}: UseVoiceRecordingOptions): UseVoiceRecordingResult {
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [duration, setDuration] = useState(0);

    const audioRecorder = useAudioRecorder(RECORDING_OPTIONS);
    const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const isMounted = useRef(true);
    const pendingAction = useRef<'send' | 'cancel' | null>(null);
    const recordedDuration = useRef(0);
    const shouldAutoStop = useRef(false);

    // Compute remaining time and near-limit state
    const isNearLimit = duration >= MAX_RECORDING_SECONDS - 30;

    // Track mounted state for cleanup
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Clear duration interval helper
    const clearDurationInterval = useCallback(() => {
        if (durationInterval.current) {
            clearInterval(durationInterval.current);
            durationInterval.current = null;
        }
    }, []);

    // Start duration tracking with auto-stop at max duration
    const startDurationTracking = useCallback(() => {
        clearDurationInterval();
        shouldAutoStop.current = false;
        durationInterval.current = setInterval(() => {
            if (isMounted.current) {
                setDuration(prev => {
                    const next = prev + 1;
                    recordedDuration.current = next;

                    // Check if we've reached max duration
                    if (next >= MAX_RECORDING_SECONDS) {
                        clearDurationInterval();
                        shouldAutoStop.current = true;
                        return prev; // Don't increment past max
                    }

                    return next;
                });
            }
        }, 1000);
    }, [clearDurationInterval]);

    // Copy file to stable location to prevent race conditions with temp file cleanup
    const copyToStableLocation = useCallback(async (sourceUri: string): Promise<string> => {
        const filename = `voice_${Date.now()}.m4a`;
        const destUri = `${FileSystem.cacheDirectory}${filename}`;

        try {
            await FileSystem.copyAsync({ from: sourceUri, to: destUri });
            return destUri;
        } catch {
            // If copy fails, use original URI
            return sourceUri;
        }
    }, []);

    // Handle the recorded file after stopping
    const processRecordedFile = useCallback(async (uri: string, action: 'send' | 'cancel') => {
        if (action === 'cancel') {
            // Clean up and reset
            try {
                await FileSystem.deleteAsync(uri, { idempotent: true });
            } catch {
                // Ignore cleanup errors
            }

            if (isMounted.current) {
                setRecordingState('idle');
                setDuration(0);
                recordedDuration.current = 0;
            }
            onCancel();
            return;
        }

        // Action is 'send'
        if (isMounted.current) {
            setRecordingState('sending');
        }

        try {
            // Verify file exists and has content
            const fileInfo = await FileSystem.getInfoAsync(uri);
            if (!fileInfo.exists) {
                throw new Error('Recording file not found');
            }

            // Copy to stable location
            const stableUri = await copyToStableLocation(uri);

            // Reset audio mode for playback
            await AudioModule.setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true,
            });

            const success = await onSend(stableUri, recordedDuration.current);

            if (isMounted.current) {
                if (success) {
                    setRecordingState('idle');
                    setDuration(0);
                    recordedDuration.current = 0;
                } else {
                    // Keep in paused state so user can retry
                    setRecordingState('paused');
                }
            }
        } catch (error) {
            console.error('Error processing recording:', error);

            // Reset audio mode even on error
            try {
                await AudioModule.setAudioModeAsync({
                    allowsRecording: false,
                    playsInSilentMode: true,
                });
            } catch {
                // Ignore
            }

            if (isMounted.current) {
                setRecordingState('paused');
            }
        }
    }, [onSend, onCancel, copyToStableLocation]);

    // Watch for recording state changes from expo-audio
    useEffect(() => {
        // When recording stops and we have a URI, process based on pending action
        if (!audioRecorder.isRecording && audioRecorder.uri && pendingAction.current) {
            const action = pendingAction.current;
            const uri = audioRecorder.uri;
            pendingAction.current = null;

            processRecordedFile(uri, action);
        }
    }, [audioRecorder.isRecording, audioRecorder.uri, processRecordedFile]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Clear interval first
            clearDurationInterval();

            // Clear pending action to prevent stale processing
            pendingAction.current = null;

            // Wrap in try-catch because the native recorder object may already be destroyed
            try {
                // Stop recording if still active
                if (audioRecorder.isRecording) {
                    audioRecorder.stop();
                }
            } catch {
                // Native object already destroyed - ignore
            }

            // Reset audio mode
            AudioModule.setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true,
            }).catch(() => {
                // Ignore
            });
        };
    }, [audioRecorder, clearDurationInterval]);

    // Auto-stop recording when max duration is reached
    useEffect(() => {
        if (shouldAutoStop.current && recordingState === 'recording') {
            shouldAutoStop.current = false;

            // Auto-send the recording
            (async () => {
                if (audioRecorder.isRecording) {
                    setRecordingState('sending');
                    audioRecorder.stop();

                    // Wait for file to be written
                    await new Promise(resolve => setTimeout(resolve, 100));

                    if (audioRecorder.uri) {
                        await processRecordedFile(audioRecorder.uri, 'send');
                    }
                }
            })();
        }
    }, [duration, recordingState, audioRecorder, processRecordedFile]);

    const startRecording = useCallback(async () => {
        // Set preparing state immediately to prevent double-press
        setRecordingState('preparing');
        setDuration(0);
        recordedDuration.current = 0;
        pendingAction.current = null;

        try {
            // Request permissions
            const permissionStatus = await AudioModule.requestRecordingPermissionsAsync();
            if (!permissionStatus.granted) {
                if (isMounted.current) {
                    setRecordingState('idle');
                }
                return;
            }

            // Configure audio mode for recording
            await AudioModule.setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });

            // Prepare and start recording
            await audioRecorder.prepareToRecordAsync();
            audioRecorder.record();

            if (isMounted.current) {
                setRecordingState('recording');
                startDurationTracking();
            }
        } catch (error) {
            console.error('[VoiceRecording] Error starting recording:', error);

            // Reset state on error
            if (isMounted.current) {
                setRecordingState('idle');
            }

            // Reset audio mode on error
            try {
                await AudioModule.setAudioModeAsync({
                    allowsRecording: false,
                    playsInSilentMode: true,
                });
            } catch {
                // Ignore
            }
        }
    }, [audioRecorder, startDurationTracking]);

    const pauseRecording = useCallback(async () => {
        try {
            audioRecorder.pause();
            clearDurationInterval();
            setRecordingState('paused');
        } catch (error) {
            console.error('Error pausing recording:', error);
        }
    }, [audioRecorder, clearDurationInterval]);

    const resumeRecording = useCallback(async () => {
        try {
            audioRecorder.record();
            setRecordingState('recording');
            startDurationTracking();
        } catch (error) {
            console.error('Error resuming recording:', error);
        }
    }, [audioRecorder, startDurationTracking]);

    const cancelRecording = useCallback(async () => {
        clearDurationInterval();

        if (audioRecorder.isRecording) {
            // Set pending action and stop - will be processed in useEffect
            pendingAction.current = 'cancel';
            audioRecorder.stop();
        } else if (audioRecorder.uri) {
            // Already stopped, process immediately
            await processRecordedFile(audioRecorder.uri, 'cancel');
        } else {
            // No recording, just reset
            setRecordingState('idle');
            setDuration(0);
            recordedDuration.current = 0;
            onCancel();
        }

        // Reset audio mode
        try {
            await AudioModule.setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true,
            });
        } catch {
            // Ignore
        }
    }, [audioRecorder, clearDurationInterval, onCancel, processRecordedFile]);

    const sendRecording = useCallback(async () => {
        if (duration === 0 && recordedDuration.current === 0) {
            return;
        }

        clearDurationInterval();
        setRecordingState('sending');

        if (audioRecorder.isRecording) {
            // Don't rely on useEffect - stop and process directly
            // This works around expo-audio bug where isRecording doesn't update
            audioRecorder.stop();

            // Small delay to ensure file is written
            await new Promise(resolve => setTimeout(resolve, 100));

            if (audioRecorder.uri) {
                await processRecordedFile(audioRecorder.uri, 'send');
            } else {
                console.error('[VoiceRecording] No URI after stopping');
                if (isMounted.current) {
                    setRecordingState('paused');
                }
            }
        } else if (audioRecorder.uri) {
            await processRecordedFile(audioRecorder.uri, 'send');
        }
    }, [duration, audioRecorder, clearDurationInterval, processRecordedFile]);

    return {
        recordingState,
        duration,
        maxDuration: MAX_RECORDING_SECONDS,
        isNearLimit,
        startRecording,
        pauseRecording,
        resumeRecording,
        cancelRecording,
        sendRecording,
    };
}
