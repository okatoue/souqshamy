// app/(auth)/index.tsx
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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

export default function AuthScreen() {
    const [inputValue, setInputValue] = useState('');
    const [isPhoneNumber, setIsPhoneNumber] = useState(false);
    const [loading, setLoading] = useState(false);

    // Detect if input is phone number
    useEffect(() => {
        const valueWithoutPrefix = inputValue.replace(/^\+963\s?/, '');
        const startsWithNumber = /^\d/.test(valueWithoutPrefix);
        const isNumericOnly = /^[\d\s+]+$/.test(inputValue) && inputValue.length > 0;
        setIsPhoneNumber(isNumericOnly || startsWithNumber);
    }, [inputValue]);

    const handleInputChange = (value: string) => {
        // If user starts typing a number and we don't have the prefix yet
        if (/^\d/.test(value) && !value.startsWith('+963')) {
            value = '+963 ' + value;
        }
        setInputValue(value);
    };

    // Helper functions
    const isEmail = (input: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(input);
    };

    const isValidPhoneNumber = (input: string) => {
        const cleaned = input.replace(/[\s\-\(\)]/g, '');
        const phoneRegex = /^\+?\d{7,15}$/;
        return phoneRegex.test(cleaned);
    };

    const checkUserExists = async (emailOrPhone: string, isPhone: boolean): Promise<boolean> => {
        try {
            if (isPhone) {
                // For phone, check with placeholder email format
                const cleanedPhone = emailOrPhone.replace(/[\s\-\(\)]/g, '');
                const placeholderEmail = `${cleanedPhone}@phone.local`;

                // Try to sign in with a wrong password to check if user exists
                const { error } = await supabase.auth.signInWithPassword({
                    email: placeholderEmail,
                    password: 'check_user_exists_dummy_password_12345',
                });

                // If error is "Invalid login credentials", user exists
                return error?.message?.includes('Invalid login credentials') ?? false;
            } else {
                // For email, same approach
                const { error } = await supabase.auth.signInWithPassword({
                    email: emailOrPhone,
                    password: 'check_user_exists_dummy_password_12345',
                });

                return error?.message?.includes('Invalid login credentials') ?? false;
            }
        } catch (error) {
            console.error('Error checking user existence:', error);
            return false;
        }
    };

    const handleContinue = async () => {
        const trimmedInput = inputValue.trim();

        if (!trimmedInput) {
            Alert.alert('Error', 'Please enter your email or phone number');
            return;
        }

        const isValidEmail = isEmail(trimmedInput);
        const isValidPhone = isValidPhoneNumber(trimmedInput);

        if (!isValidEmail && !isValidPhone) {
            Alert.alert('Error', 'Please enter a valid email address or phone number');
            return;
        }

        setLoading(true);

        try {
            const userExists = await checkUserExists(trimmedInput, isValidPhone);

            // Navigate to password screen with context
            router.push({
                pathname: '/(auth)/password',
                params: {
                    emailOrPhone: trimmedInput,
                    isPhone: isValidPhone ? 'true' : 'false',
                    isNewUser: userExists ? 'false' : 'true',
                },
            });
        } catch (error) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSocialAuth = (provider: string) => {
        Alert.alert('Coming Soon', `${provider} login will be available soon!`);
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
                            <Text style={styles.title}>Log in or Sign up</Text>
                            <Text style={styles.subtitle}>Welcome to 3ANTAR Marketplace</Text>
                        </View>

                        {/* Input Section */}
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>Email or Mobile Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email or phone number"
                                placeholderTextColor="#94a3b8"
                                value={inputValue}
                                onChangeText={handleInputChange}
                                keyboardType={isPhoneNumber ? 'phone-pad' : 'email-address'}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                            />
                            {isPhoneNumber && (
                                <View style={styles.countryHint}>
                                    <View style={styles.syriaFlag}>
                                        <View style={[styles.flagStripe, { backgroundColor: '#CE1126' }]} />
                                        <View style={[styles.flagStripe, { backgroundColor: '#FFFFFF' }]} />
                                        <View style={[styles.flagStripe, { backgroundColor: '#000000' }]} />
                                    </View>
                                    <Text style={styles.countryText}>Syria (+963)</Text>
                                </View>
                            )}
                        </View>

                        {/* Continue Button */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.continueButton,
                                pressed && styles.continueButtonPressed,
                                loading && styles.continueButtonDisabled,
                            ]}
                            onPress={handleContinue}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.continueButtonText}>Continue</Text>
                            )}
                        </Pressable>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Social Auth Buttons */}
                        <View style={styles.socialButtons}>
                            {/* Google */}
                            <Pressable
                                style={({ pressed }) => [
                                    styles.socialButton,
                                    pressed && styles.socialButtonPressed,
                                ]}
                                onPress={() => handleSocialAuth('Google')}
                            >
                                <GoogleIcon />
                                <Text style={styles.socialButtonText}>Continue with Google</Text>
                            </Pressable>

                            {/* Facebook */}
                            <Pressable
                                style={({ pressed }) => [
                                    styles.socialButton,
                                    pressed && styles.socialButtonPressed,
                                ]}
                                onPress={() => handleSocialAuth('Facebook')}
                            >
                                <FacebookIcon />
                                <Text style={styles.socialButtonText}>Continue with Facebook</Text>
                            </Pressable>

                            {/* Telegram */}
                            <Pressable
                                style={({ pressed }) => [
                                    styles.socialButton,
                                    pressed && styles.socialButtonPressed,
                                ]}
                                onPress={() => handleSocialAuth('Telegram')}
                            >
                                <TelegramIcon />
                                <Text style={styles.socialButtonText}>Log in with Telegram</Text>
                            </Pressable>
                        </View>

                        {/* Footer */}
                        <Text style={styles.footer}>
                            By continuing, you agree to our{' '}
                            <Text style={styles.footerLink}>Terms of Service</Text>
                            {' '}and{' '}
                            <Text style={styles.footerLink}>Privacy Policy</Text>
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// SVG Icons as components
const GoogleIcon = () => (
    <View style={styles.iconContainer}>
        <View style={styles.googleIcon}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>G</Text>
        </View>
    </View>
);

const FacebookIcon = () => (
    <View style={[styles.iconContainer, { backgroundColor: '#1877F2', borderRadius: 4 }]}>
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>f</Text>
    </View>
);

const TelegramIcon = () => (
    <View style={[styles.iconContainer, { backgroundColor: '#0088cc', borderRadius: 12 }]}>
        <Ionicons name="paper-plane" size={14} color="white" />
    </View>
);

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
        justifyContent: 'center',
        padding: 16,
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
        marginBottom: 28,
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
    },
    inputSection: {
        marginBottom: 20,
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
    countryHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 6,
    },
    syriaFlag: {
        width: 20,
        height: 14,
        borderRadius: 2,
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: '#e2e8f0',
    },
    flagStripe: {
        flex: 1,
    },
    countryText: {
        fontSize: 12,
        color: '#64748b',
    },
    continueButton: {
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
    continueButtonPressed: {
        backgroundColor: BRAND_COLOR_DARK,
        transform: [{ scale: 0.98 }],
    },
    continueButtonDisabled: {
        opacity: 0.7,
    },
    continueButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e2e8f0',
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 14,
        fontWeight: '500',
        color: '#94a3b8',
    },
    socialButtons: {
        gap: 12,
    },
    socialButton: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        backgroundColor: 'white',
        gap: 12,
    },
    socialButtonPressed: {
        backgroundColor: '#f8fafc',
    },
    socialButtonText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#334155',
    },
    iconContainer: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    googleIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        textAlign: 'center',
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 24,
        lineHeight: 18,
    },
    footerLink: {
        color: BRAND_COLOR,
    },
});