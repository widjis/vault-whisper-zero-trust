/**
 * Password strength utility functions
 */

// Password strength levels
export enum PasswordStrength {
  VERY_WEAK = 0,
  WEAK = 1,
  MEDIUM = 2,
  STRONG = 3,
  VERY_STRONG = 4,
}

// Password strength labels
export const strengthLabels: Record<PasswordStrength, string> = {
  [PasswordStrength.VERY_WEAK]: 'Very Weak',
  [PasswordStrength.WEAK]: 'Weak',
  [PasswordStrength.MEDIUM]: 'Medium',
  [PasswordStrength.STRONG]: 'Strong',
  [PasswordStrength.VERY_STRONG]: 'Very Strong',
};

// Password strength colors
export const strengthColors: Record<PasswordStrength, string> = {
  [PasswordStrength.VERY_WEAK]: '#e53935', // red
  [PasswordStrength.WEAK]: '#ff9800', // orange
  [PasswordStrength.MEDIUM]: '#fdd835', // yellow
  [PasswordStrength.STRONG]: '#43a047', // green
  [PasswordStrength.VERY_STRONG]: '#2e7d32', // dark green
};

/**
 * Calculate password strength score
 * @param password The password to check
 * @returns A score from 0 to 4
 */
export const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (!password) {
    return PasswordStrength.VERY_WEAK;
  }

  let score = 0;

  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character variety checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1; // Has uppercase and lowercase
  if (/\d/.test(password)) score += 1; // Has numbers
  if (/[^a-zA-Z\d]/.test(password)) score += 1; // Has special characters

  // Penalize for common patterns
  if (/^[a-zA-Z]+$/.test(password)) score -= 1; // Only letters
  if (/^\d+$/.test(password)) score -= 1; // Only numbers
  if (/^[a-zA-Z\d]+$/.test(password) && password.length < 10) score -= 1; // Alphanumeric but short
  if (/(.)(\1{2,})/.test(password)) score -= 1; // Character repeated 3+ times

  // Ensure score is within bounds
  score = Math.max(0, Math.min(score, 4)) as PasswordStrength;

  return score;
};

/**
 * Calculate password strength score (0-100)
 * @param password The password to evaluate
 * @returns A score from 0 (very weak) to 100 (very strong)
 */
export function calculatePasswordStrengthScore(password: string): number {
  if (!password) return 0;
  
  // Base score starts at 0
  let score = 0;
  
  // Length contribution (up to 25 points)
  const lengthScore = Math.min(25, password.length * 2);
  score += lengthScore;
  
  // Character variety contribution (up to 50 points)
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChars = /[^a-zA-Z0-9]/.test(password);
  
  const varietyScore = 
    (hasLowercase ? 10 : 0) +
    (hasUppercase ? 15 : 0) +
    (hasNumbers ? 10 : 0) +
    (hasSpecialChars ? 15 : 0);
  
  score += varietyScore;
  
  // Complexity contribution (up to 25 points)
  // Check for sequences, repetitions, and patterns
  let complexityScore = 25;
  
  // Penalize sequential characters (e.g., "abc", "123")
  const sequentialRegex = /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i;
  if (sequentialRegex.test(password)) {
    complexityScore -= 10;
  }
  
  // Penalize repeated characters (e.g., "aaa", "111")
  const repeatedRegex = /(.)\1{2,}/;
  if (repeatedRegex.test(password)) {
    complexityScore -= 10;
  }
  
  // Penalize common patterns (e.g., "qwerty", "password")
  const commonPatterns = ['password', 'qwerty', 'asdfgh', 'zxcvbn', 'admin', '123456', 'welcome'];
  for (const pattern of commonPatterns) {
    if (password.toLowerCase().includes(pattern)) {
      complexityScore -= 15;
      break;
    }
  }
  
  score += Math.max(0, complexityScore);
  
  return Math.min(100, score);
};

/**
 * Get a descriptive rating for a password strength score
 * @param score The password strength score (0-100)
 * @returns A string rating ("Very Weak", "Weak", "Moderate", "Strong", or "Very Strong")
 */
export function getPasswordStrengthRating(score: number): string {
  if (score < 20) return 'Very Weak';
  if (score < 40) return 'Weak';
  if (score < 60) return 'Moderate';
  if (score < 80) return 'Strong';
  return 'Very Strong';
}

/**
 * Get a color for a password strength score
 * @param score The password strength score (0-100)
 * @returns A color string ("error", "warning", "info", "success")
 */
export function getPasswordStrengthColor(score: number): string {
  if (score < 20) return 'error';
  if (score < 40) return 'error';
  if (score < 60) return 'warning';
  if (score < 80) return 'info';
  return 'success';
}

/**
 * Get feedback for improving password strength
 * @param password The password to analyze
 * @returns An array of feedback messages
 */
export const getPasswordFeedback = (password: string): string[] => {
  const feedback: string[] = [];

  if (!password) {
    return ['Please enter a password'];
  }

  if (password.length < 8) {
    feedback.push('Use at least 8 characters');
  }

  if (password.length < 12) {
    feedback.push('Consider using at least 12 characters for stronger security');
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    feedback.push('Mix uppercase and lowercase letters');
  }

  if (!/\d/.test(password)) {
    feedback.push('Include at least one number');
  }

  if (!/[^a-zA-Z\d]/.test(password)) {
    feedback.push('Include at least one special character');
  }

  if (/(.)(\1{2,})/.test(password)) {
    feedback.push('Avoid repeating characters');
  }

  if (/^(123|abc|qwerty|password|admin|welcome)/i.test(password)) {
    feedback.push('Avoid common words and sequences');
  }

  return feedback;
};

/**
 * Generate a random password with specified options
 * @param options Password generation options
 * @returns A randomly generated password
 */
export const generatePassword = (options: {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
} = {}): string => {
  const {
    length = 16,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
  } = options;

  // Define character sets
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const symbolChars = '!@#$%^&*()_+[]{}|;:,.<>?';

  // Create character pool based on options
  let chars = '';
  if (includeUppercase) chars += uppercaseChars;
  if (includeLowercase) chars += lowercaseChars;
  if (includeNumbers) chars += numberChars;
  if (includeSymbols) chars += symbolChars;

  // Default to lowercase + numbers if nothing selected
  if (!chars) chars = lowercaseChars + numberChars;

  // Generate password
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }

  // Ensure the password contains at least one character from each selected type
  const requiredChars = [];
  if (includeUppercase) requiredChars.push(uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)]);
  if (includeLowercase) requiredChars.push(lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)]);
  if (includeNumbers) requiredChars.push(numberChars[Math.floor(Math.random() * numberChars.length)]);
  if (includeSymbols) requiredChars.push(symbolChars[Math.floor(Math.random() * symbolChars.length)]);

  // Replace first few characters with required ones
  for (let i = 0; i < requiredChars.length; i++) {
    password = password.substring(0, i) + requiredChars[i] + password.substring(i + 1);
  }

  return password;
};