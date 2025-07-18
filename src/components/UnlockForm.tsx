
import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
  Avatar,
  Alert,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Shield,
  Logout,
} from '@mui/icons-material';
import { useVault } from '@/contexts/VaultContext';
import { useToast } from '@/hooks/use-toast';

export function UnlockForm() {
  const { user, unlockVault, signOut, isLoading } = useVault();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!password) {
      setError('Please enter your master password.');
      return;
    }

    try {
      await unlockVault(password);
      setPassword('');
    } catch (error) {
      setError('Invalid master password. Please try again.');
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 400 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Avatar
          sx={{
            width: 64,
            height: 64,
            mx: 'auto',
            mb: 2,
            bgcolor: 'primary.main',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <Shield sx={{ fontSize: 32 }} />
        </Avatar>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Welcome Back
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          {user?.email}
        </Typography>
        <Typography variant="body2" color="primary.main">
          Enter your master password to unlock your vault
        </Typography>
      </Box>

      <Card elevation={3}>
        <CardHeader>
          <Typography variant="h6" component="h2" align="center" gutterBottom>
            Unlock Your Vault
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Your vault is encrypted and locked for security
          </Typography>
        </CardHeader>
        
        <CardContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <TextField
              fullWidth
              id="master-password"
              label="Master Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your master password"
              required
              autoFocus
              margin="normal"
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
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mt: 3, mb: 2 }}
            >
              {isLoading ? 'Unlocking...' : 'Unlock Vault'}
            </Button>
            
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="text"
                startIcon={<Logout />}
                onClick={signOut}
                size="small"
              >
                Sign out
              </Button>
            </Box>
          </Box>
        </CardContent>
       </Card>
     </Box>
   );
 }
