// Advanced type utilities for better type safety
export type Result<T, E = Error> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

// Define AsyncResult as a Promise type to ensure compatibility with async functions
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Helper to create a properly typed Promise result
export const createAsyncResult = {
  success: <T>(data: T): Promise<Result<T>> => Promise.resolve({ success: true, data }),
  error: <T = never, E extends Error = Error>(error: E): Promise<Result<T, E>> => Promise.resolve({ success: false, error }),
};

// Branded types for better type safety
export type UserId = string & { readonly brand: unique symbol };
export type EntryId = string & { readonly brand: unique symbol };
export type SessionToken = string & { readonly brand: unique symbol };
export type EncryptedData = string & { readonly brand: unique symbol };

// Type guards
export const isUserId = (value: string): value is UserId => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

export const isEntryId = (value: string): value is EntryId => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

// Enhanced error handling with context
export class VaultError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'VaultError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
    };
  }
}

// Result pattern implementation
export const createResult = {
  success: <T>(data: T): Result<T> => ({ success: true, data }),
  error: <T = never, E extends Error = Error>(error: E): Result<T, E> => ({ success: false, error }),
};

// Safe async wrapper
export async function safeAsync<T, E extends Error = Error>(
  fn: () => Promise<T>,
  errorHandler?: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const handledError = errorHandler 
      ? errorHandler(error)
      : (error instanceof Error ? error : new Error(String(error))) as E;
    return { success: false, error: handledError };
  }
}

// Validation utilities
export interface Validator<T> {
  validate(value: unknown): Result<T, ValidationError>;
}

export class ValidationError extends VaultError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', { field });
  }
}

export const validators = {
  required: (message: string = 'This field is required') => ({
    validate(value: unknown): Result<string, ValidationError> {
      if (value === null || value === undefined || value === '') {
        return { success: false, error: new ValidationError(message) };
      }
      if (typeof value === 'string' && value.trim() === '') {
        return { success: false, error: new ValidationError(message) };
      }
      return { success: true, data: String(value) };
    }
  }),
  
  url: (message: string = 'Please enter a valid URL') => ({
    validate(value: unknown): Result<string, ValidationError> {
      if (!value || value === '') {
        return { success: true, data: '' }; // URL is optional
      }
      if (typeof value !== 'string') {
        return { success: false, error: new ValidationError('URL must be a string', 'url') };
      }
      try {
        new URL(value);
        return { success: true, data: value };
      } catch {
        return { success: false, error: new ValidationError(message, 'url') };
      }
    }
  }),
  
  email: {
    validate(value: unknown): Result<string, ValidationError> {
      if (typeof value !== 'string') {
        return { success: false, error: new ValidationError('Email must be a string', 'email') };
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return { success: false, error: new ValidationError('Invalid email format', 'email') };
      }
      return { success: true, data: value };
    }
  },
  
  password: {
    validate(value: unknown): Result<string, ValidationError> {
      if (typeof value !== 'string') {
        return { success: false, error: new ValidationError('Password must be a string', 'password') };
      }
      if (value.length < 8) {
        return { success: false, error: new ValidationError('Password must be at least 8 characters', 'password') };
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
        return { success: false, error: new ValidationError('Password must contain uppercase, lowercase, and number', 'password') };
      }
      return { success: true, data: value };
    }
  },
  
  uuid: {
    validate(value: unknown): Result<string, ValidationError> {
      if (typeof value !== 'string') {
        return { success: false, error: new ValidationError('UUID must be a string', 'id') };
      }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        return { success: false, error: new ValidationError('Invalid UUID format', 'id') };
      }
      return { success: true, data: value };
    }
  }
};