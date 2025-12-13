// app/(auth)/verify.tsx
// Unified verification screen for email verification and password reset
import {
  AuthButton,
  AuthInput,
  AuthLayout,
  AuthLogo,
  AuthPasswordInput,
  AuthTitle,
  OTPInput,
  isValidEmail,
  useAuthTheme,
} from '@/components/auth';
import { useAuth } from '@/lib/auth_context';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Mode = 'signup-verification' | 'password-reset';
type Step = 'email' | 'code' | 'password' | 'success';

// Content configuration based on mode
const CONTENT = {
  'signup-verification': {
    codeTitle: 'Verify Your Email',
    codeSubtitle: "We've sent a 6-digit verification code to",
    codeIcon: 'mail-outline' as const,
    verifyButtonTitle: 'Verify Email',
    successTitle: 'Email Verified!',
    successSubtitle: 'Your email has been successfully verified. You can now start using SouqJari.',
    successButtonTitle: 'Get Started',
    codeLength: 6,
  },
  'password-reset': {
    codeTitle: 'Enter Code',
    codeSubtitle: "We've sent a 6-digit code to",
    codeIcon: 'key-outline' as const,
    verifyButtonTitle: 'Verify Code',
    successTitle: 'Password Reset!',
    successSubtitle: 'Your password has been successfully reset. You can now sign in with your new password.',
    successButtonTitle: 'Sign In',
    codeLength: 6,
  },
};

export default function VerifyScreen() {
  const params = useLocalSearchParams<{
    mode: Mode;
    email: string;
  }>();

  const { setPasswordResetInProgress } = useAuth();

  const mode: Mode = params.mode || 'signup-verification';
  const initialEmail = params.email || '';
  const content = CONTENT[mode];

  // For password-reset, start at 'email' step if no email provided, otherwise 'code'
  // For signup-verification, always start at 'code' step
  const getInitialStep = (): Step => {
    if (mode === 'signup-verification') return 'code';
    return initialEmail ? 'code' : 'email';
  };

  const [step, setStep] = useState<Step>(getInitialStep());
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState<string[]>(Array(content.codeLength).fill(''));
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1 (password-reset only): Send verification code
  const handleSendCode = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await setPasswordResetInProgress(true);

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { shouldCreateUser: false },
      });

      if (error) {
        await setPasswordResetInProgress(false);
        if (error.message.includes('User not found') || error.message.includes('No user found')) {
          Alert.alert('Error', 'No account found with this email address');
        } else {
          Alert.alert('Error', error.message);
        }
      } else {
        setStep('code');
      }
    } catch (error: any) {
      await setPasswordResetInProgress(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP code
  const handleVerifyCode = async () => {
    const fullCode = code.join('');

    if (fullCode.length !== content.codeLength) {
      Alert.alert('Error', `Please enter the complete ${content.codeLength}-digit code`);
      return;
    }

    setLoading(true);

    try {
      if (mode === 'password-reset') {
        await setPasswordResetInProgress(true);
      }

      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: fullCode,
        type: mode === 'signup-verification' ? 'signup' : 'email',
      });

      if (error) {
        Alert.alert('Error', 'Invalid or expired code. Please try again.');
        setCode(Array(content.codeLength).fill(''));
      } else {
        // SUCCESS - For signup verification, update the profile's email_verified flag
        if (mode === 'signup-verification' && data?.user) {
          // Update profile to mark email as verified
          // (This is a backup in case the database trigger doesn't fire)
          await supabase
            .from('profiles')
            .update({ email_verified: true, updated_at: new Date().toISOString() })
            .eq('id', data.user.id);
        }

        // For password-reset, go to password step; for signup, go to success
        setStep(mode === 'password-reset' ? 'password' : 'success');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setCode(Array(content.codeLength).fill(''));
    } finally {
      setLoading(false);
    }
  };

  // Step 3 (password-reset only): Set new password
  const handleResetPassword = async () => {
    if (!password) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        await setPasswordResetInProgress(false);
        setStep('success');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    setCode(Array(content.codeLength).fill(''));
    setLoading(true);

    try {
      if (mode === 'signup-verification') {
        // Use resend for signup verification
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email.trim(),
        });

        if (error) {
          Alert.alert('Error', error.message);
        } else {
          Alert.alert('Success', 'A new verification code has been sent to your email.');
        }
      } else {
        // Use signInWithOtp for password reset - don't set loading again
        setLoading(false);
        await handleSendCode();
        return;
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to resend verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle success button press
  const handleSuccessAction = async () => {
    if (mode === 'password-reset') {
      await setPasswordResetInProgress(false);
      await supabase.auth.signOut();
      router.replace('/(auth)');
    } else {
      router.replace('/(tabs)');
    }
  };

  // Go back to sign in
  const handleBackToSignIn = async () => {
    if (mode === 'password-reset') {
      await setPasswordResetInProgress(false);
    }
    router.replace('/(auth)');
  };

  const { styles: authStyles, colors } = useAuthTheme();

  // Success Screen
  if (step === 'success') {
    return (
      <SafeAreaView style={authStyles.container}>
        <View style={authStyles.centerContent}>
          <AuthLogo
            icon="checkmark"
            size="large"
            gradientColors={[colors.success, colors.successDark]}
          />

          <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
            {content.successTitle}
          </Text>
          <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
            {content.successSubtitle}
          </Text>

          <AuthButton title={content.successButtonTitle} onPress={handleSuccessAction} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <AuthLayout>
      {/* Step 1: Email Input (password-reset only) */}
      {step === 'email' && mode === 'password-reset' && (
        <>
          <AuthLogo icon="key-outline" />

          <AuthTitle
            title="Forgot Password?"
            subtitle="Enter your email and we'll send you a verification code."
          />

          <View style={styles.inputSection}>
            <AuthInput
              label="Email Address"
              placeholder="Enter your email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              icon="mail-outline"
              containerStyle={styles.inputContainer}
            />
          </View>

          <AuthButton title="Send Code" onPress={handleSendCode} loading={loading} />
        </>
      )}

      {/* Step 2: OTP Code Input */}
      {step === 'code' && (
        <>
          <AuthLogo icon={content.codeIcon} />

          <AuthTitle
            title={content.codeTitle}
            subtitle={content.codeSubtitle}
            highlightedText={email}
          />

          <OTPInput code={code} onCodeChange={setCode} length={content.codeLength} disabled={loading} />

          <AuthButton title={content.verifyButtonTitle} onPress={handleVerifyCode} loading={loading} />

          <AuthButton
            title="Didn't receive the code? Resend"
            variant="link"
            onPress={handleResendCode}
            disabled={loading}
            style={styles.resendButton}
          />

          <AuthButton
            title="Back to Sign In"
            variant="link"
            onPress={handleBackToSignIn}
            disabled={loading}
            style={styles.backButton}
          />
        </>
      )}

      {/* Step 3: New Password (password-reset only) */}
      {step === 'password' && mode === 'password-reset' && (
        <>
          <AuthLogo icon="lock-closed-outline" />

          <AuthTitle
            title="New Password"
            subtitle="Create a strong password for your account."
          />

          <View style={authStyles.formSection}>
            <AuthPasswordInput
              label="New Password"
              placeholder="Enter new password"
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
          </View>

          <AuthButton title="Reset Password" onPress={handleResetPassword} loading={loading} />
        </>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  inputSection: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 0,
  },
  resendButton: {
    marginTop: 16,
    alignSelf: 'center',
  },
  backButton: {
    marginTop: 8,
    alignSelf: 'center',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
});
