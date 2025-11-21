import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface SubmitButtonProps {
  onPress: () => void;
  disabled: boolean;
}

export default function SubmitButton({ onPress, disabled }: SubmitButtonProps) {
  return (
    <TouchableOpacity 
      style={[
        styles.submitButton,
        disabled && styles.submitButtonDisabled
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.submitButtonText}>Post Listing</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  submitButton: {
    marginHorizontal: 20,
    marginVertical: 30,
    height: 56,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
});