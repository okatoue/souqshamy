// app/(auth)/index.tsx
import {
  AuthButton,
  AuthDivider,
  AuthInput,
  AuthLayout,
  AuthLogo,
  AuthTitle,
  BRAND_COLOR,
  SocialAuthButtons,
  SyriaFlag,
  authStyles,
  cleanPhoneNumber,
  detectPhoneNumber,
  formatPhoneInput,
  isValidEmail,
  isValidPhoneNumber,
} from '@/components/auth';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

export default function AuthScreen() {
  const [inputValue, setInputValue] = useState('');
  const [isPhoneNumber, setIsPhoneNumber] = useState(false);
  const [loading, setLoading] = useState(false);

  // Detect if input is phone number
  useEffect(() => {
    setIsPhoneNumber(detectPhoneNumber(inputValue));
  }, [inputValue]);

  const handleInputChange = (value: string) => {
    setInputValue(formatPhoneInput(value));
  };

  const checkUserExists = async (emailOrPhone: string, isPhone: boolean): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq(isPhone ? 'phone_number' : 'email', isPhone ? cleanPhoneNumber(emailOrPhone) : emailOrPhone)
        .maybeSingle();
      return !!data;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  };

  const handleContinue = async () => {
    const trimmedInput = inputValue.trim();

    if (!trimmedInput) {
      Alert.alert('Error', 'Please enter your email or phone number');
      return;
    }

    const validEmail = isValidEmail(trimmedInput);
    const validPhone = isValidPhoneNumber(trimmedInput);

    if (!validEmail && !validPhone) {
      Alert.alert('Error', 'Please enter a valid email address or phone number');
      return;
    }

    setLoading(true);

    try {
      const userExists = await checkUserExists(trimmedInput, validPhone);

      router.push({
        pathname: '/(auth)/password',
        params: {
          emailOrPhone: trimmedInput,
          isPhone: validPhone ? 'true' : 'false',
          isNewUser: userExists ? 'false' : 'true',
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = (provider: string) => {
    Alert.alert('Coming Soon', `${provider} login will be available soon!`);
  };

  return (
    <AuthLayout>
      <AuthLogo />

      <AuthTitle title="Log in or Sign up" />

      <View style={styles.inputSection}>
        <AuthInput
          label="Email or Mobile Number"
          placeholder="Enter your email or phone number"
          value={inputValue}
          onChangeText={handleInputChange}
          keyboardType={isPhoneNumber ? 'phone-pad' : 'email-address'}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          containerStyle={styles.inputContainer}
        />
        {isPhoneNumber && <SyriaFlag />}
      </View>

      <AuthButton title="Continue" onPress={handleContinue} loading={loading} />

      <AuthDivider />

      <SocialAuthButtons onPress={handleSocialAuth} />

      <Text style={authStyles.footer}>
        By continuing, you agree to our{' '}
        <Text style={styles.footerLink}>Terms of Service</Text>
        {' '}and{' '}
        <Text style={styles.footerLink}>Privacy Policy</Text>
      </Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  inputSection: {
    marginBottom: 14,
  },
  inputContainer: {
    marginBottom: 0,
  },
  footerLink: {
    color: BRAND_COLOR,
  },
});
