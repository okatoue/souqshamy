import { ThemedView } from '@/components/themed-view';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ContactSectionProps {
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  whatsappNumber: string;
  setWhatsappNumber: (whatsapp: string) => void;
  sameAsPhone: boolean;
  setSameAsPhone: (same: boolean) => void;
}

export default function ContactSection({
  phoneNumber,
  setPhoneNumber,
  whatsappNumber,
  setWhatsappNumber,
  sameAsPhone,
  setSameAsPhone,
}: ContactSectionProps) {
  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const inputBg = useThemeColor({}, 'inputBackground');
  const borderColor = useThemeColor({}, 'border');
  const mutedColor = useThemeColor({}, 'textMuted');
  const primaryColor = useThemeColor({}, 'tint');

  const handleToggleSameAsPhone = () => {
    if (!sameAsPhone) {
      // When toggling ON, copy phone to whatsapp
      setWhatsappNumber(phoneNumber);
    }
    setSameAsPhone(!sameAsPhone);
  };

  return (
    <ThemedView variant="card" style={[styles.section, { borderColor }]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Contact Information</Text>
      <Text style={[styles.sectionSubtitle, { color: mutedColor }]}>
        Add at least one way for buyers to contact you
      </Text>

      {sameAsPhone ? (
        /* Combined Phone + WhatsApp Input */
        <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
          <View style={[styles.combinedIconContainer, { borderColor }]}>
            <Ionicons name="call-outline" size={18} color={iconColor} />
            <Text style={[styles.iconSeparator, { color: mutedColor }]}>+</Text>
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
          </View>
          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder="Phone / WhatsApp"
            placeholderTextColor={COLORS.placeholder}
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);
              setWhatsappNumber(text);
            }}
            keyboardType="phone-pad"
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>
      ) : (
        /* Separate Phone and WhatsApp Inputs */
        <>
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

          {/* WhatsApp Number Input */}
          <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
            <View style={[styles.iconContainer, { borderColor }]}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </View>
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="WhatsApp Number"
              placeholderTextColor={COLORS.placeholder}
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
              keyboardType="phone-pad"
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>
        </>
      )}

      {/* Checkbox: WhatsApp same as phone number */}
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={handleToggleSameAsPhone}
        activeOpacity={0.7}
      >
        <View style={[
          styles.checkbox,
          { borderColor: sameAsPhone ? primaryColor : borderColor },
          sameAsPhone && { backgroundColor: primaryColor }
        ]}>
          {sameAsPhone && (
            <Ionicons name="checkmark" size={14} color="#fff" />
          )}
        </View>
        <Text style={[styles.checkboxLabel, { color: textColor }]}>
          WhatsApp same as phone number
        </Text>
      </TouchableOpacity>
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
  combinedIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderRightWidth: 1,
    gap: 4,
  },
  iconSeparator: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  checkboxLabel: {
    fontSize: 14,
  },
});
