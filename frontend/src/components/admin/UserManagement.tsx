import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Switch,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  useTheme,
  alpha
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  VerifiedUser as VerifiedUserIcon,
  PersonOff as PersonOffIcon,
  PersonAdd as PersonAddIcon,
  VpnKey as VpnKeyIcon,
  Security as SecurityIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { fetchWithAuth } from '../../utils/api';
import { format, formatDistanceToNow } from 'date-fns';

// Types
interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  accountLocked: boolean;
  failedLoginAttempts: number;
  createdAt: string;
  lastLoginAt: string | null;
  vaultEntriesCount: number;
  sessionsCount: number;
}

interface UserDetailedInfo extends User {
  recentSessions: Array<{
    id: string;
    createdAt: string;
    expiresAt: string;
    lastActiveAt: string;
    ipAddress: string;
    userAgent: string;
    isCurrentSession: boolean;
  }>;
  auditLogCounts: {
    auth: number;
    data: number;
    security: number;
    admin: number;
    total: number;
  };
}

interface UserQueryParams {
  search?: string;
  isActive?: boolean;
  isVerified?: boolean;
  isLocked?: boolean;
  page: number;
  limit: number;
}

interface UserStatusUpdate {
  isActive?: boolean;
  isVerified?: boolean;
  accountLocked?: boolean;
  resetFailedLoginAttempts?: boolean;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetailedInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userDetailLoading, setUserDetailLoading] = useState<boolean>(false);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<{
    isActive: boolean | null;
    isVerified: boolean | null;
    isLocked: boolean | null;
  }>({ isActive: null, isVerified: null, isLocked: null });
  const [userDialogOpen, setUserDialogOpen] = useState<boolean>(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState<boolean>(false);
  const [statusUpdate, setStatusUpdate] = useState<UserStatusUpdate>({});
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  // Fetch users with filters and pagination
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams: UserQueryParams = {
        page: page + 1, // API uses 1-indexed pages
        limit: rowsPerPage,
      };

      if (searchTerm) queryParams.search = searchTerm;
      if (filters.isActive !== null) queryParams.isActive = filters.isActive;
      if (filters.isVerified !== null) queryParams.isVerified = filters.isVerified;
      if (filters.isLocked !== null) queryParams.isLocked = filters.isLocked;

      const queryString = new URLSearchParams(queryParams as any).toString();
      const response = await fetchWithAuth(`/api/admin/users?${queryString}`);

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.data);
      setTotalUsers(data.pagination.totalCount);
    } catch (error) {
      console.error('Error fetching users:', error);
      enqueueSnackbar('Failed to load users', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, filters, enqueueSnackbar]);

  // Fetch user details
  const fetchUserDetails = async (userId: string) => {
    setUserDetailLoading(true);
    try {
      const response = await fetchWithAuth(`/api/admin/users/${userId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const data = await response.json();
      setSelectedUser(data.data);
      setUserDialogOpen(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      enqueueSnackbar('Failed to load user details', { variant: 'error' });
    } finally {
      setUserDetailLoading(false);
    }
  };

  // Update user status
  const updateUserStatus = async (userId: string) => {
    try {
      // Ensure at least one field is being updated
      if (Object.keys(statusUpdate).length === 0) {
        enqueueSnackbar('No changes to apply', { variant: 'warning' });
        return;
      }

      const response = await fetchWithAuth(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(statusUpdate),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user status');
      }

      const data = await response.json();
      
      // Update the user in the list
      setUsers(users.map(user => 
        user.id === userId ? { ...user, ...data.data } : user
      ));
      
      // Update selected user if open
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, ...data.data });
      }
      
      enqueueSnackbar('User status updated successfully', { variant: 'success' });
      setStatusDialogOpen(false);
      setStatusUpdate({});
    } catch (error) {
      console.error('Error updating user status:', error);
      enqueueSnackbar(error instanceof Error ? error.message : 'Failed to update user status', { variant: 'error' });
    }
  };

  // Initial load
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle search
  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(0);
    fetchUsers();
  };

  // Handle filter changes
  const handleFilterChange = (filterName: keyof typeof filters, value: boolean | null) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    setPage(0);
  };

  // Open status update dialog
  const openStatusDialog = (user: User) => {
    setSelectedUser(user as UserDetailedInfo);
    setStatusUpdate({
      isActive: user.isActive,
      isVerified: user.isVerified,
      accountLocked: user.accountLocked,
      resetFailedLoginAttempts: false
    });
    setStatusDialogOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return format(new Date(dateString), 'PPP p');
  };

  // Format relative time
  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom component="div">
        User Management
      </Typography>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <form onSubmit={handleSearch}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search by email, name, or ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton type="submit" edge="end">
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </form>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" justifyContent="flex-end" gap={1}>
              <Tooltip title="Show only active users">
                <Chip
                  label="Active"
                  color={filters.isActive ? "primary" : "default"}
                  onClick={() => handleFilterChange('isActive', filters.isActive === null ? true : (filters.isActive ? null : true))}
                  onDelete={filters.isActive ? () => handleFilterChange('isActive', null) : undefined}
                  deleteIcon={filters.isActive ? <CloseIcon /> : undefined}
                />
              </Tooltip>
              <Tooltip title="Show only verified users">
                <Chip
                  label="Verified"
                  color={filters.isVerified ? "success" : "default"}
                  onClick={() => handleFilterChange('isVerified', filters.isVerified === null ? true : (filters.isVerified ? null : true))}
                  onDelete={filters.isVerified ? () => handleFilterChange('isVerified', null) : undefined}
                  deleteIcon={filters.isVerified ? <CloseIcon /> : undefined}
                />
              </Tooltip>
              <Tooltip title="Show only locked accounts">
                <Chip
                  label="Locked"
                  color={filters.isLocked ? "error" : "default"}
                  onClick={() => handleFilterChange('isLocked', filters.isLocked === null ? true : (filters.isLocked ? null : true))}
                  onDelete={filters.isLocked ? () => handleFilterChange('isLocked', null) : undefined}
                  deleteIcon={filters.isLocked ? <CloseIcon /> : undefined}
                />
              </Tooltip>
              <Tooltip title="Refresh">
                <IconButton onClick={() => fetchUsers()}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="users table">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell>Entries</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.firstName || user.lastName || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      color={user.role === 'ADMIN' ? 'secondary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {user.isActive ? (
                        <Chip size="small" label="Active" color="success" />
                      ) : (
                        <Chip size="small" label="Inactive" color="default" />
                      )}
                      {user.isVerified ? (
                        <Chip size="small" label="Verified" color="info" />
                      ) : (
                        <Chip size="small" label="Unverified" color="warning" />
                      )}
                      {user.accountLocked && (
                        <Chip size="small" label="Locked" color="error" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{formatRelativeTime(user.createdAt)}</TableCell>
                  <TableCell>{formatRelativeTime(user.lastLoginAt)}</TableCell>
                  <TableCell>{user.vaultEntriesCount}</TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton
                        onClick={() => fetchUserDetails(user.id)}
                        disabled={userDetailLoading}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Status">
                      <IconButton onClick={() => openStatusDialog(user)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalUsers}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* User Details Dialog */}
      <Dialog
        open={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          User Details
          <IconButton
            aria-label="close"
            onClick={() => setUserDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {userDetailLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : selectedUser ? (
            <Grid container spacing={3}>
              {/* Basic Info */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Basic Information
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="Email" secondary={selectedUser.email} />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Name" 
                          secondary={
                            selectedUser.firstName && selectedUser.lastName
                              ? `${selectedUser.firstName} ${selectedUser.lastName}`
                              : selectedUser.firstName || selectedUser.lastName || 'N/A'
                          } 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Role" secondary={selectedUser.role} />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Created" secondary={formatDate(selectedUser.createdAt)} />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Last Login" secondary={formatDate(selectedUser.lastLoginAt)} />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Account Status */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Account Status
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="Account Status" 
                          secondary={selectedUser.isActive ? 'Active' : 'Inactive'} 
                        />
                        {selectedUser.isActive ? (
                          <Chip size="small" label="Active" color="success" />
                        ) : (
                          <Chip size="small" label="Inactive" color="default" />
                        )}
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Verification Status" 
                          secondary={selectedUser.isVerified ? 'Verified' : 'Unverified'} 
                        />
                        {selectedUser.isVerified ? (
                          <Chip size="small" label="Verified" color="info" />
                        ) : (
                          <Chip size="small" label="Unverified" color="warning" />
                        )}
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Account Lock Status" 
                          secondary={selectedUser.accountLocked ? 'Locked' : 'Unlocked'} 
                        />
                        {selectedUser.accountLocked ? (
                          <Chip size="small" label="Locked" color="error" />
                        ) : (
                          <Chip size="small" label="Unlocked" color="success" />
                        )}
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Failed Login Attempts" 
                          secondary={selectedUser.failedLoginAttempts} 
                        />
                        {selectedUser.failedLoginAttempts > 0 && (
                          <Chip 
                            size="small" 
                            label={selectedUser.failedLoginAttempts} 
                            color={selectedUser.failedLoginAttempts >= 3 ? "error" : "warning"} 
                          />
                        )}
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Usage Statistics */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Usage Statistics
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="Vault Entries" 
                          secondary={selectedUser.vaultEntriesCount} 
                        />
                        <VpnKeyIcon color="primary" />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Active Sessions" 
                          secondary={selectedUser.sessionsCount} 
                        />
                        <SecurityIcon color="info" />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Audit Log Entries" 
                          secondary={selectedUser.auditLogCounts.total} 
                        />
                      </ListItem>
                      <Divider textAlign="left">Audit Log Breakdown</Divider>
                      <ListItem>
                        <ListItemText 
                          primary="Authentication Events" 
                          secondary={selectedUser.auditLogCounts.auth} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Data Operations" 
                          secondary={selectedUser.auditLogCounts.data} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Security Events" 
                          secondary={selectedUser.auditLogCounts.security} 
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Recent Sessions */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Recent Sessions
                    </Typography>
                    {selectedUser.recentSessions.length === 0 ? (
                      <Typography variant="body2" color="textSecondary">
                        No recent sessions found
                      </Typography>
                    ) : (
                      <List dense>
                        {selectedUser.recentSessions.map(session => (
                          <React.Fragment key={session.id}>
                            <ListItem>
                              <ListItemText 
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2">
                                      {formatRelativeTime(session.lastActiveAt)}
                                    </Typography>
                                    {session.isCurrentSession && (
                                      <Chip size="small" label="Current" color="primary" />
                                    )}
                                  </Box>
                                }
                                secondary={
                                  <>
                                    <Typography variant="caption" display="block">
                                      IP: {session.ipAddress}
                                    </Typography>
                                    <Typography variant="caption" display="block" sx={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {session.userAgent}
                                    </Typography>
                                  </>
                                } 
                              />
                            </ListItem>
                            <Divider variant="inset" component="li" />
                          </React.Fragment>
                        ))}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Typography>No user selected</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Close</Button>
          {selectedUser && (
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => {
                setUserDialogOpen(false);
                openStatusDialog(selectedUser);
              }}
            >
              Edit Status
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
      >
        <DialogTitle>Update User Status</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Update status for user: {selectedUser?.email}
          </DialogContentText>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={statusUpdate.isActive ?? false}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={statusUpdate.isVerified ?? false}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, isVerified: e.target.checked })}
                />
              }
              label="Verified"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={statusUpdate.accountLocked ?? false}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, accountLocked: e.target.checked })}
                />
              }
              label="Account Locked"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={statusUpdate.resetFailedLoginAttempts ?? false}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, resetFailedLoginAttempts: e.target.checked })}
                />
              }
              label="Reset Failed Login Attempts"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => selectedUser && updateUserStatus(selectedUser.id)}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;