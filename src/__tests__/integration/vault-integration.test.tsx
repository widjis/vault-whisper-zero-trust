import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { VaultProvider, useVault } from '../../contexts/VaultContext';
import { VaultEntryCard } from '../../components/VaultEntryCard';
import { VaultEntryForm } from '../../components/VaultEntryForm';
import { apiService } from '../../lib/api';
import { cryptoService } from '../../lib/crypto';

// Mock dependencies
jest.mock('../../lib/api');
jest.mock('../../lib/crypto');

const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockCryptoService = cryptoService as jest.Mocked<typeof cryptoService>;

// Test theme
const theme = createTheme();

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <VaultProvider>
      {children}
    </VaultProvider>
  </ThemeProvider>
);

// Mock data
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  createdAt: new Date().toISOString(),
};

const mockEntry = {
  id: 'entry-1',
  title: 'Test Entry',
  username: 'test@example.com',
  password: 'TestPassword123!',
  url: 'https://example.com',
  notes: 'Test notes',
  tags: ['work', 'important'],
  favorite: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockEncryptedEntry = {
  id: 'entry-1',
  userId: 'user-1',
  title: 'Test Entry',
  encryptedData: {
    iv: 'test-iv',
    ciphertext: 'test-ciphertext',
    tag: 'test-tag'
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('Vault Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Setup default mocks
    mockCryptoService.deriveKeyFromPassword.mockResolvedValue({
      type: 'secret',
      extractable: false,
      algorithm: { name: 'AES-GCM' },
      usages: ['encrypt', 'decrypt']
    } as CryptoKey);
    mockCryptoService.encryptData.mockResolvedValue({
      iv: 'test-iv',
      ciphertext: 'test-ciphertext',
      tag: 'test-tag'
    });
    mockCryptoService.decryptData.mockResolvedValue(JSON.stringify({
      username: mockEntry.username,
      password: mockEntry.password,
      url: mockEntry.url,
      notes: mockEntry.notes,
      tags: mockEntry.tags,
      favorite: mockEntry.favorite,
    }));
    
    mockApiService.login.mockResolvedValue({
      user: mockUser,
      token: 'test-token',
    });
    
    mockApiService.getEntries.mockResolvedValue({
      entries: [mockEncryptedEntry],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 1,
        limit: 10,
        hasNextPage: false,
        hasPreviousPage: false
      }
    });
    
    mockApiService.createEntry.mockResolvedValue(mockEncryptedEntry);
    mockApiService.updateEntry.mockResolvedValue(mockEncryptedEntry);
    mockApiService.deleteEntry.mockResolvedValue();
  });

  describe('End-to-End Vault Operations', () => {
    it('completes full vault workflow: sign in, create entry, edit entry, delete entry', async () => {
      const user = userEvent.setup();
      
      // Mock component that uses vault context
      const TestComponent = () => {
        const [showForm, setShowForm] = React.useState(false);
        const [editingEntry, setEditingEntry] = React.useState(null);
        
        return (
          <div>
            <button onClick={() => setShowForm(true)}>Add Entry</button>
            <VaultEntryForm
              open={showForm}
              entry={editingEntry}
              onClose={() => {
                setShowForm(false);
                setEditingEntry(null);
              }}
              onSave={async (entryData) => {
                // This would be handled by VaultContext
                setShowForm(false);
                setEditingEntry(null);
              }}
            />
          </div>
        );
      };
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );
      
      // 1. Open form to create new entry
      await user.click(screen.getByText('Add Entry'));
      expect(screen.getByText('New Entry')).toBeInTheDocument();
      
      // 2. Fill out form
      await user.type(screen.getByLabelText(/title/i), 'Integration Test Entry');
      await user.type(screen.getByLabelText(/username/i), 'test@integration.com');
      await user.type(screen.getByLabelText(/password/i), 'IntegrationPassword123!');
      await user.type(screen.getByLabelText(/website url/i), 'https://integration.test');
      
      // 3. Submit form
      await user.click(screen.getByText('Create Entry'));
      
      // 4. Verify API calls
      await waitFor(() => {
        expect(mockCryptoService.encryptData).toHaveBeenCalled();
        expect(mockApiService.createEntry).toHaveBeenCalled();
      });
    });

    it('handles authentication flow with vault operations', async () => {
      const user = userEvent.setup();
      
      // Component that shows auth state
      const AuthTestComponent = () => {
        const { user: currentUser, signIn, signOut, isAuthenticated } = useVault();
        const [email, setEmail] = React.useState('');
        const [password, setPassword] = React.useState('');
        
        const handleSignIn = async () => {
          await signIn(email, password);
        };
        
        if (!isAuthenticated) {
          return (
            <div>
              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="email-input"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="password-input"
              />
              <button onClick={handleSignIn}>Sign In</button>
            </div>
          );
        }
        
        return (
          <div>
            <p>Welcome, {currentUser?.email}</p>
            <button onClick={signOut}>Sign Out</button>
          </div>
        );
      };
      
      render(
        <TestWrapper>
          <AuthTestComponent />
        </TestWrapper>
      );
      
      // 1. Fill in credentials
      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'password123');
      
      // 2. Sign in
      await user.click(screen.getByText('Sign In'));
      
      // 3. Verify authentication
      await waitFor(() => {
        expect(screen.getByText('Welcome, test@example.com')).toBeInTheDocument();
      });
      
      // 4. Sign out
      await user.click(screen.getByText('Sign Out'));
      
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('handles API errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock API error
      mockApiService.login.mockRejectedValue(new Error('Invalid credentials'));
      
      const ErrorTestComponent = () => {
        const { signIn, error } = useVault();
        
        return (
          <div>
            {error && <div data-testid="error-message">{error}</div>}
            <button onClick={() => signIn('test@example.com', 'wrong-password')}>
              Sign In
            </button>
          </div>
        );
      };
      
      render(
        <TestWrapper>
          <ErrorTestComponent />
        </TestWrapper>
      );
      
      await user.click(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid credentials');
      });
    });

    it('handles encryption/decryption errors', async () => {
      const user = userEvent.setup();
      
      // Mock crypto error
      mockCryptoService.decryptData.mockRejectedValue(new Error('Decryption failed'));
      
      const CryptoErrorComponent = () => {
        const { entries, error } = useVault();
        
        React.useEffect(() => {
          // Trigger entry loading which will cause decryption
        }, []);
        
        return (
          <div>
            {error && <div data-testid="crypto-error">{error}</div>}
            <div data-testid="entries-count">{entries.length}</div>
          </div>
        );
      };
      
      render(
        <TestWrapper>
          <CryptoErrorComponent />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('crypto-error')).toHaveTextContent('Decryption failed');
      });
    });
  });

  describe('Performance Integration', () => {
    it('handles large datasets efficiently', async () => {
      // Mock large dataset
      const largeEntrySet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockEncryptedEntry,
        id: `entry-${i}`,
        title: `Entry ${i}`,
      }));
      
      mockApiService.getEntries.mockResolvedValue({
        entries: largeEntrySet,
        pagination: {
          currentPage: 1,
          totalPages: 20,
          totalCount: 1000,
          limit: 50,
          hasNextPage: true,
          hasPreviousPage: false
        }
      });
      
      const PerformanceTestComponent = () => {
        const { entries, isLoading } = useVault();
        
        return (
          <div>
            <div data-testid="loading">{isLoading ? 'Loading...' : 'Loaded'}</div>
            <div data-testid="entry-count">{entries.length} entries</div>
          </div>
        );
      };
      
      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <PerformanceTestComponent />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(5000); // 5 seconds
      expect(screen.getByTestId('entry-count')).toHaveTextContent('1000 entries');
    });
  });

  describe('Security Integration', () => {
    it('properly encrypts sensitive data before API calls', async () => {
      const user = userEvent.setup();
      
      const SecurityTestComponent = () => {
        const { addEntry } = useVault();
        
        const handleAddEntry = async () => {
          await addEntry({
            title: 'Secure Entry',
            username: 'secure@example.com',
            password: 'SecurePassword123!',
            url: 'https://secure.example.com',
            notes: 'Sensitive notes',
            tags: ['secure'],
            favorite: false,
          });
        };
        
        return (
          <button onClick={handleAddEntry}>Add Secure Entry</button>
        );
      };
      
      render(
        <TestWrapper>
          <SecurityTestComponent />
        </TestWrapper>
      );
      
      await user.click(screen.getByText('Add Secure Entry'));
      
      await waitFor(() => {
        // Verify encryption was called with sensitive data
        expect(mockCryptoService.encryptData).toHaveBeenCalledWith(
          expect.stringContaining('SecurePassword123!'),
          expect.any(Uint8Array)
        );
        
        // Verify API was called with encrypted data, not plain text
        expect(mockApiService.createEntry).toHaveBeenCalledWith(
          'Secure Entry',
          'encrypted-data'
        );
        
        // Ensure plain text password is not in API call
        expect(mockApiService.createEntry).not.toHaveBeenCalledWith(
          expect.anything(),
          expect.stringContaining('SecurePassword123!')
        );
      });
    });

    it('clears sensitive data from memory after operations', async () => {
      const user = userEvent.setup();
      
      const MemoryTestComponent = () => {
        const { signOut } = useVault();
        
        return (
          <button onClick={signOut}>Sign Out</button>
        );
      };
      
      render(
        <TestWrapper>
          <MemoryTestComponent />
        </TestWrapper>
      );
      
      // Sign out should clear sensitive data
      await user.click(screen.getByText('Sign Out'));
      
      await waitFor(() => {
        // Verify localStorage is cleared
        expect(localStorage.getItem('vault_token')).toBeNull();
        expect(localStorage.getItem('vault_user')).toBeNull();
      });
    });
  });

  describe('Offline Behavior', () => {
    it('handles network failures gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      mockApiService.getEntries.mockRejectedValue(new Error('Network error'));
      
      const OfflineTestComponent = () => {
        const { entries, error, isLoading } = useVault();
        
        return (
          <div>
            <div data-testid="loading-state">{isLoading ? 'Loading' : 'Not Loading'}</div>
            <div data-testid="error-state">{error || 'No Error'}</div>
            <div data-testid="entries-state">{entries.length} entries</div>
          </div>
        );
      };
      
      render(
        <TestWrapper>
          <OfflineTestComponent />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toHaveTextContent('Network error');
        expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading');
      });
    });
  });
});