// components/auth/index.ts

// Components
export { AuthButton } from './AuthButton';
export { AuthDivider } from './AuthDivider';
export { AuthInput } from './AuthInput';
export { AuthLayout } from './AuthLayout';
export { AuthLogo } from './AuthLogo';
export { AuthPasswordInput } from './AuthPasswordInput';
export { AuthTitle } from './AuthTitle';
export { EmailPhoneDisplay } from './EmailPhoneDisplay';
export { NoticeBox } from './NoticeBox';
export { OTPInput } from './OTPInput';
export { PasswordRequirements } from './PasswordRequirements';
export { SocialAuthButtons } from './SocialAuthButtons';
export { SyriaFlag } from './SyriaFlag';

// Styles and constants
export { authStyles } from './styles';
export {
  AUTH_COLORS,
  AUTH_SIZING,
  AUTH_SPACING,
  AUTH_TYPOGRAPHY,
  BRAND_COLOR,
  BRAND_COLOR_DARK,
  isSmallScreen,
} from './constants';

// Validation utilities
export {
  cleanPhoneNumber,
  detectPhoneNumber,
  formatPhoneInput,
  isValidEmail,
  isValidPhoneNumber,
  passwordsMatch,
  validatePassword,
} from './validation';
