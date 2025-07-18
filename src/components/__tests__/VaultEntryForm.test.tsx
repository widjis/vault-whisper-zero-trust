import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { VaultEntryForm } from '../VaultEntryForm';
import { VaultEntry } from '../../lib/crypto';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

// Test theme
const theme = createTheme();

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

// Mock entry data
const mockEntry: VaultEntry = {
  id: 'test-id',
  title: 'Test Entry',
  username: 'test@example.com',
  password: 'TestPassword123!',
  url: 'https://example.com',
  notes: 'Test notes',
  tags: ['work', 'important'],
  favorite: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('VaultEntryForm', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSave: jest.fn(() => Promise.resolve()),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders new entry form correctly', () => {
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('New Entry')).toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/website url/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
      expect(screen.getByText('Create Entry')).toBeInTheDocument();
    });

    it('renders edit entry form with existing data', () => {
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} entry={mockEntry} />
        </TestWrapper>
      );

      expect(screen.getByText('Edit Entry')).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockEntry.title)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockEntry.username)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockEntry.password)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockEntry.url)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockEntry.notes)).toBeInTheDocument();
      expect(screen.getByText('Update Entry')).toBeInTheDocument();
    });

    it('shows loading state correctly', () => {
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} loading={true} />
        </TestWrapper>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      
      // All inputs should be disabled
      expect(screen.getByLabelText(/title/i)).toBeDisabled();
      expect(screen.getByLabelText(/password/i)).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors for required fields', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Create Entry');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });

      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('validates URL format', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} />
        </TestWrapper>
      );

      const urlInput = screen.getByLabelText(/website url/i);
      await user.type(urlInput, 'invalid-url');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid URL')).toBeInTheDocument();
      });
    });

    it('accepts valid form data', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} />
        </TestWrapper>
      );

      // Fill in required fields
      await user.type(screen.getByLabelText(/title/i), 'Test Title');
      await user.type(screen.getByLabelText(/password/i), 'TestPassword123!');

      const submitButton = screen.getByText('Create Entry');
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith({
          title: 'Test Title',
          username: '',
          password: 'TestPassword123!',
          url: '',
          notes: '',
          tags: [],
          favorite: false,
        });
      });
    });
  });

  describe('Password Features', () => {
    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByLabelText(/show password/i);

      expect(passwordInput).toHaveAttribute('type', 'password');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('generates password', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
      const generateButton = screen.getByLabelText(/generate password/i);

      expect(passwordInput.value).toBe('');

      await user.click(generateButton);

      expect(passwordInput.value).not.toBe('');
      expect(passwordInput.value.length).toBeGreaterThanOrEqual(16);
    });

    it('copies password to clipboard', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/password/i);
      const copyButton = screen.getByLabelText(/copy password/i);

      await user.type(passwordInput, 'TestPassword123!');
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('TestPassword123!');
    });

    it('shows password strength indicator', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/password/i);

      // Weak password
      await user.type(passwordInput, '123');
      expect(screen.getByText('Weak')).toBeInTheDocument();

      // Clear and type strong password
      await user.clear(passwordInput);
      await user.type(passwordInput, 'StrongPassword123!@#');
      expect(screen.getByText('Strong')).toBeInTheDocument();
    });
  });

  describe('Tags Management', () => {
    it('adds new tags', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} />
        </TestWrapper>
      );

      const tagInput = screen.getByPlaceholderText('Add tag...');
      const addButton = screen.getByText('Add');

      await user.type(tagInput, 'work');
      await user.click(addButton);

      expect(screen.getByText('work')).toBeInTheDocument();
      expect(tagInput).toHaveValue('');
    });

    it('adds tags with Enter key', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} />
        </TestWrapper>
      );

      const tagInput = screen.getByPlaceholderText('Add tag...');

      await user.type(tagInput, 'important{enter}');

      expect(screen.getByText('important')).toBeInTheDocument();
      expect(tagInput).toHaveValue('');
    });

    it('removes tags', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} entry={mockEntry} />
        </TestWrapper>
      );

      const workTag = screen.getByText('work');
      expect(workTag).toBeInTheDocument();

      // Find and click the delete button for the work tag
      const workChip = workTag.closest('[role="button"]');
      const deleteButton = within(workChip!).getByTestId('CancelIcon');
      await user.click(deleteButton);

      expect(screen.queryByText('work')).not.toBeInTheDocument();
    });

    it('prevents duplicate tags', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} entry={mockEntry} />
        </TestWrapper>
      );

      const tagInput = screen.getByPlaceholderText('Add tag...');
      const addButton = screen.getByText('Add');

      // Try to add existing tag
      await user.type(tagInput, 'work');
      await user.click(addButton);

      // Should still only have one 'work' tag
      const workTags = screen.getAllByText('work');
      expect(workTags).toHaveLength(1);
    });
  });

  describe('Auto-fill Features', () => {
    it('auto-fills title from URL', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} />
        </TestWrapper>
      );

      const urlInput = screen.getByLabelText(/website url/i);
      const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;

      await user.type(urlInput, 'https://github.com');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(titleInput.value).toBe('Github');
      });
    });
  });

  describe('Form Submission', () => {
    it('handles successful submission', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} />
        </TestWrapper>
      );

      // Fill form
      await user.type(screen.getByLabelText(/title/i), 'Test Entry');
      await user.type(screen.getByLabelText(/password/i), 'TestPassword123!');

      // Submit
      await user.click(screen.getByText('Create Entry'));

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalled();
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('handles submission errors', async () => {
      const user = userEvent.setup();
      const onSaveWithError = jest.fn(() => Promise.reject(new Error('Save failed')));
      
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} onSave={onSaveWithError} />
        </TestWrapper>
      );

      // Fill form
      await user.type(screen.getByLabelText(/title/i), 'Test Entry');
      await user.type(screen.getByLabelText(/password/i), 'TestPassword123!');

      // Submit
      await user.click(screen.getByText('Create Entry'));

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/title/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('aria-required', 'true');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VaultEntryForm {...defaultProps} />
        </TestWrapper>
      );

      const titleInput = screen.getByLabelText(/title/i);
      const urlInput = screen.getByLabelText(/website url/i);

      titleInput.focus();
      expect(titleInput).toHaveFocus();

      await user.tab();
      expect(urlInput).toHaveFocus();
    });
  });
});