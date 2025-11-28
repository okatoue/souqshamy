export interface VoiceRecorderProps {
    onSend: (uri: string, duration: number) => Promise<boolean>;
    onCancel: () => void;
    onStateChange?: (isActive: boolean) => void;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
}

export type RecordingState = 'idle' | 'preparing' | 'recording' | 'paused' | 'sending';
