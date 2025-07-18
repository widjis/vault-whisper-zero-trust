import { z } from 'zod';

// User registration schema
export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
  passwordHash: z
    .string()
    .min(1, 'Password hash is required')
    .max(1000, 'Password hash is too long'),
  salt: z
    .string()
    .min(1, 'Salt is required')
    .max(1000, 'Salt is too long'),
  firstName: z
    .string()
    .max(100, 'First name must be less than 100 characters')
    .optional(),
  lastName: z
    .string()
    .max(100, 'Last name must be less than 100 characters')
    .optional(),
});

// User login schema
export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
  passwordHash: z
    .string()
    .min(1, 'Password hash is required')
    .max(1000, 'Password hash is too long'),
});

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
});

// Password reset schema
export const passwordResetSchema = z.object({
  token: z
    .string()
    .min(1, 'Token is required'),
  passwordHash: z
    .string()
    .min(1, 'Password hash is required')
    .max(1000, 'Password hash is too long'),
});

// Email verification schema
export const emailVerificationSchema = z.object({
  userId: z
    .string()
    .min(1, 'User ID is required'),
  token: z
    .string()
    .min(1, 'Token is required'),
});

// Session revocation schema
export const sessionRevocationSchema = z.object({
  sessionId: z
    .string()
    .min(1, 'Session ID is required'),
});

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required'),
});

// Types derived from schemas
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type PasswordResetRequestRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetSchema>;
export type EmailVerificationRequest = z.infer<typeof emailVerificationSchema>;
export type SessionRevocationRequest = z.infer<typeof sessionRevocationSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;