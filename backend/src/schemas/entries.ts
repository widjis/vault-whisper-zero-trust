import { z } from 'zod';

// Base64 string validation
const base64Schema = z
  .string()
  .min(1, 'Base64 data is required')
  .refine(
    (val) => {
      try {
        // Check if it's valid base64
        const decoded = Buffer.from(val, 'base64');
        return Buffer.from(decoded).toString('base64') === val;
      } catch {
        return false;
      }
    },
    'Invalid base64 encoding'
  );

// Encrypted data schema
export const encryptedDataSchema = z.object({
  iv: base64Schema.refine(
    (val) => Buffer.from(val, 'base64').length === 12,
    'IV must be exactly 12 bytes when decoded'
  ),
  ciphertext: base64Schema,
  tag: base64Schema.refine(
    (val) => Buffer.from(val, 'base64').length === 16,
    'Authentication tag must be exactly 16 bytes when decoded'
  ),
});

// Entry category enum
export const entryCategorySchema = z.enum([
  'LOGIN',
  'SECURE_NOTE',
  'CREDIT_CARD',
  'IDENTITY',
  'OTHER'
]);

// Create entry schema
export const createEntrySchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .trim(),
  category: entryCategorySchema.default('OTHER'),
  favorite: z.boolean().default(false),
  tags: z.array(z.string().max(50)).optional(),
  encryptedData: encryptedDataSchema,
});

// Update entry schema
export const updateEntrySchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .trim()
    .optional(),
  category: entryCategorySchema.optional(),
  favorite: z.boolean().optional(),
  tags: z.array(z.string().max(50)).optional(),
  encryptedData: encryptedDataSchema.optional(),
}).refine(
  (data) => {
    return data.title !== undefined || 
           data.encryptedData !== undefined || 
           data.category !== undefined || 
           data.favorite !== undefined || 
           data.tags !== undefined;
  },
  'At least one field must be provided for update'
);

// Entry ID parameter schema
export const entryIdSchema = z.object({
  id: z
    .string()
    .uuid('Invalid entry ID format'),
});

// Query parameters schema for listing entries
export const listEntriesQuerySchema = z.object({
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
  search: z
    .string()
    .optional()
    .transform((val) => val?.trim())
    .refine((val) => !val || val.length >= 2, 'Search query must be at least 2 characters'),
});

// Types derived from schemas
export type CreateEntryRequest = z.infer<typeof createEntrySchema>;
export type UpdateEntryRequest = z.infer<typeof updateEntrySchema>;
export type EntryIdParams = z.infer<typeof entryIdSchema>;
export type ListEntriesQuery = z.infer<typeof listEntriesQuerySchema>;
export type EncryptedData = z.infer<typeof encryptedDataSchema>;