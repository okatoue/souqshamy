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

  type UserStatus = 'new' | 'unverified' | 'verified' | 'oauth-only';

  const checkUserStatus = async (
    email: string
  ): Promise<{ status: UserStatus; provider?: string }> => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email_verified')
        .eq('email', email)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking user status:', profileError);
        return { status: 'new' };
      }

      if (!profile) {
        // No profile exists - new user
        return { status: 'new' };
      }

      // Check if user has OAuth identity only (no password)
      const { data: identities, error: identitiesError } = await supabase.rpc(
        'get_user_auth_providers',
        { user_email: email }
      );

      if (!identitiesError && identities && identities.length > 0) {
        const hasEmailProvider = identities.some(
          (i: { provider: string }) => i.provider === 'email'
        );
        if (!hasEmailProvider) {
          // User only has OAuth providers - find which one
          const oauthProvider = identities.find((i: { provider: string }) =>
            ['google', 'facebook'].includes(i.provider)
          );
          return {
            status: 'oauth-only',
            provider: oauthProvider?.provider,
          };
        }
      }

      // Profile exists - check if verified
      return { status: profile.email_verified ? 'verified' : 'unverified' };
    } catch (error) {
      console.error('Error checking user status:', error);
      return { status: 'new' };
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
      const { status, provider } = await checkUserStatus(trimmedInput);

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
        const providerName =
          provider === 'google'
            ? 'Google'
            : provider === 'facebook'
              ? 'Facebook'
              : 'social login';
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
