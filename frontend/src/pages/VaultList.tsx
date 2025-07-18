import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Menu,
  MenuItem,
  Drawer,
  Toolbar,
  FormControl,
  InputLabel,
  Select,
  Chip,
  InputAdornment,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  Tooltip,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Search,
  Add,
  FilterList,
  Sort,
  MoreVert,
  Visibility,
  VisibilityOff,
  Favorite,
  FavoriteBorder,
  Delete,
  Edit,
  ContentCopy,
  VpnKey,
  CreditCard,
  Note,
  Label,
  Close,
  Schedule,
  Warning,
} from '@mui/icons-material';
import { useVault } from '../contexts/VaultContext';
import { useNotification } from '../contexts/NotificationContext';
import { useSettings } from '../contexts/SettingsContext';
import PasswordStrengthMeter from '../components/common/PasswordStrengthMeter';

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
      id={`vault-tabpanel-${index}`}
      aria-labelledby={`vault-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const VaultList: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useNotification();
  const { settings } = useSettings();
  const {
    entries,
    categories,
    fetchEntries,
    fetchCategories,
    updateEntry,
    deleteEntry,
    loading,
    error,
  } = useVault();

  // State for filtered and sorted entries
  const [filteredEntries, setFilteredEntries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [sortField, setSortField] = useState<string>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);
  const [showWeakPasswordsOnly, setShowWeakPasswordsOnly] = useState(false);
  
  // Menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  
  // Password visibility state
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Get all unique tags from entries
  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    entries.forEach(entry => {
      if (entry.tags && Array.isArray(entry.tags)) {
        entry.tags.forEach((tag: string) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [entries]);

  useEffect(() => {
    fetchEntries();
    fetchCategories();
  }, []);

  // Apply location state for initial filters if provided
  useEffect(() => {
    if (location.state) {
      const { filter, sort, order, category, type, search } = location.state as any;
      
      if (filter === 'favorites') {
        setShowFavoritesOnly(true);
      } else if (filter === 'expiring') {
        setShowExpiredOnly(true);
      } else if (filter === 'weak') {
        setShowWeakPasswordsOnly(true);
      }
      
      if (sort) setSortField(sort);
      if (order) setSortOrder(order);
      if (category) setSelectedCategory(category);
      if (type) setSelectedType(type);
      if (search) setSearchTerm(search);
      
      // Clear location state to prevent reapplying filters on navigation
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Filter and sort entries whenever dependencies change
  useEffect(() => {
    let result = [...entries];
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(entry => {
        return (
          entry.name?.toLowerCase().includes(searchLower) ||
          entry.username?.toLowerCase().includes(searchLower) ||
          entry.url?.toLowerCase().includes(searchLower) ||
          entry.notes?.toLowerCase().includes(searchLower) ||
          (entry.tags && entry.tags.some((tag: string) => tag.toLowerCase().includes(searchLower)))
        );
      });
    }
    
    // Apply category filter
    if (selectedCategory) {
      result = result.filter(entry => entry.categoryId === selectedCategory);
    }
    
    // Apply type filter
    if (selectedType) {
      result = result.filter(entry => entry.type === selectedType);
    }
    
    // Apply tags filter
    if (selectedTags.length > 0) {
      result = result.filter(entry => {
        if (!entry.tags) return false;
        return selectedTags.every(tag => entry.tags.includes(tag));
      });
    }
    
    // Apply favorites filter
    if (showFavoritesOnly) {
      result = result.filter(entry => entry.isFavorite);
    }
    
    // Apply expired filter
    if (showExpiredOnly) {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);
      
      result = result.filter(entry => {
        if (!entry.expiresAt) return false;
        const expiryDate = new Date(entry.expiresAt);
        return expiryDate <= thirtyDaysFromNow;
      });
    }
    
    // Apply weak passwords filter
    if (showWeakPasswordsOnly) {
      result = result.filter(entry => {
        return entry.type === 'password' && entry.passwordStrength && entry.passwordStrength < 50;
      });
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let valueA = a[sortField];
      let valueB = b[sortField];
      
      // Handle dates
      if (sortField === 'createdAt' || sortField === 'updatedAt' || sortField === 'expiresAt') {
        valueA = valueA ? new Date(valueA).getTime() : 0;
        valueB = valueB ? new Date(valueB).getTime() : 0;
      }
      // Handle strings
      else if (typeof valueA === 'string' && typeof valueB === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      // Handle undefined values
      else {
        valueA = valueA || '';
        valueB = valueB || '';
      }
      
      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
    
    setFilteredEntries(result);
  }, [
    entries,
    searchTerm,
    selectedCategory,
    selectedType,
    selectedTags,
    sortField,
    sortOrder,
    showFavoritesOnly,
    showExpiredOnly,
    showWeakPasswordsOnly,
  ]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedCategory(e.target.value as string);
  };

  const handleTypeChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedType(e.target.value as string);
  };

  const handleSortChange = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, entryId: string) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedEntryId(entryId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedEntryId(null);
  };

  const handleTogglePasswordVisibility = (entryId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [entryId]: !prev[entryId],
    }));
  };

  const handleToggleFavorite = async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    
    try {
      await updateEntry(entryId, {
        ...entry,
        isFavorite: !entry.isFavorite,
      });
      showSuccess(entry.isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (err) {
      showError('Failed to update favorite status');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      await deleteEntry(entryId);
      showSuccess('Entry deleted successfully');
    } catch (err) {
      showError('Failed to delete entry');
    }
  };

  const handleCopyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    showSuccess(`${fieldName} copied to clipboard`);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedType('');
    setSelectedTags([]);
    setShowFavoritesOnly(false);
    setShowExpiredOnly(false);
    setShowWeakPasswordsOnly(false);
    setSortField('updatedAt');
    setSortOrder('desc');
  };

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'password':
        return <VpnKey fontSize="small" />;
      case 'card':
        return <CreditCard fontSize="small" />;
      case 'note':
        return <Note fontSize="small" />;
      default:
        return <VpnKey fontSize="small" />;
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Uncategorized';
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) <= new Date();
  };

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    return expiryDate > now && expiryDate <= thirtyDaysFromNow;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Vault
        </Typography>

        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
            <TextField
              placeholder="Search vault..."
              value={searchTerm}
              onChange={handleSearchChange}
              variant="outlined"
              size="small"
              sx={{ flexGrow: 1, minWidth: '200px' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowFilterDrawer(true)}
              size="small"
            >
              Filter
            </Button>

            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/vault/new')}
              size="small"
            >
              Add Entry
            </Button>
          </Box>

          {/* Active filters display */}
          {(selectedCategory || selectedType || selectedTags.length > 0 || showFavoritesOnly || showExpiredOnly || showWeakPasswordsOnly) && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Typography variant="body2" sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                Active filters:
              </Typography>
              
              {selectedCategory && (
                <Chip
                  size="small"
                  label={`Category: ${getCategoryName(selectedCategory)}`}
                  onDelete={() => setSelectedCategory('')}
                />
              )}
              
              {selectedType && (
                <Chip
                  size="small"
                  label={`Type: ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`}
                  onDelete={() => setSelectedType('')}
                />
              )}
              
              {selectedTags.map(tag => (
                <Chip
                  key={tag}
                  size="small"
                  label={`Tag: ${tag}`}
                  onDelete={() => handleTagToggle(tag)}
                />
              ))}
              
              {showFavoritesOnly && (
                <Chip
                  size="small"
                  label="Favorites only"
                  onDelete={() => setShowFavoritesOnly(false)}
                  icon={<Favorite fontSize="small" />}
                />
              )}
              
              {showExpiredOnly && (
                <Chip
                  size="small"
                  label="Expiring entries"
                  onDelete={() => setShowExpiredOnly(false)}
                  icon={<Schedule fontSize="small" />}
                />
              )}
              
              {showWeakPasswordsOnly && (
                <Chip
                  size="small"
                  label="Weak passwords"
                  onDelete={() => setShowWeakPasswordsOnly(false)}
                  icon={<Warning fontSize="small" />}
                />
              )}
              
              <Button size="small" onClick={handleClearFilters}>
                Clear all
              </Button>
            </Box>
          )}

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="vault view tabs"
              variant={isMobile ? 'fullWidth' : 'standard'}
            >
              <Tab label="List View" id="vault-tab-0" aria-controls="vault-tabpanel-0" />
              <Tab label="Grid View" id="vault-tab-1" aria-controls="vault-tabpanel-1" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            {filteredEntries.length > 0 ? (
              <List>
                {filteredEntries.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <ListItem
                      button
                      onClick={() => navigate(`/vault/entry/${entry.id}`)}
                      sx={{
                        borderRadius: 1,
                        mb: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <ListItemIcon>{getEntryIcon(entry.type)}</ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1">{entry.name}</Typography>
                            {entry.isFavorite && <Favorite fontSize="small" color="error" />}
                            {isExpired(entry.expiresAt) && (
                              <Chip size="small" label="Expired" color="error" />
                            )}
                            {isExpiringSoon(entry.expiresAt) && !isExpired(entry.expiresAt) && (
                              <Chip size="small" label="Expiring soon" color="warning" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" component="span">
                              {getCategoryName(entry.categoryId)}
                              {entry.username && ` • ${entry.username}`}
                            </Typography>
                            {entry.type === 'password' && entry.passwordStrength && (
                              <Box sx={{ mt: 0.5 }}>
                                <PasswordStrengthMeter
                                  password={entry.password || ''}
                                  strength={entry.passwordStrength}
                                  showText={false}
                                  size="small"
                                />
                              </Box>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex' }}>
                          {entry.type === 'password' && (
                            <Tooltip title={visiblePasswords[entry.id] ? 'Hide password' : 'Show password'}>
                              <IconButton
                                edge="end"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePasswordVisibility(entry.id);
                                }}
                                size="small"
                              >
                                {visiblePasswords[entry.id] ? (
                                  <VisibilityOff fontSize="small" />
                                ) : (
                                  <Visibility fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="More options">
                            <IconButton
                              edge="end"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMenuOpen(e, entry.id);
                              }}
                              size="small"
                            >
                              <MoreVert fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {visiblePasswords[entry.id] && entry.type === 'password' && (
                      <Box
                        sx={{
                          ml: 9,
                          mb: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Typography variant="body2" fontFamily="monospace">
                          {entry.password}
                        </Typography>
                        <Tooltip title="Copy password">
                          <IconButton
                            size="small"
                            onClick={() => handleCopyToClipboard(entry.password, 'Password')}
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No entries found
                </Typography>
                {(selectedCategory || selectedType || selectedTags.length > 0 || showFavoritesOnly || showExpiredOnly || showWeakPasswordsOnly || searchTerm) ? (
                  <Button variant="outlined" onClick={handleClearFilters} sx={{ mt: 2 }}>
                    Clear filters
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => navigate('/vault/new')}
                    sx={{ mt: 2 }}
                  >
                    Add Your First Entry
                  </Button>
                )}
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {filteredEntries.length > 0 ? (
              <Grid container spacing={2}>
                {filteredEntries.map((entry) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={entry.id}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 2,
                        '&:hover': { boxShadow: 3 },
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getEntryIcon(entry.type)}
                            <Typography variant="h6" component="div" noWrap>
                              {entry.name}
                            </Typography>
                          </Box>
                          <Box>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleFavorite(entry.id)}
                              color={entry.isFavorite ? 'error' : 'default'}
                            >
                              {entry.isFavorite ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
                            </IconButton>
                          </Box>
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {getCategoryName(entry.categoryId)}
                        </Typography>

                        {entry.username && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Username
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" noWrap sx={{ maxWidth: '80%' }}>
                                {entry.username}
                              </Typography>
                              <Tooltip title="Copy username">
                                <IconButton
                                  size="small"
                                  onClick={() => handleCopyToClipboard(entry.username, 'Username')}
                                >
                                  <ContentCopy fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        )}

                        {entry.type === 'password' && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Password
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" noWrap sx={{ maxWidth: '80%' }}>
                                {visiblePasswords[entry.id] ? entry.password : '••••••••••••'}
                              </Typography>
                              <Tooltip title={visiblePasswords[entry.id] ? 'Hide password' : 'Show password'}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleTogglePasswordVisibility(entry.id)}
                                >
                                  {visiblePasswords[entry.id] ? (
                                    <VisibilityOff fontSize="small" />
                                  ) : (
                                    <Visibility fontSize="small" />
                                  )}
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
                            {entry.passwordStrength && (
                              <Box sx={{ mt: 1 }}>
                                <PasswordStrengthMeter
                                  password={entry.password || ''}
                                  strength={entry.passwordStrength}
                                  showText={false}
                                  size="small"
                                />
                              </Box>
                            )}
                          </Box>
                        )}

                        {entry.tags && entry.tags.length > 0 && (
                          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {entry.tags.slice(0, 3).map((tag: string) => (
                              <Chip key={tag} label={tag} size="small" variant="outlined" />
                            ))}
                            {entry.tags.length > 3 && (
                              <Chip
                                label={`+${entry.tags.length - 3}`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        )}

                        {entry.expiresAt && (
                          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Schedule
                              fontSize="small"
                              color={isExpired(entry.expiresAt) ? 'error' : 'warning'}
                            />
                            <Typography
                              variant="caption"
                              color={isExpired(entry.expiresAt) ? 'error' : 'warning.main'}
                            >
                              {isExpired(entry.expiresAt)
                                ? 'Expired'
                                : 'Expires ' + new Date(entry.expiresAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          onClick={() => navigate(`/vault/entry/${entry.id}`)}
                        >
                          View Details
                        </Button>
                        <Button
                          size="small"
                          onClick={() => navigate(`/vault/entry/${entry.id}/edit`)}
                          startIcon={<Edit fontSize="small" />}
                        >
                          Edit
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No entries found
                </Typography>
                {(selectedCategory || selectedType || selectedTags.length > 0 || showFavoritesOnly || showExpiredOnly || showWeakPasswordsOnly || searchTerm) ? (
                  <Button variant="outlined" onClick={handleClearFilters} sx={{ mt: 2 }}>
                    Clear filters
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => navigate('/vault/new')}
                    sx={{ mt: 2 }}
                  >
                    Add Your First Entry
                  </Button>
                )}
              </Box>
            )}
          </TabPanel>
        </Paper>
      </Box>

      {/* Entry Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (selectedEntryId) {
              navigate(`/vault/entry/${selectedEntryId}`);
            }
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedEntryId) {
              navigate(`/vault/entry/${selectedEntryId}/edit`);
            }
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedEntryId) {
              const entry = entries.find(e => e.id === selectedEntryId);
              if (entry) {
                handleToggleFavorite(selectedEntryId);
              }
            }
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            {selectedEntryId && entries.find(e => e.id === selectedEntryId)?.isFavorite ? (
              <FavoriteBorder fontSize="small" />
            ) : (
              <Favorite fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>
            {selectedEntryId && entries.find(e => e.id === selectedEntryId)?.isFavorite
              ? 'Remove from Favorites'
              : 'Add to Favorites'}
          </ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            if (selectedEntryId) {
              handleDeleteEntry(selectedEntryId);
            }
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ color: 'error' }}>
            Delete
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* Filter Drawer */}
      <Drawer
        anchor="right"
        open={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
      >
        <Box sx={{ width: 300, p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Filters</Typography>
            <IconButton onClick={() => setShowFilterDrawer(false)}>
              <Close />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="category-filter-label">Category</InputLabel>
            <Select
              labelId="category-filter-label"
              value={selectedCategory}
              onChange={handleCategoryChange}
              label="Category"
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map(category => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="type-filter-label">Type</InputLabel>
            <Select
              labelId="type-filter-label"
              value={selectedType}
              onChange={handleTypeChange}
              label="Type"
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="password">Password</MenuItem>
              <MenuItem value="card">Card</MenuItem>
              <MenuItem value="note">Secure Note</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="subtitle2" gutterBottom>
            Tags
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {allTags.length > 0 ? (
              allTags.map(tag => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onClick={() => handleTagToggle(tag)}
                  color={selectedTags.includes(tag) ? 'primary' : 'default'}
                  variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No tags found
              </Typography>
            )}
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            Special Filters
          </Typography>
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showFavoritesOnly}
                  onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                  icon={<FavoriteBorder />}
                  checkedIcon={<Favorite />}
                />
              }
              label="Favorites only"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={showExpiredOnly}
                  onChange={(e) => setShowExpiredOnly(e.target.checked)}
                />
              }
              label="Expiring entries"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={showWeakPasswordsOnly}
                  onChange={(e) => setShowWeakPasswordsOnly(e.target.checked)}
                />
              }
              label="Weak passwords"
            />
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            Sort By
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Button
              size="small"
              variant={sortField === 'name' ? 'contained' : 'outlined'}
              onClick={() => handleSortChange('name')}
              sx={{ mr: 1, mb: 1 }}
              endIcon={sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            >
              Name
            </Button>
            <Button
              size="small"
              variant={sortField === 'updatedAt' ? 'contained' : 'outlined'}
              onClick={() => handleSortChange('updatedAt')}
              sx={{ mr: 1, mb: 1 }}
              endIcon={sortField === 'updatedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
            >
              Last Updated
            </Button>
            <Button
              size="small"
              variant={sortField === 'createdAt' ? 'contained' : 'outlined'}
              onClick={() => handleSortChange('createdAt')}
              sx={{ mr: 1, mb: 1 }}
              endIcon={sortField === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
            >
              Created Date
            </Button>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button variant="outlined" onClick={handleClearFilters}>
              Clear All
            </Button>
            <Button
              variant="contained"
              onClick={() => setShowFilterDrawer(false)}
            >
              Apply Filters
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Container>
  );
};

export default VaultList;