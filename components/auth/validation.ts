// components/auth/validation.ts

/**
 * Validates if the input is a valid email address
 */
export function isValidEmail(input: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
}

/**
 * Validates password requirements
 */
export function validatePassword(password: string): {
  isValid: boolean;
  minLength: boolean;
} {
  const minLength = password.length >= 6;
  return {
    isValid: minLength,
    minLength,
  };
}

/**
 * Validates if passwords match
 */
export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword && password.length > 0;
}
