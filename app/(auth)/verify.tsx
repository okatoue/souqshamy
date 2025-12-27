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
import { handleAuthError } from '@/lib/auth-utils';
import { useAuth } from '@/lib/auth_context';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Mode = 'signup-verification' | 'password-reset';
type Step = 'email' | 'code' | 'password' | 'success';

const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const { t } = useTranslation();

  // Content configuration based on mode - using translations
  const getContent = (mode: Mode) => ({
    codeTitle: mode === 'signup-verification' ? t('auth.verifyEmail') : t('auth.enterCode'),
    codeSubtitle: t('auth.verifyEmailSubtitle'),
    codeIcon: mode === 'signup-verification' ? 'mail-outline' as const : 'key-outline' as const,
    verifyButtonTitle: mode === 'signup-verification' ? t('auth.verifyEmail') : t('auth.enterCode'),
    successTitle: mode === 'signup-verification' ? t('auth.emailVerified') : t('auth.passwordReset'),
    successSubtitle: mode === 'signup-verification' ? t('auth.emailVerifiedSubtitle') : t('auth.passwordResetSubtitle'),
    successButtonTitle: mode === 'signup-verification' ? t('auth.getStarted') : t('auth.signIn'),
  });
  const params = useLocalSearchParams<{
    mode: Mode;
    email: string;
  }>();

  const { setPasswordResetInProgress } = useAuth();

  const mode: Mode = params.mode || 'signup-verification';
  const initialEmail = params.email || '';
  const content = getContent(mode);

  // For password-reset, start at 'email' step if no email provided, otherwise 'code'
  // For signup-verification, always start at 'code' step
  const getInitialStep = (): Step => {
    if (mode === 'signup-verification') return 'code';
    return initialEmail ? 'code' : 'email';
  };

  const [step, setStep] = useState<Step>(getInitialStep());
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Ref to prevent double-sending initial verification code
  const hasSentInitialCode = useRef(false);

  // Step 1 (password-reset only): Send verification code
  const handleSendCode = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      Alert.alert(t('alerts.error'), t('validation.required'));
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      Alert.alert(t('alerts.error'), t('validation.invalidEmail'));
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
          Alert.alert(t('alerts.error'), t('errors.unauthorized'));
        } else {
          handleAuthError(error, 'password-reset');
        }
      } else {
        setStep('code');
      }
    } catch (error: any) {
      await setPasswordResetInProgress(false);
      handleAuthError(error, 'password-reset');
    } finally {
      setLoading(false);
    }
  };

  // Auto-send verification code for password-reset when email is pre-filled
  useEffect(() => {
    if (mode === 'password-reset' && initialEmail && step === 'code' && !hasSentInitialCode.current) {
      hasSentInitialCode.current = true;
      handleSendCode();
    }
  }, []);

  // Step 2: Verify OTP code
  const handleVerifyCode = async () => {
    const fullCode = code.join('');

    if (fullCode.length !== CODE_LENGTH) {
      Alert.alert(t('alerts.error'), t('validation.required'));
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
        Alert.alert(t('alerts.error'), t('auth.invalidCode'));
        setCode(Array(CODE_LENGTH).fill(''));
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
      handleAuthError(error, 'verification');
      setCode(Array(CODE_LENGTH).fill(''));
    } finally {
      setLoading(false);
    }
  };

  // Step 3 (password-reset only): Set new password
  const handleResetPassword = async () => {
    if (!password) {
      Alert.alert(t('alerts.error'), t('validation.required'));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t('alerts.error'), t('validation.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        handleAuthError(error, 'password-reset');
      } else {
        await setPasswordResetInProgress(false);
        setStep('success');
      }
    } catch (error: any) {
      handleAuthError(error, 'password-reset');
    } finally {
      setLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    setCode(Array(CODE_LENGTH).fill(''));
    setLoading(true);

    try {
      if (mode === 'signup-verification') {
        // Use resend for signup verification
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email.trim(),
        });

        if (error) {
          handleAuthError(error, 'verification');
        } else {
          Alert.alert(t('alerts.success'), t('auth.codeSent'));
        }
      } else {
        // Use signInWithOtp for password reset - don't set loading again
        setLoading(false);
        await handleSendCode();
        return;
      }
    } catch (error: any) {
      handleAuthError(error, 'verification');
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
            title={t('auth.forgotPassword')}
          />

          <View style={styles.inputSection}>
            <AuthInput
              label={t('auth.emailLabel')}
              placeholder={t('auth.emailPlaceholder')}
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

          <AuthButton title={t('auth.continue')} onPress={handleSendCode} loading={loading} />
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

          <OTPInput code={code} onCodeChange={setCode} length={CODE_LENGTH} disabled={loading} />

          <AuthButton title={content.verifyButtonTitle} onPress={handleVerifyCode} loading={loading} />

          <AuthButton
            title={t('auth.resendCode')}
            variant="link"
            onPress={handleResendCode}
            disabled={loading}
            style={styles.resendButton}
          />

          <AuthButton
            title={t('common.back')}
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
            title={t('auth.newPassword')}
          />

          <View style={authStyles.formSection}>
            <AuthPasswordInput
              label={t('auth.newPassword')}
              placeholder={t('auth.newPasswordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
          </View>

          <AuthButton title={t('auth.setNewPassword')} onPress={handleResetPassword} loading={loading} />
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
