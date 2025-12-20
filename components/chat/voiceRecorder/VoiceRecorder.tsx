import React, { useEffect, useRef } from 'react';
import { MicButton, RecordingControls } from './components';
import { usePulseAnimation, useVoiceRecording } from './hooks';
import { VoiceRecorderProps } from './types';

export function VoiceRecorder({
    onSend,
    onCancel,
    onStateChange,
    accentColor = '#007AFF',
    backgroundColor = '#f5f5f5',
    textColor = '#000'
}: VoiceRecorderProps) {
    const {
        recordingState,
        duration,
        maxDuration,
        isNearLimit,
        startRecording,
        pauseRecording,
        resumeRecording,
        cancelRecording,
        sendRecording,
    } = useVoiceRecording({ onSend, onCancel });

    const pulseAnim = usePulseAnimation(recordingState);

    // Notify parent when recording becomes active/inactive
    const prevIsActive = useRef(false);
    useEffect(() => {
        const isActive = recordingState === 'recording' || recordingState === 'paused' || recordingState === 'sending';
        if (isActive !== prevIsActive.current) {
            prevIsActive.current = isActive;
            onStateChange?.(isActive);
        }
    }, [recordingState, onStateChange]);

    // Show mic button during idle or preparing (with loading indicator when preparing)
    if (recordingState === 'idle' || recordingState === 'preparing') {
        return (
            <MicButton
                onPress={startRecording}
                accentColor={accentColor}
                isPreparing={recordingState === 'preparing'}
            />
        );
    }

    return (
        <RecordingControls
            recordingState={recordingState}
            duration={duration}
            maxDuration={maxDuration}
            isNearLimit={isNearLimit}
            pulseAnim={pulseAnim}
            onCancel={cancelRecording}
            onPause={pauseRecording}
            onResume={resumeRecording}
            onSend={sendRecording}
            accentColor={accentColor}
            backgroundColor={backgroundColor}
            textColor={textColor}
        />
    );
}
