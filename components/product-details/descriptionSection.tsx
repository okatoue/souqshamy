import { ThemedView } from '@/components/themed-view';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
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
  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const inputBg = useThemeColor({}, 'inputBackground');

  return (
    <ThemedView variant="card" style={[styles.section, { borderColor }]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Description</Text>
      <TextInput
        style={[styles.descriptionInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
        placeholder="Describe your item in detail..."
        placeholderTextColor={COLORS.placeholder}
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
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.lg,
  },
  descriptionInput: {
    minHeight: 120,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    fontSize: 16,
    borderWidth: 1,
  },
});
