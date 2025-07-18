// Environment configuration with validation
export interface AppConfig {
  // API Configuration
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  
  // Security Configuration
  security: {
    sessionTimeout: number;
    idleTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    tokenRefreshThreshold: number;
    csrfProtection: boolean;
  };
  
  // Crypto Configuration
  crypto: {
    keyDerivationIterations: number;
    saltLength: number;
    ivLength: number;
    tagLength: number;
  };
  
  // UI Configuration
  ui: {
    theme: 'light' | 'dark' | 'auto';
    entriesPerPage: number;
    autoSaveDelay: number;
    animationDuration: number;
  };
  
  // Feature Flags
  features: {
    twoFactorAuth: boolean;
    biometricAuth: boolean;
    offlineMode: boolean;
    auditLogging: boolean;
    performanceMonitoring: boolean;
  };
  
  // Development Configuration
  development: {
    enableDebugLogs: boolean;
    mockApi: boolean;
    skipCrypto: boolean;
  };
}

const defaultConfig: AppConfig = {
  api: {
    baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api',
    timeout: parseInt(process.env.REACT_APP_API_TIMEOUT || '30000'),
    retryAttempts: parseInt(process.env.REACT_APP_API_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.REACT_APP_API_RETRY_DELAY || '1000'),
  },
  
  security: {
    sessionTimeout: parseInt(process.env.REACT_APP_SESSION_TIMEOUT || '1800000'), // 30 minutes
    idleTimeout: parseInt(process.env.REACT_APP_IDLE_TIMEOUT || '900000'), // 15 minutes
    maxLoginAttempts: parseInt(process.env.REACT_APP_MAX_LOGIN_ATTEMPTS || '5'),
    lockoutDuration: parseInt(process.env.REACT_APP_LOCKOUT_DURATION || '300000'), // 5 minutes
    tokenRefreshThreshold: parseInt(process.env.REACT_APP_TOKEN_REFRESH_THRESHOLD || '300000'), // 5 minutes
    csrfProtection: process.env.REACT_APP_CSRF_PROTECTION !== 'false',
  },
  
  crypto: {
    keyDerivationIterations: parseInt(process.env.REACT_APP_KDF_ITERATIONS || '100000'),
    saltLength: parseInt(process.env.REACT_APP_SALT_LENGTH || '32'),
    ivLength: parseInt(process.env.REACT_APP_IV_LENGTH || '12'),
    tagLength: parseInt(process.env.REACT_APP_TAG_LENGTH || '16'),
  },
  
  ui: {
    theme: (process.env.REACT_APP_DEFAULT_THEME as 'light' | 'dark' | 'auto') || 'auto',
    entriesPerPage: parseInt(process.env.REACT_APP_ENTRIES_PER_PAGE || '50'),
    autoSaveDelay: parseInt(process.env.REACT_APP_AUTOSAVE_DELAY || '2000'),
    animationDuration: parseInt(process.env.REACT_APP_ANIMATION_DURATION || '300'),
  },
  
  features: {
    twoFactorAuth: process.env.REACT_APP_ENABLE_2FA === 'true',
    biometricAuth: process.env.REACT_APP_ENABLE_BIOMETRIC === 'true',
    offlineMode: process.env.REACT_APP_ENABLE_OFFLINE === 'true',
    auditLogging: process.env.REACT_APP_ENABLE_AUDIT_LOGGING !== 'false',
    performanceMonitoring: process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING !== 'false',
  },
  
  development: {
    enableDebugLogs: process.env.NODE_ENV === 'development' || process.env.REACT_APP_DEBUG_LOGS === 'true',
    mockApi: process.env.REACT_APP_MOCK_API === 'true',
    skipCrypto: process.env.REACT_APP_SKIP_CRYPTO === 'true',
  },
};

// Configuration validation
function validateConfig(config: AppConfig): string[] {
  const errors: string[] = [];
  
  // Validate API configuration
  if (!config.api.baseUrl) {
    errors.push('API base URL is required');
  }
  
  if (config.api.timeout < 1000) {
    errors.push('API timeout must be at least 1000ms');
  }
  
  if (config.api.retryAttempts < 0 || config.api.retryAttempts > 10) {
    errors.push('API retry attempts must be between 0 and 10');
  }
  
  // Validate security configuration
  if (config.security.sessionTimeout < 60000) {
    errors.push('Session timeout must be at least 1 minute');
  }
  
  if (config.security.idleTimeout < 30000) {
    errors.push('Idle timeout must be at least 30 seconds');
  }
  
  if (config.security.maxLoginAttempts < 1) {
    errors.push('Max login attempts must be at least 1');
  }
  
  // Validate crypto configuration
  if (config.crypto.keyDerivationIterations < 10000) {
    errors.push('Key derivation iterations must be at least 10,000');
  }
  
  if (config.crypto.saltLength < 16) {
    errors.push('Salt length must be at least 16 bytes');
  }
  
  // Validate UI configuration
  if (config.ui.entriesPerPage < 1 || config.ui.entriesPerPage > 1000) {
    errors.push('Entries per page must be between 1 and 1000');
  }
  
  return errors;
}

// Create and validate configuration
function createConfig(): AppConfig {
  const config = { ...defaultConfig };
  
  // Override with environment-specific values
  if (process.env.NODE_ENV === 'production') {
    config.development.enableDebugLogs = false;
    config.development.mockApi = false;
    config.development.skipCrypto = false;
  }
  
  // Validate configuration
  const errors = validateConfig(config);
  if (errors.length > 0) {
    console.error('Configuration validation errors:', errors);
    throw new Error(`Invalid configuration: ${errors.join(', ')}`);
  }
  
  return config;
}

export const config = createConfig();

// Configuration utilities
export const isProduction = () => process.env.NODE_ENV === 'production';
export const isDevelopment = () => process.env.NODE_ENV === 'development';
export const isFeatureEnabled = (feature: keyof AppConfig['features']) => config.features[feature];

// Runtime configuration updates (for feature flags)
export const updateFeatureFlag = (feature: keyof AppConfig['features'], enabled: boolean) => {
  config.features[feature] = enabled;
  localStorage.setItem(`feature_${feature}`, enabled.toString());
};

// Load feature flags from localStorage
Object.keys(config.features).forEach(feature => {
  const stored = localStorage.getItem(`feature_${feature}`);
  if (stored !== null) {
    (config.features as any)[feature] = stored === 'true';
  }
});