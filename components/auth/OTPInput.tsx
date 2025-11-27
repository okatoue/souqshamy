// components/auth/OTPInput.tsx
import React, { useRef } from 'react';
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

  const handleChange = (text: string, index: number) => {
    // Only allow numbers
    const cleanText = text.replace(/[^0-9]/g, '');

    if (cleanText.length <= 1) {
      const newCode = [...code];
      newCode[index] = cleanText;
      onCodeChange(newCode);

      // Auto-focus next input
      if (cleanText.length === 1 && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (cleanText.length === length) {
      // Handle paste of full code
      const newCode = cleanText.split('');
      onCodeChange(newCode);
      inputRefs.current[length - 1]?.focus();
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
            {
              borderColor: colors.border,
              backgroundColor: colors.cardBackground,
              color: colors.textPrimary,
            },
            digit !== '' && styles.inputFilled,
          ]}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
          onFocus={() => handleFocus(index)}
          keyboardType="number-pad"
          maxLength={1}
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
    gap: 6,
    marginBottom: isSmallScreen ? 24 : 32,
  },
  input: {
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 46 : 52,
    borderWidth: 2,
    borderRadius: 8,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  inputFilled: {
    borderColor: BRAND_COLOR,
    backgroundColor: `${BRAND_COLOR}08`,
  },
});
