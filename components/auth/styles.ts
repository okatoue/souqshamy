// components/auth/styles.ts
import { StyleSheet } from 'react-native';
import {
  AUTH_COLORS,
  AUTH_SIZING,
  AUTH_SPACING,
  AUTH_TYPOGRAPHY,
  BRAND_COLOR,
  BRAND_COLOR_DARK,
  isSmallScreen,
} from './constants';

// Shared styles used across auth screens
export const authStyles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
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
    color: AUTH_COLORS.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: AUTH_TYPOGRAPHY.subtitle.fontSize,
    color: AUTH_COLORS.textSecondary,
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
    color: AUTH_COLORS.textLabel,
    marginBottom: 6,
  },

  // Input field
  input: {
    height: AUTH_SIZING.inputHeight,
    borderWidth: 1,
    borderColor: AUTH_COLORS.border,
    borderRadius: AUTH_SIZING.borderRadius,
    paddingHorizontal: 14,
    fontSize: AUTH_TYPOGRAPHY.body.fontSize,
    color: AUTH_COLORS.textPrimary,
    backgroundColor: AUTH_COLORS.cardBackground,
  },

  // Password container
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AUTH_COLORS.border,
    borderRadius: AUTH_SIZING.borderRadius,
    backgroundColor: AUTH_COLORS.cardBackground,
  },
  passwordInput: {
    flex: 1,
    height: AUTH_SIZING.inputHeight,
    paddingHorizontal: 14,
    fontSize: AUTH_TYPOGRAPHY.body.fontSize,
    color: AUTH_COLORS.textPrimary,
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
    borderColor: AUTH_COLORS.border,
    borderRadius: AUTH_SIZING.borderRadius,
    backgroundColor: AUTH_COLORS.cardBackground,
    gap: 10,
  },
  socialButtonPressed: {
    backgroundColor: AUTH_COLORS.background,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: AUTH_COLORS.textLabel,
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
    backgroundColor: AUTH_COLORS.border,
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 13,
    fontWeight: '500',
    color: AUTH_COLORS.textMuted,
  },

  // Card/Box style
  card: {
    backgroundColor: AUTH_COLORS.cardBackground,
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
    color: AUTH_COLORS.textMuted,
    marginTop: isSmallScreen ? 16 : 20,
    lineHeight: 16,
  },
});
