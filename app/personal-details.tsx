import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackButton } from '@/components/ui/BackButton';
import { BORDER_RADIUS, BRAND_COLOR, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useProfile } from '@/hooks/userProfile';
import { useAuth } from '@/lib/auth_context';
import { deleteAvatar, uploadAvatar } from '@/lib/avatarUpload';
import { useRTL } from '@/lib/rtl_context';
import { rtlRow, rtlTextAlign } from '@/lib/rtlStyles';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Image,
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
    const { t } = useTranslation();
    const { isRTL } = useRTL();
    const { user } = useAuth();
    const { profile, isLoading, updateProfile } = useProfile();

    // Local state for form fields
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Avatar state
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

    // Track whether form has been initialized to prevent overwriting user input on background refreshes
    const hasInitialized = useRef(false);

    // Theme colors
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const iconColor = useThemeColor({}, 'icon');
    const inputBackground = useThemeColor({ light: '#f5f5f5', dark: '#1c1c1e' }, 'background');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'border');
    const labelColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');
    const disabledBg = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');

    // Initialize form fields when profile loads (only once to prevent overwriting user input)
    useEffect(() => {
        if (profile && !hasInitialized.current) {
            setDisplayName(profile.display_name || '');
            setEmail(profile.email || '');
            setPhoneNumber(profile.phone_number || '');
            hasInitialized.current = true;
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
                t('profile.unsavedChanges'),
                t('profile.unsavedChangesMessage'),
                [
                    { text: t('common.stay'), style: 'cancel' },
                    { text: t('common.discard'), style: 'destructive', onPress: () => router.back() },
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
                Alert.alert(t('alerts.success'), t('profile.profileUpdated'), [
                    { text: t('common.ok'), onPress: () => router.back() }
                ]);
            } else {
                Alert.alert(t('alerts.error'), t('profile.updateFailed'));
            }
        } catch (error) {
            Alert.alert(t('alerts.error'), t('errors.unexpected'));
        } finally {
            setIsSaving(false);
        }
    };

    const handlePickImage = async () => {
        if (!user) return;

        try {
            // Request permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    t('profile.permissionRequired'),
                    t('profile.photoLibraryPermission'),
                    [{ text: t('common.ok') }]
                );
                return;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (result.canceled || !result.assets[0]) {
                return;
            }

            const selectedImage = result.assets[0];
            setLocalAvatarUri(selectedImage.uri);
            setIsUploadingAvatar(true);

            try {
                // Upload to Supabase
                const publicUrl = await uploadAvatar(
                    selectedImage.uri,
                    user.id,
                    profile?.avatar_url
                );

                // Update profile with new avatar URL
                const success = await updateProfile({ avatar_url: publicUrl });

                if (success) {
                    setLocalAvatarUri(null); // Clear local URI, profile will have the new URL
                } else {
                    setLocalAvatarUri(null);
                    Alert.alert(t('alerts.error'), t('profile.avatarUpdateFailed'));
                }
            } catch (uploadError) {
                setLocalAvatarUri(null);
                const message = uploadError instanceof Error ? uploadError.message : t('profile.avatarUploadFailed');
                Alert.alert(t('profile.uploadFailed'), message);
            }
        } catch (error) {
            Alert.alert(t('alerts.error'), t('errors.unexpected'));
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleRemoveAvatar = () => {
        if (!profile?.avatar_url) return;

        Alert.alert(
            t('profile.removePhoto'),
            t('profile.removePhotoConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.remove'),
                    style: 'destructive',
                    onPress: async () => {
                        setIsUploadingAvatar(true);
                        try {
                            // Delete from storage
                            await deleteAvatar(profile.avatar_url!);

                            // Update profile to remove avatar URL
                            const success = await updateProfile({ avatar_url: null });

                            if (!success) {
                                Alert.alert(t('alerts.error'), t('profile.updateFailed'));
                            }
                        } catch (error) {
                            Alert.alert(t('alerts.error'), t('profile.removePhotoFailed'));
                        } finally {
                            setIsUploadingAvatar(false);
                        }
                    },
                },
            ]
        );
    };

    // Get the current avatar to display
    const currentAvatarUri = localAvatarUri || profile?.avatar_url;

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
                <View style={[styles.header, rtlRow(isRTL), { borderBottomColor: borderColor }]}>
                    <BackButton onPress={handleBack} />
                    <ThemedText type="title" style={styles.headerTitle}>
                        {t('profile.personalDetails')}
                    </ThemedText>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        <Pressable
                            style={styles.avatarContainer}
                            onPress={handlePickImage}
                            disabled={isUploadingAvatar}
                        >
                            {currentAvatarUri ? (
                                <Image
                                    source={{ uri: currentAvatarUri }}
                                    style={styles.avatarImage}
                                />
                            ) : (
                                <View style={[styles.avatarPlaceholder, { backgroundColor: inputBackground }]}>
                                    <MaterialCommunityIcons
                                        name="account-circle"
                                        size={100}
                                        color={iconColor}
                                    />
                                </View>
                            )}
                            {isUploadingAvatar && (
                                <View style={styles.avatarLoadingOverlay}>
                                    <ActivityIndicator size="large" color="white" />
                                </View>
                            )}
                            <View style={[styles.cameraButton, { backgroundColor: BRAND_COLOR }]}>
                                <Ionicons name="camera" size={16} color="white" />
                            </View>
                        </Pressable>
                        <Pressable
                            style={styles.changePhotoButton}
                            onPress={handlePickImage}
                            disabled={isUploadingAvatar}
                        >
                            <Text style={[styles.changePhotoText, { color: BRAND_COLOR }]}>
                                {t('profile.changePhoto')}
                            </Text>
                        </Pressable>
                        {profile?.avatar_url && !localAvatarUri && (
                            <Pressable
                                style={styles.removePhotoButton}
                                onPress={handleRemoveAvatar}
                                disabled={isUploadingAvatar}
                            >
                                <Text style={styles.removePhotoText}>
                                    {t('profile.removePhoto')}
                                </Text>
                            </Pressable>
                        )}
                    </View>

                    {/* Form Fields */}
                    <ThemedView style={styles.formContainer}>
                        {/* Display Name */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, rtlTextAlign(isRTL), { color: labelColor }]}>
                                {t('profile.displayName')}
                            </Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    rtlTextAlign(isRTL),
                                    {
                                        backgroundColor: inputBackground,
                                        borderColor: borderColor,
                                        color: displayName ? textColor : COLORS.muted,
                                    },
                                ]}
                                value={displayName}
                                onChangeText={setDisplayName}
                                placeholder={t('profile.enterName')}
                                placeholderTextColor={COLORS.placeholder}
                                autoCapitalize="words"
                                autoCorrect={false}
                            />
                        </View>

                        {/* Email (Read-only) */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, rtlTextAlign(isRTL), { color: labelColor }]}>
                                {t('auth.emailLabel')}
                            </Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={[
                                        styles.input,
                                        styles.disabledInput,
                                        rtlTextAlign(isRTL),
                                        {
                                            backgroundColor: disabledBg,
                                            borderColor: borderColor,
                                            color: COLORS.muted,
                                        },
                                    ]}
                                    value={email}
                                    editable={false}
                                    placeholder={t('profile.noEmailSet')}
                                    placeholderTextColor={COLORS.placeholder}
                                />
                                <View style={[styles.lockIconContainer, { [isRTL ? 'left' : 'right']: SPACING.lg }]}>
                                    <Ionicons name="lock-closed" size={16} color={COLORS.muted} />
                                </View>
                            </View>
                            <Text style={[styles.helperText, rtlTextAlign(isRTL), { color: labelColor }]}>
                                {t('profile.emailSecurityNote')}
                            </Text>
                        </View>

                        {/* Phone Number */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, rtlTextAlign(isRTL), { color: labelColor }]}>
                                {t('profile.phoneNumber')}
                            </Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    rtlTextAlign(isRTL),
                                    {
                                        backgroundColor: inputBackground,
                                        borderColor: borderColor,
                                        color: phoneNumber ? textColor : COLORS.muted,
                                    },
                                ]}
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                placeholder={t('profile.enterPhone')}
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
                            <Text style={styles.saveButtonText}>{t('common.saveChanges')}</Text>
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
    // Avatar styles
    avatarSection: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    avatarContainer: {
        position: 'relative',
        width: 120,
        height: 120,
        marginBottom: SPACING.md,
    },
    avatarImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'white',
    },
    changePhotoButton: {
        paddingVertical: SPACING.sm,
    },
    changePhotoText: {
        fontSize: 16,
        fontWeight: '600',
    },
    removePhotoButton: {
        paddingVertical: SPACING.xs,
    },
    removePhotoText: {
        fontSize: 14,
        color: '#FF3B30',
    },
});
