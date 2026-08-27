export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Validates and normalizes phone numbers (E.164 or national format)
 */
export function validateAndNormalizePhone(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, normalized: '', error: 'Phone number is required' };
  }

  // Remove common separator characters: spaces, dashes, dots, parentheses
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');

  // Check if string contains only digits and optional leading +
  const phoneRegex = /^\+?[0-9]{7,15}$/;
  if (!phoneRegex.test(cleaned)) {
    return {
      isValid: false,
      normalized: cleaned,
      error: 'Invalid phone number format. Must contain 7-15 digits.',
    };
  }

  return {
    isValid: true,
    normalized: cleaned,
  };
}
