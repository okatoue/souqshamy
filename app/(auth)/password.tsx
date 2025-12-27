// app/(auth)/password.tsx
import {
  AuthButton,
  AuthInput,
  AuthLayout,
  AuthLogo,
  AuthPasswordInput,
  AuthTitle,
  EmailPhoneDisplay,
  PasswordRequirements,
  useAuthStyles,
} from '@/components/auth';
import { handleAuthError } from '@/lib/auth-utils';
import { useAuth } from '@/lib/auth_context';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';

export default function PasswordScreen() {
  const { t } = useTranslation();
  const authStyles = useAuthStyles();
  const params = useLocalSearchParams<{
    emailOrPhone: string;
    isPhone: string;
    isNewUser: string;
  }>();

  const { signIn, signUp } = useAuth();

  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const isNewUser = params.isNewUser === 'true';
  const email = params.emailOrPhone || '';

  const handleSubmit = async () => {
    if (!password) {
      Alert.alert(t('alerts.error'), t('validation.required'));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t('alerts.error'), t('validation.passwordTooShort'));
      return;
    }

    if (isNewUser) {
      if (!displayName.trim()) {
        Alert.alert(t('alerts.error'), t('validation.required'));
        return;
      }
    }

    setLoading(true);

    try {
      if (isNewUser) {
        await signUp(email, password, undefined, displayName.trim());
        // Navigate to email verification screen
        router.replace({
          pathname: '/(auth)/verify',
          params: { mode: 'signup-verification', email },
        });
      } else {
        await signIn(email, password);
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      // Check if error is due to email not being confirmed
      const errorMessage = error.message?.toLowerCase() || '';
      if (errorMessage.includes('email not confirmed') || errorMessage.includes('email_not_confirmed')) {
        // Resend verification code before redirecting
        try {
          await supabase.auth.resend({
            type: 'signup',
            email: email,
          });
        } catch {
          // Ignore resend errors
        }

        // Redirect to email verification screen
        router.replace({
          pathname: '/(auth)/verify',
          params: { mode: 'signup-verification', email },
        });
      } else {
        // Use shared error handler for consistent error display
        handleAuthError(error, isNewUser ? 'signup' : 'signin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleForgotPassword = () => {
    router.push({
      pathname: '/(auth)/verify',
      params: {
        mode: 'password-reset',
        email: email,
      },
    });
  };

  return (
    <AuthLayout>
      <AuthLogo />

      <AuthTitle
        title={isNewUser ? t('auth.createAccount') : t('auth.welcomeBack')}
        subtitle={isNewUser ? undefined : undefined}
      />

      <EmailPhoneDisplay value={email} onChangePress={handleBack} />

      <View style={authStyles.formSection}>
        {isNewUser && (
          <AuthInput
            label={t('auth.nameLabel')}
            placeholder={t('auth.namePlaceholder')}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!loading}
          />
        )}

        <AuthPasswordInput
          label={t('auth.passwordLabel')}
          placeholder={isNewUser ? t('auth.newPasswordPlaceholder') : t('auth.passwordPlaceholder')}
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        {!isNewUser && <AuthButton title={t('auth.forgotPassword')} variant="link" onPress={handleForgotPassword} />}
      </View>

      <AuthButton
        title={isNewUser ? t('auth.createAccount') : t('auth.signIn')}
        onPress={handleSubmit}
        loading={loading}
      />

      {isNewUser && <PasswordRequirements password={password} />}
    </AuthLayout>
  );
}
