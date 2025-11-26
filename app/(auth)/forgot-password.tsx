// app/(auth)/forgot-password.tsx
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallScreen = SCREEN_HEIGHT < 700;

type Step = 'email' | 'code' | 'password' | 'success';

export default function ForgotPasswordScreen() {
    const params = useLocalSearchParams<{
        emailOrPhone: string;
        isPhone: string;
    }>();

    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState(params.isPhone === 'true' ? '' : params.emailOrPhone || '');
    const [code, setCode] = useState(['', '', '', '', '', '', '', '']);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Refs for OTP inputs
    const codeInputRefs = useRef<(TextInput | null)[]>([]);

    const isPhone = params.isPhone === 'true';

    const isValidEmail = (input: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(input);
    };

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
            // Use Supabase OTP for password recovery
            const { error } = await supabase.auth.signInWithOtp({
                email: trimmedEmail,
                options: {
                    shouldCreateUser: false, // Don't create new user if doesn't exist
                },
            });

            if (error) {
                // Handle "User not found" gracefully
                if (error.message.includes('User not found')) {
                    Alert.alert('Error', 'No account found with this email address');
                } else {
                    Alert.alert('Error', error.message);
                }
            } else {
                setStep('code');
            }
        } catch (error: any) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle OTP input
    const handleCodeChange = (text: string, index: number) => {
        // Only allow numbers
        const cleanText = text.replace(/[^0-9]/g, '');

        if (cleanText.length <= 1) {
            const newCode = [...code];
            newCode[index] = cleanText;
            setCode(newCode);

            // Auto-focus next input
            if (cleanText.length === 1 && index < 7) {
                codeInputRefs.current[index + 1]?.focus();
            }
        } else if (cleanText.length === 8) {
            // Handle paste of full code
            const newCode = cleanText.split('');
            setCode(newCode);
            codeInputRefs.current[7]?.focus();
        }
    };

    const handleCodeKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && code[index] === '' && index > 0) {
            codeInputRefs.current[index - 1]?.focus();
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
            // Set flag to prevent auto-redirect to main app
            await AsyncStorage.setItem('@password_reset_in_progress', 'true');

            const { error } = await supabase.auth.verifyOtp({
                email: email.trim(),
                token: fullCode,
                type: 'email',
            });

            if (error) {
                await AsyncStorage.removeItem('@password_reset_in_progress');
                Alert.alert('Error', 'Invalid or expired code. Please try again.');
                setCode(['', '', '', '', '', '', '', '']);
                codeInputRefs.current[0]?.focus();
            } else {
                setStep('password');
            }
        } catch (error: any) {
            await AsyncStorage.removeItem('@password_reset_in_progress');
            Alert.alert('Error', 'Something went wrong. Please try again.');
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
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) {
                Alert.alert('Error', error.message);
            } else {
                // Clear the flag
                await AsyncStorage.removeItem('@password_reset_in_progress');
                setStep('success');
            }
        } catch (error: any) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (step === 'email') {
            router.back();
        } else if (step === 'code') {
            setStep('email');
            setCode(['', '', '', '', '', '', '', '']);
        } else if (step === 'password') {
            // Can't go back from password step (already verified)
            Alert.alert(
                'Cancel Reset?',
                'Are you sure you want to cancel? You\'ll need to request a new code.',
                [
                    { text: 'Stay', style: 'cancel' },
                    {
                        text: 'Cancel',
                        style: 'destructive',
                        onPress: async () => {
                            await AsyncStorage.removeItem('@password_reset_in_progress');
                            await supabase.auth.signOut();
                            router.replace('/(auth)');
                        }
                    },
                ]
            );
        }
    };

    const handleBackToLogin = async () => {
        await AsyncStorage.removeItem('@password_reset_in_progress');
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
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>
                    <View style={styles.successIconContainer}>
                        <LinearGradient
                            colors={['#22c55e', '#16a34a']}
                            style={styles.statusIconGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="checkmark" size={40} color="white" />
                        </LinearGradient>
                    </View>

                    <Text style={styles.statusTitle}>Password Reset!</Text>
                    <Text style={styles.statusSubtitle}>
                        Your password has been successfully reset. You can now sign in with your new password.
                    </Text>

                    <Pressable
                        style={({ pressed }) => [
                            styles.primaryButton,
                            pressed && styles.primaryButtonPressed,
                        ]}
                        onPress={handleBackToLogin}
                    >
                        <Text style={styles.primaryButtonText}>Sign In</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

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
                    bounces={false}
                >
                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <LinearGradient
                            colors={[BRAND_COLOR, BRAND_COLOR_DARK]}
                            style={styles.logoGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons
                                name={step === 'password' ? 'lock-closed-outline' : 'key-outline'}
                                size={isSmallScreen ? 28 : 36}
                                color="white"
                            />
                        </LinearGradient>
                    </View>

                    {/* Step 1: Email Input */}
                    {step === 'email' && (
                        <>
                            <View style={styles.titleContainer}>
                                <Text style={styles.title}>Forgot Password?</Text>
                                <Text style={styles.subtitle}>
                                    Enter your email and we'll send you a verification code.
                                </Text>
                            </View>

                            {isPhone && (
                                <View style={styles.noticeBox}>
                                    <Ionicons name="information-circle-outline" size={20} color={BRAND_COLOR} />
                                    <Text style={styles.noticeText}>
                                        Password reset is only available via email. Please enter the email associated with your account.
                                    </Text>
                                </View>
                            )}

                            <View style={styles.inputSection}>
                                <Text style={styles.inputLabel}>Email Address</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your email address"
                                        placeholderTextColor="#94a3b8"
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={!loading}
                                    />
                                </View>
                            </View>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.primaryButton,
                                    pressed && styles.primaryButtonPressed,
                                    loading && styles.primaryButtonDisabled,
                                ]}
                                onPress={handleSendCode}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Send Code</Text>
                                )}
                            </Pressable>
                        </>
                    )}

                    {/* Step 2: Code Input */}
                    {step === 'code' && (
                        <>
                            <View style={styles.titleContainer}>
                                <Text style={styles.title}>Enter Code</Text>
                                <Text style={styles.subtitle}>
                                    We sent an 8-digit code to{'\n'}
                                    <Text style={styles.emailHighlight}>{email}</Text>
                                </Text>
                            </View>

                            <View style={styles.codeContainer}>
                                {code.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => (codeInputRefs.current[index] = ref)}
                                        style={[
                                            styles.codeInput,
                                            digit && styles.codeInputFilled,
                                        ]}
                                        value={digit}
                                        onChangeText={(text) => handleCodeChange(text, index)}
                                        onKeyPress={({ nativeEvent }) => handleCodeKeyPress(nativeEvent.key, index)}
                                        keyboardType="number-pad"
                                        maxLength={1}
                                        selectTextOnFocus
                                        editable={!loading}
                                    />
                                ))}
                            </View>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.primaryButton,
                                    pressed && styles.primaryButtonPressed,
                                    loading && styles.primaryButtonDisabled,
                                ]}
                                onPress={handleVerifyCode}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Verify Code</Text>
                                )}
                            </Pressable>

                            <Pressable style={styles.resendButton} onPress={handleResendCode} disabled={loading}>
                                <Text style={styles.resendButtonText}>Didn't receive the code? Resend</Text>
                            </Pressable>
                        </>
                    )}

                    {/* Step 3: New Password */}
                    {step === 'password' && (
                        <>
                            <View style={styles.titleContainer}>
                                <Text style={styles.title}>New Password</Text>
                                <Text style={styles.subtitle}>
                                    Create a strong password for your account.
                                </Text>
                            </View>

                            <View style={styles.formSection}>
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputLabel}>New Password</Text>
                                    <View style={styles.passwordContainer}>
                                        <TextInput
                                            style={styles.passwordInput}
                                            placeholder="Enter new password"
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

                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputLabel}>Confirm Password</Text>
                                    <View style={styles.passwordContainer}>
                                        <TextInput
                                            style={styles.passwordInput}
                                            placeholder="Confirm new password"
                                            placeholderTextColor="#94a3b8"
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showPassword}
                                            editable={!loading}
                                        />
                                    </View>
                                </View>
                            </View>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.primaryButton,
                                    pressed && styles.primaryButtonPressed,
                                    loading && styles.primaryButtonDisabled,
                                ]}
                                onPress={handleResetPassword}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Reset Password</Text>
                                )}
                            </Pressable>

                            {/* Password Requirements */}
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
                        </>
                    )}
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
    header: {
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: isSmallScreen ? 16 : 24,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: isSmallScreen ? 16 : 20,
    },
    logoGradient: {
        width: isSmallScreen ? 56 : 68,
        height: isSmallScreen ? 56 : 68,
        borderRadius: isSmallScreen ? 14 : 17,
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
        marginBottom: isSmallScreen ? 20 : 28,
    },
    title: {
        fontSize: isSmallScreen ? 22 : 26,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: isSmallScreen ? 13 : 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 20,
    },
    emailHighlight: {
        fontWeight: '600',
        color: '#334155',
    },
    noticeBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: `${BRAND_COLOR}10`,
        borderRadius: 12,
        padding: 14,
        marginBottom: isSmallScreen ? 16 : 20,
        gap: 10,
    },
    noticeText: {
        flex: 1,
        fontSize: 13,
        color: '#334155',
        lineHeight: 18,
    },
    inputSection: {
        marginBottom: isSmallScreen ? 20 : 24,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#334155',
        marginBottom: 6,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        backgroundColor: '#fff',
    },
    inputIcon: {
        paddingLeft: 14,
    },
    input: {
        flex: 1,
        height: isSmallScreen ? 46 : 50,
        paddingHorizontal: 10,
        fontSize: 15,
        color: '#1e293b',
    },
    // OTP Code Input
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginBottom: isSmallScreen ? 24 : 32,
    },
    codeInput: {
        width: isSmallScreen ? 38 : 42,
        height: isSmallScreen ? 48 : 54,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        backgroundColor: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1e293b',
    },
    codeInputFilled: {
        borderColor: BRAND_COLOR,
        backgroundColor: `${BRAND_COLOR}08`,
    },
    // Password Input
    formSection: {
        marginBottom: isSmallScreen ? 16 : 20,
    },
    inputWrapper: {
        marginBottom: isSmallScreen ? 12 : 16,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        backgroundColor: '#fff',
    },
    passwordInput: {
        flex: 1,
        height: isSmallScreen ? 46 : 50,
        paddingHorizontal: 14,
        fontSize: 15,
        color: '#1e293b',
    },
    eyeButton: {
        paddingHorizontal: 14,
        height: isSmallScreen ? 46 : 50,
        justifyContent: 'center',
    },
    // Buttons
    primaryButton: {
        height: isSmallScreen ? 46 : 50,
        backgroundColor: BRAND_COLOR,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: BRAND_COLOR,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
    },
    primaryButtonPressed: {
        backgroundColor: BRAND_COLOR_DARK,
        transform: [{ scale: 0.98 }],
    },
    primaryButtonDisabled: {
        opacity: 0.7,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    resendButton: {
        alignItems: 'center',
        marginTop: 16,
        padding: 12,
    },
    resendButtonText: {
        fontSize: 14,
        color: BRAND_COLOR,
        fontWeight: '500',
    },
    // Requirements
    requirements: {
        marginTop: isSmallScreen ? 16 : 20,
        padding: 14,
        backgroundColor: 'white',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    requirementsTitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748b',
        marginBottom: 8,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    requirementText: {
        fontSize: 12,
        color: '#94a3b8',
    },
    requirementMet: {
        color: '#22c55e',
    },
    // Success state
    successIconContainer: {
        marginBottom: 24,
    },
    statusIconGradient: {
        width: 80,
        height: 80,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    statusTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
    },
    statusSubtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 16,
        lineHeight: 20,
    },
});