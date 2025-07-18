import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { VaultEntry } from '../lib/crypto';
import { Result, AsyncResult, safeAsync, VaultError } from '../lib/types';

// State interfaces
interface User {
  id: string;
  email: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  masterKey: CryptoKey | null;
  lastActivity: number;
}

interface VaultState {
  entries: VaultEntry[];
  selectedEntry: VaultEntry | null;
  searchQuery: string;
  sortBy: 'title' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  filters: {
    category?: string;
    favorite?: boolean;
    tags?: string[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface UIState {
  theme: 'light' | 'dark' | 'auto';
  sidebarOpen: boolean;
  loading: {
    auth: boolean;
    entries: boolean;
    entry: boolean;
  };
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    persistent?: boolean;
  }>;
}

// Combined store interface
interface AppStore extends AuthState, VaultState, UIState {
  // Auth actions
  signIn: (email: string, password: string) => AsyncResult<void>;
  signOut: () => void;
  refreshToken: () => AsyncResult<void>;
  updateLastActivity: () => void;
  
  // Vault actions
  loadEntries: () => AsyncResult<void>;
  addEntry: (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>) => AsyncResult<void>;
  updateEntry: (id: string, updates: Partial<VaultEntry>) => AsyncResult<void>;
  deleteEntry: (id: string) => AsyncResult<void>;
  selectEntry: (entry: VaultEntry | null) => void;
  
  // Search and filter actions
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: VaultState['sortBy']) => void;
  setSortOrder: (order: VaultState['sortOrder']) => void;
  setFilters: (filters: Partial<VaultState['filters']>) => void;
  setPagination: (pagination: Partial<VaultState['pagination']>) => void;
  
  // UI actions
  setTheme: (theme: UIState['theme']) => void;
  toggleSidebar: () => void;
  setLoading: (key: keyof UIState['loading'], loading: boolean) => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Computed selectors
  filteredEntries: () => VaultEntry[];
  sortedEntries: () => VaultEntry[];
  paginatedEntries: () => VaultEntry[];
}

// Create the store with middleware
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial auth state
          isAuthenticated: false,
          user: null,
          token: null,
          masterKey: null,
          lastActivity: Date.now(),
          
          // Initial vault state
          entries: [],
          selectedEntry: null,
          searchQuery: '',
          sortBy: 'updatedAt',
          sortOrder: 'desc',
          filters: {},
          pagination: {
            page: 1,
            limit: 50,
            total: 0,
          },
          
          // Initial UI state
          theme: 'auto',
          sidebarOpen: true,
          loading: {
            auth: false,
            entries: false,
            entry: false,
          },
          notifications: [],
          
          // Auth actions
          signIn: async (email: string, password: string) => {
            return safeAsync(async () => {
              set((state) => {
                state.loading.auth = true;
              });
              
              try {
                // Import API service dynamically
                const { apiService } = await import('../lib/api');
                const { hashPasswordForStorage, base64ToArrayBuffer } = await import('../lib/crypto');
                
                // Get user salt
                const saltResponse = await apiService.getSalt(email);
                const salt = base64ToArrayBuffer(saltResponse);
                
                // Hash password with salt
                const passwordHash = await hashPasswordForStorage(password, salt);
                
                // Login
                const loginResponse = await apiService.login(email, passwordHash);
                
                set((state) => {
                  state.isAuthenticated = true;
                  state.user = loginResponse.user;
                  state.token = loginResponse.token;
                  state.lastActivity = Date.now();
                });
                
                // Load entries
                await get().loadEntries();
              } finally {
                set((state) => {
                  state.loading.auth = false;
                });
              }
            });
          },
          
          signOut: () => {
            set((state) => {
              state.isAuthenticated = false;
              state.user = null;
              state.token = null;
              state.masterKey = null;
              state.entries = [];
              state.selectedEntry = null;
              state.searchQuery = '';
              state.filters = {};
              state.pagination = { page: 1, limit: 50, total: 0 };
            });
            
            localStorage.removeItem('auth_token');
          },
          
          refreshToken: async () => {
            return safeAsync(async () => {
              // For now, just update the last activity
              // In a real implementation, you would call a refresh endpoint
              set((state) => {
                state.lastActivity = Date.now();
              });
            });
          },
          
          updateLastActivity: () => {
            set((state) => {
              state.lastActivity = Date.now();
            });
          },
          
          // Vault actions
          loadEntries: async () => {
            return safeAsync(async () => {
              set((state) => {
                state.loading.entries = true;
              });
              
              try {
                const { apiService } = await import('../lib/api');
                const response = await apiService.getEntries();
                
                set((state) => {
                  state.entries = response.entries;
                  state.pagination.total = response.total;
                });
              } finally {
                set((state) => {
                  state.loading.entries = false;
                });
              }
            });
          },
          
          addEntry: async (entry) => {
            return safeAsync(async () => {
              set((state) => {
                state.loading.entry = true;
              });
              
              try {
                const { apiService } = await import('../lib/api');
                const { encryptVaultEntry } = await import('../lib/crypto');
                
                const masterKey = get().masterKey;
                if (!masterKey) {
                  throw new VaultError('Master key not available', 'NO_MASTER_KEY');
                }
                
                const encryptedData = await encryptVaultEntry(entry, masterKey);
                const response = await apiService.createEntry(entry.title, encryptedData);
                
                set((state) => {
                  state.entries.push({
                    ...entry,
                    id: response.id,
                    createdAt: response.createdAt,
                    updatedAt: response.updatedAt,
                  });
                });
              } finally {
                set((state) => {
                  state.loading.entry = false;
                });
              }
            });
          },
          
          updateEntry: async (id, updates) => {
            return safeAsync(async () => {
              set((state) => {
                state.loading.entry = true;
              });
              
              try {
                const { apiService } = await import('../lib/api');
                const { encryptVaultEntry } = await import('../lib/crypto');
                
                const masterKey = get().masterKey;
                if (!masterKey) {
                  throw new VaultError('Master key not available', 'NO_MASTER_KEY');
                }
                
                const existingEntry = get().entries.find(e => e.id === id);
                if (!existingEntry) {
                  throw new VaultError('Entry not found', 'ENTRY_NOT_FOUND');
                }
                
                const updatedEntry = { ...existingEntry, ...updates };
                const encryptedData = await encryptVaultEntry(updatedEntry, masterKey);
                
                await apiService.updateEntry(id, updatedEntry.title, encryptedData);
                
                set((state) => {
                  const index = state.entries.findIndex(e => e.id === id);
                  if (index !== -1) {
                    state.entries[index] = {
                      ...updatedEntry,
                      updatedAt: new Date().toISOString(),
                    };
                  }
                });
              } finally {
                set((state) => {
                  state.loading.entry = false;
                });
              }
            });
          },
          
          deleteEntry: async (id) => {
            return safeAsync(async () => {
              const { apiService } = await import('../lib/api');
              await apiService.deleteEntry(id);
              
              set((state) => {
                state.entries = state.entries.filter(e => e.id !== id);
                if (state.selectedEntry?.id === id) {
                  state.selectedEntry = null;
                }
              });
            });
          },
          
          selectEntry: (entry) => {
            set((state) => {
              state.selectedEntry = entry;
            });
          },
          
          // Search and filter actions
          setSearchQuery: (query) => {
            set((state) => {
              state.searchQuery = query;
              state.pagination.page = 1; // Reset to first page
            });
          },
          
          setSortBy: (sortBy) => {
            set((state) => {
              state.sortBy = sortBy;
            });
          },
          
          setSortOrder: (order) => {
            set((state) => {
              state.sortOrder = order;
            });
          },
          
          setFilters: (filters) => {
            set((state) => {
              state.filters = { ...state.filters, ...filters };
              state.pagination.page = 1; // Reset to first page
            });
          },
          
          setPagination: (pagination) => {
            set((state) => {
              state.pagination = { ...state.pagination, ...pagination };
            });
          },
          
          // UI actions
          setTheme: (theme) => {
            set((state) => {
              state.theme = theme;
            });
          },
          
          toggleSidebar: () => {
            set((state) => {
              state.sidebarOpen = !state.sidebarOpen;
            });
          },
          
          setLoading: (key, loading) => {
            set((state) => {
              state.loading[key] = loading;
            });
          },
          
          addNotification: (notification) => {
            const id = Math.random().toString(36).substr(2, 9);
            set((state) => {
              state.notifications.push({ ...notification, id });
            });
            return id;
          },
          
          removeNotification: (id) => {
            set((state) => {
              state.notifications = state.notifications.filter(n => n.id !== id);
            });
          },
          
          clearNotifications: () => {
            set((state) => {
              state.notifications = [];
            });
          },
          
          // Computed selectors
          filteredEntries: () => {
            const { entries, searchQuery, filters } = get();
            
            return entries.filter(entry => {
              // Search filter
              if (searchQuery) {
                const query = searchQuery.toLowerCase();
                if (!entry.title.toLowerCase().includes(query) &&
                    !entry.username?.toLowerCase().includes(query) &&
                    !entry.url?.toLowerCase().includes(query)) {
                  return false;
                }
              }
              
              // Category filter
              if (filters.category && entry.category !== filters.category) {
                return false;
              }
              
              // Favorite filter
              if (filters.favorite !== undefined && entry.favorite !== filters.favorite) {
                return false;
              }
              
              // Tags filter
              if (filters.tags && filters.tags.length > 0) {
                if (!entry.tags || !filters.tags.every(tag => entry.tags!.includes(tag))) {
                  return false;
                }
              }
              
              return true;
            });
          },
          
          sortedEntries: () => {
            const { sortBy, sortOrder } = get();
            const filtered = get().filteredEntries();
            
            return [...filtered].sort((a, b) => {
              let aValue: string | number;
              let bValue: string | number;
              
              switch (sortBy) {
                case 'title':
                  aValue = a.title.toLowerCase();
                  bValue = b.title.toLowerCase();
                  break;
                case 'createdAt':
                  aValue = new Date(a.createdAt).getTime();
                  bValue = new Date(b.createdAt).getTime();
                  break;
                case 'updatedAt':
                  aValue = new Date(a.updatedAt).getTime();
                  bValue = new Date(b.updatedAt).getTime();
                  break;
                default:
                  return 0;
              }
              
              if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
              if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
              return 0;
            });
          },
          
          paginatedEntries: () => {
            const { pagination } = get();
            const sorted = get().sortedEntries();
            
            const start = (pagination.page - 1) * pagination.limit;
            const end = start + pagination.limit;
            
            return sorted.slice(start, end);
          },
        }))
      ),
      {
        name: 'vault-app-store',
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          pagination: state.pagination,
        }),
      }
    ),
    { name: 'VaultApp' }
  )
);

// Selectors for better performance
export const useAuth = () => useAppStore((state) => ({
  isAuthenticated: state.isAuthenticated,
  user: state.user,
  signIn: state.signIn,
  signOut: state.signOut,
  updateLastActivity: state.updateLastActivity,
}));

export const useVaultEntries = () => useAppStore((state) => ({
  entries: state.paginatedEntries(),
  selectedEntry: state.selectedEntry,
  loading: state.loading.entries,
  loadEntries: state.loadEntries,
  addEntry: state.addEntry,
  updateEntry: state.updateEntry,
  deleteEntry: state.deleteEntry,
  selectEntry: state.selectEntry,
}));

export const useSearch = () => useAppStore((state) => ({
  searchQuery: state.searchQuery,
  sortBy: state.sortBy,
  sortOrder: state.sortOrder,
  filters: state.filters,
  setSearchQuery: state.setSearchQuery,
  setSortBy: state.setSortBy,
  setSortOrder: state.setSortOrder,
  setFilters: state.setFilters,
}));

export const useUI = () => useAppStore((state) => ({
  theme: state.theme,
  sidebarOpen: state.sidebarOpen,
  loading: state.loading,
  notifications: state.notifications,
  setTheme: state.setTheme,
  toggleSidebar: state.toggleSidebar,
  setLoading: state.setLoading,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
}));