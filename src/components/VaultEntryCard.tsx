import React, { memo, useMemo, useCallback } from 'react';
import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Avatar,
  Tooltip,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Star,
  StarBorder,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  ContentCopy,
  Launch,
} from '@mui/icons-material';
import { VaultEntry } from '../lib/crypto';
import { useVirtualScrolling, useDebounce } from '../hooks/advanced';

// Memoized entry card component for performance
interface VaultEntryCardProps {
  entry: VaultEntry;
  isSelected: boolean;
  onSelect: (entry: VaultEntry) => void;
  onEdit: (entry: VaultEntry) => void;
  onDelete: (entryId: string) => void;
  onToggleFavorite: (entryId: string) => void;
  onCopyPassword: (password: string) => void;
  onCopyUsername: (username: string) => void;
  onOpenUrl: (url: string) => void;
}

export const VaultEntryCard = memo<VaultEntryCardProps>(({
  entry,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopyPassword,
  onCopyUsername,
  onOpenUrl,
}) => {
  const theme = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  
  // Debounced handlers to prevent rapid clicks
  const debouncedSelect = useDebounce(() => onSelect(entry), 150);
  const debouncedEdit = useDebounce(() => onEdit(entry), 150);
  const debouncedDelete = useDebounce(() => onDelete(entry.id), 150);
  const debouncedToggleFavorite = useDebounce(() => onToggleFavorite(entry.id), 150);
  
  // Memoized handlers
  const handleCopyPassword = useCallback(() => {
    if (entry.password) {
      onCopyPassword(entry.password);
    }
  }, [entry.password, onCopyPassword]);
  
  const handleCopyUsername = useCallback(() => {
    if (entry.username) {
      onCopyUsername(entry.username);
    }
  }, [entry.username, onCopyUsername]);
  
  const handleOpenUrl = useCallback(() => {
    if (entry.url) {
      onOpenUrl(entry.url);
    }
  }, [entry.url, onOpenUrl]);
  
  // Memoized styles
  const cardStyles = useMemo(() => ({
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    border: isSelected ? `2px solid ${theme.palette.primary.main}` : '1px solid transparent',
    backgroundColor: isSelected 
      ? alpha(theme.palette.primary.main, 0.05)
      : theme.palette.background.paper,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[4],
      backgroundColor: alpha(theme.palette.primary.main, 0.02),
    },
  }), [isSelected, theme]);
  
  // Get favicon URL
  const faviconUrl = useMemo(() => {
    if (!entry.url) return null;
    try {
      const domain = new URL(entry.url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  }, [entry.url]);
  
  return (
    <Card sx={cardStyles} onClick={debouncedSelect}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Avatar
            src={faviconUrl || undefined}
            sx={{ 
              width: 32, 
              height: 32, 
              mr: 1,
              bgcolor: theme.palette.primary.main,
              fontSize: '0.875rem'
            }}
          >
            {entry.title.charAt(0).toUpperCase()}
          </Avatar>
          
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontSize: '1rem',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {entry.title}
            </Typography>
            {entry.username && (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {entry.username}
              </Typography>
            )}
          </Box>
          
          <Tooltip title={entry.favorite ? 'Remove from favorites' : 'Add to favorites'}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                debouncedToggleFavorite();
              }}
              sx={{ color: entry.favorite ? 'warning.main' : 'text.secondary' }}
            >
              {entry.favorite ? <Star /> : <StarBorder />}
            </IconButton>
          </Tooltip>
        </Box>
        
        {/* URL */}
        {entry.url && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                flexGrow: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {entry.url}
            </Typography>
            <Tooltip title="Open URL">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenUrl();
                }}
              >
                <Launch fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        
        {/* Password field */}
        {entry.password && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                flexGrow: 1,
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }}
            >
              {showPassword ? entry.password : '••••••••'}
            </Typography>
            <Tooltip title={showPassword ? 'Hide password' : 'Show password'}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPassword(!showPassword);
                }}
              >
                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy password">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyPassword();
                }}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        
        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {entry.tags.slice(0, 3).map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem', height: 20 }}
              />
            ))}
            {entry.tags.length > 3 && (
              <Chip
                label={`+${entry.tags.length - 3}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem', height: 20 }}
              />
            )}
          </Box>
        )}
        
        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Updated {new Date(entry.updatedAt).toLocaleDateString()}
          </Typography>
          
          <Box>
            {entry.username && (
              <Tooltip title="Copy username">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyUsername();
                  }}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Edit entry">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  debouncedEdit();
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete entry">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  debouncedDelete();
                }}
                sx={{ color: 'error.main' }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
});

VaultEntryCard.displayName = 'VaultEntryCard';

// Skeleton loader for entry cards
export const VaultEntryCardSkeleton = memo(() => (
  <Card sx={{ mb: 1 }}>
    <CardContent sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Skeleton variant="circular" width={32} height={32} sx={{ mr: 1 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="40%" height={20} />
        </Box>
        <Skeleton variant="circular" width={24} height={24} />
      </Box>
      <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
        <Skeleton variant="rounded" width={60} height={20} />
        <Skeleton variant="rounded" width={50} height={20} />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton variant="text" width="30%" height={16} />
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="circular" width={24} height={24} />
        </Box>
      </Box>
    </CardContent>
  </Card>
));

VaultEntryCardSkeleton.displayName = 'VaultEntryCardSkeleton';

// Virtualized list component for large datasets
interface VirtualizedEntryListProps {
  entries: VaultEntry[];
  selectedEntry: VaultEntry | null;
  loading: boolean;
  onSelect: (entry: VaultEntry) => void;
  onEdit: (entry: VaultEntry) => void;
  onDelete: (entryId: string) => void;
  onToggleFavorite: (entryId: string) => void;
  onCopyPassword: (password: string) => void;
  onCopyUsername: (username: string) => void;
  onOpenUrl: (url: string) => void;
  height: number;
}

export const VirtualizedEntryList = memo<VirtualizedEntryListProps>(({
  entries,
  selectedEntry,
  loading,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopyPassword,
  onCopyUsername,
  onOpenUrl,
  height,
}) => {
  const ITEM_HEIGHT = 120; // Approximate height of each entry card
  
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll
  } = useVirtualScrolling(entries, ITEM_HEIGHT, height);
  
  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        {Array.from({ length: 5 }).map((_, index) => (
          <VaultEntryCardSkeleton key={index} />
        ))}
      </Box>
    );
  }
  
  if (entries.length === 0) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          flexDirection: 'column',
          gap: 2
        }}
      >
        <Typography variant="h6" color="text.secondary">
          No entries found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first vault entry to get started
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box
      sx={{ height, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <Box sx={{ height: totalHeight, position: 'relative' }}>
        <Box
          sx={{
            transform: `translateY(${offsetY}px)`,
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          {visibleItems.map(({ item: entry, index }) => (
            <VaultEntryCard
              key={entry.id}
              entry={entry}
              isSelected={selectedEntry?.id === entry.id}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleFavorite={onToggleFavorite}
              onCopyPassword={onCopyPassword}
              onCopyUsername={onCopyUsername}
              onOpenUrl={onOpenUrl}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
});

VirtualizedEntryList.displayName = 'VirtualizedEntryList';