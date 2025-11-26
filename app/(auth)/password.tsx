// app/(auth)/password.tsx
import { useAuth } from '@/lib/auth_context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Brand color
const BRAND_COLOR = '#18AEF2';
const BRAND_COLOR_DARK = '#0d9fe0';

export default function PasswordScreen() {
    const params = useLocalSearchParams<{
        emailOrPhone: string;
        isPhone: string;
        isNewUser: string;
    }>();

    const { signIn, signUp } = useAuth();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const isNewUser = params.isNewUser === 'true';
    const isPhone = params.isPhone === 'true';
    const emailOrPhone = params.emailOrPhone || '';

    // Get display value for the email/phone
    const getDisplayValue = () => {
        if (isPhone) {
            return emailOrPhone;
        }
        return emailOrPhone;
    };

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
                // Sign up flow
                if (isPhone) {
                    const cleanedPhone = emailOrPhone.replace(/[\s\-\(\)]/g, '');
                    await signUp(undefined, password, cleanedPhone, displayName.trim());
                    Alert.alert(
                        'Account Created!',
                        'Your account has been created successfully. You can now sign in.',
                        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
                    );
                } else {
                    await signUp(emailOrPhone, password, undefined, displayName.trim());
                    Alert.alert(
                        'Check Your Email',
                        'We\'ve sent you a verification email. Please verify your email to continue.',
                        [{ text: 'OK', onPress: () => router.replace('/(auth)') }]
                    );
                }
            } else {
                // Sign in flow
                if (isPhone) {
                    const cleanedPhone = emailOrPhone.replace(/[\s\-\(\)]/g, '');
                    await signIn(undefined, password, cleanedPhone);
                } else {
                    await signIn(emailOrPhone, password);
                }
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

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Back Button */}
                    <Pressable style={styles.backButton} onPress={handleBack}>
                        <Ionicons name="arrow-back" size={24} color="#334155" />
                    </Pressable>

                    <View style={styles.card}>
                        {/* Logo */}
                        <View style={styles.logoContainer}>
                            <LinearGradient
                                colors={[BRAND_COLOR, BRAND_COLOR_DARK]}
                                style={styles.logoGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="cart-outline" size={40} color="white" />
                            </LinearGradient>
                        </View>

                        {/* Title */}
                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>
                                {isNewUser ? 'Create Account' : 'Welcome Back'}
                            </Text>
                            <Text style={styles.subtitle}>
                                {isNewUser
                                    ? 'Set up your account to get started'
                                    : 'Enter your password to sign in'}
                            </Text>
                        </View>

                        {/* Email/Phone Display */}
                        <View style={styles.emailDisplay}>
                            <Ionicons
                                name={isPhone ? 'call-outline' : 'mail-outline'}
                                size={18}
                                color="#64748b"
                            />
                            <Text style={styles.emailText}>{getDisplayValue()}</Text>
                            <Pressable onPress={handleBack}>
                                <Text style={styles.changeText}>Change</Text>
                            </Pressable>
                        </View>

                        {/* Form Fields */}
                        <View style={styles.formSection}>
                            {/* Name field for new users */}
                            {isNewUser && (
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputLabel}>Your Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your full name"
                                        placeholderTextColor="#94a3b8"
                                        value={displayName}
                                        onChangeText={setDisplayName}
                                        autoCapitalize="words"
                                        autoCorrect={false}
                                        editable={!loading}
                                    />
                                </View>
                            )}

                            {/* Password field */}
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>Password</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder={isNewUser ? 'Create a password' : 'Enter your password'}
                                        placeholderTextColor="#94a3b8"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        editable={!loading}
                                    />
                                    <Pressable
                                        style={styles.eyeButton}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <Ionicons
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={22}
                                            color="#64748b"
                                        />
                                    </Pressable>
                                </View>
                            </View>

                            {/* Confirm password for new users */}
                            {isNewUser && (
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputLabel}>Confirm Password</Text>
                                    <View style={styles.passwordContainer}>
                                        <TextInput
                                            style={styles.passwordInput}
                                            placeholder="Confirm your password"
                                            placeholderTextColor="#94a3b8"
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showPassword}
                                            editable={!loading}
                                        />
                                    </View>
                                </View>
                            )}

                            {/* Forgot Password (for existing users) */}
                            {!isNewUser && (
                                <Pressable style={styles.forgotPassword}>
                                    <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                                </Pressable>
                            )}
                        </View>

                        {/* Submit Button */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.submitButton,
                                pressed && styles.submitButtonPressed,
                                loading && styles.submitButtonDisabled,
                            ]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    {isNewUser ? 'Create Account' : 'Sign In'}
                                </Text>
                            )}
                        </Pressable>

                        {/* Password Requirements for new users */}
                        {isNewUser && (
                            <View style={styles.requirements}>
                                <Text style={styles.requirementsTitle}>Password must:</Text>
                                <View style={styles.requirementItem}>
                                    <Ionicons
                                        name={password.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={16}
                                        color={password.length >= 6 ? '#22c55e' : '#94a3b8'}
                                    />
                                    <Text
                                        style={[
                                            styles.requirementText,
                                            password.length >= 6 && styles.requirementMet,
                                        ]}
                                    >
                                        Be at least 6 characters
                                    </Text>
                                </View>
                                <View style={styles.requirementItem}>
                                    <Ionicons
                                        name={password === confirmPassword && password.length > 0 ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={16}
                                        color={password === confirmPassword && password.length > 0 ? '#22c55e' : '#94a3b8'}
                                    />
                                    <Text
                                        style={[
                                            styles.requirementText,
                                            password === confirmPassword && password.length > 0 && styles.requirementMet,
                                        ]}
                                    >
                                        Passwords match
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logoGradient: {
        width: 72,
        height: 72,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: BRAND_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    titleContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
    },
    emailDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 14,
        marginBottom: 24,
        gap: 10,
    },
    emailText: {
        flex: 1,
        fontSize: 14,
        color: '#334155',
    },
    changeText: {
        fontSize: 14,
        color: BRAND_COLOR,
        fontWeight: '500',
    },
    formSection: {
        marginBottom: 20,
    },
    inputWrapper: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#334155',
        marginBottom: 8,
    },
    input: {
        height: 52,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#1e293b',
        backgroundColor: '#fff',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        backgroundColor: '#fff',
    },
    passwordInput: {
        flex: 1,
        height: 52,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#1e293b',
    },
    eyeButton: {
        paddingHorizontal: 14,
        height: 52,
        justifyContent: 'center',
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    forgotPasswordText: {
        fontSize: 14,
        color: BRAND_COLOR,
        fontWeight: '500',
    },
    submitButton: {
        height: 52,
        backgroundColor: BRAND_COLOR,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: BRAND_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonPressed: {
        backgroundColor: BRAND_COLOR_DARK,
        transform: [{ scale: 0.98 }],
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    requirements: {
        marginTop: 20,
        padding: 16,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
    },
    requirementsTitle: {
        fontSize: 13,
        fontWeight: '500',
        color: '#64748b',
        marginBottom: 10,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    requirementText: {
        fontSize: 13,
        color: '#94a3b8',
    },
    requirementMet: {
        color: '#22c55e',
    },
});