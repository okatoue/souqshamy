// app/(auth)/password.tsx
import { useAuth } from '@/lib/auth_context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
                if (isPhone) {
                    const cleanedPhone = emailOrPhone.replace(/[\s\-\(\)]/g, '');
                    await signUp(undefined, password, cleanedPhone, displayName.trim());
                    Alert.alert(
                        'Account Created!',
                        'Your account has been created successfully.',
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

    const handleForgotPassword = () => {
        router.push({
            pathname: '/(auth)/forgot-password',
            params: {
                emailOrPhone: emailOrPhone,
                isPhone: isPhone ? 'true' : 'false',
            },
        });
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
                            <Ionicons name="cart-outline" size={isSmallScreen ? 28 : 36} color="white" />
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
                        <Text style={styles.emailText}>{emailOrPhone}</Text>
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
                            <Pressable style={styles.forgotPassword} onPress={handleForgotPassword}>
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
        marginBottom: isSmallScreen ? 16 : 20,
    },
    title: {
        fontSize: isSmallScreen ? 22 : 26,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: isSmallScreen ? 13 : 14,
        color: '#64748b',
        textAlign: 'center',
    },
    emailDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 14,
        marginBottom: isSmallScreen ? 16 : 20,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
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
        marginBottom: isSmallScreen ? 16 : 20,
    },
    inputWrapper: {
        marginBottom: isSmallScreen ? 12 : 16,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#334155',
        marginBottom: 6,
    },
    input: {
        height: isSmallScreen ? 46 : 50,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 14,
        fontSize: 15,
        color: '#1e293b',
        backgroundColor: '#fff',
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
    submitButtonPressed: {
        backgroundColor: BRAND_COLOR_DARK,
        transform: [{ scale: 0.98 }],
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
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
});