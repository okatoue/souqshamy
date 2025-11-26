// app/(auth)/forgot-password.tsx
import {
  AUTH_COLORS,
  AuthButton,
  AuthInput,
  AuthLayout,
  AuthLogo,
  AuthPasswordInput,
  AuthTitle,
  BRAND_COLOR,
  NoticeBox,
  OTPInput,
  authStyles,
  isValidEmail,
} from '@/components/auth';
import { useAuth } from '@/lib/auth_context';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Step = 'email' | 'code' | 'password' | 'success';

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{
    emailOrPhone: string;
    isPhone: string;
  }>();

  const { setPasswordResetInProgress } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(params.isPhone === 'true' ? '' : params.emailOrPhone || '');
  const [code, setCode] = useState(['', '', '', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isPhone = params.isPhone === 'true';

  // Step 1: Send verification code
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

  // Step 2: Verify code
  const handleVerifyCode = async () => {
    const fullCode = code.join('');

    if (fullCode.length !== 8) {
      Alert.alert('Error', 'Please enter the complete 8-digit code');
      return;
    }

    setLoading(true);

    try {
      await setPasswordResetInProgress(true);

      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: fullCode,
        type: 'email',
      });

      if (error) {
        Alert.alert('Error', 'Invalid or expired code. Please try again.');
        setCode(['', '', '', '', '', '', '', '']);
      } else {
        setStep('password');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setCode(['', '', '', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set new password
  const handleResetPassword = async () => {
    if (!password) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
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

  const handleBackToLogin = async () => {
    await setPasswordResetInProgress(false);
    await supabase.auth.signOut();
    router.replace('/(auth)');
  };

  const handleResendCode = async () => {
    setCode(['', '', '', '', '', '', '', '']);
    await handleSendCode();
  };

  // Success Screen
  if (step === 'success') {
    return (
      <SafeAreaView style={authStyles.container}>
        <View style={authStyles.centerContent}>
          <AuthLogo
            icon="checkmark"
            size="large"
            gradientColors={[AUTH_COLORS.success, AUTH_COLORS.successDark]}
          />

          <Text style={styles.statusTitle}>Password Reset!</Text>
          <Text style={styles.statusSubtitle}>
            Your password has been successfully reset. You can now sign in with your new password.
          </Text>

          <AuthButton title="Sign In" onPress={handleBackToLogin} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <AuthLayout>
      <AuthLogo icon={step === 'password' ? 'lock-closed-outline' : 'key-outline'} />

      {/* Step 1: Email Input */}
      {step === 'email' && (
        <>
          <AuthTitle
            title="Forgot Password?"
            subtitle="Enter your email and we'll send you a verification code."
          />

          {isPhone && (
            <NoticeBox message="Password reset is only available via email. Please enter the email associated with your account." />
          )}

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
          <AuthTitle
            title="Enter Code"
            subtitle="We've sent an 8-digit code to"
            highlightedText={email}
          />

          <OTPInput code={code} onCodeChange={setCode} disabled={loading} />

          <AuthButton title="Verify Code" onPress={handleVerifyCode} loading={loading} />

          <AuthButton
            title="Didn't receive the code? Resend"
            variant="link"
            onPress={handleResendCode}
            disabled={loading}
            style={styles.resendButton}
          />
        </>
      )}

      {/* Step 3: New Password */}
      {step === 'password' && (
        <>
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

            <AuthPasswordInput
              label="Confirm Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
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
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AUTH_COLORS.textPrimary,
    marginBottom: 12,
  },
  statusSubtitle: {
    fontSize: 15,
    color: AUTH_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
});
