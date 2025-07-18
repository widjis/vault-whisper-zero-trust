import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  VpnKey as KeyIcon,
  Star as StarIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { apiGet } from '../utils/api';

interface DashboardStats {
  totalEntries: number;
  favoriteEntries: number;
  recentlyViewed: Array<{
    id: string;
    title: string;
    lastViewed: string;
  }>;
  categories: Array<{
    name: string;
    count: number;
  }>;
  securityStatus: {
    passwordLastChanged: string | null;
    activeSessions: number;
    lastLogin: string | null;
  };
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await apiGet<DashboardStats>('/api/dashboard/stats');
        setStats(data);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  // Fallback data if API call fails
  const dashboardData = stats || {
    totalEntries: 0,
    favoriteEntries: 0,
    recentlyViewed: [],
    categories: [],
    securityStatus: {
      passwordLastChanged: null,
      activeSessions: 1,
      lastLogin: null,
    },
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Welcome Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 2,
          bgcolor: 'primary.light',
          color: 'primary.contrastText',
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome back, {user?.firstName || 'User'}
        </Typography>
        <Typography variant="body1">
          Your secure vault is ready. Manage your sensitive information with confidence.
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Button
            component={RouterLink}
            to="/entries"
            variant="contained"
            color="secondary"
            startIcon={<KeyIcon />}
            sx={{ mr: 2 }}
          >
            View Vault
          </Button>
          <Button
            component={RouterLink}
            to="/entries/new"
            variant="outlined"
            color="inherit"
            startIcon={<AddIcon />}
          >
            Add New Entry
          </Button>
        </Box>
      </Paper>

      <Grid container spacing={4}>
        {/* Stats Cards */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Card sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <KeyIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="div">
                      Total Entries
                    </Typography>
                  </Box>
                  <Typography variant="h3" component="div" sx={{ mt: 2, fontWeight: 'bold' }}>
                    {dashboardData.totalEntries}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    component={RouterLink}
                    to="/entries"
                    size="small"
                    endIcon={<ViewIcon />}
                  >
                    View All
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <StarIcon sx={{ color: '#FFD700', mr: 1 }} />
                    <Typography variant="h6" component="div">
                      Favorites
                    </Typography>
                  </Box>
                  <Typography variant="h3" component="div" sx={{ mt: 2, fontWeight: 'bold' }}>
                    {dashboardData.favoriteEntries}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    component={RouterLink}
                    to="/entries?filter=favorites"
                    size="small"
                    endIcon={<ViewIcon />}
                  >
                    View Favorites
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" component="div" gutterBottom>
                    Categories
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {dashboardData.categories.length > 0 ? (
                      dashboardData.categories.map((category) => (
                        <Grid item xs={6} sm={4} md={3} key={category.name}>
                          <Paper
                            sx={{
                              p: 2,
                              textAlign: 'center',
                              bgcolor: 'background.default',
                              borderRadius: 2,
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              {category.name}
                            </Typography>
                            <Typography variant="h6">{category.count}</Typography>
                          </Paper>
                        </Grid>
                      ))
                    ) : (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          No categories found
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Recent Activity & Security */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={3} direction="column">
            <Grid item>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <HistoryIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="div">
                      Recently Viewed
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <List sx={{ p: 0 }}>
                    {dashboardData.recentlyViewed.length > 0 ? (
                      dashboardData.recentlyViewed.map((entry) => (
                        <ListItem
                          key={entry.id}
                          component={RouterLink}
                          to={`/entries/${entry.id}`}
                          sx={{
                            borderRadius: 1,
                            mb: 1,
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <ListItemIcon>
                            <KeyIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={entry.title}
                            secondary={`Viewed: ${new Date(entry.lastViewed).toLocaleDateString()}`}
                            primaryTypographyProps={{ variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      ))
                    ) : (
                      <ListItem>
                        <ListItemText
                          primary="No recently viewed entries"
                          primaryTypographyProps={{
                            variant: 'body2',
                            color: 'text.secondary',
                          }}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <SecurityIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="div">
                      Security Status
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <List sx={{ p: 0 }}>
                    <ListItem>
                      <ListItemIcon>
                        <PersonIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Active Sessions"
                        secondary={dashboardData.securityStatus.activeSessions}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <HistoryIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Last Login"
                        secondary={
                          dashboardData.securityStatus.lastLogin
                            ? new Date(dashboardData.securityStatus.lastLogin).toLocaleString()
                            : 'N/A'
                        }
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <SecurityIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Password Last Changed"
                        secondary={
                          dashboardData.securityStatus.passwordLastChanged
                            ? new Date(
                                dashboardData.securityStatus.passwordLastChanged
                              ).toLocaleDateString()
                            : 'Never'
                        }
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  </List>
                </CardContent>
                <CardActions>
                  <Button
                    component={RouterLink}
                    to="/profile"
                    size="small"
                    endIcon={<PersonIcon />}
                  >
                    Manage Profile
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;