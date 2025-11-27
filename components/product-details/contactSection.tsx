import { ThemedView } from '@/components/themed-view';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';

interface ContactSectionProps {
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
}

export default function ContactSection({
  phoneNumber,
  setPhoneNumber,
}: ContactSectionProps) {
  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const inputBg = useThemeColor({}, 'inputBackground');
  const borderColor = useThemeColor({}, 'border');
  const mutedColor = useThemeColor({}, 'textMuted');

  return (
    <ThemedView variant="card" style={[styles.section, { borderColor }]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Contact Information</Text>
      <Text style={[styles.sectionSubtitle, { color: mutedColor }]}>
        Add at least one way for buyers to contact you
      </Text>

      {/* Phone Number Input */}
      <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
        <View style={[styles.iconContainer, { borderColor }]}>
          <Ionicons name="call-outline" size={20} color={iconColor} />
        </View>
        <TextInput
          style={[styles.input, { color: textColor }]}
          placeholder="Phone Number"
          placeholderTextColor={COLORS.placeholder}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          returnKeyType="done"
          blurOnSubmit={true}
          onSubmitEditing={Keyboard.dismiss}
        />
      </View>
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
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: SPACING.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  iconContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderRightWidth: 1,
  },
  input: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: 16,
  },
});
