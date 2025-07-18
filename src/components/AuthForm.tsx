
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
  LinearProgress,
  Alert,
  Link,
  Container,
  Paper,
  useTheme,
  useMediaQuery,
  Fade,
  Chip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Security as SecurityIcon,
  Email as EmailIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useVault } from '@/contexts/VaultContext';
import { useToast } from '@/hooks/use-toast';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type AuthFormData = z.infer<typeof authSchema>;

interface AuthFormProps {
  mode: 'signin' | 'signup';
  onToggleMode: () => void;
}

const getPasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 25;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/[a-z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 10;
  if (/[^A-Za-z0-9]/.test(password)) strength += 10;
  return Math.min(strength, 100);
};

const getStrengthColor = (strength: number): 'error' | 'warning' | 'info' | 'success' => {
  if (strength < 30) return 'error';
  if (strength < 60) return 'warning';
  if (strength < 80) return 'info';
  return 'success';
};

const getStrengthText = (strength: number): string => {
  if (strength < 30) return 'Weak';
  if (strength < 60) return 'Fair';
  if (strength < 80) return 'Good';
  return 'Strong';
};

export function AuthForm() {
  const { signUp, signIn, isLoading } = useVault();
  const { toast } = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const password = watch('password', '');
  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: AuthFormData) => {
    try {
      if (activeTab === 'signup') {
        await signUp(data.email, data.password);
        toast({
          title: 'Success',
          description: 'Account created successfully',
        });
      } else {
        await signIn(data.email, data.password);
        toast({
          title: 'Success',
          description: 'Signed in successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Authentication failed',
        variant: 'destructive',
      });
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${theme.palette.primary.light}20 0%, ${theme.palette.secondary.light}20 100%)`,
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Fade in timeout={800}>
          <Paper
            elevation={8}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              background: theme.palette.background.paper,
            }}
          >
            {/* Header */}
            <Box
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                p: 4,
                textAlign: 'center',
              }}
            >
              <SecurityIcon sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
                SecureVault
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Zero-knowledge password manager
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                PT Merdeka Tsingshan Indonesia
              </Typography>
            </Box>

            {/* Form */}
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', borderRadius: 1, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
                  <Button
                    fullWidth
                    variant={activeTab === 'signin' ? 'contained' : 'text'}
                    onClick={() => setActiveTab('signin')}
                    sx={{ borderRadius: 0 }}
                  >
                    Sign In
                  </Button>
                  <Button
                    fullWidth
                    variant={activeTab === 'signup' ? 'contained' : 'text'}
                    onClick={() => setActiveTab('signup')}
                    sx={{ borderRadius: 0 }}
                  >
                    Sign Up
                  </Button>
                </Box>
              </Box>

              <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
                {/* Email Field */}
                <TextField
                  {...register('email')}
                  fullWidth
                  label="Email Address"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  sx={{ mb: 3 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Password Field */}
                <TextField
                  {...register('password')}
                  fullWidth
                  label="Master Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={activeTab === 'signin' ? 'current-password' : 'new-password'}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  sx={{ mb: activeTab === 'signup' && password ? 2 : 3 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Password Strength Indicator */}
                {activeTab === 'signup' && password && (
                  <Fade in timeout={300}>
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Password Strength:
                        </Typography>
                        <Chip
                          label={getStrengthText(passwordStrength)}
                          color={getStrengthColor(passwordStrength)}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={passwordStrength}
                        color={getStrengthColor(passwordStrength)}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                      {passwordStrength < 60 && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          <Typography variant="body2">
                            Use a mix of uppercase, lowercase, numbers, and special characters for a stronger password.
                          </Typography>
                        </Alert>
                      )}
                    </Box>
                  </Fade>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isLoading}
                  sx={{
                    mt: 2,
                    mb: 3,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                    },
                  }}
                >
                  {isLoading ? 'Loading...' : activeTab === 'signin' ? 'Sign In' : 'Create Account'}
                </Button>
              </Box>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'start' }}>
                  <LockIcon sx={{ mr: 1, mt: 0.5, fontSize: 20 }} />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Zero-Knowledge Security
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Your master password encrypts all data locally. We never see your passwords.
                    </Typography>
                  </Box>
                </Box>
              </Alert>
            </CardContent>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
}
