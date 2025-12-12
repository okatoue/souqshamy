// app/(auth)/verify-email.tsx
import {
  AuthButton,
  AuthLayout,
  AuthLogo,
  AuthTitle,
  OTPInput,
  useAuthTheme,
} from '@/components/auth';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Step = 'code' | 'success';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{
    email: string;
  }>();

  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState(['', '', '', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const email = params.email || '';

  // Verify the OTP code
  const handleVerifyCode = async () => {
    const fullCode = code.join('');

    if (fullCode.length !== 8) {
      Alert.alert('Error', 'Please enter the complete 8-digit code');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email,
        token: fullCode,
        type: 'signup',
      });

      if (error) {
        Alert.alert('Error', 'Invalid or expired code. Please try again.');
        setCode(['', '', '', '', '', '', '', '']);
      } else {
        setStep('success');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setCode(['', '', '', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  // Resend verification email
  const handleResendCode = async () => {
    setResendLoading(true);
    setCode(['', '', '', '', '', '', '', '']);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'A new verification code has been sent to your email.');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to resend verification code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // Navigate to main app after successful verification
  const handleContinue = () => {
    router.replace('/(tabs)');
  };

  // Go back to sign in
  const handleBackToSignIn = () => {
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
            Email Verified!
          </Text>
          <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
            Your email has been successfully verified. You can now start using SouqJari.
          </Text>

          <AuthButton title="Get Started" onPress={handleContinue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <AuthLayout>
      <AuthLogo icon="mail-outline" />

      <AuthTitle
        title="Verify Your Email"
        subtitle="We've sent an 8-digit verification code to"
        highlightedText={email}
      />

      <OTPInput code={code} onCodeChange={setCode} disabled={loading || resendLoading} />

      <AuthButton title="Verify Email" onPress={handleVerifyCode} loading={loading} />

      <AuthButton
        title={resendLoading ? 'Sending...' : "Didn't receive the code? Resend"}
        variant="link"
        onPress={handleResendCode}
        disabled={loading || resendLoading}
        style={styles.resendButton}
      />

      <AuthButton
        title="Back to Sign In"
        variant="link"
        onPress={handleBackToSignIn}
        disabled={loading || resendLoading}
        style={styles.backButton}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
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
