import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
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

export function useVoiceRecording({
    onSend,
    onCancel,
}: UseVoiceRecordingOptions): UseVoiceRecordingResult {
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [duration, setDuration] = useState(0);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [pendingSend, setPendingSend] = useState(false);

    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const durationInterval = useRef<NodeJS.Timeout | null>(null);
    const savedDuration = useRef(0);

    const requestPermissions = useCallback(async () => {
        try {
            const status = await AudioModule.requestRecordingPermissionsAsync();
            setPermissionGranted(status.granted);
            return status.granted;
        } catch (error) {
            console.error('Error requesting permissions:', error);
            return false;
        }
    }, []);

    // Request permissions on mount
    useEffect(() => {
        requestPermissions();
        return () => {
            if (durationInterval.current) {
                clearInterval(durationInterval.current);
            }
        };
    }, [requestPermissions]);

    const handleSendWithUri = useCallback(async (uri: string) => {
        setPendingSend(false);

        try {
            const success = await onSend(uri, savedDuration.current);

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
            try {
                await AudioModule.setAudioModeAsync({
                    allowsRecording: false,
                    playsInSilentMode: true,
                });
            } catch {
                // Ignore
            }
            setRecordingState('paused');
        }
    }, [onSend]);

    // Watch for URI to become available after stopping
    useEffect(() => {
        const handleUri = async () => {
            if (pendingSend && audioRecorder.uri && !audioRecorder.isRecording) {
                const tempUri = audioRecorder.uri;

                // Poll for file existence
                let fileExists = false;
                let attempts = 0;
                const maxAttempts = 30;

                while (!fileExists && attempts < maxAttempts) {
                    try {
                        const fileInfo = await FileSystem.getInfoAsync(tempUri);

                        if (fileInfo.exists && (fileInfo as any).size && (fileInfo as any).size > 0) {
                            fileExists = true;
                        } else {
                            await new Promise(resolve => setTimeout(resolve, 100));
                            attempts++;
                        }
                    } catch {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        attempts++;
                    }
                }

                if (!fileExists) {
                    setPendingSend(false);
                    setRecordingState('paused');
                    return;
                }

                try {
                    const safeUri = `${FileSystem.cacheDirectory}voice_${Date.now()}.m4a`;
                    await FileSystem.copyAsync({ from: tempUri, to: safeUri });
                    handleSendWithUri(safeUri);
                } catch {
                    handleSendWithUri(tempUri);
                }
            }
        };

        handleUri();
    }, [audioRecorder.uri, audioRecorder.isRecording, pendingSend, handleSendWithUri]);

    const startRecording = useCallback(async () => {
        let hasPermission = permissionGranted;
        if (!hasPermission) {
            hasPermission = await requestPermissions();
            if (!hasPermission) return;
        }

        try {
            setDuration(0);
            setPendingSend(false);

            await AudioModule.setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });

            await audioRecorder.prepareToRecordAsync();
            audioRecorder.record();
            setRecordingState('recording');

            durationInterval.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error starting recording:', error);
        }
    }, [permissionGranted, requestPermissions, audioRecorder]);

    const pauseRecording = useCallback(async () => {
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
    }, [audioRecorder]);

    const resumeRecording = useCallback(async () => {
        try {
            audioRecorder.record();
            setRecordingState('recording');

            durationInterval.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error resuming recording:', error);
        }
    }, [audioRecorder]);

    const cancelRecording = useCallback(async () => {
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
    }, [audioRecorder, onCancel]);

    const sendRecording = useCallback(async () => {
        try {
            setRecordingState('sending');

            if (durationInterval.current) {
                clearInterval(durationInterval.current);
                durationInterval.current = null;
            }

            savedDuration.current = duration;
            setPendingSend(true);
            audioRecorder.stop();
        } catch (error) {
            console.error('Error stopping recording:', error);
            setRecordingState('paused');
            setPendingSend(false);
        }
    }, [duration, audioRecorder]);

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
