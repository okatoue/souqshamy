import { SettingsMenuItem, SettingsSection } from '@/components/settings';
import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/ui/BackButton';
import { BORDER_RADIUS, BRAND_COLOR, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getProviderDisplayName, isOAuthOnlyUser, OAuthProvider } from '@/lib/auth-utils';
import { useAuth } from '@/lib/auth_context';
import { exportUserData, shareExportedData } from '@/lib/dataExport';
import { useRTL } from '@/lib/rtl_context';
import { rtlRow } from '@/lib/rtlStyles';
import { supabase } from '@/lib/supabase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ManageAccountScreen() {
    const { t } = useTranslation();
    const { isRTL } = useRTL();
    const { user, signOut } = useAuth();
    const backgroundColor = useThemeColor({}, 'background');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'border');
    const iconColor = useThemeColor({}, 'icon');
    const inputBackground = useThemeColor({ light: '#f5f5f5', dark: '#1c1c1e' }, 'background');
    const textColor = useThemeColor({}, 'text');
    const labelColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');
    const modalBackground = useThemeColor({ light: '#fff', dark: '#1c1c1e' }, 'background');

    // Change Password state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Delete Account state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeletePassword, setShowDeletePassword] = useState(false);
    const [confirmationPhrase, setConfirmationPhrase] = useState('');

    // OAuth user detection state - uses shared utility for consistent detection
    const [isOAuthUser, setIsOAuthUser] = useState(false);
    const [oauthProvider, setOAuthProvider] = useState<OAuthProvider | undefined>(undefined);

    // Data export state
    const [isExporting, setIsExporting] = useState(false);

    // Check if user signed in via OAuth (no password) using shared utility
    useEffect(() => {
        const checkOAuthStatus = async () => {
            if (user?.email) {
                const { isOAuthOnly, provider } = await isOAuthOnlyUser(user.email);
                setIsOAuthUser(isOAuthOnly);
                setOAuthProvider(provider);
            }
        };
        checkOAuthStatus();
    }, [user?.email]);

    const resetPasswordForm = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    const resetDeleteForm = () => {
        setDeletePassword('');
        setShowDeletePassword(false);
        setConfirmationPhrase('');
    };

    const handleChangePassword = () => {
        if (isOAuthUser) {
            Alert.alert(
                'Cannot Change Password',
                'You signed in with Google or Facebook. To set a password, please use the "Forgot Password" option on the login screen.',
                [{ text: 'OK' }]
            );
            return;
        }
        setShowPasswordModal(true);
    };

    const handleSubmitPasswordChange = async () => {
        // Validation
        if (!currentPassword) {
            Alert.alert('Error', 'Please enter your current password.');
            return;
        }
        if (!newPassword) {
            Alert.alert('Error', 'Please enter a new password.');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Error', 'New password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match.');
            return;
        }

        setIsChangingPassword(true);

        try {
            // Verify current password first (re-authenticate)
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user?.email || '',
                password: currentPassword,
            });

            if (signInError) {
                Alert.alert('Error', 'Current password is incorrect.');
                setIsChangingPassword(false);
                return;
            }

            // Update to new password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                Alert.alert('Error', updateError.message);
            } else {
                Alert.alert('Success', 'Your password has been updated.', [
                    {
                        text: 'OK',
                        onPress: () => {
                            setShowPasswordModal(false);
                            resetPasswordForm();
                        },
                    },
                ]);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'An unexpected error occurred.');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone. All your listings, messages, and data will be permanently deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => setShowDeleteModal(true),
                },
            ]
        );
    };

    const handleExportData = async () => {
        if (!user?.id) return;

        setIsExporting(true);
        try {
            const filePath = await exportUserData(user.id);
            await shareExportedData(filePath);
        } catch (error: any) {
            Alert.alert(
                'Export Failed',
                error.message || 'Failed to export your data. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsExporting(false);
        }
    };

    const handleConfirmDelete = async () => {
        // Different validation for OAuth vs password users
        if (isOAuthUser) {
            // OAuth users must type "DELETE" to confirm
            if (confirmationPhrase !== 'DELETE') {
                Alert.alert('Error', 'Please type DELETE to confirm account deletion.');
                return;
            }
        } else {
            // Password users must enter their password
            if (!deletePassword) {
                Alert.alert('Error', 'Please enter your password to confirm deletion.');
                return;
            }
        }

        setIsDeleting(true);

        try {
            // For password users, verify password first
            if (!isOAuthUser) {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: user?.email || '',
                    password: deletePassword,
                });

                if (signInError) {
                    Alert.alert('Error', 'Password is incorrect.');
                    setIsDeleting(false);
                    return;
                }
            }

            // Proceed with account deletion (soft delete)
            const { error: deleteError } = await supabase
                .from('profiles')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', user?.id);

            if (deleteError) {
                Alert.alert('Error', deleteError.message || 'Failed to delete account. Please try again.');
                setIsDeleting(false);
                return;
            }

            // Also deactivate all user's listings
            await supabase
                .from('listings')
                .update({ status: 'deleted' })
                .eq('user_id', user?.id);

            // Sign out and redirect to auth
            await signOut();
            router.replace('/(auth)');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'An unexpected error occurred.');
            setIsDeleting(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                {/* Header */}
                <View style={[styles.header, rtlRow(isRTL), { borderBottomColor: borderColor }]}>
                    <BackButton />
                    <ThemedText type="title" style={styles.headerTitle}>
                        {t('settings.manageAccount')}
                    </ThemedText>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Security Section */}
                    <SettingsSection title={t('settings.security')}>
                        <SettingsMenuItem
                            icon="lock-closed-outline"
                            title={t('settings.changePassword')}
                            subtitle={isOAuthUser ? t('settings.notAvailableSocial') : t('settings.changePasswordSubtitle')}
                            onPress={handleChangePassword}
                            disabled={isOAuthUser}
                        />
                    </SettingsSection>

                    {/* Your Data Section */}
                    <SettingsSection title={t('settings.yourData')}>
                        <SettingsMenuItem
                            icon="download-outline"
                            title={t('settings.exportData')}
                            subtitle={t('settings.exportDataSubtitle')}
                            onPress={handleExportData}
                            disabled={isExporting}
                            rightElement={isExporting ? <ActivityIndicator size="small" color={BRAND_COLOR} /> : undefined}
                        />
                    </SettingsSection>

                    {/* Danger Zone Section */}
                    <SettingsSection title={t('settings.dangerZone')}>
                        <SettingsMenuItem
                            icon="trash-outline"
                            title={t('settings.deleteAccount')}
                            subtitle={t('settings.deleteAccountSubtitle')}
                            onPress={handleDeleteAccount}
                            showArrow={false}
                            destructive
                        />
                    </SettingsSection>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Change Password Modal */}
            <Modal
                visible={showPasswordModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => {
                    setShowPasswordModal(false);
                    resetPasswordForm();
                }}
            >
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: modalBackground }]}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardView}
                    >
                        {/* Modal Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                            <Pressable
                                onPress={() => {
                                    setShowPasswordModal(false);
                                    resetPasswordForm();
                                }}
                                style={styles.modalCloseButton}
                            >
                                <Text style={[styles.modalCloseText, { color: BRAND_COLOR }]}>Cancel</Text>
                            </Pressable>
                            <ThemedText type="defaultSemiBold" style={styles.modalTitle}>
                                Change Password
                            </ThemedText>
                            <View style={styles.modalHeaderSpacer} />
                        </View>

                        <ScrollView
                            style={styles.modalScrollView}
                            contentContainerStyle={styles.modalScrollContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Current Password */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: labelColor }]}>
                                    Current Password
                                </Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            {
                                                backgroundColor: inputBackground,
                                                borderColor: borderColor,
                                                color: textColor,
                                            },
                                        ]}
                                        value={currentPassword}
                                        onChangeText={setCurrentPassword}
                                        placeholder="Enter current password"
                                        placeholderTextColor={COLORS.placeholder}
                                        secureTextEntry={!showCurrentPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <Pressable
                                        style={styles.eyeIconContainer}
                                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                                    >
                                        <Ionicons
                                            name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={COLORS.muted}
                                        />
                                    </Pressable>
                                </View>
                            </View>

                            {/* New Password */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: labelColor }]}>
                                    New Password
                                </Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            {
                                                backgroundColor: inputBackground,
                                                borderColor: borderColor,
                                                color: textColor,
                                            },
                                        ]}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        placeholder="Enter new password"
                                        placeholderTextColor={COLORS.placeholder}
                                        secureTextEntry={!showNewPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <Pressable
                                        style={styles.eyeIconContainer}
                                        onPress={() => setShowNewPassword(!showNewPassword)}
                                    >
                                        <Ionicons
                                            name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={COLORS.muted}
                                        />
                                    </Pressable>
                                </View>
                                <Text style={[styles.helperText, { color: labelColor }]}>
                                    Password must be at least 6 characters
                                </Text>
                            </View>

                            {/* Confirm New Password */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: labelColor }]}>
                                    Confirm New Password
                                </Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            {
                                                backgroundColor: inputBackground,
                                                borderColor: borderColor,
                                                color: textColor,
                                            },
                                        ]}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        placeholder="Confirm new password"
                                        placeholderTextColor={COLORS.placeholder}
                                        secureTextEntry={!showConfirmPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <Pressable
                                        style={styles.eyeIconContainer}
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        <Ionicons
                                            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={COLORS.muted}
                                        />
                                    </Pressable>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Submit Button */}
                        <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
                            <Pressable
                                style={[
                                    styles.submitButton,
                                    (!currentPassword || !newPassword || !confirmPassword) && styles.submitButtonDisabled,
                                ]}
                                onPress={handleSubmitPasswordChange}
                                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                            >
                                {isChangingPassword ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Update Password</Text>
                                )}
                            </Pressable>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>

            {/* Delete Account Modal */}
            <Modal
                visible={showDeleteModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => {
                    setShowDeleteModal(false);
                    resetDeleteForm();
                }}
            >
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: modalBackground }]}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardView}
                    >
                        {/* Modal Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                            <Pressable
                                onPress={() => {
                                    setShowDeleteModal(false);
                                    resetDeleteForm();
                                }}
                                style={styles.modalCloseButton}
                            >
                                <Text style={[styles.modalCloseText, { color: BRAND_COLOR }]}>Cancel</Text>
                            </Pressable>
                            <ThemedText type="defaultSemiBold" style={styles.modalTitle}>
                                Delete Account
                            </ThemedText>
                            <View style={styles.modalHeaderSpacer} />
                        </View>

                        <ScrollView
                            style={styles.modalScrollView}
                            contentContainerStyle={styles.modalScrollContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Warning */}
                            <View style={styles.warningContainer}>
                                <MaterialIcons name="warning" size={48} color="#FF3B30" />
                                <Text style={[styles.warningTitle, { color: textColor }]}>
                                    This action is permanent
                                </Text>
                                <Text style={[styles.warningText, { color: labelColor }]}>
                                    Once you delete your account, all your data including listings, messages,
                                    and profile information will be permanently removed and cannot be recovered.
                                </Text>
                            </View>

                            {isOAuthUser ? (
                                /* OAuth User: Type DELETE to confirm */
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: labelColor }]}>
                                        You signed in with {getProviderDisplayName(oauthProvider)}. Type{' '}
                                        <Text style={{ fontWeight: '700', color: '#FF3B30' }}>DELETE</Text>
                                        {' '}to confirm account deletion.
                                    </Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                {
                                                    backgroundColor: inputBackground,
                                                    borderColor: confirmationPhrase === 'DELETE' ? '#FF3B30' : borderColor,
                                                    color: textColor,
                                                },
                                            ]}
                                            value={confirmationPhrase}
                                            onChangeText={setConfirmationPhrase}
                                            placeholder="Type DELETE"
                                            placeholderTextColor={COLORS.placeholder}
                                            autoCapitalize="characters"
                                            autoCorrect={false}
                                        />
                                    </View>
                                    {confirmationPhrase.length > 0 && confirmationPhrase !== 'DELETE' && (
                                        <Text style={[styles.helperText, { color: '#FF3B30' }]}>
                                            Please type DELETE exactly as shown
                                        </Text>
                                    )}
                                </View>
                            ) : (
                                /* Password User: Enter password */
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: labelColor }]}>
                                        Enter your password to confirm
                                    </Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                {
                                                    backgroundColor: inputBackground,
                                                    borderColor: borderColor,
                                                    color: textColor,
                                                },
                                            ]}
                                            value={deletePassword}
                                            onChangeText={setDeletePassword}
                                            placeholder="Enter password"
                                            placeholderTextColor={COLORS.placeholder}
                                            secureTextEntry={!showDeletePassword}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                        <Pressable
                                            style={styles.eyeIconContainer}
                                            onPress={() => setShowDeletePassword(!showDeletePassword)}
                                        >
                                            <Ionicons
                                                name={showDeletePassword ? 'eye-off-outline' : 'eye-outline'}
                                                size={20}
                                                color={COLORS.muted}
                                            />
                                        </Pressable>
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        {/* Delete Button */}
                        <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
                            <Pressable
                                style={[
                                    styles.deleteButton,
                                    (isOAuthUser ? confirmationPhrase !== 'DELETE' : !deletePassword) &&
                                        styles.submitButtonDisabled,
                                ]}
                                onPress={handleConfirmDelete}
                                disabled={
                                    isDeleting ||
                                    (isOAuthUser ? confirmationPhrase !== 'DELETE' : !deletePassword)
                                }
                            >
                                {isDeleting ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text style={styles.submitButtonText}>
                                        Delete My Account
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
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
        width: 28 + SPACING.xs * 2,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingVertical: SPACING.lg,
    },
    // Modal styles
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalCloseButton: {
        padding: SPACING.xs,
    },
    modalCloseText: {
        fontSize: 16,
    },
    modalTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 17,
    },
    modalHeaderSpacer: {
        width: 60,
    },
    modalScrollView: {
        flex: 1,
    },
    modalScrollContent: {
        padding: SPACING.lg,
    },
    inputGroup: {
        marginBottom: SPACING.xl,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: SPACING.xs,
        marginBottom: SPACING.sm,
    },
    inputWrapper: {
        position: 'relative',
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.lg,
        paddingRight: 50,
        fontSize: 16,
    },
    eyeIconContainer: {
        position: 'absolute',
        right: SPACING.lg,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
    },
    helperText: {
        fontSize: 12,
        marginLeft: SPACING.xs,
        marginTop: SPACING.sm,
    },
    modalFooter: {
        padding: SPACING.lg,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    submitButton: {
        backgroundColor: BRAND_COLOR,
        height: 50,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: '#FF3B30',
        height: 50,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Warning styles
    warningContainer: {
        alignItems: 'center',
        marginBottom: SPACING.xxl,
        padding: SPACING.lg,
    },
    warningTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
    },
    warningText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});
