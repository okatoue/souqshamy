export interface VoiceRecorderProps {
    onSend: (uri: string, duration: number) => Promise<boolean>;
    onCancel: () => void;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
}

export type RecordingState = 'idle' | 'recording' | 'paused' | 'sending';
