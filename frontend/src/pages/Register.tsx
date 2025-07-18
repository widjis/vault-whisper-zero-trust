import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Paper,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Visibility, VisibilityOff, PersonAddOutlined } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from '../hooks';
import PasswordStrengthMeter from '../components/common/PasswordStrengthMeter';
import PasswordGenerator from '../components/common/PasswordGenerator';

// Define interface for form values
interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  agreeToTerms: boolean;
}

const Register: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Form validation rules
  const validationRules = {
    firstName: (value: string) => {
      if (!value || value.length < 2) {
        return 'First name must be at least 2 characters';
      }
      return null;
    },
    lastName: (value: string) => {
      if (!value || value.length < 2) {
        return 'Last name must be at least 2 characters';
      }
      return null;
    },
    email: (value: string) => {
      if (!value) {
        return 'Email is required';
      }
      const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
      if (!emailRegex.test(value)) {
        return 'Invalid email address';
      }
      return null;
    },
    password: (value: string) => {
      if (!value) {
        return 'Password is required';
      }
      if (value.length < 8) {
        return 'Password must be at least 8 characters';
      }
      return null;
    },
    confirmPassword: (value: string, values: RegisterFormValues) => {
      if (!value) {
        return 'Please confirm your password';
      }
      if (value !== values.password) {
        return 'Passwords do not match';
      }
      return null;
    },
    agreeToTerms: (value: boolean) => {
      if (!value) {
        return 'You must agree to the terms and conditions';
      }
      return null;
    },
  };

  // Initialize form
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    isValid,
    setFieldValue,
  } = useForm<RegisterFormValues>(
    {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
    validationRules
  );

  // Steps for registration process
  const steps = ['Personal Info', 'Account Details', 'Review & Submit'];

  // Handle next step
  const handleNext = () => {
    // Validate current step
    let isStepValid = false;
    
    if (activeStep === 0) {
      isStepValid = (!errors.firstName && !errors.lastName) || 
                   (values.firstName !== '' || values.lastName !== '');
    } else if (activeStep === 1) {
      isStepValid = !errors.email && !errors.password && !errors.confirmPassword && 
                   values.email !== '' && values.password !== '' && values.confirmPassword !== '';
    }
    
    if (isStepValid) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  // Handle back step
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  // Handle form submission
  const onSubmit = async () => {
    if (!isValid) return;
    setError('');
    
    try {
      await register(
        values.email,
        values.password,
        values.firstName || undefined,
        values.lastName || undefined
      );
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    }
  };

  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  // Toggle confirm password visibility
  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  // Handle password generator selection
  const handleSelectPassword = (generatedPassword: string) => {
    setFieldValue('password', generatedPassword);
    setFieldValue('confirmPassword', generatedPassword);
    setShowPasswordGenerator(false);
  };

  // Render step content
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="normal"
                  fullWidth
                  id="firstName"
                  label="First Name"
                  name="firstName"
                  autoComplete="given-name"
                  autoFocus
                  value={values.firstName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.firstName && !!errors.firstName}
                  helperText={touched.firstName && errors.firstName}
                  disabled={isLoading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="normal"
                  fullWidth
                  id="lastName"
                  label="Last Name"
                  name="lastName"
                  autoComplete="family-name"
                  value={values.lastName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.lastName && !!errors.lastName}
                  helperText={touched.lastName && errors.lastName}
                  disabled={isLoading}
                />
              </Grid>
            </Grid>
          </>
        );
      case 1:
        return (
          <>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.email && !!errors.email}
              helperText={touched.email && errors.email}
              disabled={isLoading}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.password && !!errors.password}
              helperText={touched.password && errors.password}
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            {values.password && (
              <PasswordStrengthMeter password={values.password} />
            )}
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.confirmPassword && !!errors.confirmPassword}
              helperText={touched.confirmPassword && errors.confirmPassword}
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={handleToggleConfirmPasswordVisibility}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowPasswordGenerator(!showPasswordGenerator)}
              >
                {showPasswordGenerator ? 'Hide Password Generator' : 'Generate Strong Password'}
              </Button>
            </Box>
            
            {showPasswordGenerator && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <PasswordGenerator onSelectPassword={handleSelectPassword} />
              </Box>
            )}
          </>
        );
      case 2:
        return (
          <>
            <Alert severity="info" sx={{ mb: 3 }}>
              Please review your information before submitting.
            </Alert>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Name
              </Typography>
              <Typography variant="body1">
                {values.firstName} {values.lastName}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Email Address
              </Typography>
              <Typography variant="body1">{values.email}</Typography>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Password
              </Typography>
              <Typography variant="body1">{'•'.repeat(values.password.length)}</Typography>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <label htmlFor="agreeToTerms">
                <input
                  type="checkbox"
                  id="agreeToTerms"
                  name="agreeToTerms"
                  checked={values.agreeToTerms}
                  onChange={handleChange}
                  style={{ marginRight: 8 }}
                />
                I agree to the{' '}
                <Link href="#" target="_blank">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="#" target="_blank">
                  Privacy Policy
                </Link>
              </label>
              {touched.agreeToTerms && errors.agreeToTerms && (
                <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                  {errors.agreeToTerms}
                </Typography>
              )}
            </Box>
          </>
        );
      default:
        return 'Unknown step';
    }
  };

  if (success) {
    return (
      <Container component="main" maxWidth="xs">
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
              p: 4,
              width: '100%',
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              Registration successful! Please check your email to verify your account.
            </Alert>
            <Typography variant="body1" align="center" sx={{ mb: 3 }}>
              You will be redirected to the login page in a few seconds...
            </Typography>
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              color="primary"
              fullWidth
            >
              Go to Login
            </Button>
          </Paper>
        </Box>
      </Container>
    );

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pb: 4,
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
              <PersonAddOutlined />
            </Box>

            <Typography component="h1" variant="h5" fontWeight="bold">
              Create Your Vault Whisper Account
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
              Secure, encrypted storage for your sensitive information
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{!isMobile ? label : ''}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {getStepContent(activeStep)}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                disabled={activeStep === 0 || isLoading}
                onClick={handleBack}
                variant="outlined"
              >
                Back
              </Button>
              
              {activeStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading || !isValid || !values.agreeToTerms}
                >
                  {isLoading ? <CircularProgress size={24} /> : 'Create Account'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={isLoading}
                >
                  Next
                </Button>
              )}
            </Box>
          </form>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" variant="body2">
                Sign in
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;