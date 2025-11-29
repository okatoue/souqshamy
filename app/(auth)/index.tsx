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
  isValidEmail,
  useAuthStyles,
} from '@/components/auth';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

export default function AuthScreen() {
  const authStyles = useAuthStyles();
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const checkUserExists = async (email: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
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
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!isValidEmail(trimmedInput)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const userExists = await checkUserExists(trimmedInput);

      router.push({
        pathname: '/(auth)/password',
        params: {
          emailOrPhone: trimmedInput,
          isPhone: 'false',
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
          label="Email Address"
          placeholder="Enter your email address"
          value={inputValue}
          onChangeText={setInputValue}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          containerStyle={styles.inputContainer}
        />
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
