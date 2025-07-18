import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Chip,
  IconButton,
  InputAdornment,
  FormControl,
  FormLabel,
  FormHelperText,
  Autocomplete,
  Switch,
  FormControlLabel,
  Divider,
  Typography,
  Alert,
  LinearProgress,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Add,
  Delete,
  Security,
  Refresh,
  ContentCopy,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { VaultEntry } from '../lib/crypto';
import { useFormValidation } from '../hooks/advanced';
import { validators, ValidationError } from '../lib/types';

interface VaultEntryFormProps {
  open: boolean;
  entry?: VaultEntry | null;
  onClose: () => void;
  onSave: (entry: Partial<VaultEntry>) => Promise<void>;
  loading?: boolean;
}

interface FormData {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  tags: string[];
  favorite: boolean;
}

const initialFormData: FormData = {
  title: '',
  username: '',
  password: '',
  url: '',
  notes: '',
  tags: [],
  favorite: false,
};

// Password strength calculator
const calculatePasswordStrength = (password: string): {
  score: number;
  feedback: string[];
  color: 'error' | 'warning' | 'info' | 'success';
} => {
  if (!password) return { score: 0, feedback: [], color: 'error' };
  
  let score = 0;
  const feedback: string[] = [];
  
  // Length check
  if (password.length >= 8) score += 25;
  else feedback.push('Use at least 8 characters');
  
  if (password.length >= 12) score += 10;
  else if (password.length >= 8) feedback.push('Consider using 12+ characters');
  
  // Character variety
  if (/[a-z]/.test(password)) score += 15;
  else feedback.push('Include lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 15;
  else feedback.push('Include uppercase letters');
  
  if (/[0-9]/.test(password)) score += 15;
  else feedback.push('Include numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 20;
  else feedback.push('Include special characters');
  
  // Common patterns (reduce score)
  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    feedback.push('Avoid repeated characters');
  }
  
  if (/123|abc|qwe/i.test(password)) {
    score -= 15;
    feedback.push('Avoid common sequences');
  }
  
  const color = score >= 80 ? 'success' : score >= 60 ? 'info' : score >= 40 ? 'warning' : 'error';
  
  return { score: Math.max(0, Math.min(100, score)), feedback, color };
};

// Password generator
const generatePassword = (
  length: number = 16,
  includeSymbols: boolean = true,
  excludeSimilar: boolean = true
): string => {
  let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  if (includeSymbols) {
    chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  }
  
  if (excludeSimilar) {
    chars = chars.replace(/[il1Lo0O]/g, '');
  }
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password;
};

export const VaultEntryForm: React.FC<VaultEntryFormProps> = ({
  open,
  entry,
  onClose,
  onSave,
  loading = false,
}) => {
  const theme = useTheme();
  const isEditing = Boolean(entry);
  
  // Form state
  const [formData, setFormData] = useState<FormData>(() => ({
    ...initialFormData,
    ...(entry && {
      title: entry.title || '',
      username: entry.username || '',
      password: entry.password || '',
      url: entry.url || '',
      notes: entry.notes || '',
      tags: entry.tags || [],
      favorite: entry.favorite || false,
    }),
  }));
  
  const [showPassword, setShowPassword] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Form validation
  const validationRules = useMemo(() => ({
    title: (value: string) => {
      const result = validators.required('Title is required').validate(value);
      return result.success ? null : result.error.message;
    },
    username: () => null, // No validation for username
    password: (value: string) => {
      const result = validators.required('Password is required').validate(value);
      return result.success ? null : result.error.message;
    },
    url: (value: string) => {
      if (!value) return null; // URL is optional
      const result = validators.url('Please enter a valid URL').validate(value);
      return result.success ? null : result.error.message;
    },
    notes: () => null, // No validation for notes
    tags: () => null, // No validation for tags
    favorite: () => null, // No validation for favorite
  }), []);
  
  const {
    values,
    errors,
    touched,
    isValid,
    setValue,
    setFieldTouched,
    validateAll,
    reset,
  } = useFormValidation(formData, validationRules);
  
  // Password strength
  const passwordStrength = useMemo(() => 
    calculatePasswordStrength(values.password), 
    [values.password]
  );
  
  // Handlers
  const handleInputChange = useCallback((field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.type === 'checkbox' 
      ? event.target.checked 
      : event.target.value;
    
    setValue(field, value);
    setSaveError(null);
  }, [setValue]);
  
  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !values.tags.includes(newTag.trim())) {
      setValue('tags', [...values.tags, newTag.trim()]);
      setNewTag('');
    }
  }, [newTag, values.tags, setValue]);
  
  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setValue('tags', values.tags.filter(tag => tag !== tagToRemove));
  }, [values.tags, setValue]);
  
  const handleGeneratePassword = useCallback(() => {
    const newPassword = generatePassword();
    setValue('password', newPassword);
  }, [setValue]);
  
  const handleCopyPassword = useCallback(async () => {
    if (values.password) {
      try {
        await navigator.clipboard.writeText(values.password);
        // Could show a toast notification here
      } catch (error: unknown) {
        // Handle error with proper type checking
        if (typeof error === 'object' && error !== null && 'message' in error) {
          console.error('Failed to copy password:', (error as { message: string }).message);
        } else {
          console.error('Failed to copy password:', String(error));
        }
      }
    }
  }, [values.password]);
  
  const handleSubmit = useCallback(async () => {
    try {
      setSaveError(null);
      
      // Validate form
      const isFormValid = validateAll();
      if (!isFormValid) {
        return;
      }
      
      // Save entry
      await onSave(values);
      
      // Reset form and close
      reset();
      onClose();
    } catch (error: unknown) {
      // Handle error with proper type checking
      if (typeof error === 'object' && error !== null && 'message' in error) {
        setSaveError((error as { message: string }).message);
      } else {
        setSaveError('Failed to save entry');
      }
    }
  }, [values, validateAll, onSave, onClose, reset]);
  
  const handleClose = useCallback(() => {
    reset();
    setSaveError(null);
    onClose();
  }, [reset, onClose]);
  
  // Auto-fill URL favicon and title
  const handleUrlBlur = useCallback(async () => {
    if (values.url && !values.title) {
      try {
        const url = new URL(values.url);
        const domain = url.hostname.replace('www.', '');
        const suggestedTitle = domain.split('.')[0];
        
        setValue('title', suggestedTitle.charAt(0).toUpperCase() + suggestedTitle.slice(1));
      } catch {
        // Invalid URL, ignore
      }
    }
  }, [values.url, values.title, setValue]);
  
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Security color="primary" />
          {isEditing ? 'Edit Entry' : 'New Entry'}
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
            {saveError}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Basic Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Title"
                value={values.title}
                onChange={handleInputChange('title')}
                error={Boolean(errors.title)}
                helperText={errors.title}
                required
                fullWidth
                disabled={loading}
              />
              
              <TextField
                label="Website URL"
                value={values.url}
                onChange={handleInputChange('url')}
                onBlur={handleUrlBlur}
                error={Boolean(errors.url)}
                helperText={errors.url}
                fullWidth
                disabled={loading}
                placeholder="https://example.com"
              />
              
              <TextField
                label="Username/Email"
                value={values.username}
                onChange={handleInputChange('username')}
                error={Boolean(errors.username)}
                helperText={errors.username}
                fullWidth
                disabled={loading}
              />
            </Box>
          </Box>
          
          <Divider />
          
          {/* Password Section */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Password
            </Typography>
            
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={values.password}
              onChange={handleInputChange('password')}
              error={Boolean(errors.password)}
              helperText={errors.password}
              required
              fullWidth
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Copy password">
                      <IconButton
                        onClick={handleCopyPassword}
                        disabled={!values.password}
                        size="small"
                      >
                        <ContentCopy />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Generate password">
                      <IconButton
                        onClick={handleGeneratePassword}
                        disabled={loading}
                        size="small"
                      >
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={showPassword ? 'Hide password' : 'Show password'}>
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        size="small"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
            
            {/* Password Strength Indicator */}
            {values.password && (
              <Box sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Password Strength:
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color={`${passwordStrength.color}.main`}
                    fontWeight="medium"
                  >
                    {passwordStrength.score >= 80 ? 'Strong' : 
                     passwordStrength.score >= 60 ? 'Good' : 
                     passwordStrength.score >= 40 ? 'Fair' : 'Weak'}
                  </Typography>
                </Box>
                
                <LinearProgress
                  variant="determinate"
                  value={passwordStrength.score}
                  color={passwordStrength.color}
                  sx={{ height: 4, borderRadius: 2 }}
                />
                
                {passwordStrength.feedback.length > 0 && (
                  <Box sx={{ mt: 0.5 }}>
                    {passwordStrength.feedback.map((feedback, index) => (
                      <Typography
                        key={index}
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        • {feedback}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
          
          <Divider />
          
          {/* Additional Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Additional Information
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Notes"
                value={values.notes}
                onChange={handleInputChange('notes')}
                multiline
                rows={3}
                fullWidth
                disabled={loading}
                placeholder="Additional notes or comments..."
              />
              
              {/* Tags */}
              <FormControl>
                <FormLabel>Tags</FormLabel>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                  {values.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      size="small"
                      disabled={loading}
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    disabled={loading}
                    sx={{ flexGrow: 1 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAddTag}
                    disabled={!newTag.trim() || loading}
                    startIcon={<Add />}
                  >
                    Add
                  </Button>
                </Box>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={values.favorite}
                    onChange={handleInputChange('favorite')}
                    disabled={loading}
                  />
                }
                label="Add to favorites"
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || Object.keys(errors).length > 0}
          startIcon={loading ? undefined : <CheckCircle />}
        >
          {loading ? 'Saving...' : isEditing ? 'Update Entry' : 'Create Entry'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};