
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SecureStorage } from '@/lib/storage';
import { 
  generateSalt, 
  hashPasswordForStorage, 
  deriveKeyFromPassword, 
  encryptVaultEntry, 
  decryptVaultEntry,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  VaultEntry
} from '@/lib/crypto';
import { apiService } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  salt: string; // base64 encoded
}

interface VaultContextType {
  // Authentication state
  isAuthenticated: boolean;
  isUnlocked: boolean;
  user: User | null;
  
  // Vault state
  entries: VaultEntry[];
  isLoading: boolean;
  
  // Actions
  signUp: (email: string, masterPassword: string) => Promise<void>;
  signIn: (email: string, masterPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  unlockVault: (masterPassword: string) => Promise<void>;
  lockVault: () => void;
  
  // Entry management
  addEntry: (entry: Omit<VaultEntry, 'id'>) => Promise<void>;
  updateEntry: (id: string, entry: Partial<VaultEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  refreshEntries: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function useVault() {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}

let currentEncryptionKey: CryptoKey | null = null;

interface VaultProviderProps {
  children: ReactNode;
}

export function VaultProvider({ children }: VaultProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Initialize from session
  useEffect(() => {
    const session = SecureStorage.getSession();
    if (session && session.isUnlocked) {
      setIsAuthenticated(true);
      setIsUnlocked(true);
      setUser({
        id: session.userId,
        email: session.email,
        salt: '', // Will be loaded when needed
      });
    }
  }, []);

  // Auto-lock timer
  useEffect(() => {
    if (!isUnlocked) return;

    const settings = SecureStorage.getSettings();
    const timeout = setTimeout(() => {
      lockVault();
      toast({
        title: "Vault locked",
        description: "Your vault has been automatically locked for security.",
      });
    }, settings.autoLockTimeout);

    return () => clearTimeout(timeout);
  }, [isUnlocked, toast]);

  const signUp = async (email: string, masterPassword: string): Promise<void> => {
    try {
      setIsLoading(true);

      // Generate salt and hash password
      const salt = generateSalt();
      const passwordHash = await hashPasswordForStorage(masterPassword, salt);

      // Register with API
      const response = await apiService.register(
        email,
        passwordHash,
        arrayBufferToBase64(salt)
      );

      // Set authenticated state
      setIsAuthenticated(true);
      setUser({
        id: response.user.id,
        email: response.user.email,
        salt: response.user.salt || arrayBufferToBase64(salt),
      });

      // Store session
      SecureStorage.setSession({
        userId: response.user.id,
        email: response.user.email,
        isUnlocked: false,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      });

      toast({
        title: "Account created",
        description: "Your account has been created and your vault is ready.",
      });
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, masterPassword: string): Promise<void> => {
    try {
      setIsLoading(true);

      // First, get the user's salt
      const saltBase64 = await apiService.getSalt(email);
      const salt = base64ToArrayBuffer(saltBase64);

      // Hash password with the user's salt
      const passwordHash = await hashPasswordForStorage(masterPassword, new Uint8Array(salt));

      // Login with the correct hash
      const response = await apiService.login(email, passwordHash);
      
      // Set authenticated state
      setIsAuthenticated(true);
      setUser({
        id: response.user.id,
        email: response.user.email,
        salt: response.user.salt!,
      });

      // Store session
      SecureStorage.setSession({
        userId: response.user.id,
        email: response.user.email,
        isUnlocked: false,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      });

      toast({
        title: "Signed in",
        description: "Enter your master password to unlock your vault.",
      });
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setIsAuthenticated(false);
    setIsUnlocked(false);
    setUser(null);
    setEntries([]);
    currentEncryptionKey = null;
    SecureStorage.clearSession();

    toast({
      title: "Signed out",
      description: "You have been securely signed out.",
    });
  };

  const unlockVault = async (masterPassword: string): Promise<void> => {
    try {
      if (!user) throw new Error('No user authenticated');

      setIsLoading(true);

      // Derive encryption key
      const salt = base64ToArrayBuffer(user.salt);
      const encryptionKey = await deriveKeyFromPassword(masterPassword, new Uint8Array(salt));
      
      currentEncryptionKey = encryptionKey;
      setIsUnlocked(true);

      // Update session
      const session = SecureStorage.getSession();
      if (session) {
        SecureStorage.setSession({
          ...session,
          isUnlocked: true,
        });
      }

      // Load entries
      await refreshEntries();

      toast({
        title: "Vault unlocked",
        description: "Your vault is now accessible.",
      });
    } catch (error) {
      console.error('Unlock failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const lockVault = (): void => {
    setIsUnlocked(false);
    setEntries([]);
    currentEncryptionKey = null;

    // Update session
    const session = SecureStorage.getSession();
    if (session) {
      SecureStorage.setSession({
        ...session,
        isUnlocked: false,
      });
    }
  };

  const refreshEntries = async (): Promise<void> => {
    try {
      if (!user || !currentEncryptionKey) return;

      setIsLoading(true);

      // Get encrypted entries from API
      const entriesResponse = await apiService.getEntries();
      
      // Decrypt entries
      const decryptedEntries: VaultEntry[] = [];
      for (const encryptedEntry of entriesResponse.entries) {
        try {
          const decryptedData = await decryptVaultEntry(encryptedEntry.encryptedData, currentEncryptionKey);
          decryptedEntries.push({
            id: encryptedEntry.id,
            title: encryptedEntry.title,
            ...decryptedData,
            createdAt: encryptedEntry.createdAt,
            updatedAt: encryptedEntry.updatedAt,
          });
        } catch (error) {
          console.error('Failed to decrypt entry:', encryptedEntry.id, error);
        }
      }

      setEntries(decryptedEntries);
    } catch (error) {
      console.error('Failed to refresh entries:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const addEntry = async (entry: Omit<VaultEntry, 'id'>): Promise<void> => {
    try {
      if (!user || !currentEncryptionKey) throw new Error('Vault not unlocked');

      setIsLoading(true);

      // Encrypt entry data
      const encryptedData = await encryptVaultEntry(entry, currentEncryptionKey);

      // Create entry via API
      await apiService.createEntry(entry.title, encryptedData);

      await refreshEntries();

      toast({
        title: "Entry added",
        description: `${entry.title} has been added to your vault.`,
      });
    } catch (error) {
      console.error('Failed to add entry:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateEntry = async (id: string, updates: Partial<VaultEntry>): Promise<void> => {
    try {
      if (!user || !currentEncryptionKey) throw new Error('Vault not unlocked');

      setIsLoading(true);

      // Find existing entry in current entries
      const existingEntry = entries.find(e => e.id === id);
      if (!existingEntry) throw new Error('Entry not found');

      // Merge updates
      const updatedEntry = {
        title: updates.title ?? existingEntry.title,
        url: updates.url ?? existingEntry.url,
        username: updates.username ?? existingEntry.username,
        password: updates.password ?? existingEntry.password,
        notes: updates.notes ?? existingEntry.notes,
      };

      // Encrypt updated data
      const encryptedData = await encryptVaultEntry(updatedEntry, currentEncryptionKey);

      // Update entry via API
      await apiService.updateEntry(id, updatedEntry.title, encryptedData);

      await refreshEntries();

      toast({
        title: "Entry updated",
        description: `${updatedEntry.title} has been updated.`,
      });
    } catch (error) {
      console.error('Failed to update entry:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEntry = async (id: string): Promise<void> => {
    try {
      if (!user) throw new Error('User not authenticated');

      setIsLoading(true);

      // Find entry to get title for toast
      const entry = entries.find(e => e.id === id);
      const entryTitle = entry?.title || 'Entry';

      // Delete entry via API
      await apiService.deleteEntry(id);

      await refreshEntries();

      toast({
        title: "Entry deleted",
        description: `${entryTitle} has been removed from your vault.`,
      });
    } catch (error) {
      console.error('Failed to delete entry:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: VaultContextType = {
    isAuthenticated,
    isUnlocked,
    user,
    entries,
    isLoading,
    signUp,
    signIn,
    signOut,
    unlockVault,
    lockVault,
    addEntry,
    updateEntry,
    deleteEntry,
    refreshEntries,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}
