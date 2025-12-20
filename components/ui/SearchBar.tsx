import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

interface SearchBarProps extends Omit<TextInputProps, 'style'> {
  style?: ViewStyle;
  showIcon?: boolean;
  showClearButton?: boolean;
  onClear?: () => void;
}

export function SearchBar({
  style,
  value: externalValue,
  onChangeText: externalOnChangeText,
  showIcon = false,
  showClearButton = true,
  onClear,
  ...props
}: SearchBarProps) {
  // Use internal state if no external value is provided (uncontrolled mode)
  const [internalValue, setInternalValue] = useState('');

  const isControlled = externalValue !== undefined;
  const value = isControlled ? externalValue : internalValue;

  const handleChangeText = (text: string) => {
    if (!isControlled) {
      setInternalValue(text);
    }
    externalOnChangeText?.(text);
  };

  const handleClear = () => {
    if (!isControlled) {
      setInternalValue('');
    }
    externalOnChangeText?.('');
    onClear?.();
  };

  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({ light: '#999', dark: '#888' }, 'icon');
  const iconColor = useThemeColor({ light: '#666', dark: '#888' }, 'icon');

  return (
    <View style={[styles.container, style]} accessibilityRole="search">
      {showIcon && (
        <Ionicons name="search" size={20} color={iconColor} style={styles.icon} />
      )}
      <TextInput
        placeholder="Search..."
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={handleChangeText}
        style={[styles.input, { color: textColor }]}
        returnKeyType="search"
        accessibilityLabel="Search for listings"
        accessibilityHint="Enter keywords to search for listings"
        {...props}
      />
      {showClearButton && value && value.length > 0 && (
        <Pressable
          onPress={handleClear}
          style={styles.clearButton}
          accessibilityLabel="Clear search"
          accessibilityRole="button"
        >
          <Ionicons name="close-circle" size={18} color={iconColor} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
});