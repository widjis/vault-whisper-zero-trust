import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Tooltip,
  CircularProgress,
  Alert,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Folder,
  FolderOpen,
  Add,
  Edit,
  Delete,
  DragIndicator,
  Check,
  Close,
} from '@mui/icons-material';
import { useVault } from '../../contexts/VaultContext';
import { useNotification } from '../../contexts/NotificationContext';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  order?: number;
  entryCount?: number;
}

interface CategoryFormData {
  id?: string;
  name: string;
  color?: string;
  icon?: string;
}

const CategoriesManager: React.FC = () => {
  const theme = useTheme();
  const { categories, fetchCategories, addCategory, updateCategory, deleteCategory, loading, error } = useVault();
  const { showSuccess, showError } = useNotification();

  // State for category management
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState<CategoryFormData>({ name: '', color: '', icon: '' });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [orderedCategories, setOrderedCategories] = useState<Category[]>([]);

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Update ordered categories when categories change
  useEffect(() => {
    if (categories.length > 0) {
      // Sort categories by order property if it exists
      const sorted = [...categories].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return 0;
      });
      setOrderedCategories(sorted);
    }
  }, [categories]);

  const handleOpenAddDialog = () => {
    setDialogMode('add');
    setFormData({ name: '', color: '', icon: '' });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (category: Category) => {
    setDialogMode('edit');
    setFormData({
      id: category.id,
      name: category.name,
      color: category.color || '',
      icon: category.icon || '',
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
      showError('Category name is required');
      return;
    }

    try {
      if (dialogMode === 'add') {
        await addCategory(formData);
        showSuccess('Category added successfully');
      } else {
        if (formData.id) {
          await updateCategory(formData.id, formData);
          showSuccess('Category updated successfully');
        }
      }
      handleCloseDialog();
      fetchCategories();
    } catch (err) {
      showError(dialogMode === 'add' ? 'Failed to add category' : 'Failed to update category');
    }
  };

  const handleOpenDeleteConfirm = (categoryId: string) => {
    setCategoryToDelete(categoryId);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setCategoryToDelete(null);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      await deleteCategory(categoryToDelete);
      showSuccess('Category deleted successfully');
      handleCloseDeleteConfirm();
      fetchCategories();
    } catch (err) {
      showError('Failed to delete category');
    }
  };

  const handleToggleReordering = () => {
    setReordering(!reordering);
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(orderedCategories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update the order property for each category
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index,
    }));

    setOrderedCategories(updatedItems);

    // In a real app, you would call an API to update the order
    try {
      // This is a placeholder for the actual API call
      // await updateCategoriesOrder(updatedItems);
      showSuccess('Categories reordered successfully');
    } catch (err) {
      showError('Failed to reorder categories');
      // Revert to original order on error
      setOrderedCategories(categories);
    }
  };

  const getCategoryColor = (category: Category) => {
    if (category.color) return category.color;
    
    // Generate a deterministic color based on category name
    const hash = category.name.split('').reduce((acc, char) => {
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
        <Typography variant="h6">Categories</Typography>
        <Box>
          <Button
            variant="outlined"
            size="small"
            onClick={handleToggleReordering}
            sx={{ mr: 1 }}
          >
            {reordering ? 'Done' : 'Reorder'}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={handleOpenAddDialog}
          >
            Add Category
          </Button>
        </Box>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {orderedCategories.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              No categories found
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={handleOpenAddDialog}
              sx={{ mt: 1 }}
            >
              Add Your First Category
            </Button>
          </Box>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="categories">
              {(provided) => (
                <List {...provided.droppableProps} ref={provided.innerRef} disablePadding>
                  {orderedCategories.map((category, index) => (
                    <Draggable
                      key={category.id}
                      draggableId={category.id}
                      index={index}
                      isDragDisabled={!reordering}
                    >
                      {(provided) => (
                        <ListItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          divider={index < orderedCategories.length - 1}
                          sx={{
                            '&:hover': {
                              bgcolor: 'action.hover',
                            },
                          }}
                        >
                          {reordering && (
                            <Box
                              {...provided.dragHandleProps}
                              sx={{ display: 'flex', mr: 1, cursor: 'grab' }}
                            >
                              <DragIndicator color="action" />
                            </Box>
                          )}
                          <ListItemIcon>
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: alpha(getCategoryColor(category), 0.2),
                                color: getCategoryColor(category),
                              }}
                            >
                              {category.icon ? (
                                <span>{category.icon}</span>
                              ) : (
                                <Folder />
                              )}
                            </Box>
                          </ListItemIcon>
                          <ListItemText
                            primary={category.name}
                            secondary={
                              category.entryCount !== undefined ? (
                                `${category.entryCount} ${category.entryCount === 1 ? 'entry' : 'entries'}`
                              ) : null
                            }
                          />
                          {!reordering && (
                            <ListItemSecondaryAction>
                              <Tooltip title="Edit category">
                                <IconButton
                                  edge="end"
                                  onClick={() => handleOpenEditDialog(category)}
                                  size="small"
                                  sx={{ mr: 1 }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete category">
                                <IconButton
                                  edge="end"
                                  onClick={() => handleOpenDeleteConfirm(category.id)}
                                  size="small"
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </ListItemSecondaryAction>
                          )}
                        </ListItem>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </List>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </Paper>

      {/* Add/Edit Category Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Category' : 'Edit Category'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Category Name"
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
            sx={{ mb: 2 }}
            helperText="Optional: Set a custom color for this category"
          />
          <TextField
            margin="dense"
            name="icon"
            label="Icon (emoji or icon name)"
            type="text"
            fullWidth
            value={formData.icon}
            onChange={handleInputChange}
            placeholder="📁 or folder"
            helperText="Optional: Set a custom icon for this category"
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
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete this category?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Note: This will not delete the entries in this category. They will be moved to the default category.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm} startIcon={<Close />}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteCategory}
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

export default CategoriesManager;