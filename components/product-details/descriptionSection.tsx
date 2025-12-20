import { ThemedView } from '@/components/themed-view';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';

const MAX_DESCRIPTION_LENGTH = 61000;

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
  const mutedColor = useThemeColor({}, 'textMuted');

  // Character count color based on usage
  const charCount = description.length;
  const isNearLimit = charCount > MAX_DESCRIPTION_LENGTH * 0.9;
  const isOverLimit = charCount >= MAX_DESCRIPTION_LENGTH;
  const countColor = isOverLimit ? COLORS.error : isNearLimit ? COLORS.warning : mutedColor;

  return (
    <View>
      <ThemedView variant="card" style={[styles.section, { borderColor }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Description</Text>
        <TextInput
          style={[
            styles.descriptionInput,
            {
              backgroundColor: inputBg,
              borderColor: isOverLimit ? COLORS.error : borderColor,
              color: textColor
            }
          ]}
          placeholder="Describe your item in detail..."
          placeholderTextColor={COLORS.placeholder}
          multiline
          numberOfLines={6}
          value={description}
          onChangeText={(text) => setDescription(text.slice(0, MAX_DESCRIPTION_LENGTH))}
          maxLength={MAX_DESCRIPTION_LENGTH}
          textAlignVertical="top"
          returnKeyType="done"
          blurOnSubmit={true}
          onSubmitEditing={Keyboard.dismiss}
        />
      </ThemedView>
      <Text style={[styles.characterCount, { color: countColor }]}>
        {charCount.toLocaleString()}/{MAX_DESCRIPTION_LENGTH.toLocaleString()}
      </Text>
    </View>
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
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    marginTop: SPACING.xs,
    marginRight: SPACING.xl,
    marginBottom: SPACING.md,
  },
});
