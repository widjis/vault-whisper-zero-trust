/**
 * Utility functions for calculating password strength
 */

/**
 * Calculate password strength score (0-100)
 * @param password The password to evaluate
 * @returns A score from 0 (very weak) to 100 (very strong)
 */
export function calculatePasswordStrength(password: string): number {
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
}

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