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
import { useAuth } from '@/lib/auth_context';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

export default function AuthScreen() {
  const authStyles = useAuthStyles();
  const { signInWithGoogle, signInWithFacebook } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  const checkUserStatus = async (email: string): Promise<{
    exists: boolean;
    isEmailConfirmed: boolean;
  }> => {
    try {
      // Try to sign in with a dummy password to check if user exists
      // and get error details about email confirmation status
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: '__CHECK_USER_EXISTS__', // Intentionally wrong password
      });

      if (!error) {
        // Unlikely but handle it - user exists and somehow this matched
        return { exists: true, isEmailConfirmed: true };
      }

      const errorMsg = error.message.toLowerCase();

      // "Invalid login credentials" = user exists, email is confirmed, wrong password
      if (errorMsg.includes('invalid login credentials') || errorMsg.includes('invalid_credentials')) {
        return { exists: true, isEmailConfirmed: true };
      }

      // "Email not confirmed" = user exists but hasn't verified email
      if (errorMsg.includes('email not confirmed') || errorMsg.includes('email_not_confirmed')) {
        return { exists: true, isEmailConfirmed: false };
      }

      // Any other error (including "user not found" patterns) = new user
      return { exists: false, isEmailConfirmed: false };
    } catch (error) {
      console.error('Error checking user status:', error);
      return { exists: false, isEmailConfirmed: false };
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
      const { exists, isEmailConfirmed } = await checkUserStatus(trimmedInput);

      if (exists && !isEmailConfirmed) {
        // User exists but email not verified - go to verification screen
        // Also resend the verification code
        await supabase.auth.resend({
          type: 'signup',
          email: trimmedInput,
        });

        router.push({
          pathname: '/(auth)/verify',
          params: { mode: 'signup-verification', email: trimmedInput },
        });
      } else {
        // Either new user or existing verified user - go to password screen
        router.push({
          pathname: '/(auth)/password',
          params: {
            emailOrPhone: trimmedInput,
            isPhone: 'false',
            isNewUser: exists ? 'false' : 'true',
          },
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: string) => {
    if (provider === 'Google') {
      try {
        setSocialLoading(true);
        await signInWithGoogle();
        // Navigation happens automatically via auth state listener in _layout.tsx
      } catch (error) {
        // Error already handled in signInWithGoogle
        console.log('[AuthScreen] Google sign-in failed:', error);
      } finally {
        setSocialLoading(false);
      }
    } else if (provider === 'Facebook') {
      try {
        setSocialLoading(true);
        await signInWithFacebook();
        // Navigation happens automatically via auth state listener in _layout.tsx
      } catch (error) {
        // Error already handled in signInWithFacebook
        console.log('[AuthScreen] Facebook sign-in failed:', error);
      } finally {
        setSocialLoading(false);
      }
    } else {
      Alert.alert('Coming Soon', `${provider} login will be available soon!`);
    }
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
          editable={!loading && !socialLoading}
          containerStyle={styles.inputContainer}
        />
      </View>

      <AuthButton title="Continue" onPress={handleContinue} loading={loading} disabled={socialLoading} />

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
