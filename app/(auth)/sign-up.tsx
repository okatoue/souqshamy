import { useAuth } from '@/lib/auth_context';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SignUp() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  // Helper function to detect if input is email or phone
  const isEmail = (input: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  };

  const isPhoneNumber = (input: string) => {
    // Remove any spaces, dashes, or parentheses
    const cleaned = input.replace(/[\s\-\(\)]/g, '');
    // Check if it contains only digits and possibly starts with +
    const phoneRegex = /^\+?\d{7,15}$/;
    return phoneRegex.test(cleaned);
  };

  const handleSignUp = async () => {
    if (!emailOrPhone || !password) {
      alert('Please fill in all fields');
      return;
    }

    // Validate input
    const trimmedInput = emailOrPhone.trim();
    const isValidEmail = isEmail(trimmedInput);
    const isValidPhone = isPhoneNumber(trimmedInput);

    if (!isValidEmail && !isValidPhone) {
      alert('Please enter a valid email address or phone number');
      return;
    }

    setLoading(true);
    try {
      if (isValidEmail) {
        // Sign up with email
        await signUp(trimmedInput, password, undefined);
      } else {
        // Sign up with phone number
        const cleanedPhone = trimmedInput.replace(/[\s\-\(\)]/g, '');
        await signUp(undefined, password, cleanedPhone);
      }
      
      if (isValidEmail) {
        alert('Sign up successful! Please check your email for verification.');
      } else {
        alert('Sign up successful! You can now sign in.');
      }
      router.push('/(auth)/sign-in');
    } catch (error) {
      // Error handled in auth context
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.form}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Syria's Marketplace</Text>

          <TextInput
            style={styles.input}
            placeholder="Email or Phone Number"
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <Text style={styles.helperText}>
            You can sign up with either your email address or phone number
          </Text>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/(auth)/sign-in')}
            disabled={loading}
          >
            <Text style={styles.link}>
              Already have an account? Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  form: {
    padding: 20,
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    fontStyle: 'italic',
  },
});