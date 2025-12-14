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

  type UserStatus = 'new' | 'unverified' | 'verified';

  const checkUserStatus = async (email: string): Promise<UserStatus> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email_verified')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('Error checking user status:', error);
        return 'new'; // Default to new user on error
      }

      if (!data) {
        // No profile exists - new user
        return 'new';
      }

      // Profile exists - check if verified
      return data.email_verified ? 'verified' : 'unverified';
    } catch (error) {
      console.error('Error checking user status:', error);
      return 'new';
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
      const status = await checkUserStatus(trimmedInput);

      if (status === 'new') {
        // New user - go to signup (password creation) screen
        router.push({
          pathname: '/(auth)/password',
          params: {
            emailOrPhone: trimmedInput,
            isPhone: 'false',
            isNewUser: 'true',
          },
        });
      } else if (status === 'unverified') {
        // Existing but unverified - resend code and go to verification screen
        try {
          await supabase.auth.resend({
            type: 'signup',
            email: trimmedInput,
          });
        } catch (resendError) {
          // Continue to verification screen anyway - they can request resend there
        }

        router.push({
          pathname: '/(auth)/verify',
          params: {
            mode: 'signup-verification',
            email: trimmedInput,
          },
        });
      } else {
        // Verified user - go to login screen
        router.push({
          pathname: '/(auth)/password',
          params: {
            emailOrPhone: trimmedInput,
            isPhone: 'false',
            isNewUser: 'false',
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
