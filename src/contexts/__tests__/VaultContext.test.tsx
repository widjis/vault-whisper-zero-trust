import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { VaultProvider, useVault } from '../VaultContext';
import { apiService } from '../../lib/api';

// Mock the API service
jest.mock('../../lib/api');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Test component to access vault context
const TestComponent = () => {
  const { isAuthenticated, signIn, signOut, entries, addEntry } = useVault();
  
  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'authenticated' : 'not-authenticated'}
      </div>
      <button 
        data-testid="sign-in" 
        onClick={() => signIn('test@example.com', 'password123')}
      >
        Sign In
      </button>
      <button data-testid="sign-out" onClick={signOut}>
        Sign Out
      </button>
      <div data-testid="entries-count">{entries.length}</div>
      <button 
        data-testid="add-entry" 
        onClick={() => addEntry({
          title: 'Test Entry',  // Removed 'id' as it's not in Omit<VaultEntry, "id">
          username: 'testuser',
          password: 'testpass',
          url: 'https://example.com',
          notes: 'Test notes',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })}
      >
        Add Entry
      </button>
    </div>
  );
};

describe('VaultContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize with unauthenticated state', () => {
    render(
      <VaultProvider>
        <TestComponent />
      </VaultProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('entries-count')).toHaveTextContent('0');
  });

  it('should handle successful sign in', async () => {
    const user = userEvent.setup();
    
    // Mock successful API responses
    mockApiService.getSalt.mockResolvedValue('test-salt'); // Fixed: returning string instead of object
    mockApiService.login.mockResolvedValue({
      token: 'test-token',
      user: { 
        id: '1', 
        email: 'test@example.com',
        createdAt: new Date().toISOString() // Added required createdAt property
      }
    });
    mockApiService.getEntries.mockResolvedValue({
      entries: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        limit: 50,
        hasNextPage: false,
        hasPreviousPage: false
      }
    });

    render(
      <VaultProvider>
        <TestComponent />
      </VaultProvider>
    );

    await user.click(screen.getByTestId('sign-in'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    });

    expect(mockApiService.getSalt).toHaveBeenCalledWith('test@example.com');
    expect(mockApiService.login).toHaveBeenCalled();
    expect(mockApiService.getEntries).toHaveBeenCalled();
  });

  it('should handle sign out', async () => {
    const user = userEvent.setup();
    
    // Mock successful sign in first
    mockApiService.getSalt.mockResolvedValue('test-salt');
    mockApiService.login.mockResolvedValue({
      token: 'test-token',
      user: { id: '1', email: 'test@example.com', createdAt: '2023-01-01T00:00:00Z' }
    });
    mockApiService.getEntries.mockResolvedValue({
      entries: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        limit: 50,
        hasNextPage: false,
        hasPreviousPage: false
      }
    });

    render(
      <VaultProvider>
        <TestComponent />
      </VaultProvider>
    );

    // Sign in first
    await user.click(screen.getByTestId('sign-in'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    });

    // Then sign out
    await user.click(screen.getByTestId('sign-out'));

    expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('entries-count')).toHaveTextContent('0');
  });

  it('should handle API errors during sign in', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Mock API error
    mockApiService.getSalt.mockRejectedValue(new Error('Network error'));

    render(
      <VaultProvider>
        <TestComponent />
      </VaultProvider>
    );

    await user.click(screen.getByTestId('sign-in'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Sign in failed:', expect.any(Error));
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
    
    consoleSpy.mockRestore();
  });

  it('should add entries after authentication', async () => {
    const user = userEvent.setup();
    
    // Mock successful authentication
    mockApiService.getSalt.mockResolvedValue('test-salt');
    mockApiService.login.mockResolvedValue({
      token: 'test-token',
      user: { 
        id: '1', 
        email: 'test@example.com',
        createdAt: new Date().toISOString()
      }
    });
    mockApiService.getEntries.mockResolvedValue({
      entries: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        limit: 50,
        hasNextPage: false,
        hasPreviousPage: false
      }
    });

    render(
      <VaultProvider>
        <TestComponent />
      </VaultProvider>
    );

    // Sign in first
    await user.click(screen.getByTestId('sign-in'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    });

    // Add entry
    await user.click(screen.getByTestId('add-entry'));

    await waitFor(() => {
      expect(mockApiService.createEntry).toHaveBeenCalled();
    });
  });
});