import { z } from 'zod';

// User status update schema
export const userStatusUpdateSchema = z.object({
  userId: z
    .string()
    .uuid('Invalid user ID format'),
  isActive: z
    .boolean()
    .optional(),
  isVerified: z
    .boolean()
    .optional(),
  accountLocked: z
    .boolean()
    .optional(),
  accountLockedUntil: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional(),
  resetFailedLoginAttempts: z
    .boolean()
    .optional(),
}).refine(
  (data) => {
    return data.isActive !== undefined || 
           data.isVerified !== undefined || 
           data.accountLocked !== undefined || 
           data.accountLockedUntil !== undefined || 
           data.resetFailedLoginAttempts !== undefined;
  },
  'At least one field must be provided for update'
);

// Audit log query schema
export const auditLogQuerySchema = z.object({
  userId: z
    .string()
    .uuid('Invalid user ID format')
    .optional(),
  action: z
    .enum(['AUTH', 'DATA', 'SECURITY', 'ADMIN'])
    .optional(),
  resourceType: z
    .string()
    .optional(),
  status: z
    .enum(['SUCCESS', 'FAILED'])
    .optional(),
  startDate: z
    .string()
    .datetime({ offset: true })
    .optional(),
  endDate: z
    .string()
    .datetime({ offset: true })
    .optional(),
  page: z
    .string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 1)
    .refine((val) => val > 0, 'Page must be a positive number'),
  limit: z
    .string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 50)
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
});

// User query schema
export const userQuerySchema = z.object({
  search: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  isVerified: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  accountLocked: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  page: z
    .string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 1)
    .refine((val) => val > 0, 'Page must be a positive number'),
  limit: z
    .string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 50)
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
});

// Types derived from schemas
export type UserStatusUpdateRequest = z.infer<typeof userStatusUpdateSchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;