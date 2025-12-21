import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BORDER_RADIUS, BRAND_COLOR, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useProfile } from '@/hooks/userProfile';
import { useAuth } from '@/lib/auth_context';
import { deleteAvatar, uploadAvatar } from '@/lib/avatarUpload';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
    const { user } = useAuth();
    const { profile, isLoading, updateProfile } = useProfile();

    // Local state for form fields
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [bio, setBio] = useState('');
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
            setBio(profile.bio || '');
            hasInitialized.current = true;
        }
    }, [profile]);

    // Check for changes
    useEffect(() => {
        if (profile) {
            const nameChanged = displayName !== (profile.display_name || '');
            const phoneChanged = phoneNumber !== (profile.phone_number || '');
            const bioChanged = bio !== (profile.bio || '');
            setHasChanges(nameChanged || phoneChanged || bioChanged);
        }
    }, [displayName, phoneNumber, bio, profile]);

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
                bio: bio.trim() || null,
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

    const handlePickImage = async () => {
        if (!user) return;

        try {
            // Request permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please allow access to your photo library to upload a profile picture.',
                    [{ text: 'OK' }]
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
                    Alert.alert('Error', 'Failed to update profile with new avatar.');
                }
            } catch (uploadError) {
                setLocalAvatarUri(null);
                const message = uploadError instanceof Error ? uploadError.message : 'Failed to upload avatar';
                Alert.alert('Upload Failed', message);
            }
        } catch (error) {
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleRemoveAvatar = () => {
        if (!profile?.avatar_url) return;

        Alert.alert(
            'Remove Photo',
            'Are you sure you want to remove your profile photo?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        setIsUploadingAvatar(true);
                        try {
                            // Delete from storage
                            await deleteAvatar(profile.avatar_url!);

                            // Update profile to remove avatar URL
                            const success = await updateProfile({ avatar_url: null });

                            if (!success) {
                                Alert.alert('Error', 'Failed to update profile.');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to remove photo. Please try again.');
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
                                Change Photo
                            </Text>
                        </Pressable>
                        {profile?.avatar_url && !localAvatarUri && (
                            <Pressable
                                style={styles.removePhotoButton}
                                onPress={handleRemoveAvatar}
                                disabled={isUploadingAvatar}
                            >
                                <Text style={styles.removePhotoText}>
                                    Remove Photo
                                </Text>
                            </Pressable>
                        )}
                    </View>

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

                        {/* Bio */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: labelColor }]}>
                                Bio
                            </Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    styles.textArea,
                                    {
                                        backgroundColor: inputBackground,
                                        borderColor: borderColor,
                                        color: bio ? textColor : COLORS.muted,
                                    },
                                ]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Tell others about yourself..."
                                placeholderTextColor={COLORS.placeholder}
                                multiline
                                numberOfLines={4}
                                maxLength={500}
                                textAlignVertical="top"
                            />
                            <Text style={[styles.charCount, { color: labelColor }]}>
                                {bio.length}/500
                            </Text>
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
    textArea: {
        height: 100,
        paddingTop: SPACING.md,
        paddingBottom: SPACING.md,
    },
    charCount: {
        fontSize: 12,
        textAlign: 'right',
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
