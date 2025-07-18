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

// Types derived from schemas
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;