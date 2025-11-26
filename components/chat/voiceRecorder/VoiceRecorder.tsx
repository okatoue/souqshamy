import React from 'react';
import { MicButton, RecordingControls } from './components';
import { usePulseAnimation, useVoiceRecording } from './hooks';
import { VoiceRecorderProps } from './types';

export function VoiceRecorder({
    onSend,
    onCancel,
    accentColor = '#007AFF',
    backgroundColor = '#f5f5f5',
    textColor = '#000'
}: VoiceRecorderProps) {
    const {
        recordingState,
        duration,
        startRecording,
        pauseRecording,
        resumeRecording,
        cancelRecording,
        sendRecording,
    } = useVoiceRecording({ onSend, onCancel });

    const pulseAnim = usePulseAnimation(recordingState);

    if (recordingState === 'idle') {
        return (
            <MicButton
                onPress={startRecording}
                accentColor={accentColor}
            />
        );
    }

    return (
        <RecordingControls
            recordingState={recordingState}
            duration={duration}
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
