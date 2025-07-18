
import { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Chip,
  InputAdornment,
  IconButton,
  Paper,
  Stack,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Search as SearchIcon,
  Lock as LockIcon,
  Logout as LogoutIcon,
  Security as SecurityIcon,
  VpnKey as KeyIcon,
  Language as LanguageIcon,
  Warning as WarningIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useVault } from '@/contexts/VaultContext';
import { VaultEntry } from './VaultEntry';
import { AddEntryDialog } from './AddEntryDialog';

export function VaultDashboard() {
  const { user, entries, lockVault, signOut } = useVault();
  const [searchQuery, setSearchQuery] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Filter entries based on search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    
    const query = searchQuery.toLowerCase();
    return entries.filter(entry => 
      entry.title.toLowerCase().includes(query) ||
      entry.url?.toLowerCase().includes(query) ||
      entry.username?.toLowerCase().includes(query)
    );
  }, [entries, searchQuery]);

  // Calculate vault statistics
  const stats = useMemo(() => {
    const totalEntries = entries.length;
    const entriesWithPasswords = entries.filter(e => e.password).length;
    const entriesWithUrls = entries.filter(e => e.url).length;
    const duplicateUrls = entries.reduce((acc, entry) => {
      if (entry.url) {
        acc[entry.url] = (acc[entry.url] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    const duplicateCount = Object.values(duplicateUrls).filter(count => count > 1).length;

    return {
      totalEntries,
      entriesWithPasswords,
      entriesWithUrls,
      duplicateCount,
    };
  }, [entries]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Paper 
        elevation={1} 
        sx={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 50,
          borderRadius: 0,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Box sx={{ maxWidth: '1200px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 } }}>
          <Stack 
            direction="row" 
            alignItems="center" 
            justifyContent="space-between" 
            sx={{ height: 64 }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Paper
                elevation={3}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}
              >
                <SecurityIcon sx={{ color: 'white', fontSize: 24 }} />
              </Paper>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  SecureVault
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
            </Stack>
            
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<LockIcon />}
                onClick={lockVault}
                size={isMobile ? 'small' : 'medium'}
              >
                {!isMobile && 'Lock'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<LogoutIcon />}
                onClick={signOut}
                size={isMobile ? 'small' : 'medium'}
              >
                {!isMobile && 'Sign Out'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      <Box sx={{ maxWidth: '1200px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Entries
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <KeyIcon color="primary" />
                  <Typography variant="h4" fontWeight="bold">
                    {stats.totalEntries}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  With Passwords
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <SecurityIcon sx={{ color: 'success.main' }} />
                  <Typography variant="h4" fontWeight="bold">
                    {stats.entriesWithPasswords}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Websites
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LanguageIcon sx={{ color: 'info.main' }} />
                  <Typography variant="h4" fontWeight="bold">
                    {stats.entriesWithUrls}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Duplicates
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <WarningIcon sx={{ color: 'warning.main' }} />
                  <Typography variant="h4" fontWeight="bold">
                    {stats.duplicateCount}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Actions */}
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={2} 
          sx={{ mb: 4 }}
        >
          <TextField
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your vault..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchQuery('')}
                    edge="end"
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ flexGrow: 1 }}
          />
          
          <AddEntryDialog />
        </Stack>

        {/* Entries Grid */}
        {filteredEntries.length === 0 ? (
          <Card elevation={2} sx={{ textAlign: 'center', py: 8 }}>
            <CardContent>
              {entries.length === 0 ? (
                <>
                  <SecurityIcon 
                    sx={{ 
                      fontSize: 64, 
                      color: 'text.secondary', 
                      mb: 2 
                    }} 
                  />
                  <Typography variant="h5" gutterBottom fontWeight="medium">
                    Your vault is empty
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    Add your first password entry to get started with SecureVault
                  </Typography>
                  <AddEntryDialog />
                </>
              ) : (
                <>
                  <SearchIcon 
                    sx={{ 
                      fontSize: 64, 
                      color: 'text.secondary', 
                      mb: 2 
                    }} 
                  />
                  <Typography variant="h5" gutterBottom fontWeight="medium">
                    No entries found
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Try adjusting your search terms or add a new entry
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Results header */}
            <Stack 
              direction="row" 
              alignItems="center" 
              justifyContent="space-between" 
              sx={{ mb: 3 }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Typography variant="h6" fontWeight="medium">
                  {searchQuery ? 'Search Results' : 'Your Passwords'}
                </Typography>
                <Chip 
                  label={`${filteredEntries.length} ${filteredEntries.length === 1 ? 'entry' : 'entries'}`}
                  size="small"
                  variant="outlined"
                />
              </Stack>
              
              {searchQuery && (
                <Button 
                  variant="text" 
                  onClick={() => setSearchQuery('')}
                  startIcon={<ClearIcon />}
                >
                  Clear search
                </Button>
              )}
            </Stack>

            {/* Entries grid */}
            <Grid container spacing={3}>
              {filteredEntries.map((entry) => (
                <Grid item xs={12} lg={6} key={entry.id}>
                  <VaultEntry entry={entry} />
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Box>
    </Box>
  );
}
