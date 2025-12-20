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
import { checkUserAuthStatus, getProviderDisplayName, handleAuthError } from '@/lib/auth-utils';
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
      // Use shared utility for consistent user status checking
      const { status, provider } = await checkUserAuthStatus(trimmedInput);

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
      } else if (status === 'oauth-only') {
        // User signed up with OAuth only - show alert
        const providerName = getProviderDisplayName(provider);
        Alert.alert(
          'Sign In Method',
          `This account was created using ${providerName}. Please use the "${providerName}" button below to sign in.`,
          [{ text: 'OK' }]
        );
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
        // Verified user with password - go to login screen
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
      handleAuthError(error, 'signin');
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
