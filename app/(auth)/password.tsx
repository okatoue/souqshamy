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
import { useAuth } from '@/lib/auth_context';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

export default function PasswordScreen() {
  const authStyles = useAuthStyles();
  const params = useLocalSearchParams<{
    emailOrPhone: string;
    isPhone: string;
    isNewUser: string;
  }>();

  const { signIn, signUp } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const isNewUser = params.isNewUser === 'true';
  const email = params.emailOrPhone || '';

  const handleSubmit = async () => {
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (isNewUser) {
      if (!displayName.trim()) {
        Alert.alert('Error', 'Please enter your name');
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
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
      // Error is handled in auth context
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
        title={isNewUser ? 'Create Account' : 'Welcome Back'}
        subtitle={isNewUser ? 'Set up your account to get started' : 'Enter your password to sign in'}
      />

      <EmailPhoneDisplay value={email} onChangePress={handleBack} />

      <View style={authStyles.formSection}>
        {isNewUser && (
          <AuthInput
            label="Your Name"
            placeholder="Enter your full name"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!loading}
          />
        )}

        <AuthPasswordInput
          label="Password"
          placeholder={isNewUser ? 'Create a password' : 'Enter your password'}
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        {isNewUser && (
          <AuthPasswordInput
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
          />
        )}

        {!isNewUser && <AuthButton title="Forgot password?" variant="link" onPress={handleForgotPassword} />}
      </View>

      <AuthButton
        title={isNewUser ? 'Create Account' : 'Sign In'}
        onPress={handleSubmit}
        loading={loading}
      />

      {isNewUser && <PasswordRequirements password={password} confirmPassword={confirmPassword} />}
    </AuthLayout>
  );
}
