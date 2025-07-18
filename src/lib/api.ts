import { VaultEntry, EncryptedVaultEntry } from './crypto';

const API_BASE_URL = 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    salt?: string;
    createdAt: string;
  };
  token: string;
}

interface EntriesResponse {
  entries: Array<{
    id: string;
    title: string;
    encryptedData: {
      iv: string;
      ciphertext: string;
      tag: string;
    };
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

class ApiService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add authorization header if token exists
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async getSalt(email: string): Promise<string> {
    const response = await this.request<{ salt: string }>('/auth/salt', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    if (response.success && response.data) {
      return response.data.salt;
    }

    throw new Error('Failed to get salt');
  }

  async register(email: string, passwordHash: string, salt: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        passwordHash,
        salt,
      }),
    });

    if (response.success && response.data) {
      this.token = response.data.token;
      localStorage.setItem('auth_token', this.token);
      return response.data;
    }

    throw new Error('Registration failed');
  }

  async login(email: string, passwordHash: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        passwordHash,
      }),
    });

    if (response.success && response.data) {
      this.token = response.data.token;
      localStorage.setItem('auth_token', this.token);
      return response.data;
    }

    throw new Error('Login failed');
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Entry methods
  async getEntries(page: number = 1, limit: number = 50, search?: string): Promise<EntriesResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) {
      params.append('search', search);
    }

    const response = await this.request<EntriesResponse>(`/entries?${params}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error('Failed to fetch entries');
  }

  async getEntry(id: string): Promise<{
    id: string;
    title: string;
    encryptedData: {
      iv: string;
      ciphertext: string;
      tag: string;
    };
    createdAt: string;
    updatedAt: string;
  }> {
    const response = await this.request<{
      entry: {
        id: string;
        title: string;
        encryptedData: {
          iv: string;
          ciphertext: string;
          tag: string;
        };
        createdAt: string;
        updatedAt: string;
      };
    }>(`/entries/${id}`);

    if (response.success && response.data) {
      return response.data.entry;
    }

    throw new Error('Failed to fetch entry');
  }

  async createEntry(title: string, encryptedData: {
    iv: string;
    ciphertext: string;
    tag: string;
  }): Promise<{
    id: string;
    title: string;
    encryptedData: {
      iv: string;
      ciphertext: string;
      tag: string;
    };
    createdAt: string;
    updatedAt: string;
  }> {
    const response = await this.request<{
      entry: {
        id: string;
        title: string;
        encryptedData: {
          iv: string;
          ciphertext: string;
          tag: string;
        };
        createdAt: string;
        updatedAt: string;
      };
    }>('/entries', {
      method: 'POST',
      body: JSON.stringify({
        title,
        encryptedData,
      }),
    });

    if (response.success && response.data) {
      return response.data.entry;
    }

    throw new Error('Failed to create entry');
  }

  async updateEntry(id: string, title: string, encryptedData: {
    iv: string;
    ciphertext: string;
    tag: string;
  }): Promise<{
    id: string;
    title: string;
    encryptedData: {
      iv: string;
      ciphertext: string;
      tag: string;
    };
    createdAt: string;
    updatedAt: string;
  }> {
    const response = await this.request<{
      entry: {
        id: string;
        title: string;
        encryptedData: {
          iv: string;
          ciphertext: string;
          tag: string;
        };
        createdAt: string;
        updatedAt: string;
      };
    }>(`/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title,
        encryptedData,
      }),
    });

    if (response.success && response.data) {
      return response.data.entry;
    }

    throw new Error('Failed to update entry');
  }

  async deleteEntry(id: string): Promise<void> {
    const response = await this.request(`/entries/${id}`, {
      method: 'DELETE',
    });

    if (!response.success) {
      throw new Error('Failed to delete entry');
    }
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }
}

export const apiService = new ApiService();