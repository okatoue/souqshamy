import { ThemedView } from '@/components/themed-view';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';

interface ContactSectionProps {
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  whatsappNumber: string;
  setWhatsappNumber: (whatsapp: string) => void;
}

export default function ContactSection({ 
  phoneNumber, 
  setPhoneNumber,
  whatsappNumber,
  setWhatsappNumber
}: ContactSectionProps) {
  return (
    <ThemedView style={styles.section}>
      <Text style={styles.sectionTitle}>Contact Information</Text>
      <Text style={styles.sectionSubtitle}>
        Add at least one way for buyers to contact you
      </Text>
      
      {/* Phone Number Input */}
      <View style={styles.inputWrapper}>
        <View style={styles.iconContainer}>
          <Ionicons name="call-outline" size={20} color="#666" />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor="#888"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          returnKeyType="done"
          blurOnSubmit={true}
          onSubmitEditing={Keyboard.dismiss}
        />
      </View>

      {/* WhatsApp Number Input */}
      <View style={styles.inputWrapper}>
        <View style={styles.iconContainer}>
          <FontAwesome name="whatsapp" size={20} color="#666" />
        </View>
        <TextInput
          style={styles.input}
          placeholder="WhatsApp Number"
          placeholderTextColor="#888"
          value={whatsappNumber}
          onChangeText={setWhatsappNumber}
          keyboardType="phone-pad"
          returnKeyType="done"
          blurOnSubmit={true}
          onSubmitEditing={Keyboard.dismiss}
        />
      </View>

      {/* Helper Text */}
      {!phoneNumber && !whatsappNumber && (
        <Text style={styles.helperText}>
          * At least one contact method is required
        </Text>
      )}
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
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 15,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  iconContainer: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: 'white',
  },
  helperText: {
    fontSize: 12,
    color: '#ff9500',
    marginTop: 4,
    fontStyle: 'italic',
  },
});