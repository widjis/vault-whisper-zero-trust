import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useLocalStorage } from '../hooks';
import { useAuth } from './AuthContext';

// Define settings interface
export interface Settings {
  // Appearance settings
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  density: 'comfortable' | 'compact' | 'standard';
  
  // Security settings
  autoLockTimeout: number; // in minutes, 0 = never
  passwordGeneratorDefaults: {
    length: number;
    includeUppercase: boolean;
    includeLowercase: boolean;
    includeNumbers: boolean;
    includeSymbols: boolean;
  };
  clipboardClearTimeout: number; // in seconds, 0 = never
  
  // Display settings
  defaultView: 'grid' | 'list';
  defaultSort: 'title' | 'category' | 'lastModified' | 'createdAt';
  defaultSortDirection: 'asc' | 'desc';
  showFavorites: boolean;
  itemsPerPage: number;
  
  // Notification settings
  notificationsEnabled: boolean;
  notificationDuration: number; // in milliseconds
}

// Default settings
export const defaultSettings: Settings = {
  // Appearance settings
  theme: 'system',
  primaryColor: '#2196f3', // MUI blue
  density: 'standard',
  
  // Security settings
  autoLockTimeout: 5, // 5 minutes
  passwordGeneratorDefaults: {
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
  },
  clipboardClearTimeout: 30, // 30 seconds
  
  // Display settings
  defaultView: 'grid',
  defaultSort: 'title',
  defaultSortDirection: 'asc',
  showFavorites: true,
  itemsPerPage: 12,
  
  // Notification settings
  notificationsEnabled: true,
  notificationDuration: 5000, // 5 seconds
};

// Define settings context interface
interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  resetSettings: () => void;
  updatePasswordGeneratorDefaults: (defaults: Partial<Settings['passwordGeneratorDefaults']>) => void;
}

// Create the settings context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Settings provider props
interface SettingsProviderProps {
  children: ReactNode;
}

// Create the settings provider component
export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [storedSettings, setStoredSettings] = useLocalStorage<Settings>('vault_settings', defaultSettings);
  const [settings, setSettings] = useState<Settings>(storedSettings);

  // Sync settings with localStorage
  useEffect(() => {
    setStoredSettings(settings);
  }, [settings, setStoredSettings]);

  // Sync settings with user preferences from server when user changes
  useEffect(() => {
    if (user) {
      // In a real app, you might fetch user settings from the server here
      // For now, we'll just use localStorage
    }
  }, [user]);

  // Update settings
  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
  };

  // Reset settings to defaults
  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  // Update password generator defaults
  const updatePasswordGeneratorDefaults = (defaults: Partial<Settings['passwordGeneratorDefaults']>) => {
    setSettings(prev => ({
      ...prev,
      passwordGeneratorDefaults: {
        ...prev.passwordGeneratorDefaults,
        ...defaults,
      },
    }));
  };

  // Context value
  const value = {
    settings,
    updateSettings,
    resetSettings,
    updatePasswordGeneratorDefaults,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

// Custom hook to use settings context
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};