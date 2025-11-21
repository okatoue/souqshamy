import { ThemedView } from '@/components/themed-view';
import React from 'react';
import { Keyboard, StyleSheet, Text, TextInput } from 'react-native';

interface DescriptionSectionProps {
  description: string;
  setDescription: (description: string) => void;
}

export default function DescriptionSection({ 
  description, 
  setDescription 
}: DescriptionSectionProps) {
  return (
    <ThemedView style={styles.section}>
      <Text style={styles.sectionTitle}>Description</Text>
      <TextInput
        style={styles.descriptionInput}
        placeholder="Describe your item in detail..."
        placeholderTextColor="#888"
        multiline
        numberOfLines={6}
        value={description}
        onChangeText={setDescription}
        textAlignVertical="top"
        returnKeyType="done"
        blurOnSubmit={true}
        onSubmitEditing={Keyboard.dismiss}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 20,
    marginBottom: 25,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 15,
  },
  descriptionInput: {
    minHeight: 120,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: '#333',
  },
});