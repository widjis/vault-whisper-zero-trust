import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Checkbox,
  ListItemText,
  InputAdornment,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as CopyIcon,
  Sort as SortIcon,
} from '@mui/icons-material';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

interface VaultEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string | null;
  notes: string | null;
  category: string | null;
  favorite: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface VaultEntriesResponse {
  entries: VaultEntry[];
  total: number;
}

const CATEGORIES = [
  'Login',
  'Banking',
  'Email',
  'Social Media',
  'Shopping',
  'Work',
  'Personal',
  'Other',
];

const VaultEntries: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialFilter = queryParams.get('filter') || '';

  // State for entries and pagination
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // State for filtering and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(initialFilter === 'favorites');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortDirection, setSortDirection] = useState('desc');

  // State for entry management
  const [selectedEntry, setSelectedEntry] = useState<VaultEntry | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for entry form
  const [entryForm, setEntryForm] = useState<Partial<VaultEntry>>({
    title: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    category: '',
    favorite: false,
    tags: [],
  });

  // State for menu
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuEntryId, setMenuEntryId] = useState<string | null>(null);

  // State for tabs
  const [tabValue, setTabValue] = useState(0);

  // Available tags (would be fetched from API in a real app)
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    fetchEntries();
  }, [searchTerm, categoryFilter, tagFilter, showFavoritesOnly, sortBy, sortDirection]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter.length > 0) params.append('categories', categoryFilter.join(','));
      if (tagFilter.length > 0) params.append('tags', tagFilter.join(','));
      if (showFavoritesOnly) params.append('favorite', 'true');
      params.append('sortBy', sortBy);
      params.append('sortDirection', sortDirection);

      const response = await apiGet<VaultEntriesResponse>(`/api/entries?${params.toString()}`);
      setEntries(response.entries);
      setTotalEntries(response.total);

      // Extract all unique tags from entries for the tag filter
      const tags = new Set<string>();
      response.entries.forEach((entry) => {
        entry.tags.forEach((tag) => tags.add(tag));
      });
      setAvailableTags(Array.from(tags));
    } catch (err) {
      setError('Failed to load vault entries');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, entryId: string) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuEntryId(entryId);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setMenuEntryId(null);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const toggleShowPassword = (entryId: string) => {
    setShowPassword((prev) => ({
      ...prev,
      [entryId]: !prev[entryId],
    }));
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleToggleFavorite = async (entry: VaultEntry) => {
    try {
      await apiPut(`/api/entries/${entry.id}`, {
        ...entry,
        favorite: !entry.favorite,
      });
      fetchEntries();
    } catch (err) {
      setError('Failed to update entry');
      console.error(err);
    }
  };

  const handleCreateOrUpdateEntry = async () => {
    setIsSubmitting(true);
    try {
      if (selectedEntry) {
        // Update existing entry
        await apiPut(`/api/entries/${selectedEntry.id}`, entryForm);
        setSuccess('Entry updated successfully');
      } else {
        // Create new entry
        await apiPost('/api/entries', entryForm);
        setSuccess('Entry created successfully');
      }
      setEntryFormOpen(false);
      resetEntryForm();
      fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!menuEntryId) return;

    setIsSubmitting(true);
    try {
      await apiDelete(`/api/entries/${menuEntryId}`);
      setSuccess('Entry deleted successfully');
      setDeleteDialogOpen(false);
      handleCloseMenu();
      fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEntry = (entry: VaultEntry) => {
    setSelectedEntry(entry);
    setEntryForm({
      title: entry.title,
      username: entry.username,
      password: entry.password,
      url: entry.url || '',
      notes: entry.notes || '',
      category: entry.category || '',
      favorite: entry.favorite,
      tags: entry.tags,
    });
    setEntryFormOpen(true);
    handleCloseMenu();
  };

  const resetEntryForm = () => {
    setSelectedEntry(null);
    setEntryForm({
      title: '',
      username: '',
      password: '',
      url: '',
      notes: '',
      category: '',
      favorite: false,
      tags: [],
    });
  };

  const handleEntryFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setEntryForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCategoryChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setEntryForm((prev) => ({
      ...prev,
      category: event.target.value as string,
    }));
  };

  const handleTagsChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setEntryForm((prev) => ({
      ...prev,
      tags: event.target.value as string[],
    }));
  };

  const handleCategoryFilterChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setCategoryFilter(event.target.value as string[]);
  };

  const handleTagFilterChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setTagFilter(event.target.value as string[]);
  };

  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const renderEntryCards = () => {
    if (entries.length === 0) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No entries found
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {searchTerm || categoryFilter.length > 0 || tagFilter.length > 0 || showFavoritesOnly
              ? 'Try adjusting your filters or search term'
              : 'Create your first vault entry to get started'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              resetEntryForm();
              setEntryFormOpen(true);
            }}
          >
            Add New Entry
          </Button>
        </Box>
      );
    }

    return (
      <Grid container spacing={3}>
        {entries.map((entry) => (
          <Grid item xs={12} sm={6} md={4} key={entry.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 1,
                  }}
                >
                  <Typography variant="h6" component="div" noWrap>
                    {entry.title}
                  </Typography>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleFavorite(entry)}
                      color={entry.favorite ? 'warning' : 'default'}
                    >
                      {entry.favorite ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => handleOpenMenu(e, entry.id)}
                      aria-label="more options"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </Box>

                {entry.category && (
                  <Chip
                    label={entry.category}
                    size="small"
                    sx={{ mb: 2, mr: 1 }}
                    color="primary"
                    variant="outlined"
                  />
                )}

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Username
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2,
                    bgcolor: 'background.default',
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body1" noWrap sx={{ flexGrow: 1 }}>
                    {entry.username}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleCopyToClipboard(entry.username)}
                    aria-label="copy username"
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Password
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2,
                    bgcolor: 'background.default',
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body1" noWrap sx={{ flexGrow: 1 }}>
                    {showPassword[entry.id] ? entry.password : '••••••••••••'}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => toggleShowPassword(entry.id)}
                    aria-label="toggle password visibility"
                  >
                    {showPassword[entry.id] ? (
                      <VisibilityOffIcon fontSize="small" />
                    ) : (
                      <VisibilityIcon fontSize="small" />
                    )}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleCopyToClipboard(entry.password)}
                    aria-label="copy password"
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Box>

                {entry.url && (
                  <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      URL
                    </Typography>
                    <Typography
                      variant="body2"
                      component="a"
                      href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ display: 'block', mb: 2, wordBreak: 'break-all' }}
                    >
                      {entry.url}
                    </Typography>
                  </>
                )}

                {entry.tags.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    {entry.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                )}
              </CardContent>
              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Updated: {new Date(entry.updatedAt).toLocaleDateString()}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => handleEditEntry(entry)}
                >
                  Edit
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Vault Entries
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetEntryForm();
            setEntryFormOpen(true);
          }}
        >
          Add New Entry
        </Button>
      </Box>

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

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel id="category-filter-label">Categories</InputLabel>
                <Select
                  labelId="category-filter-label"
                  multiple
                  value={categoryFilter}
                  onChange={handleCategoryFilterChange}
                  input={<OutlinedInput label="Categories" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  size="small"
                >
                  {CATEGORIES.map((category) => (
                    <MenuItem key={category} value={category}>
                      <Checkbox checked={categoryFilter.indexOf(category) > -1} />
                      <ListItemText primary={category} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel id="tag-filter-label">Tags</InputLabel>
                <Select
                  labelId="tag-filter-label"
                  multiple
                  value={tagFilter}
                  onChange={handleTagFilterChange}
                  input={<OutlinedInput label="Tags" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  size="small"
                >
                  {availableTags.map((tag) => (
                    <MenuItem key={tag} value={tag}>
                      <Checkbox checked={tagFilter.indexOf(tag) > -1} />
                      <ListItemText primary={tag} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Tooltip title="Show favorites only">
                <IconButton
                  color={showFavoritesOnly ? 'warning' : 'default'}
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                >
                  {showFavoritesOnly ? <StarIcon /> : <StarBorderIcon />}
                </IconButton>
              </Tooltip>

              <Tooltip title="Sort entries">
                <IconButton
                  onClick={() => {
                    const fields = ['title', 'updatedAt', 'createdAt'];
                    const currentIndex = fields.indexOf(sortBy);
                    const nextField = fields[(currentIndex + 1) % fields.length];
                    handleSortChange(nextField);
                  }}
                >
                  <SortIcon />
                </IconButton>
              </Tooltip>

              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                size="small"
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter([]);
                  setTagFilter([]);
                  setShowFavoritesOnly(false);
                  setSortBy('updatedAt');
                  setSortDirection('desc');
                }}
              >
                Reset Filters
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="vault entry tabs"
          variant="fullWidth"
        >
          <Tab label="All Entries" />
          <Tab label="Favorites" onClick={() => setShowFavoritesOnly(true)} />
          <Tab label="Recently Updated" onClick={() => {
            setSortBy('updatedAt');
            setSortDirection('desc');
            setShowFavoritesOnly(false);
          }} />
        </Tabs>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {entries.length} of {totalEntries} entries
            </Typography>
          </Box>
          {renderEntryCards()}
        </>
      )}

      {/* Entry Form Dialog */}
      <Dialog open={entryFormOpen} onClose={() => setEntryFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedEntry ? 'Edit Entry' : 'Add New Entry'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                name="title"
                value={entryForm.title}
                onChange={handleEntryFormChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={entryForm.username}
                onChange={handleEntryFormChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword['form'] ? 'text' : 'password'}
                value={entryForm.password}
                onChange={handleEntryFormChange}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() =>
                          setShowPassword((prev) => ({
                            ...prev,
                            form: !prev['form'],
                          }))
                        }
                        edge="end"
                      >
                        {showPassword['form'] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="URL"
                name="url"
                value={entryForm.url}
                onChange={handleEntryFormChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="category-label">Category</InputLabel>
                <Select
                  labelId="category-label"
                  value={entryForm.category || ''}
                  onChange={handleCategoryChange}
                  input={<OutlinedInput label="Category" />}
                >
                  <MenuItem value="">None</MenuItem>
                  {CATEGORIES.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="tags-label">Tags</InputLabel>
                <Select
                  labelId="tags-label"
                  multiple
                  value={entryForm.tags || []}
                  onChange={handleTagsChange}
                  input={<OutlinedInput label="Tags" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {availableTags.map((tag) => (
                    <MenuItem key={tag} value={tag}>
                      <Checkbox checked={(entryForm.tags || []).indexOf(tag) > -1} />
                      <ListItemText primary={tag} />
                    </MenuItem>
                  ))}
                  <Divider />
                  <MenuItem value="__new__" sx={{ fontStyle: 'italic' }}>
                    <ListItemText primary="Add new tag..." />
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={entryForm.notes}
                onChange={handleEntryFormChange}
                multiline
                rows={4}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={entryForm.favorite || false}
                  onChange={handleEntryFormChange}
                  name="favorite"
                  color="warning"
                />
                <Typography>Mark as favorite</Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEntryFormOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateOrUpdateEntry}
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <CircularProgress size={24} />
            ) : selectedEntry ? (
              'Update Entry'
            ) : (
              'Create Entry'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Entry</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this entry? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteEntry}
            variant="contained"
            color="error"
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Entry Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem
          onClick={() => {
            const entry = entries.find((e) => e.id === menuEntryId);
            if (entry) handleEditEntry(entry);
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDeleteDialogOpen(true);
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography color="error">Delete</Typography>
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default VaultEntries;