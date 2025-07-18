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
  DialogTitle,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Card,
  CardContent,
  useTheme,
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Security as SecurityIcon,
  VpnKey as VpnKeyIcon,
  Storage as StorageIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { fetchWithAuth } from '../../utils/api';
import { format, formatDistanceToNow } from 'date-fns';

// Types
interface AuditLog {
  id: string;
  userId: string;
  sessionId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  action: 'AUTH' | 'DATA' | 'SECURITY' | 'ADMIN';
  resourceType: string;
  resourceId: string | null;
  status: 'SUCCESS' | 'FAILED';
  metadata: Record<string, any>;
  timestamp: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

interface AuditLogQueryParams {
  userId?: string;
  actionType?: 'AUTH' | 'DATA' | 'SECURITY' | 'ADMIN';
  resourceType?: string;
  status?: 'SUCCESS' | 'FAILED';
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

const AuditLogViewer: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(20);
  const [filters, setFilters] = useState<{
    userId: string;
    actionType: 'AUTH' | 'DATA' | 'SECURITY' | 'ADMIN' | '';
    resourceType: string;
    status: 'SUCCESS' | 'FAILED' | '';
    startDate: Date | null;
    endDate: Date | null;
  }>({
    userId: '',
    actionType: '',
    resourceType: '',
    status: '',
    startDate: null,
    endDate: null,
  });
  const [detailDialogOpen, setDetailDialogOpen] = useState<boolean>(false);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  // Fetch audit logs with filters and pagination
  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams: AuditLogQueryParams = {
        page: page + 1, // API uses 1-indexed pages
        limit: rowsPerPage,
      };

      if (filters.userId) queryParams.userId = filters.userId;
      if (filters.actionType) queryParams.actionType = filters.actionType as any;
      if (filters.resourceType) queryParams.resourceType = filters.resourceType;
      if (filters.status) queryParams.status = filters.status as any;
      if (filters.startDate) queryParams.startDate = filters.startDate.toISOString();
      if (filters.endDate) queryParams.endDate = filters.endDate.toISOString();

      const queryString = new URLSearchParams(queryParams as any).toString();
      const response = await fetchWithAuth(`/api/admin/audit-logs?${queryString}`);

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setAuditLogs(data.data);
      setTotalLogs(data.pagination.totalCount);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      enqueueSnackbar('Failed to load audit logs', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters, enqueueSnackbar]);

  // Initial load
  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle filter changes
  const handleFilterChange = (event: SelectChangeEvent | React.ChangeEvent<HTMLInputElement>, filterName: keyof typeof filters) => {
    const value = event.target.value;
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Handle date filter changes
  const handleDateChange = (date: Date | null, filterName: 'startDate' | 'endDate') => {
    setFilters(prev => ({
      ...prev,
      [filterName]: date
    }));
  };

  // Apply filters
  const applyFilters = () => {
    setPage(0);
    fetchAuditLogs();
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      userId: '',
      actionType: '',
      resourceType: '',
      status: '',
      startDate: null,
      endDate: null,
    });
    setPage(0);
  };

  // View log details
  const viewLogDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPP p');
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'AUTH':
        return <VpnKeyIcon color="primary" />;
      case 'DATA':
        return <StorageIcon color="info" />;
      case 'SECURITY':
        return <SecurityIcon color="warning" />;
      case 'ADMIN':
        return <AdminIcon color="secondary" />;
      default:
        return null;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <SuccessIcon color="success" />;
      case 'FAILED':
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };

  // Get user display name
  const getUserDisplayName = (user: AuditLog['user']) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.firstName || user.lastName || user.email;
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom component="div">
        Audit Log Viewer
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Filters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6} lg={3}>
                <TextField
                  fullWidth
                  label="User ID"
                  variant="outlined"
                  value={filters.userId}
                  onChange={(e) => handleFilterChange(e, 'userId')}
                  placeholder="Filter by user ID"
                />
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Action Type</InputLabel>
                  <Select
                    value={filters.actionType}
                    onChange={(e) => handleFilterChange(e, 'actionType')}
                    label="Action Type"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="AUTH">Authentication</MenuItem>
                    <MenuItem value="DATA">Data Operation</MenuItem>
                    <MenuItem value="SECURITY">Security Event</MenuItem>
                    <MenuItem value="ADMIN">Admin Action</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <TextField
                  fullWidth
                  label="Resource Type"
                  variant="outlined"
                  value={filters.resourceType}
                  onChange={(e) => handleFilterChange(e, 'resourceType')}
                  placeholder="e.g. USER, VAULT_ENTRY"
                />
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={(e) => handleFilterChange(e, 'status')}
                    label="Status"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="SUCCESS">Success</MenuItem>
                    <MenuItem value="FAILED">Failed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Date"
                    value={filters.startDate}
                    onChange={(date) => handleDateChange(date, 'startDate')}
                    slotProps={{ textField: { fullWidth: true, variant: 'outlined' } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="End Date"
                    value={filters.endDate}
                    onChange={(date) => handleDateChange(date, 'endDate')}
                    slotProps={{ textField: { fullWidth: true, variant: 'outlined' } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} md={12} lg={6}>
                <Box display="flex" justifyContent="flex-end" gap={1}>
                  <Button variant="outlined" onClick={resetFilters} startIcon={<CloseIcon />}>
                    Reset
                  </Button>
                  <Button variant="contained" onClick={applyFilters} startIcon={<SearchIcon />}>
                    Apply Filters
                  </Button>
                  <Tooltip title="Refresh">
                    <IconButton onClick={() => fetchAuditLogs()}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* Audit Logs Table */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="audit logs table">
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Resource</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : auditLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Tooltip title={formatDate(log.timestamp)}>
                      <Typography variant="body2">{formatRelativeTime(log.timestamp)}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={log.user.email}>
                      <Typography variant="body2">{getUserDisplayName(log.user)}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getActionIcon(log.action)}
                      <Chip
                        label={log.action}
                        size="small"
                        color={
                          log.action === 'AUTH' ? 'primary' :
                          log.action === 'DATA' ? 'info' :
                          log.action === 'SECURITY' ? 'warning' :
                          'secondary'
                        }
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{log.resourceType}</Typography>
                    {log.resourceId && (
                      <Typography variant="caption" color="textSecondary">
                        ID: {log.resourceId.substring(0, 8)}...
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(log.status)}
                      <Chip
                        label={log.status}
                        size="small"
                        color={log.status === 'SUCCESS' ? 'success' : 'error'}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    {log.ipAddress || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton onClick={() => viewLogDetails(log)}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 20, 50, 100]}
          component="div"
          count={totalLogs}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Log Details Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Audit Log Details
          <IconButton
            aria-label="close"
            onClick={() => setDetailDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedLog ? (
            <Grid container spacing={3}>
              {/* Basic Info */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Event Information
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      {getActionIcon(selectedLog.action)}
                      <Chip
                        label={selectedLog.action}
                        color={
                          selectedLog.action === 'AUTH' ? 'primary' :
                          selectedLog.action === 'DATA' ? 'info' :
                          selectedLog.action === 'SECURITY' ? 'warning' :
                          'secondary'
                        }
                      />
                      {getStatusIcon(selectedLog.status)}
                      <Chip
                        label={selectedLog.status}
                        color={selectedLog.status === 'SUCCESS' ? 'success' : 'error'}
                      />
                    </Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Timestamp
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {formatDate(selectedLog.timestamp)} ({formatRelativeTime(selectedLog.timestamp)})
                    </Typography>
                    <Typography variant="subtitle2" gutterBottom>
                      Resource Type
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {selectedLog.resourceType}
                    </Typography>
                    {selectedLog.resourceId && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          Resource ID
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {selectedLog.resourceId}
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* User Info */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      User Information
                    </Typography>
                    <Typography variant="subtitle2" gutterBottom>
                      User
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {getUserDisplayName(selectedLog.user)} ({selectedLog.user.email})
                    </Typography>
                    <Typography variant="subtitle2" gutterBottom>
                      User ID
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {selectedLog.userId}
                    </Typography>
                    {selectedLog.sessionId && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          Session ID
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {selectedLog.sessionId}
                        </Typography>
                      </>
                    )}
                    {selectedLog.ipAddress && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          IP Address
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {selectedLog.ipAddress}
                        </Typography>
                      </>
                    )}
                    {selectedLog.userAgent && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          User Agent
                        </Typography>
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          {selectedLog.userAgent}
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Metadata */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Event Metadata
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        p: 2,
                        borderRadius: 1,
                        bgcolor: theme.palette.grey[100],
                        overflowX: 'auto',
                        fontSize: '0.875rem',
                        '&::-webkit-scrollbar': {
                          height: 8,
                        },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: alpha(theme.palette.grey[500], 0.7),
                          borderRadius: 4,
                        },
                      }}
                    >
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Typography>No log selected</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditLogViewer;