// app/(auth)/index.tsx
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
        if (/^\d/.test(value) && !value.startsWith('+963')) {
            value = '+963 ' + value;
        }
        setInputValue(value);
    };

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
                const cleanedPhone = emailOrPhone.replace(/[\s\-\(\)]/g, '');
                const { data } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('phone_number', cleanedPhone)
                    .maybeSingle();
                return !!data;
            } else {
                const { data } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', emailOrPhone)
                    .maybeSingle();
                return !!data;
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
                        <Text style={styles.title}>Log in or Sign up</Text>
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
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const GoogleIcon = () => (
    <View style={styles.iconContainer}>
        <View style={styles.googleIcon}>
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>G</Text>
        </View>
    </View>
);

const FacebookIcon = () => (
    <View style={[styles.iconContainer, { backgroundColor: '#1877F2', borderRadius: 4 }]}>
        <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>f</Text>
    </View>
);

const TelegramIcon = () => (
    <View style={[styles.iconContainer, { backgroundColor: '#0088cc', borderRadius: 10 }]}>
        <Ionicons name="paper-plane" size={12} color="white" />
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
        marginBottom: isSmallScreen ? 20 : 28,
    },
    title: {
        fontSize: isSmallScreen ? 22 : 26,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: isSmallScreen ? 13 : 14,
        color: '#64748b',
    },
    inputSection: {
        marginBottom: isSmallScreen ? 14 : 18,
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
    countryHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 6,
    },
    syriaFlag: {
        width: 18,
        height: 12,
        borderRadius: 2,
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: '#e2e8f0',
    },
    flagStripe: {
        flex: 1,
    },
    countryText: {
        fontSize: 11,
        color: '#64748b',
    },
    continueButton: {
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
    continueButtonPressed: {
        backgroundColor: BRAND_COLOR_DARK,
        transform: [{ scale: 0.98 }],
    },
    continueButtonDisabled: {
        opacity: 0.7,
    },
    continueButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: isSmallScreen ? 16 : 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e2e8f0',
    },
    dividerText: {
        marginHorizontal: 14,
        fontSize: 13,
        fontWeight: '500',
        color: '#94a3b8',
    },
    socialButtons: {
        gap: isSmallScreen ? 8 : 10,
    },
    socialButton: {
        height: isSmallScreen ? 44 : 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        backgroundColor: 'white',
        gap: 10,
    },
    socialButtonPressed: {
        backgroundColor: '#f8fafc',
    },
    socialButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#334155',
    },
    iconContainer: {
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    googleIcon: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        textAlign: 'center',
        fontSize: 11,
        color: '#94a3b8',
        marginTop: isSmallScreen ? 16 : 20,
        lineHeight: 16,
    },
    footerLink: {
        color: BRAND_COLOR,
    },
});