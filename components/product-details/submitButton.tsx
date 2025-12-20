import { BORDER_RADIUS, BRAND_COLOR, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { UploadProgress } from '@/hooks/useCreateListing';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SubmitButtonProps {
  onPress: () => void;
  disabled: boolean;
  loading?: boolean;
  buttonText?: string;
  uploadProgress?: UploadProgress | null;
}

export default function SubmitButton({
  onPress,
  disabled,
  loading,
  buttonText = 'Post Listing',
  uploadProgress,
}: SubmitButtonProps) {
  const disabledBg = useThemeColor({}, 'border');

  const getButtonText = () => {
    if (uploadProgress) {
      return `Uploading ${uploadProgress.currentImage}/${uploadProgress.total}...`;
    }
    if (loading) {
      return 'Creating Listing...';
    }
    return buttonText;
  };

  const isInProgress = loading || uploadProgress;

  return (
    <TouchableOpacity
      style={[
        styles.submitButton,
        { backgroundColor: BRAND_COLOR },
        disabled && [styles.submitButtonDisabled, { backgroundColor: disabledBg }]
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {isInProgress ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="white" size="small" />
          <Text style={styles.loadingText}>{getButtonText()}</Text>
          {uploadProgress && (
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${uploadProgress.percentage}%` }
                ]}
              />
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.submitButtonText}>{buttonText}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  submitButton: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
    minHeight: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  loadingContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: SPACING.lg,
  },
  loadingText: {
    color: 'white',
    marginTop: SPACING.xs,
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },
});
