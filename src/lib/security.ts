// Enhanced security utilities
export class SecurityManager {
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static readonly IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
  private static sessionTimer: NodeJS.Timeout | null = null;
  private static idleTimer: NodeJS.Timeout | null = null;
  private static lastActivity = Date.now();

  // Session timeout management
  static initializeSessionTimeout(onTimeout: () => void): void {
    this.resetSessionTimeout(onTimeout);
    this.setupIdleDetection(onTimeout);
  }

  private static resetSessionTimeout(onTimeout: () => void): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    
    this.sessionTimer = setTimeout(() => {
      onTimeout();
      this.cleanup();
    }, this.SESSION_TIMEOUT);
  }

  private static setupIdleDetection(onTimeout: () => void): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const resetIdleTimer = () => {
      this.lastActivity = Date.now();
      
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
      }
      
      this.idleTimer = setTimeout(() => {
        onTimeout();
        this.cleanup();
      }, this.IDLE_TIMEOUT);
    };

    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer, true);
    });

    resetIdleTimer();
  }

  static cleanup(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  // Secure storage with encryption
  static async setSecureItem(key: string, value: any, masterKey: CryptoKey): Promise<void> {
    try {
      const { encryptVaultEntry } = await import('./crypto');
      const encrypted = await encryptVaultEntry(value, masterKey);
      sessionStorage.setItem(`secure_${key}`, JSON.stringify(encrypted));
    } catch (error) {
      console.error('Failed to store secure item:', error);
      throw new Error('Secure storage failed');
    }
  }

  static async getSecureItem<T>(key: string, masterKey: CryptoKey): Promise<T | null> {
    try {
      const encrypted = sessionStorage.getItem(`secure_${key}`);
      if (!encrypted) return null;
      
      const { decryptVaultEntry } = await import('./crypto');
      const decrypted = await decryptVaultEntry(JSON.parse(encrypted), masterKey);
      return decrypted as T;
    } catch (error) {
      console.error('Failed to retrieve secure item:', error);
      return null;
    }
  }

  static removeSecureItem(key: string): void {
    sessionStorage.removeItem(`secure_${key}`);
  }

  // Content Security Policy validation
  static validateCSP(): boolean {
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!meta) {
      console.warn('CSP not found');
      return false;
    }
    
    const csp = meta.getAttribute('content') || '';
    const requiredDirectives = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'"
    ];
    
    return requiredDirectives.every(directive => 
      csp.includes(directive.split(' ')[0])
    );
  }

  // Input sanitization
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  // Rate limiting for client-side operations
  private static rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();

  static checkRateLimit(operation: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const limiter = this.rateLimiters.get(operation);
    
    if (!limiter || now > limiter.resetTime) {
      this.rateLimiters.set(operation, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (limiter.count >= maxRequests) {
      return false;
    }
    
    limiter.count++;
    return true;
  }
}

// Audit logging
export class AuditLogger {
  private static logs: Array<{
    timestamp: string;
    action: string;
    details: any;
    userId?: string;
  }> = [];

  static log(action: string, details: any = {}, userId?: string): void {
    this.logs.push({
      timestamp: new Date().toISOString(),
      action,
      details,
      userId,
    });
    
    // Keep only last 1000 logs in memory
    if (this.logs.length > 1000) {
      this.logs.shift();
    }
    
    // In production, send to backend
    if (process.env.NODE_ENV === 'production') {
      this.sendToBackend({ action, details, userId });
    }
  }

  private static async sendToBackend(logEntry: any): Promise<void> {
    try {
      // This would be implemented to send logs to your backend
      console.log('Audit log:', logEntry);
    } catch (error) {
      console.error('Failed to send audit log:', error);
    }
  }

  static getLogs(): typeof AuditLogger.logs {
    return [...this.logs];
  }

  static exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}