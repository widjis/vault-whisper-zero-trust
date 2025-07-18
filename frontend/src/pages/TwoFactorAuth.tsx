import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Link,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { VerifiedUser, ContentCopy, Refresh } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks';

const TwoFactorAuth: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  // Get email and password from location state
  const { email = '', password = '', remember = false } = 
    (location.state as { email: string; password: string; remember: boolean }) || {};
  
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [backupCodeError, setBackupCodeError] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [recoveryCodesVisible, setRecoveryCodesVisible] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  
  const { loading, error, post, reset } = useApi();
  
  // Redirect if no email/password provided
  useEffect(() => {
    if (!email || !password) {
      navigate('/login', { replace: true });
    }
  }, [email, password, navigate]);
  
  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);
  
  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste of full code
      if (value.length === 6 && /^\d{6}$/.test(value)) {
        const newDigits = value.split('');
        setDigits(newDigits);
        setCode(value);
        // Focus last input
        if (inputRefs.current[5]) {
          inputRefs.current[5].focus();
        }
        return;
      }
      value = value.slice(0, 1);
    }
    
    if (value && !/^\d$/.test(value)) return;
    
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    
    // Update code
    const newCode = newDigits.join('');
    setCode(newCode);
    setCodeError('');
    
    // Auto-focus next input
    if (value && index < 5) {
      if (inputRefs.current[index + 1]) {
        inputRefs.current[index + 1].focus();
      }
    }
  };
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      if (inputRefs.current[index - 1]) {
        inputRefs.current[index - 1].focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      if (inputRefs.current[index - 1]) {
        inputRefs.current[index - 1].focus();
      }
    } else if (e.key === 'ArrowRight' && index < 5) {
      if (inputRefs.current[index + 1]) {
        inputRefs.current[index + 1].focus();
      }
    }
  };
  
  const handleBackupCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBackupCode(e.target.value);
    setBackupCodeError('');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    
    if (useBackupCode) {
      if (!backupCode) {
        setBackupCodeError('Backup code is required');
        return;
      }
      
      try {
        await login(email, password, remember, backupCode);
        navigate('/', { replace: true });
      } catch (err) {
        // Error is handled by useApi
      }
    } else {
      if (code.length !== 6) {
        setCodeError('Please enter all 6 digits');
        return;
      }
      
      try {
        await login(email, password, remember, code);
        navigate('/', { replace: true });
      } catch (err) {
        // Error is handled by useApi
      }
    }
  };
  
  const handleGetRecoveryCodes = async () => {
    try {
      const response = await post('/api/auth/recovery-codes', { email, password });
      if (response?.recoveryCodes) {
        setRecoveryCodes(response.recoveryCodes);
        setRecoveryCodesVisible(true);
      }
    } catch (err) {
      // Error is handled by useApi
    }
  };
  
  const copyRecoveryCodes = () => {
    if (recoveryCodes.length > 0) {
      navigator.clipboard.writeText(recoveryCodes.join('\n'));
    }
  };
  
  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: isMobile ? 3 : 4,
            width: '100%',
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Box
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                width: 56,
                height: 56,
                display: 'flex',
                borderRadius: '50%',
                justifyContent: 'center',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <VerifiedUser />
            </Box>

            <Typography component="h1" variant="h5" fontWeight="bold">
              Two-Factor Authentication
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
              {useBackupCode 
                ? 'Enter a backup code to verify your identity' 
                : 'Enter the 6-digit code from your authenticator app'}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={reset}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            {!useBackupCode ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <TextField
                      key={index}
                      inputRef={(el) => (inputRefs.current[index] = el)}
                      value={digits[index]}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      variant="outlined"
                      margin="dense"
                      inputProps={{
                        maxLength: 1,
                        style: { textAlign: 'center', fontSize: '1.5rem', padding: '12px 0' },
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                      }}
                      sx={{
                        width: '3rem',
                        mx: 0.5,
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: codeError ? 'error.main' : 'inherit',
                          },
                        },
                      }}
                      disabled={loading}
                    />
                  ))}
                </Box>
                {codeError && (
                  <Typography color="error" variant="body2" align="center" sx={{ mt: 1 }}>
                    {codeError}
                  </Typography>
                )}
              </>
            ) : (
              <TextField
                margin="normal"
                required
                fullWidth
                id="backupCode"
                label="Backup Code"
                name="backupCode"
                autoComplete="one-time-code"
                value={backupCode}
                onChange={handleBackupCodeChange}
                error={!!backupCodeError}
                helperText={backupCodeError}
                disabled={loading}
                autoFocus
              />
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Verify'}
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, flexWrap: 'wrap' }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => setUseBackupCode(!useBackupCode)}
                sx={{ mb: isMobile ? 1 : 0 }}
              >
                {useBackupCode ? 'Use authenticator code' : 'Use backup code'}
              </Link>
              
              <Link
                component="button"
                variant="body2"
                onClick={handleGetRecoveryCodes}
                disabled={loading}
              >
                Lost access to authenticator?
              </Link>
            </Box>
            
            {recoveryCodesVisible && recoveryCodes.length > 0 && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">Recovery Codes</Typography>
                  <Box>
                    <IconButton size="small" onClick={copyRecoveryCodes} title="Copy codes">
                      <ContentCopy fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={handleGetRecoveryCodes} title="Refresh codes">
                      <Refresh fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Box 
                  sx={{ 
                    bgcolor: 'background.default', 
                    p: 1, 
                    borderRadius: 1, 
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                  }}
                >
                  {recoveryCodes.map((code, index) => (
                    <Typography key={index} variant="body2" component="div" fontFamily="monospace">
                      {code}
                    </Typography>
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Save these codes in a secure place. Each code can be used once to access your account if you lose your authenticator device.
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Return to Login
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default TwoFactorAuth;