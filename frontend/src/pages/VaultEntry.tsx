import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Divider,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Edit,
  Delete,
  ContentCopy,
  Favorite,
  FavoriteBorder,
  ArrowBack,
  History,
  Save,
  Cancel,
  Info,
  Lock,
  LockOpen,
  Schedule,
} from '@mui/icons-material';
import { useVault } from '../contexts/VaultContext';
import { useNotification } from '../contexts/NotificationContext';
import PasswordStrengthMeter from '../components/common/PasswordStrengthMeter';
import PasswordGenerator from '../components/common/PasswordGenerator';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`entry-tabpanel-${index}`}
      aria-labelledby={`entry-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const VaultEntry: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const {
    getEntry,
    updateEntry,
    deleteEntry,
    categories,
    fetchCategories,
    loading,
    error,
  } = useVault();

  const [entry, setEntry] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    categoryId: '',
    tags: [] as string[],
    isFavorite: false,
    expiresAt: null as string | null,
  });

  // New tag input
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (id) {
      fetchCategories();
      loadEntry();
    }
  }, [id]);

  const loadEntry = async () => {
    if (!id) return;
    
    try {
      const entryData = await getEntry(id);
      if (entryData) {
        setEntry(entryData);
        setFormData({
          name: entryData.name || '',
          username: entryData.username || '',
          password: entryData.password || '',
          url: entryData.url || '',
          notes: entryData.notes || '',
          categoryId: entryData.categoryId || '',
          tags: entryData.tags || [],
          isFavorite: entryData.isFavorite || false,
          expiresAt: entryData.expiresAt || null,
        });
      }
    } catch (err) {
      showError('Failed to load entry');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleFavorite = async () => {
    if (isEditing) {
      setFormData(prev => ({
        ...prev,
        isFavorite: !prev.isFavorite,
      }));
    } else if (entry) {
      try {
        const updatedEntry = await updateEntry(id!, {
          ...entry,
          isFavorite: !entry.isFavorite,
        });
        setEntry(updatedEntry);
        showSuccess(updatedEntry.isFavorite ? 'Added to favorites' : 'Removed from favorites');
      } catch (err) {
        showError('Failed to update favorite status');
      }
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleCopyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    showSuccess(`${fieldName} copied to clipboard`);
  };

  const handleSave = async () => {
    if (!id) return;
    
    try {
      const updatedEntry = await updateEntry(id, {
        ...entry,
        ...formData,
      });
      setEntry(updatedEntry);
      setIsEditing(false);
      showSuccess('Entry updated successfully');
    } catch (err) {
      showError('Failed to update entry');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteEntry(id);
      showSuccess('Entry deleted successfully');
      navigate('/vault');
    } catch (err) {
      showError('Failed to delete entry');
    }
  };

  const handleSelectPassword = (generatedPassword: string) => {
    setFormData(prev => ({
      ...prev,
      password: generatedPassword,
    }));
    setShowPasswordGenerator(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!entry) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="info">Entry not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/vault')}
          sx={{ mb: 2 }}
        >
          Back to Vault
        </Button>

        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h1">
              {isEditing ? 'Edit Entry' : entry.name}
            </Typography>
            <Box>
              <Tooltip title={formData.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                <IconButton onClick={handleToggleFavorite} color={formData.isFavorite ? 'error' : 'default'}>
                  {formData.isFavorite ? <Favorite /> : <FavoriteBorder />}
                </IconButton>
              </Tooltip>
              {!isEditing && (
                <>
                  <Tooltip title="Edit entry">
                    <IconButton onClick={() => setIsEditing(true)} color="primary">
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete entry">
                    <IconButton onClick={() => setShowDeleteDialog(true)} color="error">
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {isEditing ? (
            <Box>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="entry tabs"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab label="Basic Info" id="entry-tab-0" aria-controls="entry-tabpanel-0" />
                <Tab label="Security" id="entry-tab-1" aria-controls="entry-tabpanel-1" />
                <Tab label="Additional Info" id="entry-tab-2" aria-controls="entry-tabpanel-2" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="category-label">Category</InputLabel>
                      <Select
                        labelId="category-label"
                        name="categoryId"
                        value={formData.categoryId}
                        onChange={handleInputChange}
                        label="Category"
                      >
                        <MenuItem value="">None</MenuItem>
                        {categories.map(category => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Website URL"
                      name="url"
                      value={formData.url}
                      onChange={handleInputChange}
                    />
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange}
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
                  </Grid>
                  {formData.password && (
                    <Grid item xs={12}>
                      <PasswordStrengthMeter password={formData.password} />
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setShowPasswordGenerator(!showPasswordGenerator)}
                    >
                      {showPasswordGenerator ? 'Hide Password Generator' : 'Generate Strong Password'}
                    </Button>
                  </Grid>
                  {showPasswordGenerator && (
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                        <PasswordGenerator onSelectPassword={handleSelectPassword} />
                      </Paper>
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Expiration Date"
                      name="expiresAt"
                      type="date"
                      value={formData.expiresAt || ''}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                      helperText="Leave empty for no expiration"
                    />
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      multiline
                      rows={4}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Tags
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {formData.tags.map(tag => (
                        <Chip
                          key={tag}
                          label={tag}
                          onDelete={() => handleRemoveTag(tag)}
                          size="small"
                        />
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        size="small"
                        label="Add tag"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      />
                      <Button variant="outlined" size="small" onClick={handleAddTag}>
                        Add
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </TabPanel>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={() => {
                    setIsEditing(false);
                    // Reset form data to original entry
                    setFormData({
                      name: entry.name || '',
                      username: entry.username || '',
                      password: entry.password || '',
                      url: entry.url || '',
                      notes: entry.notes || '',
                      categoryId: entry.categoryId || '',
                      tags: entry.tags || [],
                      isFavorite: entry.isFavorite || false,
                      expiresAt: entry.expiresAt || null,
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSave}
                  disabled={!formData.name}
                >
                  Save Changes
                </Button>
              </Box>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {entry.categoryId && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Category
                  </Typography>
                  <Typography variant="body1">
                    {categories.find(c => c.id === entry.categoryId)?.name || 'Uncategorized'}
                  </Typography>
                </Grid>
              )}

              {entry.username && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Username
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1">{entry.username}</Typography>
                    <Tooltip title="Copy username">
                      <IconButton
                        size="small"
                        onClick={() => handleCopyToClipboard(entry.username, 'Username')}
                      >
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>
              )}

              {entry.password && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Password
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1">
                      {showPassword ? entry.password : '••••••••••••'}
                    </Typography>
                    <Tooltip title={showPassword ? 'Hide password' : 'Show password'}>
                      <IconButton size="small" onClick={handleTogglePasswordVisibility}>
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Copy password">
                      <IconButton
                        size="small"
                        onClick={() => handleCopyToClipboard(entry.password, 'Password')}
                      >
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  {entry.password && (
                    <Box sx={{ mt: 1 }}>
                      <PasswordStrengthMeter password={entry.password} size="small" />
                    </Box>
                  )}
                </Grid>
              )}

              {entry.url && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Website URL
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1">
                      <a
                        href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {entry.url}
                      </a>
                    </Typography>
                    <Tooltip title="Copy URL">
                      <IconButton
                        size="small"
                        onClick={() => handleCopyToClipboard(entry.url, 'URL')}
                      >
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>
              )}

              {entry.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Notes
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {entry.notes}
                  </Typography>
                </Grid>
              )}

              {entry.tags && entry.tags.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Tags
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {entry.tags.map((tag: string) => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Box>
                </Grid>
              )}

              {entry.expiresAt && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Schedule fontSize="small" color="warning" />
                    <Typography variant="body2" color="text.secondary">
                      Expires on {new Date(entry.expiresAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Info fontSize="small" color="disabled" />
                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(entry.createdAt).toLocaleString()}
                    {entry.updatedAt &&
                      entry.updatedAt !== entry.createdAt &&
                      ` • Updated: ${new Date(entry.updatedAt).toLocaleString()}`}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </Paper>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Delete Entry</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete "{entry.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VaultEntry;