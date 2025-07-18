// Advanced type utilities for better type safety
export type Result<T, E = Error> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

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
  error: <E extends Error>(error: E): Result<never, E> => ({ success: false, error }),
};

// Safe async wrapper
export async function safeAsync<T, E extends Error = Error>(
  fn: () => Promise<T>,
  errorHandler?: (error: unknown) => E
): AsyncResult<T, E> {
  try {
    const data = await fn();
    return createResult.success(data);
  } catch (error) {
    const handledError = errorHandler 
      ? errorHandler(error)
      : (error instanceof Error ? error : new Error(String(error))) as E;
    return createResult.error(handledError);
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
  email: {
    validate(value: unknown): Result<string, ValidationError> {
      if (typeof value !== 'string') {
        return createResult.error(new ValidationError('Email must be a string', 'email'));
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return createResult.error(new ValidationError('Invalid email format', 'email'));
      }
      return createResult.success(value);
    }
  },
  
  password: {
    validate(value: unknown): Result<string, ValidationError> {
      if (typeof value !== 'string') {
        return createResult.error(new ValidationError('Password must be a string', 'password'));
      }
      if (value.length < 8) {
        return createResult.error(new ValidationError('Password must be at least 8 characters', 'password'));
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
        return createResult.error(new ValidationError('Password must contain uppercase, lowercase, and number', 'password'));
      }
      return createResult.success(value);
    }
  },
  
  uuid: {
    validate(value: unknown): Result<string, ValidationError> {
      if (typeof value !== 'string') {
        return createResult.error(new ValidationError('UUID must be a string', 'id'));
      }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        return createResult.error(new ValidationError('Invalid UUID format', 'id'));
      }
      return createResult.success(value);
    }
  }
};