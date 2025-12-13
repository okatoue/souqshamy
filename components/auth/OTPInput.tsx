// components/auth/OTPInput.tsx
import React, { useRef, useState } from 'react';
import { StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import { BRAND_COLOR, isSmallScreen } from './constants';
import { useAuthColors } from './useAuthStyles';

interface OTPInputProps {
  code: string[];
  onCodeChange: (code: string[]) => void;
  length?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function OTPInput({
  code,
  onCodeChange,
  length = 8,
  disabled = false,
  style,
}: OTPInputProps) {
  const colors = useAuthColors();
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const handleChange = (text: string, index: number) => {
    // Only allow numbers
    const cleanText = text.replace(/[^0-9]/g, '');

    if (cleanText.length === 0) {
      // Clearing the current input
      const newCode = [...code];
      newCode[index] = '';
      onCodeChange(newCode);
    } else if (cleanText.length === 1) {
      // Single digit entered
      const newCode = [...code];
      newCode[index] = cleanText;
      onCodeChange(newCode);

      // Auto-focus next input
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else {
      // Multiple digits = paste detected
      // Take up to `length` digits and distribute them starting from index 0
      const digits = cleanText.slice(0, length).split('');
      const newCode = Array(length).fill('');
      digits.forEach((digit, i) => {
        newCode[i] = digit;
      });
      onCodeChange(newCode);

      // Focus the last filled input or the next empty one
      const lastFilledIndex = Math.min(digits.length - 1, length - 1);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && code[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    // Find the first empty box
    const firstEmptyIndex = code.findIndex((digit) => digit === '');

    // If there's an empty box and user clicked on a later box, focus the first empty one
    if (firstEmptyIndex !== -1 && firstEmptyIndex < index) {
      inputRefs.current[firstEmptyIndex]?.focus();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {code.slice(0, length).map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => (inputRefs.current[index] = ref)}
          style={[
            styles.input,
            { borderBottomColor: colors.border, color: colors.textPrimary },
            digit !== '' && styles.inputFilled,
            focusedIndex === index && styles.inputFocused,
          ]}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
          onFocus={() => {
            setFocusedIndex(index);
            handleFocus(index);
          }}
          onBlur={() => setFocusedIndex(null)}
          keyboardType="number-pad"
          selectTextOnFocus
          editable={!disabled}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: isSmallScreen ? 8 : 12,
    marginBottom: isSmallScreen ? 24 : 32,
  },
  input: {
    width: isSmallScreen ? 36 : 42,
    height: isSmallScreen ? 46 : 52,
    borderWidth: 0,
    borderBottomWidth: 2,
    borderRadius: 0,
    backgroundColor: 'transparent',
    fontSize: isSmallScreen ? 22 : 26,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputFilled: {
    borderBottomColor: BRAND_COLOR,
  },
  inputFocused: {
    borderBottomColor: BRAND_COLOR,
    borderBottomWidth: 3,
  },
});
