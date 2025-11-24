import { ThemedView } from '@/components/themed-view';
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
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const inputBackground = useThemeColor({ light: '#f5f5f5', dark: '#1a1a1a' }, 'background');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'icon');
  const placeholderColor = useThemeColor({ light: '#999', dark: '#888' }, 'icon');

  return (
    <ThemedView style={[styles.section, { borderColor }]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Contact Information</Text>
      <Text style={[styles.sectionSubtitle, { color: placeholderColor }]}>
        Add at least one way for buyers to contact you
      </Text>

      {/* Phone Number Input */}
      <View style={[styles.inputWrapper, { backgroundColor: inputBackground, borderColor }]}>
        <View style={[styles.iconContainer, { borderColor }]}>
          <Ionicons name="call-outline" size={20} color={iconColor} />
        </View>
        <TextInput
          style={[styles.input, { color: textColor }]}
          placeholder="Phone Number"
          placeholderTextColor={placeholderColor}
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
    marginHorizontal: 20,
    marginBottom: 25,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 15,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconContainer: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
  },
});