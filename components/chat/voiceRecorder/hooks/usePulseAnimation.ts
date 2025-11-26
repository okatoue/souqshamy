import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { RecordingState } from '../types';

export function usePulseAnimation(recordingState: RecordingState): Animated.Value {
    const pulseAnim = useRef(new Animated.Value(1)).current;

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
    }, [recordingState, pulseAnim]);

    return pulseAnim;
}
