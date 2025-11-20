import { useState } from 'react';
import { TextInput, TextInputProps } from 'react-native';

export function SearchBar({ style, ...props }: TextInputProps) {
      const [searchQuery, setSearchQuery] = useState('');

      return (
        <TextInput
          placeholder="Search..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={style}
          {...props}
        />
      );
    }

