
import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  Chip,
  Divider,
  Avatar,
} from '@mui/material';
import {
  ContentCopy,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  OpenInNew,
  CalendarToday,
  Person,
  Lock,
  Language,
  Description,
} from '@mui/icons-material';
import { VaultEntry as VaultEntryType } from '@/lib/crypto';
import { SecureStorage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { useVault } from '@/contexts/VaultContext';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { PasswordGenerator } from './PasswordGenerator';

interface VaultEntryProps {
  entry: VaultEntryType;
}

export function VaultEntry({ entry }: VaultEntryProps) {
  const { updateEntry, deleteEntry } = useVault();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editForm, setEditForm] = useState({
    title: entry.title,
    url: entry.url || '',
    username: entry.username || '',
    password: entry.password || '',
    notes: entry.notes || '',
  });

  const handleCopy = async (text: string, label: string) => {
    try {
      await SecureStorage.copyToClipboard(text);
      toast({
        title: `${label} copied`,
        description: 'Copied to clipboard (will clear in 30 seconds).',
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: `Failed to copy ${label.toLowerCase()}.`,
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    try {
      await updateEntry(entry.id!, editForm);
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Update failed',
        description: 'Failed to update entry.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      await deleteEntry(entry.id!);
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Failed to delete entry.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card sx={{ transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } }}>
      <CardHeader sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.light' }}>
              <Language />
            </Avatar>
            <Box>
              <Typography variant="h6" component="h3">
                {entry.title}
              </Typography>
              {entry.url && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <Language sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {entry.url}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => window.open(entry.url, '_blank')}
                    sx={{ ml: 0.5 }}
                  >
                    <OpenInNew sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              )}
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={() => setIsEditing(true)}>
              <Edit />
            </IconButton>
            <IconButton size="small" onClick={handleDelete} color="error">
              <Delete />
            </IconButton>
          </Box>
        </Box>
      </CardHeader>
      
      {/* Edit Dialog */}
      <Dialog open={isEditing} onClose={() => setIsEditing(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Entry</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <TextField
                  fullWidth
                  label="Title"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                />
                
                <TextField
                  fullWidth
                  label="URL"
                  type="url"
                  value={editForm.url}
                  onChange={(e) => setEditForm(prev => ({ ...prev, url: e.target.value }))}
                />
                
                <TextField
                  fullWidth
                  label="Username"
                  value={editForm.username}
                  onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                />
                
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={editForm.password}
                  onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                
                {editForm.password && (
                  <PasswordStrengthMeter password={editForm.password} />
                )}
                
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <PasswordGenerator
                onPasswordGenerated={(password) => 
                  setEditForm(prev => ({ ...prev, password }))
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>
      
      <CardContent sx={{ pt: 1 }}>
        {entry.username && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            p: 2,
            bgcolor: 'action.hover',
            borderRadius: 1,
            mb: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" fontWeight="medium">Username</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {entry.username}
              </Typography>
              <IconButton
                size="small"
                onClick={() => handleCopy(entry.username!, 'Username')}
              >
                <ContentCopy sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          </Box>
        )}
        
        {entry.password && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            p: 2,
            bgcolor: 'action.hover',
            borderRadius: 1,
            mb: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Lock sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" fontWeight="medium">Password</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {showPassword ? entry.password : '••••••••'}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <VisibilityOff sx={{ fontSize: 14 }} /> : <Visibility sx={{ fontSize: 14 }} />}
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleCopy(entry.password!, 'Password')}
              >
                <ContentCopy sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          </Box>
        )}
        
        {entry.notes && (
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Description sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" fontWeight="medium">Notes</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {entry.notes}
            </Typography>
          </Box>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarToday sx={{ fontSize: 12, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Created: {formatDate(entry.createdAt)}
            </Typography>
          </Box>
          {entry.updatedAt && entry.updatedAt !== entry.createdAt && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarToday sx={{ fontSize: 12, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Updated: {formatDate(entry.updatedAt)}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
