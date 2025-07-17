
// Secure local storage utilities for session management
export class SecureStorage {
  private static readonly SESSION_KEY = 'vault_session';
  private static readonly SETTINGS_KEY = 'vault_settings';

  // Session management
  static setSession(data: {
    userId: string;
    email: string;
    isUnlocked: boolean;
    expiresAt: number;
  }): void {
    try {
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to store session:', error);
    }
  }

  static getSession(): {
    userId: string;
    email: string;
    isUnlocked: boolean;
    expiresAt: number;
  } | null {
    try {
      const data = sessionStorage.getItem(this.SESSION_KEY);
      if (!data) return null;
      
      const session = JSON.parse(data);
      
      // Check if session has expired
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('Failed to retrieve session:', error);
      return null;
    }
  }

  static clearSession(): void {
    try {
      sessionStorage.removeItem(this.SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  static isSessionValid(): boolean {
    const session = this.getSession();
    return session !== null && session.isUnlocked;
  }

  // User settings (non-sensitive)
  static setSettings(settings: {
    theme?: 'light' | 'dark' | 'system';
    autoLockTimeout?: number;
    passwordGeneratorDefaults?: {
      length: number;
      includeUppercase: boolean;
      includeLowercase: boolean;
      includeNumbers: boolean;
      includeSpecialChars: boolean;
    };
  }): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to store settings:', error);
    }
  }

  static getSettings(): {
    theme: 'light' | 'dark' | 'system';
    autoLockTimeout: number;
    passwordGeneratorDefaults: {
      length: number;
      includeUppercase: boolean;
      includeLowercase: boolean;
      includeNumbers: boolean;
      includeSpecialChars: boolean;
    };
  } {
    try {
      const data = localStorage.getItem(this.SETTINGS_KEY);
      const defaultSettings = {
        theme: 'system' as const,
        autoLockTimeout: 15 * 60 * 1000, // 15 minutes
        passwordGeneratorDefaults: {
          length: 16,
          includeUppercase: true,
          includeLowercase: true,
          includeNumbers: true,
          includeSpecialChars: true,
        },
      };

      if (!data) return defaultSettings;
      
      return { ...defaultSettings, ...JSON.parse(data) };
    } catch (error) {
      console.error('Failed to retrieve settings:', error);
      return {
        theme: 'system' as const,
        autoLockTimeout: 15 * 60 * 1000,
        passwordGeneratorDefaults: {
          length: 16,
          includeUppercase: true,
          includeLowercase: true,
          includeNumbers: true,
          includeSpecialChars: true,
        },
      };
    }
  }

  // Clipboard utilities with automatic clearing
  static async copyToClipboard(text: string, clearAfter: number = 30000): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      
      // Clear clipboard after specified time
      setTimeout(async () => {
        try {
          const current = await navigator.clipboard.readText();
          if (current === text) {
            await navigator.clipboard.writeText('');
          }
        } catch (error) {
          // Ignore errors when clearing clipboard
        }
      }, clearAfter);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw new Error('Failed to copy to clipboard');
    }
  }
}
