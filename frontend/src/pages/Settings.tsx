import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Divider,
  useTheme,
  useMediaQuery,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Alert,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  AccountCircle,
  Security,
  Settings as SettingsIcon,
  Palette,
  Backup,
  Visibility,
  VisibilityOff,
  Edit,
  Save,
  Delete,
  ContentCopy,
  QrCode,
  Download,
  Upload,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useNotification } from '../contexts/NotificationContext';
import PasswordStrengthMeter from '../components/common/PasswordStrengthMeter';
import PasswordGenerator from '../components/common/PasswordGenerator';
import CategoriesManager from '../components/vault/CategoriesManager';
import TagsManager from '../components/vault/TagsManager';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const Settings: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, updateProfile, changePassword, enable2FA, disable2FA, generateBackupCodes } = useAuth();
  const { settings, updateSettings, exportVault, importVault } = useSettings();
  const { showSuccess, showError } = useNotification();

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Profile state
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
  const [twoFactorSetupOpen, setTwoFactorSetupOpen] = useState(false);
  const [twoFactorQrCode, setTwoFactorQrCode] = useState('');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [backupCodesOpen, setBackupCodesOpen] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // App settings state
  const [appSettings, setAppSettings] = useState({
    autoLockTimeout: settings?.autoLockTimeout || 5,
    darkMode: settings?.darkMode || false,
    passwordGeneratorDefaults: {
      length: settings?.passwordGeneratorDefaults?.length || 16,
      includeUppercase: settings?.passwordGeneratorDefaults?.includeUppercase || true,
      includeLowercase: settings?.passwordGeneratorDefaults?.includeLowercase || true,
      includeNumbers: settings?.passwordGeneratorDefaults?.includeNumbers || true,
      includeSymbols: settings?.passwordGeneratorDefaults?.includeSymbols || true,
    },
    clipboardClearTimeout: settings?.clipboardClearTimeout || 30,
    showPasswordStrength: settings?.showPasswordStrength || true,
  });

  // Import/Export state
  const [importExportLoading, setImportExportLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Profile handlers
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!profileData.firstName || !profileData.lastName) {
      showError('First name and last name are required');
      return;
    }

    setProfileLoading(true);
    try {
      await updateProfile(profileData);
      setIsEditingProfile(false);
      showSuccess('Profile updated successfully');
    } catch (error) {
      showError('Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Password handlers
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword) {
      showError('Current password is required');
      return;
    }

    if (!passwordData.newPassword) {
      showError('New password is required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      showSuccess('Password changed successfully');
    } catch (error) {
      showError('Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUseGeneratedPassword = (password: string) => {
    setPasswordData(prev => ({
      ...prev,
      newPassword: password,
      confirmPassword: password,
    }));
    setShowPasswordGenerator(false);
  };

  // 2FA handlers
  const handleSetup2FA = async () => {
    setTwoFactorLoading(true);
    try {
      const response = await enable2FA();
      setTwoFactorQrCode(response.qrCode);
      setTwoFactorSecret(response.secret);
      setTwoFactorSetupOpen(true);
    } catch (error) {
      showError('Failed to setup 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFactorCode) {
      showError('Please enter the verification code');
      return;
    }

    setTwoFactorLoading(true);
    try {
      await enable2FA(twoFactorCode);
      setTwoFactorEnabled(true);
      setTwoFactorSetupOpen(false);
      showSuccess('Two-factor authentication enabled successfully');
      handleGenerateBackupCodes();
    } catch (error) {
      showError('Failed to verify 2FA code');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setTwoFactorLoading(true);
    try {
      await disable2FA();
      setTwoFactorEnabled(false);
      showSuccess('Two-factor authentication disabled successfully');
    } catch (error) {
      showError('Failed to disable 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleGenerateBackupCodes = async () => {
    setTwoFactorLoading(true);
    try {
      const codes = await generateBackupCodes();
      setBackupCodes(codes);
      setBackupCodesOpen(true);
    } catch (error) {
      showError('Failed to generate backup codes');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    showSuccess('Backup codes copied to clipboard');
  };

  const handleDownloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vault-whisper-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // App settings handlers
  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setAppSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handlePasswordGeneratorSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setAppSettings(prev => ({
      ...prev,
      passwordGeneratorDefaults: {
        ...prev.passwordGeneratorDefaults,
        [name]: type === 'checkbox' ? checked : Number(value),
      },
    }));
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettings(appSettings);
      showSuccess('Settings saved successfully');
    } catch (error) {
      showError('Failed to save settings');
    }
  };

  // Import/Export handlers
  const handleExportVault = async () => {
    setImportExportLoading(true);
    try {
      const exportData = await exportVault();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vault-whisper-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess('Vault exported successfully');
    } catch (error) {
      showError('Failed to export vault');
    } finally {
      setImportExportLoading(false);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImportVault = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        try {
          setImportExportLoading(true);
          const importData = JSON.parse(event.target.result as string);
          await importVault(importData);
          showSuccess('Vault imported successfully');
        } catch (error) {
          showError('Failed to import vault. Invalid file format.');
        } finally {
          setImportExportLoading(false);
        }
      }
    };
    reader.readAsText(file);
    // Reset the file input
    e.target.value = '';
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="settings tabs"
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons={isMobile ? 'auto' : false}
            allowScrollButtonsMobile
            centered={!isMobile}
          >
            <Tab icon={<AccountCircle />} label="Profile" id="settings-tab-0" aria-controls="settings-tabpanel-0" />
            <Tab icon={<Security />} label="Security" id="settings-tab-1" aria-controls="settings-tabpanel-1" />
            <Tab icon={<SettingsIcon />} label="App Settings" id="settings-tab-2" aria-controls="settings-tabpanel-2" />
            <Tab icon={<Backup />} label="Backup & Restore" id="settings-tab-3" aria-controls="settings-tabpanel-3" />
            <Tab icon={<Palette />} label="Customization" id="settings-tab-4" aria-controls="settings-tabpanel-4" />
          </Tabs>
        </Box>

        {/* Profile Tab */}
        <TabPanel value={tabValue} index={0}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardHeader title="Account Information" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    name="firstName"
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    disabled={!isEditingProfile}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    name="lastName"
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                    disabled={!isEditingProfile}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    value={profileData.email}
                    disabled
                    helperText="Email address cannot be changed"
                  />
                </Grid>
                <Grid item xs={12}>
                  {isEditingProfile ? (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Button
                        variant="outlined"
                        onClick={() => setIsEditingProfile(false)}
                        disabled={profileLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={profileLoading ? <CircularProgress size={20} /> : <Save />}
                        onClick={handleSaveProfile}
                        disabled={profileLoading}
                      >
                        Save Changes
                      </Button>
                    </Box>
                  ) : (
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={handleEditProfile}
                    >
                      Edit Profile
                    </Button>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardHeader title="Account Actions" />
            <CardContent>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                fullWidth={isMobile}
              >
                Delete Account
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Warning: This action is irreversible and will permanently delete all your data.
              </Typography>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Security Tab */}
        <TabPanel value={tabValue} index={1}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardHeader title="Change Password" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    name="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            edge="end"
                          >
                            {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="New Password"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            edge="end"
                          >
                            {showNewPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                {passwordData.newPassword && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Password Strength
                    </Typography>
                    <PasswordStrengthMeter password={passwordData.newPassword} />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      onClick={() => setShowPasswordGenerator(true)}
                    >
                      Generate Strong Password
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={passwordLoading ? <CircularProgress size={20} /> : <Save />}
                      onClick={handleChangePassword}
                      disabled={passwordLoading}
                    >
                      Change Password
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardHeader title="Two-Factor Authentication" />
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle1">
                    {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {twoFactorEnabled
                      ? 'Your account is protected with two-factor authentication.'
                      : 'Add an extra layer of security to your account.'}
                  </Typography>
                </Box>
                {twoFactorEnabled ? (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleDisable2FA}
                    disabled={twoFactorLoading}
                  >
                    Disable
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleSetup2FA}
                    disabled={twoFactorLoading}
                  >
                    Enable
                  </Button>
                )}
              </Box>

              {twoFactorEnabled && (
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={handleGenerateBackupCodes}
                  disabled={twoFactorLoading}
                  fullWidth={isMobile}
                  sx={{ mt: 2 }}
                >
                  Generate New Backup Codes
                </Button>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardHeader title="Active Sessions" />
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Manage your active sessions and sign out from other devices.
              </Typography>
              <Button
                variant="outlined"
                color="error"
                sx={{ mt: 2 }}
                fullWidth={isMobile}
              >
                Sign Out All Other Devices
              </Button>
            </CardContent>
          </Card>
        </TabPanel>

        {/* App Settings Tab */}
        <TabPanel value={tabValue} index={2}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardHeader title="General Settings" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={appSettings.darkMode}
                        onChange={handleSettingsChange}
                        name="darkMode"
                      />
                    }
                    label="Dark Mode"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Auto-Lock Timeout (minutes)"
                    name="autoLockTimeout"
                    type="number"
                    value={appSettings.autoLockTimeout}
                    onChange={handleSettingsChange}
                    InputProps={{ inputProps: { min: 1, max: 60 } }}
                    helperText="Automatically lock the vault after this period of inactivity"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Clear Clipboard Timeout (seconds)"
                    name="clipboardClearTimeout"
                    type="number"
                    value={appSettings.clipboardClearTimeout}
                    onChange={handleSettingsChange}
                    InputProps={{ inputProps: { min: 0, max: 300 } }}
                    helperText="Automatically clear sensitive data from clipboard (0 to disable)"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={appSettings.showPasswordStrength}
                        onChange={handleSettingsChange}
                        name="showPasswordStrength"
                      />
                    }
                    label="Show Password Strength Indicators"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardHeader title="Password Generator Defaults" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Password Length: {appSettings.passwordGeneratorDefaults.length}
                  </Typography>
                  <Box sx={{ px: 1 }}>
                    <input
                      type="range"
                      min="8"
                      max="32"
                      name="length"
                      value={appSettings.passwordGeneratorDefaults.length}
                      onChange={handlePasswordGeneratorSettingsChange}
                      style={{ width: '100%' }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={appSettings.passwordGeneratorDefaults.includeUppercase}
                        onChange={handlePasswordGeneratorSettingsChange}
                        name="includeUppercase"
                      />
                    }
                    label="Include Uppercase Letters"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={appSettings.passwordGeneratorDefaults.includeLowercase}
                        onChange={handlePasswordGeneratorSettingsChange}
                        name="includeLowercase"
                      />
                    }
                    label="Include Lowercase Letters"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={appSettings.passwordGeneratorDefaults.includeNumbers}
                        onChange={handlePasswordGeneratorSettingsChange}
                        name="includeNumbers"
                      />
                    }
                    label="Include Numbers"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={appSettings.passwordGeneratorDefaults.includeSymbols}
                        onChange={handlePasswordGeneratorSettingsChange}
                        name="includeSymbols"
                      />
                    }
                    label="Include Symbols"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSaveSettings}
            >
              Save Settings
            </Button>
          </Box>
        </TabPanel>

        {/* Backup & Restore Tab */}
        <TabPanel value={tabValue} index={3}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Regularly backup your vault to prevent data loss. All exports are encrypted with your master password.
          </Alert>

          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardHeader title="Export Vault" />
            <CardContent>
              <Typography variant="body2" gutterBottom>
                Export your vault data as an encrypted JSON file. You'll need your master password to import this file later.
              </Typography>
              <Button
                variant="contained"
                startIcon={importExportLoading ? <CircularProgress size={20} /> : <Download />}
                onClick={handleExportVault}
                disabled={importExportLoading}
                sx={{ mt: 2 }}
                fullWidth={isMobile}
              >
                Export Vault
              </Button>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardHeader title="Import Vault" />
            <CardContent>
              <Typography variant="body2" gutterBottom>
                Import a previously exported vault file. This will merge with your existing vault data.
              </Typography>
              <input
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleImportVault}
              />
              <Button
                variant="outlined"
                startIcon={importExportLoading ? <CircularProgress size={20} /> : <Upload />}
                onClick={handleImportClick}
                disabled={importExportLoading}
                sx={{ mt: 2 }}
                fullWidth={isMobile}
              >
                Import Vault
              </Button>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Customization Tab */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardHeader title="Categories" />
                <CardContent>
                  <CategoriesManager />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardHeader title="Tags" />
                <CardContent>
                  <TagsManager />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Password Generator Dialog */}
      <Dialog open={showPasswordGenerator} onClose={() => setShowPasswordGenerator(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Strong Password</DialogTitle>
        <DialogContent>
          <PasswordGenerator
            onSelectPassword={handleUseGeneratedPassword}
            initialOptions={{
              length: appSettings.passwordGeneratorDefaults.length,
              includeUppercase: appSettings.passwordGeneratorDefaults.includeUppercase,
              includeLowercase: appSettings.passwordGeneratorDefaults.includeLowercase,
              includeNumbers: appSettings.passwordGeneratorDefaults.includeNumbers,
              includeSymbols: appSettings.passwordGeneratorDefaults.includeSymbols,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordGenerator(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* 2FA Setup Dialog */}
      <Dialog open={twoFactorSetupOpen} onClose={() => setTwoFactorSetupOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            1. Scan the QR code with your authenticator app
          </Typography>
          {twoFactorQrCode && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <img src={twoFactorQrCode} alt="QR Code" style={{ maxWidth: '100%', height: 'auto' }} />
            </Box>
          )}
          <Typography variant="subtitle1" gutterBottom>
            2. Or manually enter this secret key:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <TextField
              fullWidth
              value={twoFactorSecret}
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
              size="small"
              sx={{ mr: 1 }}
            />
            <IconButton onClick={() => navigator.clipboard.writeText(twoFactorSecret)}>
              <ContentCopy />
            </IconButton>
          </Box>
          <Typography variant="subtitle1" gutterBottom>
            3. Enter the verification code from your app:
          </Typography>
          <TextField
            fullWidth
            label="6-digit code"
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
            variant="outlined"
            placeholder="000000"
            inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTwoFactorSetupOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleVerify2FA}
            disabled={twoFactorLoading || twoFactorCode.length !== 6}
          >
            Verify and Enable
          </Button>
        </DialogActions>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={backupCodesOpen} onClose={() => setBackupCodesOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Recovery Backup Codes</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Save these backup codes in a secure place. Each code can only be used once to recover access to your account if you lose your authentication device.
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2,
              fontFamily: 'monospace',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 1,
            }}
          >
            {backupCodes.map((code, index) => (
              <Typography key={index} variant="body2">
                {code}
              </Typography>
            ))}
          </Paper>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              startIcon={<ContentCopy />}
              onClick={handleCopyBackupCodes}
              variant="outlined"
            >
              Copy Codes
            </Button>
            <Button
              startIcon={<Download />}
              onClick={handleDownloadBackupCodes}
              variant="outlined"
            >
              Download Codes
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => setBackupCodesOpen(false)}
          >
            I've Saved These Codes
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Settings;