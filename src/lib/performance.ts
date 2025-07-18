// Performance monitoring and caching utilities
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();

  static startTimer(operation: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
    };
  }

  private static recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    const metrics = this.metrics.get(operation)!;
    metrics.push(duration);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  static getAverageTime(operation: string): number {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) return 0;
    return metrics.reduce((sum, time) => sum + time, 0) / metrics.length;
  }

  static getAllMetrics(): Record<string, { average: number; count: number }> {
    const result: Record<string, { average: number; count: number }> = {};
    this.metrics.forEach((times, operation) => {
      result[operation] = {
        average: this.getAverageTime(operation),
        count: times.length,
      };
    });
    return result;
  }
}

// Simple in-memory cache with TTL
export class CacheManager {
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Enhanced crypto operations with performance monitoring
export class MonitoredCrypto {
  static async encryptWithMonitoring(data: any, key: CryptoKey): Promise<any> {
    const endTimer = PerformanceMonitor.startTimer('encryption');
    try {
      const { encryptVaultEntry } = await import('./crypto');
      return await encryptVaultEntry(data, key);
    } finally {
      endTimer();
    }
  }

  static async decryptWithMonitoring(encryptedData: any, key: CryptoKey): Promise<any> {
    const endTimer = PerformanceMonitor.startTimer('decryption');
    try {
      const { decryptVaultEntry } = await import('./crypto');
      return await decryptVaultEntry(encryptedData, key);
    } finally {
      endTimer();
    }
  }
}