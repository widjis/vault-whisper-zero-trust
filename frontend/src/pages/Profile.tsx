import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  VpnKey as KeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Security as SecurityIcon,
  DevicesOther as DevicesIcon,
  Logout as LogoutIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPut, apiPost } from '../utils/api';

interface ProfileData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  vaultEntriesCount: number;
  activeSessionsCount: number;
}

interface Session {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
}

const Profile: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Dialog states
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [logoutAllDialogOpen, setLogoutAllDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const data = await apiGet<ProfileData>('/api/profile');
        setProfileData(data);
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email,
        });
      } catch (err) {
        setError('Failed to load profile data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const fetchSessions = async () => {
      try {
        const data = await apiGet<Session[]>('/api/sessions');
        setSessions(data);
      } catch (err) {
        console.error('Failed to load sessions:', err);
      }
    };

    fetchProfileData();
    fetchSessions();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await apiPut('/api/profile', formData);
      setSuccess('Profile updated successfully');
      // Refresh user data in auth context
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      setIsSubmitting(false);
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsSubmitting(false);
      return;
    }

    try {
      await apiPost('/api/profile/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setSuccess('Password changed successfully');
      setPasswordDialogOpen(false);
      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoutAllSessions = async () => {
    setIsSubmitting(true);
    try {
      await apiPost('/api/auth/logout-all', {});
      setSuccess('All other sessions have been terminated');
      // Refresh sessions list
      const data = await apiGet<Session[]>('/api/sessions');
      setSessions(data);
      setLogoutAllDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to logout all sessions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoutSession = async (sessionId: string) => {
    try {
      await apiPost(`/api/sessions/${sessionId}/revoke`, {});
      setSuccess('Session terminated successfully');
      // Refresh sessions list
      const data = await apiGet<Session[]>('/api/sessions');
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to terminate session');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Profile Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Profile Information */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <PersonIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Personal Information</Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Box component="form" onSubmit={handleProfileUpdate}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    helperText={
                      formData.email !== profileData?.email
                        ? 'Changing your email will require verification'
                        : ''
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon />
                        </InputAdornment>
                      ),
                      endAdornment: profileData?.isVerified ? (
                        <InputAdornment position="end">
                          <Chip
                            icon={<CheckIcon />}
                            label="Verified"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        </InputAdornment>
                      ) : (
                        <InputAdornment position="end">
                          <Chip
                            icon={<WarningIcon />}
                            label="Unverified"
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 2, mt: 3 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <SecurityIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Security</Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <List>
              <ListItem>
                <ListItemIcon>
                  <KeyIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Password"
                  secondary="Change your account password"
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="outlined"
                    onClick={() => setPasswordDialogOpen(true)}
                    size="small"
                  >
                    Change
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <DevicesIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Active Sessions"
                  secondary={`You have ${sessions.length} active ${sessions.length === 1 ? 'session' : 'sessions'}`}
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setLogoutAllDialogOpen(true)}
                    size="small"
                    disabled={sessions.length <= 1}
                  >
                    Logout All
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Logout"
                  secondary="Sign out from your current session"
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={logout}
                    size="small"
                  >
                    Logout
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Account Information & Sessions */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <PersonIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Account Information</Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <List>
              <ListItem>
                <ListItemText
                  primary="Account ID"
                  secondary={profileData?.id || 'N/A'}
                  primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                  secondaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Account Created"
                  secondary={
                    profileData?.createdAt
                      ? new Date(profileData.createdAt).toLocaleString()
                      : 'N/A'
                  }
                  primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                  secondaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Last Login"
                  secondary={
                    profileData?.lastLogin
                      ? new Date(profileData.lastLogin).toLocaleString()
                      : 'N/A'
                  }
                  primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                  secondaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Vault Entries"
                  secondary={profileData?.vaultEntriesCount || 0}
                  primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                  secondaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Account Status"
                  secondary={
                    <Chip
                      label={profileData?.isActive ? 'Active' : 'Inactive'}
                      color={profileData?.isActive ? 'success' : 'error'}
                      size="small"
                    />
                  }
                  primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                />
              </ListItem>
            </List>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 2, mt: 3 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <DevicesIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Active Sessions</Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <List>
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <ListItem key={session.id} sx={{ mb: 1 }}>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center">
                          <Typography variant="body1">
                            {session.userAgent.split(' ')[0]}
                            {session.isCurrent && (
                              <Chip
                                label="Current"
                                size="small"
                                color="primary"
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="caption" display="block">
                            IP: {session.ipAddress}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Created: {new Date(session.createdAt).toLocaleString()}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Last Active: {new Date(session.lastActive).toLocaleString()}
                          </Typography>
                        </>
                      }
                    />
                    {!session.isCurrent && (
                      <ListItemSecondaryAction>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => handleLogoutSession(session.id)}
                        >
                          Revoke
                        </Button>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="No active sessions found" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)}>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Please enter your current password and a new password to update your credentials.
          </DialogContentText>
          <Box component="form" onSubmit={handlePasswordUpdate}>
            <TextField
              margin="dense"
              label="Current Password"
              type={showPasswords.current ? 'text' : 'password'}
              fullWidth
              required
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                      }
                      edge="end"
                    >
                      {showPasswords.current ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="dense"
              label="New Password"
              type={showPasswords.new ? 'text' : 'password'}
              fullWidth
              required
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                      }
                      edge="end"
                    >
                      {showPasswords.new ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              helperText="Password must be at least 8 characters long"
            />
            <TextField
              margin="dense"
              label="Confirm New Password"
              type={showPasswords.confirm ? 'text' : 'password'}
              fullWidth
              required
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                      }
                      edge="end"
                    >
                      {showPasswords.confirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handlePasswordUpdate}
            variant="contained"
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Logout All Sessions Dialog */}
      <Dialog open={logoutAllDialogOpen} onClose={() => setLogoutAllDialogOpen(false)}>
        <DialogTitle>Logout All Sessions</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will terminate all your active sessions except the current one. You will be
            logged out from all other devices. Are you sure you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutAllDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleLogoutAllSessions}
            variant="contained"
            color="error"
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Logout All Sessions'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;