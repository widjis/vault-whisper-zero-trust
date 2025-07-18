import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  CircularProgress,
  Card, 
  CardContent, 
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import { 
  PeopleAlt as PeopleIcon,
  VpnKey as VpnKeyIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon,
  LockOpen as LockOpenIcon,
  Lock as LockIcon,
  VerifiedUser as VerifiedUserIcon,
  PersonAdd as PersonAddIcon,
  NoteAdd as NoteAddIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { fetchWithAuth } from '../../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

// Types for our statistics
interface SystemStats {
  users: {
    total: number;
    active: number;
    verified: number;
    locked: number;
    recentRegistrations: number;
  };
  vaultEntries: {
    total: number;
    recentlyCreated: number;
  };
  sessions: {
    total: number;
  };
  auditLogs: {
    total: number;
    recent: number;
  };
  timestamp: string;
}

interface ActivityStats {
  logins: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  failedLogins: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  vaultOperations: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  timestamp: string;
}

interface SecurityStats {
  securityEvents: {
    total: number;
    failed: number;
  };
  passwordResets: number;
  accountLockouts: number;
  suspiciousActivities: number;
  timestamp: string;
}

const Dashboard: React.FC = () => {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  // Colors for charts
  const colors = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
  };

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all stats in parallel
        const [systemResponse, activityResponse, securityResponse] = await Promise.all([
          fetchWithAuth('/api/admin/stats/system'),
          fetchWithAuth('/api/admin/stats/activity'),
          fetchWithAuth('/api/admin/stats/security')
        ]);

        if (!systemResponse.ok || !activityResponse.ok || !securityResponse.ok) {
          throw new Error('Failed to fetch statistics');
        }

        const systemData = await systemResponse.json();
        const activityData = await activityResponse.json();
        const securityData = await securityResponse.json();

        setSystemStats(systemData.data.stats);
        setActivityStats(activityData.data.stats);
        setSecurityStats(securityData.data.stats);
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setError('Failed to load dashboard statistics');
        enqueueSnackbar('Failed to load dashboard statistics', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Refresh stats every 5 minutes
    const intervalId = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [enqueueSnackbar]);

  // Prepare data for charts
  const prepareUserStatusData = () => {
    if (!systemStats) return [];
    
    return [
      { name: 'Active', value: systemStats.users.active, color: colors.success },
      { name: 'Inactive', value: systemStats.users.total - systemStats.users.active, color: colors.info },
      { name: 'Locked', value: systemStats.users.locked, color: colors.error },
      { name: 'Unverified', value: systemStats.users.total - systemStats.users.verified, color: colors.warning },
    ];
  };

  const prepareLoginActivityData = () => {
    if (!activityStats) return [];
    
    return [
      { name: 'Daily', successful: activityStats.logins.daily, failed: activityStats.failedLogins.daily },
      { name: 'Weekly', successful: activityStats.logins.weekly, failed: activityStats.failedLogins.weekly },
      { name: 'Monthly', successful: activityStats.logins.monthly, failed: activityStats.failedLogins.monthly },
    ];
  };

  const prepareVaultActivityData = () => {
    if (!activityStats) return [];
    
    return [
      { name: 'Daily', operations: activityStats.vaultOperations.daily },
      { name: 'Weekly', operations: activityStats.vaultOperations.weekly },
      { name: 'Monthly', operations: activityStats.vaultOperations.monthly },
    ];
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography color="error" variant="h6">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom component="div" sx={{ mb: 4 }}>
        Admin Dashboard
      </Typography>

      {/* System Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PeopleIcon sx={{ fontSize: 40, color: colors.primary, mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                    Total Users
                  </Typography>
                  <Typography variant="h4">
                    {systemStats?.users.total || 0}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                {systemStats?.users.recentRegistrations || 0} new in last 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <VpnKeyIcon sx={{ fontSize: 40, color: colors.secondary, mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                    Vault Entries
                  </Typography>
                  <Typography variant="h4">
                    {systemStats?.vaultEntries.total || 0}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                {systemStats?.vaultEntries.recentlyCreated || 0} created in last 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <VisibilityIcon sx={{ fontSize: 40, color: colors.info, mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                    Active Sessions
                  </Typography>
                  <Typography variant="h4">
                    {systemStats?.sessions.total || 0}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                {systemStats?.users.active || 0} users currently active
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <SecurityIcon sx={{ fontSize: 40, color: colors.warning, mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                    Security Events
                  </Typography>
                  <Typography variant="h4">
                    {securityStats?.securityEvents.total || 0}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                {securityStats?.suspiciousActivities || 0} suspicious activities detected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Login Activity</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prepareLoginActivityData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="successful" name="Successful Logins" fill={colors.success} />
                <Bar dataKey="failed" name="Failed Attempts" fill={colors.error} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>User Status</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={prepareUserStatusData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {prepareUserStatusData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Security Stats and Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Security Overview</Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary="Account Lockouts" 
                  secondary={`${securityStats?.accountLockouts || 0} in the last 30 days`} 
                />
                <LockIcon color="error" />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText 
                  primary="Password Resets" 
                  secondary={`${securityStats?.passwordResets || 0} in the last 30 days`} 
                />
                <LockOpenIcon color="warning" />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText 
                  primary="Failed Security Events" 
                  secondary={`${securityStats?.securityEvents.failed || 0} in the last 30 days`} 
                />
                <WarningIcon color="error" />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText 
                  primary="Suspicious Activities" 
                  secondary={`${securityStats?.suspiciousActivities || 0} in the last 30 days`} 
                />
                <WarningIcon color="warning" />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>System Health</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <Chip 
                icon={<VerifiedUserIcon />} 
                label={`${systemStats?.users.verified || 0} Verified Users`} 
                color="success" 
                variant="outlined" 
              />
              <Chip 
                icon={<LockIcon />} 
                label={`${systemStats?.users.locked || 0} Locked Accounts`} 
                color="error" 
                variant="outlined" 
              />
              <Chip 
                icon={<PersonAddIcon />} 
                label={`${systemStats?.users.recentRegistrations || 0} New Users`} 
                color="primary" 
                variant="outlined" 
              />
              <Chip 
                icon={<NoteAddIcon />} 
                label={`${systemStats?.vaultEntries.recentlyCreated || 0} New Entries`} 
                color="secondary" 
                variant="outlined" 
              />
            </Box>
            
            <Typography variant="h6" gutterBottom>Vault Activity</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={prepareVaultActivityData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="operations" name="Vault Operations" fill={colors.secondary} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Last updated timestamp */}
      <Box sx={{ mt: 4, textAlign: 'right' }}>
        <Typography variant="caption" color="textSecondary">
          Last updated: {systemStats ? formatDistanceToNow(new Date(systemStats.timestamp), { addSuffix: true }) : 'N/A'}
        </Typography>
      </Box>
    </Box>
  );
};

export default Dashboard;