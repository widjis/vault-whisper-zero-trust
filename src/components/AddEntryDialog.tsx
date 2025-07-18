
import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  InputAdornment,
  Alert,
} from '@mui/material';
import { Add, Visibility, VisibilityOff } from '@mui/icons-material';
import { useVault } from '@/contexts/VaultContext';
import { useToast } from '@/hooks/use-toast';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { PasswordGenerator } from './PasswordGenerator';

export function AddEntryDialog() {
  const { addEntry } = useVault();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    url: '',
    username: '',
    password: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!form.title.trim()) {
      setError('Please enter a title for this entry.');
      return;
    }

    try {
      await addEntry(form);
      setForm({
        title: '',
        url: '',
        username: '',
        password: '',
        notes: '',
      });
      setOpen(false);
    } catch (error) {
      setError('Failed to add entry. Please try again.');
    }
  };

  return (
    <>
      <Button
        variant="contained"
        size="large"
        startIcon={<Add />}
        onClick={() => setOpen(true)}
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: 3,
          '&:hover': {
            boxShadow: 6,
          },
        }}
      >
        Add Entry
      </Button>
      
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle>Add New Entry</DialogTitle>
        
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <Grid container spacing={3}>
              {/* Entry Form */}
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Title"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Gmail, Facebook, Company Portal"
                    required
                  />
                  
                  <TextField
                    fullWidth
                    label="URL"
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com"
                  />
                  
                  <TextField
                    fullWidth
                    label="Username"
                    value={form.username}
                    onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Email or username"
                  />
                  
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter or generate a password"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  
                  {form.password && (
                    <PasswordStrengthMeter password={form.password} />
                  )}
                  
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={4}
                    value={form.notes}
                    onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional information..."
                  />
                </Box>
              </Grid>
              
              {/* Password Generator */}
              <Grid item xs={12} md={6}>
                <PasswordGenerator
                  onPasswordGenerated={(password) => 
                    setForm(prev => ({ ...prev, password }))
                  }
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">Add Entry</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
