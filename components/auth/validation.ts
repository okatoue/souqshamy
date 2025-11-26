// components/auth/validation.ts

/**
 * Validates if the input is a valid email address
 */
export function isValidEmail(input: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
}

/**
 * Validates if the input is a valid phone number
 * Accepts international format with 7-15 digits
 */
export function isValidPhoneNumber(input: string): boolean {
  const cleaned = cleanPhoneNumber(input);
  const phoneRegex = /^\+?\d{7,15}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Cleans phone number by removing spaces, dashes, and parentheses
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, '');
}

/**
 * Detects if the input appears to be a phone number
 */
export function detectPhoneNumber(input: string): boolean {
  const valueWithoutPrefix = input.replace(/^\+963\s?/, '');
  const startsWithNumber = /^\d/.test(valueWithoutPrefix);
  const isNumericOnly = /^[\d\s+]+$/.test(input) && input.length > 0;
  return isNumericOnly || startsWithNumber;
}

/**
 * Formats phone input with Syrian prefix if it starts with a number
 */
export function formatPhoneInput(value: string): string {
  if (/^\d/.test(value) && !value.startsWith('+963')) {
    return '+963 ' + value;
  }
  return value;
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
