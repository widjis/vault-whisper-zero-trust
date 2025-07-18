import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Define vault entry interface
export interface VaultEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  category?: string;
  tags?: string[];
  isFavorite: boolean;
  lastModified: string;
  createdAt: string;
  icon?: string;
}

// Define vault context state
interface VaultContextState {
  entries: VaultEntry[];
  isLoading: boolean;
  error: string | null;
  categories: string[];
  tags: string[];
  lastSync: Date | null;
}

// Define vault context interface
interface VaultContextType extends VaultContextState {
  fetchEntries: () => Promise<void>;
  addEntry: (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'lastModified'>) => Promise<VaultEntry>;
  updateEntry: (id: string, entry: Partial<VaultEntry>) => Promise<VaultEntry>;
  deleteEntry: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  searchEntries: (query: string) => VaultEntry[];
  filterByCategory: (category: string | null) => VaultEntry[];
  filterByTag: (tag: string | null) => VaultEntry[];
  clearError: () => void;
}

// Create the vault context
const VaultContext = createContext<VaultContextType | undefined>(undefined);

// Vault provider props
interface VaultProviderProps {
  children: ReactNode;
}

// Create the vault provider component
export const VaultProvider: React.FC<VaultProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  const [state, setState] = useState<VaultContextState>({
    entries: [],
    isLoading: false,
    error: null,
    categories: [],
    tags: [],
    lastSync: null,
  });

  // Fetch entries when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchEntries();
    } else {
      // Clear entries when not authenticated
      setState(prev => ({
        ...prev,
        entries: [],
        categories: [],
        tags: [],
        lastSync: null,
      }));
    }
  }, [isAuthenticated]);

  // Extract categories and tags from entries
  useEffect(() => {
    if (state.entries.length > 0) {
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(state.entries.map(entry => entry.category).filter(Boolean) as string[])
      ).sort();

      // Extract unique tags
      const allTags = state.entries
        .flatMap(entry => entry.tags || [])
        .filter(Boolean);
      const uniqueTags = Array.from(new Set(allTags)).sort();

      setState(prev => ({
        ...prev,
        categories: uniqueCategories,
        tags: uniqueTags,
      }));
    }
  }, [state.entries]);

  // Fetch all vault entries
  const fetchEntries = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch('/api/vault/entries', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch vault entries');
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        entries: data,
        isLoading: false,
        lastSync: new Date(),
      }));
    } catch (error) {
      console.error('Error fetching vault entries:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch vault entries',
      }));
    }
  };

  // Add a new vault entry
  const addEntry = async (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'lastModified'>) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch('/api/vault/entries', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add vault entry');
      }

      const newEntry = await response.json();
      
      setState(prev => ({
        ...prev,
        entries: [...prev.entries, newEntry],
        isLoading: false,
      }));

      return newEntry;
    } catch (error) {
      console.error('Error adding vault entry:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to add vault entry',
      }));
      throw error;
    }
  };

  // Update an existing vault entry
  const updateEntry = async (id: string, entryUpdate: Partial<VaultEntry>) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch(`/api/vault/entries/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryUpdate),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update vault entry');
      }

      const updatedEntry = await response.json();
      
      setState(prev => ({
        ...prev,
        entries: prev.entries.map(entry => 
          entry.id === id ? updatedEntry : entry
        ),
        isLoading: false,
      }));

      return updatedEntry;
    } catch (error) {
      console.error('Error updating vault entry:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update vault entry',
      }));
      throw error;
    }
  };

  // Delete a vault entry
  const deleteEntry = async (id: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch(`/api/vault/entries/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete vault entry');
      }

      setState(prev => ({
        ...prev,
        entries: prev.entries.filter(entry => entry.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error deleting vault entry:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete vault entry',
      }));
      throw error;
    }
  };

  // Toggle favorite status
  const toggleFavorite = async (id: string) => {
    try {
      const entry = state.entries.find(e => e.id === id);
      if (!entry) {
        throw new Error('Entry not found');
      }

      const updatedEntry = await updateEntry(id, { 
        isFavorite: !entry.isFavorite 
      });

      return updatedEntry;
    } catch (error) {
      console.error('Error toggling favorite status:', error);
      throw error;
    }
  };

  // Search entries by query
  const searchEntries = (query: string): VaultEntry[] => {
    if (!query.trim()) {
      return state.entries;
    }

    const searchTerms = query.toLowerCase().trim().split(/\s+/);
    
    return state.entries.filter(entry => {
      const searchableText = [
        entry.title,
        entry.username,
        entry.url,
        entry.notes,
        entry.category,
        ...(entry.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    });
  };

  // Filter entries by category
  const filterByCategory = (category: string | null): VaultEntry[] => {
    if (!category) {
      return state.entries;
    }

    return state.entries.filter(entry => entry.category === category);
  };

  // Filter entries by tag
  const filterByTag = (tag: string | null): VaultEntry[] => {
    if (!tag) {
      return state.entries;
    }

    return state.entries.filter(entry => 
      entry.tags?.includes(tag)
    );
  };

  // Clear error
  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  // Context value
  const value = {
    ...state,
    fetchEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    toggleFavorite,
    searchEntries,
    filterByCategory,
    filterByTag,
    clearError,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
};

// Custom hook to use vault context
export const useVault = (): VaultContextType => {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};