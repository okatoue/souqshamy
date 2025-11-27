import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BORDER_RADIUS, BRAND_COLOR, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useProfile } from '@/hooks/userProfile';
import { Ionicons } from '@expo/vector-icons';
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

export default function PersonalDetailsScreen() {
    const { profile, isLoading, updateProfile } = useProfile();

    // Local state for form fields
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Theme colors
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const inputBackground = useThemeColor({ light: '#f5f5f5', dark: '#1c1c1e' }, 'background');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'border');
    const labelColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');
    const disabledBg = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');

    // Initialize form fields when profile loads
    useEffect(() => {
        if (profile) {
            setDisplayName(profile.display_name || '');
            setEmail(profile.email || '');
            setPhoneNumber(profile.phone_number || '');
        }
    }, [profile]);

    // Check for changes
    useEffect(() => {
        if (profile) {
            const nameChanged = displayName !== (profile.display_name || '');
            const phoneChanged = phoneNumber !== (profile.phone_number || '');
            setHasChanges(nameChanged || phoneChanged);
        }
    }, [displayName, phoneNumber, profile]);

    const handleBack = () => {
        if (hasChanges) {
            Alert.alert(
                'Unsaved Changes',
                'You have unsaved changes. Are you sure you want to go back?',
                [
                    { text: 'Stay', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: () => router.back() },
                ]
            );
        } else {
            router.back();
        }
    };

    const handleSave = async () => {
        if (!hasChanges) return;

        setIsSaving(true);
        try {
            const success = await updateProfile({
                display_name: displayName.trim() || null,
                phone_number: phoneNumber.trim() || null,
            });

            if (success) {
                Alert.alert('Success', 'Your profile has been updated.', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            } else {
                Alert.alert('Error', 'Failed to update profile. Please try again.');
            }
        } catch (error) {
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={BRAND_COLOR} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: borderColor }]}>
                    <Pressable onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={iconColor} />
                    </Pressable>
                    <ThemedText type="title" style={styles.headerTitle}>
                        Personal Details
                    </ThemedText>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Form Fields */}
                    <ThemedView style={styles.formContainer}>
                        {/* Display Name */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: labelColor }]}>
                                Display Name
                            </Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        backgroundColor: inputBackground,
                                        borderColor: borderColor,
                                        color: displayName ? textColor : COLORS.muted,
                                    },
                                ]}
                                value={displayName}
                                onChangeText={setDisplayName}
                                placeholder="Enter your name"
                                placeholderTextColor={COLORS.placeholder}
                                autoCapitalize="words"
                                autoCorrect={false}
                            />
                        </View>

                        {/* Email (Read-only) */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: labelColor }]}>
                                Email
                            </Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={[
                                        styles.input,
                                        styles.disabledInput,
                                        {
                                            backgroundColor: disabledBg,
                                            borderColor: borderColor,
                                            color: COLORS.muted,
                                        },
                                    ]}
                                    value={email}
                                    editable={false}
                                    placeholder="No email set"
                                    placeholderTextColor={COLORS.placeholder}
                                />
                                <View style={styles.lockIconContainer}>
                                    <Ionicons name="lock-closed" size={16} color={COLORS.muted} />
                                </View>
                            </View>
                            <Text style={[styles.helperText, { color: labelColor }]}>
                                Email cannot be changed here for security reasons.
                            </Text>
                        </View>

                        {/* Phone Number */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: labelColor }]}>
                                Phone Number
                            </Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        backgroundColor: inputBackground,
                                        borderColor: borderColor,
                                        color: phoneNumber ? textColor : COLORS.muted,
                                    },
                                ]}
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                placeholder="Enter your phone number"
                                placeholderTextColor={COLORS.placeholder}
                                keyboardType="phone-pad"
                                autoCorrect={false}
                            />
                        </View>
                    </ThemedView>
                </ScrollView>

                {/* Save Button */}
                <View style={[styles.footer, { borderTopColor: borderColor }]}>
                    <Pressable
                        style={[
                            styles.saveButton,
                            !hasChanges && styles.saveButtonDisabled,
                        ]}
                        onPress={handleSave}
                        disabled={!hasChanges || isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        padding: SPACING.xs,
        marginLeft: -SPACING.xs,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 20,
    },
    headerSpacer: {
        width: 28 + SPACING.xs * 2, // Same width as back button for centering
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    formContainer: {
        gap: SPACING.xl,
    },
    inputGroup: {
        gap: SPACING.sm,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: SPACING.xs,
    },
    inputWrapper: {
        position: 'relative',
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.lg,
        fontSize: 16,
    },
    disabledInput: {
        paddingRight: 44, // Space for lock icon
    },
    lockIconContainer: {
        position: 'absolute',
        right: SPACING.lg,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
    },
    helperText: {
        fontSize: 12,
        marginLeft: SPACING.xs,
        marginTop: SPACING.xs,
    },
    footer: {
        padding: SPACING.lg,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    saveButton: {
        backgroundColor: BRAND_COLOR,
        height: 50,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
