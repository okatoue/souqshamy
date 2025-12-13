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
    startRecording: () => Promise<void>;
    pauseRecording: () => Promise<void>;
    resumeRecording: () => Promise<void>;
    cancelRecording: () => Promise<void>;
    sendRecording: () => Promise<void>;
}

const RECORDING_OPTIONS = RecordingPresets.HIGH_QUALITY;

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

    // Start duration tracking
    const startDurationTracking = useCallback(() => {
        clearDurationInterval();
        durationInterval.current = setInterval(() => {
            if (isMounted.current) {
                setDuration(prev => {
                    recordedDuration.current = prev + 1;
                    return prev + 1;
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
        console.log('[VoiceRecording] processRecordedFile called:', { uri, action });

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
            console.log('[VoiceRecording] Checking file exists...');
            const fileInfo = await FileSystem.getInfoAsync(uri);
            console.log('[VoiceRecording] File info:', JSON.stringify(fileInfo));
            if (!fileInfo.exists) {
                throw new Error('Recording file not found');
            }

            // Copy to stable location
            console.log('[VoiceRecording] Copying to stable location...');
            const stableUri = await copyToStableLocation(uri);
            console.log('[VoiceRecording] Stable URI:', stableUri);

            // Reset audio mode for playback
            console.log('[VoiceRecording] Resetting audio mode...');
            await AudioModule.setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true,
            });

            console.log('[VoiceRecording] Calling onSend with duration:', recordedDuration.current);
            const success = await onSend(stableUri, recordedDuration.current);
            console.log('[VoiceRecording] onSend returned:', success);

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
        console.log('[VoiceRecording] useEffect triggered:', {
            isRecording: audioRecorder.isRecording,
            hasUri: !!audioRecorder.uri,
            pendingAction: pendingAction.current
        });

        // When recording stops and we have a URI, process based on pending action
        if (!audioRecorder.isRecording && audioRecorder.uri && pendingAction.current) {
            const action = pendingAction.current;
            const uri = audioRecorder.uri;
            pendingAction.current = null;

            console.log('[VoiceRecording] Processing recorded file:', { uri, action });
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

    const startRecording = useCallback(async () => {
        // Set preparing state immediately to prevent double-press
        setRecordingState('preparing');
        setDuration(0);
        recordedDuration.current = 0;
        pendingAction.current = null;

        try {
            // Request permissions
            console.log('[VoiceRecording] Requesting permissions...');
            const permissionStatus = await AudioModule.requestRecordingPermissionsAsync();
            if (!permissionStatus.granted) {
                console.warn('[VoiceRecording] Permission denied:', permissionStatus);
                if (isMounted.current) {
                    setRecordingState('idle');
                }
                return;
            }
            console.log('[VoiceRecording] Permission granted');

            // Configure audio mode for recording
            console.log('[VoiceRecording] Setting audio mode...');
            await AudioModule.setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });

            // Prepare and start recording
            console.log('[VoiceRecording] Preparing recorder...');
            await audioRecorder.prepareToRecordAsync();
            console.log('[VoiceRecording] Starting recording...');
            audioRecorder.record();

            if (isMounted.current) {
                console.log('[VoiceRecording] Recording started successfully');
                setRecordingState('recording');
                startDurationTracking();
            } else {
                console.warn('[VoiceRecording] Component unmounted during recording start');
            }
        } catch (error) {
            console.error('[VoiceRecording] Error starting recording:', error);
            console.error('[VoiceRecording] Error details:', {
                name: (error as Error)?.name,
                message: (error as Error)?.message,
                stack: (error as Error)?.stack,
            });

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
        console.log('[VoiceRecording] sendRecording called:', {
            duration,
            recordedDuration: recordedDuration.current,
            isRecording: audioRecorder.isRecording,
            hasUri: !!audioRecorder.uri
        });

        if (duration === 0 && recordedDuration.current === 0) {
            console.log('[VoiceRecording] Nothing to send (duration is 0)');
            return;
        }

        clearDurationInterval();
        setRecordingState('sending');

        if (audioRecorder.isRecording) {
            console.log('[VoiceRecording] Stopping recorder and waiting...');
            // Don't rely on useEffect - stop and process directly
            // This works around expo-audio bug where isRecording doesn't update
            audioRecorder.stop();

            // Small delay to ensure file is written
            await new Promise(resolve => setTimeout(resolve, 100));

            console.log('[VoiceRecording] Recorder stopped, URI:', audioRecorder.uri);
            if (audioRecorder.uri) {
                await processRecordedFile(audioRecorder.uri, 'send');
            } else {
                console.error('[VoiceRecording] No URI after stopping');
                if (isMounted.current) {
                    setRecordingState('paused');
                }
            }
        } else if (audioRecorder.uri) {
            console.log('[VoiceRecording] Already stopped, processing immediately');
            await processRecordedFile(audioRecorder.uri, 'send');
        } else {
            console.log('[VoiceRecording] No recording to send');
        }
    }, [duration, audioRecorder, clearDurationInterval, processRecordedFile]);

    return {
        recordingState,
        duration,
        startRecording,
        pauseRecording,
        resumeRecording,
        cancelRecording,
        sendRecording,
    };
}
