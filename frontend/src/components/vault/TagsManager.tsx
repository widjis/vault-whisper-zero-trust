import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Grid,
  CircularProgress,
  Alert,
  InputAdornment,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  LocalOffer,
  Search,
  Close,
  Check,
} from '@mui/icons-material';
import { useVault } from '../../contexts/VaultContext';
import { useNotification } from '../../contexts/NotificationContext';

interface Tag {
  id: string;
  name: string;
  color?: string;
  entryCount?: number;
}

interface TagFormData {
  id?: string;
  name: string;
  color?: string;
}

const TagsManager: React.FC = () => {
  const theme = useTheme();
  const { tags, fetchTags, addTag, updateTag, deleteTag, loading, error } = useVault();
  const { showSuccess, showError } = useNotification();

  // State for tag management
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState<TagFormData>({ name: '', color: '' });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);

  // Fetch tags on component mount
  useEffect(() => {
    fetchTags();
  }, []);

  // Filter tags when search query or tags change
  useEffect(() => {
    if (tags.length > 0) {
      if (searchQuery) {
        const filtered = tags.filter(tag =>
          tag.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredTags(filtered);
      } else {
        setFilteredTags(tags);
      }
    } else {
      setFilteredTags([]);
    }
  }, [tags, searchQuery]);

  const handleOpenAddDialog = () => {
    setDialogMode('add');
    setFormData({ name: '', color: '' });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (tag: Tag) => {
    setDialogMode('edit');
    setFormData({
      id: tag.id,
      name: tag.name,
      color: tag.color || '',
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showError('Tag name is required');
      return;
    }

    try {
      if (dialogMode === 'add') {
        await addTag(formData);
        showSuccess('Tag added successfully');
      } else {
        if (formData.id) {
          await updateTag(formData.id, formData);
          showSuccess('Tag updated successfully');
        }
      }
      handleCloseDialog();
      fetchTags();
    } catch (err) {
      showError(dialogMode === 'add' ? 'Failed to add tag' : 'Failed to update tag');
    }
  };

  const handleOpenDeleteConfirm = (tagId: string) => {
    setTagToDelete(tagId);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setTagToDelete(null);
  };

  const handleDeleteTag = async () => {
    if (!tagToDelete) return;

    try {
      await deleteTag(tagToDelete);
      showSuccess('Tag deleted successfully');
      handleCloseDeleteConfirm();
      fetchTags();
    } catch (err) {
      showError('Failed to delete tag');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const getTagColor = (tag: Tag) => {
    if (tag.color) return tag.color;
    
    // Generate a deterministic color based on tag name
    const hash = tag.name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, ${theme.palette.mode === 'dark' ? '40%' : '50%'})`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Tags</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<Add />}
          onClick={handleOpenAddDialog}
        >
          Add Tag
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Search tags..."
        variant="outlined"
        size="small"
        value={searchQuery}
        onChange={handleSearchChange}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
          endAdornment: searchQuery ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={() => setSearchQuery('')}
                edge="end"
              >
                <Close fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />

      <Paper sx={{ p: 3, borderRadius: 2 }}>
        {filteredTags.length === 0 ? (
          <Box sx={{ textAlign: 'center' }}>
            {searchQuery ? (
              <Typography variant="body2" color="text.secondary">
                No tags found matching "{searchQuery}"
              </Typography>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  No tags found
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={handleOpenAddDialog}
                  sx={{ mt: 1 }}
                >
                  Add Your First Tag
                </Button>
              </>
            )}
          </Box>
        ) : (
          <Grid container spacing={1}>
            {filteredTags.map(tag => (
              <Grid item key={tag.id}>
                <Chip
                  icon={<LocalOffer style={{ color: getTagColor(tag) }} />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" component="span">
                        {tag.name}
                      </Typography>
                      {tag.entryCount !== undefined && (
                        <Typography
                          variant="caption"
                          component="span"
                          sx={{ ml: 0.5, opacity: 0.7 }}
                        >
                          ({tag.entryCount})
                        </Typography>
                      )}
                    </Box>
                  }
                  sx={{
                    bgcolor: alpha(getTagColor(tag), 0.1),
                    borderColor: alpha(getTagColor(tag), 0.3),
                    '&:hover': {
                      bgcolor: alpha(getTagColor(tag), 0.2),
                    },
                    border: '1px solid',
                    px: 0.5,
                  }}
                  deleteIcon={
                    <Box sx={{ display: 'flex' }}>
                      <Tooltip title="Edit tag">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditDialog(tag);
                          }}
                          sx={{ mr: 0.5, fontSize: '0.75rem' }}
                        >
                          <Edit fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete tag">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteConfirm(tag.id);
                          }}
                          sx={{ fontSize: '0.75rem' }}
                        >
                          <Delete fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                  onDelete={() => {}} // This is needed to show the delete icon
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Add/Edit Tag Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Tag' : 'Edit Tag'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Tag Name"
            type="text"
            fullWidth
            value={formData.name}
            onChange={handleInputChange}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="color"
            label="Color (hex or CSS color)"
            type="text"
            fullWidth
            value={formData.color}
            onChange={handleInputChange}
            placeholder="#3f51b5 or blue"
            helperText="Optional: Set a custom color for this tag"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {dialogMode === 'add' ? 'Add' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleCloseDeleteConfirm} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Tag</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete this tag?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Note: This will remove the tag from all entries that use it.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm} startIcon={<Close />}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteTag}
            color="error"
            variant="contained"
            startIcon={<Delete />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TagsManager;