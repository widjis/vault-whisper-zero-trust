import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  InputAdornment,
  CircularProgress,
  Alert,
  Grid,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Tooltip,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormHelperText,
  Autocomplete,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  Visibility,
  VisibilityOff,
  Save,
  Delete,
  ArrowBack,
  Add,
  Close,
  ContentCopy,
  VpnKey,
  CreditCard,
  Note,
  Label,
  Schedule,
  Refresh,
} from '@mui/icons-material';
import { useVault } from '../../contexts/VaultContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useSettings } from '../../contexts/SettingsContext';
import PasswordStrengthMeter from '../common/PasswordStrengthMeter';
import PasswordGenerator from '../common/PasswordGenerator';
import { useForm } from '../../hooks/useForm';

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
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

interface VaultEntryFormProps {
  isEdit?: boolean;
}

const VaultEntryForm: React.FC<VaultEntryFormProps> = ({ isEdit = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError } = useNotification();
  const { settings } = useSettings();
  const {
    entries,
    categories,
    fetchEntries,
    fetchCategories,
    addEntry,
    updateEntry,
    deleteEntry,
    loading,
    error,
  } = useVault();

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  
  // Password generator dialog state
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  
  // Category dialog state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Tag input state
  const [tagInput, setTagInput] = useState('');
  
  // Form state
  const initialValues = {
    id: '',
    name: '',
    type: 'password',
    username: '',
    password: '',
    url: '',
    notes: '',
    categoryId: '',
    tags: [] as string[],
    isFavorite: false,
    expiresAt: null as Date | null,
    cardholderName: '',
    cardNumber: '',
    cardExpiryMonth: '',
    cardExpiryYear: '',
    cardCvv: '',
    cardType: '',
  };

  const { values, setValues, handleChange, handleSubmit, errors, setErrors, touched, setTouched } = 
    useForm({
      initialValues,
      onSubmit: handleFormSubmit,
      validate: validateForm,
    });

  // Load entry data if in edit mode
  useEffect(() => {
    fetchCategories();
    
    if (isEdit && id) {
      fetchEntries().then(() => {
        const entry = entries.find(e => e.id === id);
        if (entry) {
          const formattedEntry = {
            ...initialValues,
            ...entry,
            expiresAt: entry.expiresAt ? new Date(entry.expiresAt) : null,
            cardExpiryMonth: entry.cardExpiryMonth || '',
            cardExpiryYear: entry.cardExpiryYear || '',
          };
          setValues(formattedEntry);
          
          // Set tab based on entry type
          if (entry.type === 'card') {
            setTabValue(1);
          } else if (entry.type === 'note') {
            setTabValue(2);
          }
        } else {
          showError('Entry not found');
          navigate('/vault');
        }
      });
    }
  }, [isEdit, id]);

  function validateForm(values: typeof initialValues) {
    const errors: Partial<Record<keyof typeof initialValues, string>> = {};
    
    // Common validations
    if (!values.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!values.categoryId) {
      errors.categoryId = 'Category is required';
    }
    
    // Type-specific validations
    if (values.type === 'password') {
      if (!values.password) {
        errors.password = 'Password is required';
      }
    } else if (values.type === 'card') {
      if (!values.cardholderName) {
        errors.cardholderName = 'Cardholder name is required';
      }
      
      if (!values.cardNumber) {
        errors.cardNumber = 'Card number is required';
      } else if (!/^\d{13,19}$/.test(values.cardNumber.replace(/\s/g, ''))) {
        errors.cardNumber = 'Invalid card number';
      }
      
      if (!values.cardExpiryMonth) {
        errors.cardExpiryMonth = 'Expiry month is required';
      }
      
      if (!values.cardExpiryYear) {
        errors.cardExpiryYear = 'Expiry year is required';
      }
      
      if (!values.cardCvv) {
        errors.cardCvv = 'CVV is required';
      } else if (!/^\d{3,4}$/.test(values.cardCvv)) {
        errors.cardCvv = 'Invalid CVV';
      }
    } else if (values.type === 'note') {
      if (!values.notes) {
        errors.notes = 'Note content is required';
      }
    }
    
    return errors;
  }

  async function handleFormSubmit() {
    try {
      const entryData = {
        ...values,
        expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
      };
      
      if (isEdit && id) {
        await updateEntry(id, entryData);
        showSuccess('Entry updated successfully');
      } else {
        await addEntry(entryData);
        showSuccess('Entry created successfully');
      }
      
      navigate('/vault');
    } catch (err) {
      showError(isEdit ? 'Failed to update entry' : 'Failed to create entry');
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Update entry type based on tab
    let newType = 'password';
    if (newValue === 1) newType = 'card';
    if (newValue === 2) newType = 'note';
    
    setTabValue(newValue);
    setValues({ ...values, type: newType });
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handlePasswordGenerated = (password: string) => {
    setValues({ ...values, password });
    setShowPasswordGenerator(false);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      // In a real app, you would call an API to create a new category
      // For now, we'll just show a success message
      showSuccess(`Category "${newCategoryName}" would be created`);
      setNewCategoryName('');
      setShowCategoryDialog(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !values.tags.includes(tagInput.trim())) {
      setValues({
        ...values,
        tags: [...values.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setValues({
      ...values,
      tags: values.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const handleCopyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    showSuccess(`${fieldName} copied to clipboard`);
  };

  const handleDeleteEntry = async () => {
    if (!isEdit || !id) return;
    
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      await deleteEntry(id);
      showSuccess('Entry deleted successfully');
      navigate('/vault');
    } catch (err) {
      showError('Failed to delete entry');
    }
  };

  if (loading && isEdit) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, mb: 4, px: 2 }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/vault')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" component="h1">
            {isEdit ? 'Edit Entry' : 'New Entry'}
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="entry type tabs"
            variant={isMobile ? 'fullWidth' : 'standard'}
          >
            <Tab 
              label="Password" 
              id="entry-tab-0" 
              aria-controls="entry-tabpanel-0" 
              icon={<VpnKey />}
              iconPosition="start"
            />
            <Tab 
              label="Card" 
              id="entry-tab-1" 
              aria-controls="entry-tabpanel-1" 
              icon={<CreditCard />}
              iconPosition="start"
            />
            <Tab 
              label="Secure Note" 
              id="entry-tab-2" 
              aria-controls="entry-tabpanel-2" 
              icon={<Note />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={values.name}
                  onChange={handleChange}
                  error={touched.name && Boolean(errors.name)}
                  helperText={touched.name && errors.name}
                  required
                  margin="normal"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal" error={touched.categoryId && Boolean(errors.categoryId)}>
                  <InputLabel id="category-label">Category</InputLabel>
                  <Select
                    labelId="category-label"
                    name="categoryId"
                    value={values.categoryId}
                    onChange={handleChange}
                    label="Category"
                    required
                  >
                    {categories.map(category => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {touched.categoryId && errors.categoryId && (
                    <FormHelperText>{errors.categoryId}</FormHelperText>
                  )}
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => setShowCategoryDialog(true)}
                    sx={{ mt: 1, alignSelf: 'flex-start' }}
                  >
                    Add New Category
                  </Button>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <DatePicker
                    label="Expiry Date"
                    value={values.expiresAt}
                    onChange={(date) => setValues({ ...values, expiresAt: date })}                    
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        margin: 'normal',
                      },
                    }}
                  />
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ mr: 2 }}>
                    Tags
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Add a tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    sx={{ mr: 1, flexGrow: 1 }}
                  />
                  <Button size="small" onClick={handleAddTag}>
                    Add
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {values.tags.map(tag => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      size="small"
                    />
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.isFavorite}
                      onChange={(e) => setValues({ ...values, isFavorite: e.target.checked })}
                      name="isFavorite"
                    />
                  }
                  label="Add to favorites"
                />
              </Grid>
            </Grid>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Username / Email"
                  name="username"
                  value={values.username}
                  onChange={handleChange}
                  margin="normal"
                  InputProps={{
                    endAdornment: values.username && (
                      <InputAdornment position="end">
                        <Tooltip title="Copy username">
                          <IconButton
                            onClick={() => handleCopyToClipboard(values.username, 'Username')}
                            edge="end"
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  onChange={handleChange}
                  error={touched.password && Boolean(errors.password)}
                  helperText={touched.password && errors.password}
                  required
                  margin="normal"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={showPassword ? 'Hide password' : 'Show password'}>
                          <IconButton
                            onClick={handleTogglePasswordVisibility}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </Tooltip>
                        {values.password && (
                          <Tooltip title="Copy password">
                            <IconButton
                              onClick={() => handleCopyToClipboard(values.password, 'Password')}
                              edge="end"
                            >
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </InputAdornment>
                    ),
                  }}
                />
                <Box sx={{ mt: 1, mb: 2 }}>
                  <PasswordStrengthMeter password={values.password} />
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => setShowPasswordGenerator(true)}
                  size="small"
                >
                  Generate Strong Password
                </Button>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Website URL"
                  name="url"
                  value={values.url}
                  onChange={handleChange}
                  margin="normal"
                  placeholder="https://example.com"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  value={values.notes}
                  onChange={handleChange}
                  margin="normal"
                  multiline
                  rows={4}
                />
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Cardholder Name"
                  name="cardholderName"
                  value={values.cardholderName}
                  onChange={handleChange}
                  error={touched.cardholderName && Boolean(errors.cardholderName)}
                  helperText={touched.cardholderName && errors.cardholderName}
                  required
                  margin="normal"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Card Number"
                  name="cardNumber"
                  value={values.cardNumber}
                  onChange={handleChange}
                  error={touched.cardNumber && Boolean(errors.cardNumber)}
                  helperText={touched.cardNumber && errors.cardNumber}
                  required
                  margin="normal"
                  InputProps={{
                    endAdornment: values.cardNumber && (
                      <InputAdornment position="end">
                        <Tooltip title="Copy card number">
                          <IconButton
                            onClick={() => handleCopyToClipboard(values.cardNumber, 'Card number')}
                            edge="end"
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth margin="normal" error={touched.cardExpiryMonth && Boolean(errors.cardExpiryMonth)}>
                  <InputLabel id="expiry-month-label">Expiry Month</InputLabel>
                  <Select
                    labelId="expiry-month-label"
                    name="cardExpiryMonth"
                    value={values.cardExpiryMonth}
                    onChange={handleChange}
                    label="Expiry Month"
                    required
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      return (
                        <MenuItem key={month} value={month.toString().padStart(2, '0')}>
                          {month.toString().padStart(2, '0')}
                        </MenuItem>
                      );
                    })}
                  </Select>
                  {touched.cardExpiryMonth && errors.cardExpiryMonth && (
                    <FormHelperText>{errors.cardExpiryMonth}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth margin="normal" error={touched.cardExpiryYear && Boolean(errors.cardExpiryYear)}>
                  <InputLabel id="expiry-year-label">Expiry Year</InputLabel>
                  <Select
                    labelId="expiry-year-label"
                    name="cardExpiryYear"
                    value={values.cardExpiryYear}
                    onChange={handleChange}
                    label="Expiry Year"
                    required
                  >
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() + i;
                      return (
                        <MenuItem key={year} value={year.toString()}>
                          {year}
                        </MenuItem>
                      );
                    })}
                  </Select>
                  {touched.cardExpiryYear && errors.cardExpiryYear && (
                    <FormHelperText>{errors.cardExpiryYear}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="CVV"
                  name="cardCvv"
                  type={showPassword ? 'text' : 'password'}
                  value={values.cardCvv}
                  onChange={handleChange}
                  error={touched.cardCvv && Boolean(errors.cardCvv)}
                  helperText={touched.cardCvv && errors.cardCvv}
                  required
                  margin="normal"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={showPassword ? 'Hide CVV' : 'Show CVV'}>
                          <IconButton
                            onClick={handleTogglePasswordVisibility}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="card-type-label">Card Type</InputLabel>
                  <Select
                    labelId="card-type-label"
                    name="cardType"
                    value={values.cardType}
                    onChange={handleChange}
                    label="Card Type"
                  >
                    <MenuItem value="">Select Card Type</MenuItem>
                    <MenuItem value="visa">Visa</MenuItem>
                    <MenuItem value="mastercard">Mastercard</MenuItem>
                    <MenuItem value="amex">American Express</MenuItem>
                    <MenuItem value="discover">Discover</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  value={values.notes}
                  onChange={handleChange}
                  margin="normal"
                  multiline
                  rows={4}
                />
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Secure Note"
                  name="notes"
                  value={values.notes}
                  onChange={handleChange}
                  error={touched.notes && Boolean(errors.notes)}
                  helperText={touched.notes && errors.notes}
                  required
                  margin="normal"
                  multiline
                  rows={10}
                />
              </Grid>
            </Grid>
          </TabPanel>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/vault')}
            >
              Cancel
            </Button>
            <Box>
              {isEdit && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={handleDeleteEntry}
                  sx={{ mr: 2 }}
                >
                  Delete
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<Save />}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : isEdit ? 'Update' : 'Save'}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>

      {/* Password Generator Dialog */}
      <Dialog
        open={showPasswordGenerator}
        onClose={() => setShowPasswordGenerator(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate Strong Password</DialogTitle>
        <DialogContent>
          <PasswordGenerator onGenerate={handlePasswordGenerated} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordGenerator(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog
        open={showCategoryDialog}
        onClose={() => setShowCategoryDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
          <Button onClick={handleAddCategory} variant="contained" disabled={!newCategoryName.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VaultEntryForm;