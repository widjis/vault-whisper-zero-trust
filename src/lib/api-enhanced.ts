import { VaultEntry, EncryptedVaultEntry } from './crypto';

const API_BASE_URL = 'http://localhost:3001/api';

// Enhanced error types
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string = 'Network connection failed') {
    super(message, 'NETWORK_ERROR', undefined, true);
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401, false);
  }
}

// Enhanced API service with retry logic and better error handling
export class EnhancedApiService {
  private token: string | null = null;
  private refreshPromise: Promise<string> | null = null;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  // Exponential backoff retry logic
  private async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && error instanceof ApiError && error.retryable) {
        await this.delay(this.retryDelay * (this.maxRetries - retries + 1));
        return this.withRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Enhanced request method with better error handling
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    skipAuth: boolean = false
  ): Promise<T> {
    return this.withRetry(async () => {
      const url = `${API_BASE_URL}${endpoint}`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      // Add authorization header if token exists and not skipped
      if (this.token && !skipAuth) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      try {
        const response = await fetch(url, {
          ...options,
          headers,
          // Add timeout
          signal: AbortSignal.timeout(30000), // 30 seconds
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          switch (response.status) {
            case 401:
              this.handleAuthError();
              throw new AuthenticationError(errorData.error?.message);
            case 403:
              throw new ApiError('Access forbidden', 'FORBIDDEN', 403);
            case 404:
              throw new ApiError('Resource not found', 'NOT_FOUND', 404);
            case 429:
              throw new ApiError('Rate limit exceeded', 'RATE_LIMIT', 429, true);
            case 500:
            case 502:
            case 503:
            case 504:
              throw new ApiError('Server error', 'SERVER_ERROR', response.status, true);
            default:
              throw new ApiError(
                errorData.error?.message || 'Request failed',
                errorData.error?.code || 'UNKNOWN_ERROR',
                response.status
              );
          }
        }

        const data = await response.json();
        return data.success ? data.data : data;
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new NetworkError();
        }
        if (error.name === 'AbortError') {
          throw new ApiError('Request timeout', 'TIMEOUT', undefined, true);
        }
        throw error;
      }
    });
  }

  private handleAuthError(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
    // Emit event for components to handle logout
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  // Token refresh logic
  private async refreshToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.request<{ token: string }>('/auth/refresh', {
      method: 'POST',
    }).then(response => {
      this.token = response.token;
      localStorage.setItem('auth_token', this.token);
      this.refreshPromise = null;
      return this.token;
    }).catch(error => {
      this.refreshPromise = null;
      throw error;
    });

    return this.refreshPromise;
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health', { method: 'GET' }, true);
  }

  // Batch operations for better performance
  async batchGetEntries(ids: string[]): Promise<Array<{
    id: string;
    title: string;
    encryptedData: any;
    createdAt: string;
    updatedAt: string;
  }>> {
    return this.request('/entries/batch', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }
}