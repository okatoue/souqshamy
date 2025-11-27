// components/auth/styles.ts
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import {
  AUTH_COLORS,
  AUTH_COLORS_DARK,
  AUTH_SIZING,
  AUTH_SPACING,
  AUTH_TYPOGRAPHY,
  BRAND_COLOR,
  BRAND_COLOR_DARK,
  getAuthColors,
  isSmallScreen,
} from './constants';

// Type for auth styles
export interface AuthStylesType {
  container: ViewStyle;
  keyboardView: ViewStyle;
  scrollContent: ViewStyle;
  centerContent: ViewStyle;
  logoContainer: ViewStyle;
  logoGradient: ViewStyle;
  titleContainer: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  formSection: ViewStyle;
  inputWrapper: ViewStyle;
  inputLabel: TextStyle;
  input: TextStyle;
  passwordContainer: ViewStyle;
  passwordInput: TextStyle;
  eyeButton: ViewStyle;
  primaryButton: ViewStyle;
  primaryButtonPressed: ViewStyle;
  primaryButtonDisabled: ViewStyle;
  primaryButtonText: TextStyle;
  socialButton: ViewStyle;
  socialButtonPressed: ViewStyle;
  socialButtonText: TextStyle;
  divider: ViewStyle;
  dividerLine: ViewStyle;
  dividerText: TextStyle;
  card: ViewStyle;
  linkText: TextStyle;
  footer: TextStyle;
}

// Function to create theme-aware auth styles
export function createAuthStyles(theme: 'light' | 'dark'): AuthStylesType {
  const colors = getAuthColors(theme);

  return StyleSheet.create({
    // Layout
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: AUTH_SPACING.horizontal,
      paddingVertical: isSmallScreen ? AUTH_SPACING.verticalSmall : AUTH_SPACING.verticalLarge,
    },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: AUTH_SPACING.horizontal,
    },

    // Logo
    logoContainer: {
      alignItems: 'center',
      marginBottom: isSmallScreen ? 16 : 20,
    },
    logoGradient: {
      width: AUTH_SIZING.logoSize,
      height: AUTH_SIZING.logoSize,
      borderRadius: AUTH_SIZING.logoRadius,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: BRAND_COLOR,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },

    // Title section
    titleContainer: {
      alignItems: 'center',
      marginBottom: isSmallScreen ? 20 : 28,
    },
    title: {
      fontSize: AUTH_TYPOGRAPHY.title.fontSize,
      fontWeight: AUTH_TYPOGRAPHY.title.fontWeight,
      color: colors.textPrimary,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: AUTH_TYPOGRAPHY.subtitle.fontSize,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },

    // Form section
    formSection: {
      marginBottom: isSmallScreen ? 16 : 20,
    },
    inputWrapper: {
      marginBottom: isSmallScreen ? 12 : 16,
    },
    inputLabel: {
      fontSize: AUTH_TYPOGRAPHY.label.fontSize,
      fontWeight: AUTH_TYPOGRAPHY.label.fontWeight,
      color: colors.textLabel,
      marginBottom: 6,
    },

    // Input field
    input: {
      height: AUTH_SIZING.inputHeight,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: AUTH_SIZING.borderRadius,
      paddingHorizontal: 14,
      fontSize: AUTH_TYPOGRAPHY.body.fontSize,
      color: colors.textPrimary,
      backgroundColor: colors.cardBackground,
    },

    // Password container
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: AUTH_SIZING.borderRadius,
      backgroundColor: colors.cardBackground,
    },
    passwordInput: {
      flex: 1,
      height: AUTH_SIZING.inputHeight,
      paddingHorizontal: 14,
      fontSize: AUTH_TYPOGRAPHY.body.fontSize,
      color: colors.textPrimary,
    },
    eyeButton: {
      paddingHorizontal: 14,
      height: AUTH_SIZING.inputHeight,
      justifyContent: 'center',
    },

    // Primary button
    primaryButton: {
      height: AUTH_SIZING.buttonHeight,
      backgroundColor: BRAND_COLOR,
      borderRadius: AUTH_SIZING.borderRadius,
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
      fontSize: AUTH_TYPOGRAPHY.button.fontSize,
      fontWeight: AUTH_TYPOGRAPHY.button.fontWeight,
    },

    // Social buttons
    socialButton: {
      height: AUTH_SIZING.socialButtonHeight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: AUTH_SIZING.borderRadius,
      backgroundColor: colors.cardBackground,
      gap: 10,
    },
    socialButtonPressed: {
      backgroundColor: colors.background,
    },
    socialButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textLabel,
    },

    // Divider
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: isSmallScreen ? 16 : 20,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      marginHorizontal: 14,
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
    },

    // Card/Box style
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: AUTH_SIZING.borderRadius,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },

    // Link text
    linkText: {
      color: BRAND_COLOR,
      fontWeight: '500',
    },

    // Footer
    footer: {
      textAlign: 'center',
      fontSize: AUTH_TYPOGRAPHY.footer.fontSize,
      color: colors.textMuted,
      marginTop: isSmallScreen ? 16 : 20,
      lineHeight: 16,
    },
  });
}

// Default light theme styles (for backwards compatibility)
export const authStyles = createAuthStyles('light');
