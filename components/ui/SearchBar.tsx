import { useThemeColor } from '@/hooks/use-theme-color';
import { useState } from 'react';
import { TextInput, TextInputProps } from 'react-native';

export function SearchBar({ style, ...props }: TextInputProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({ light: '#999', dark: '#888' }, 'icon');

  return (
    <TextInput
      placeholder="Search..."
      placeholderTextColor={placeholderColor}
      value={searchQuery}
      onChangeText={setSearchQuery}
      style={[{ color: textColor }, style]}
      {...props}
    />
  );
}

