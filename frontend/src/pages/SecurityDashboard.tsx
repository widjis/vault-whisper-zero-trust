import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Card,
  CardContent,
  CardHeader,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
} from '@mui/material';
import {
  Security,
  VpnKey,
  DevicesOther,
  History,
  Warning,
  Check,
  Visibility,
  VisibilityOff,
  Refresh,
  Delete,
  ContentCopy,
  Download,
  QrCode,
  Lock,
  LockOpen,
  ErrorOutline,
  Info,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks';
import PasswordStrengthMeter from '../components/common/PasswordStrengthMeter';
import { calculatePasswordStrength } from '../utils/passwordStrength';

interface SecurityScore {
  overall: number;
  passwordStrength: number;
  twoFactorEnabled: boolean;
  unusedBackupCodes: number;
  recentPasswordChange: boolean;
  activeSessions: number;
  weakPasswords: number;
  expiredPasswords: number;
  duplicatePasswords: number;
}

interface PasswordHealth {
  weak: number;
  medium: number;
  strong: number;
  expired: number;
  expiringSoon: number;
  duplicates: number;
  total: number;
}

interface Session {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
}

interface SecurityEvent {
  id: string;
  eventType: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  details: string;
}

const SecurityDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // API hooks
  const securityScoreApi = useApi<SecurityScore>();
  const passwordHealthApi = useApi<PasswordHealth>();
  const sessionsApi = useApi<Session[]>();
  const securityEventsApi = useApi<SecurityEvent[]>();
  
  // State
  const [securityScore, setSecurityScore] = useState<SecurityScore | null>(null);
  const [passwordHealth, setPasswordHealth] = useState<PasswordHealth | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [eventsDialogOpen, setEventsDialogOpen] = useState(false);
  const [passwordHealthDialogOpen, setPasswordHealthDialogOpen] = useState(false);
  
  useEffect(() => {
    const fetchSecurityData = async () => {
      setLoading(true);
      try {
        // Fetch security score
        const scoreData = await securityScoreApi.get('/api/security/score');
        if (scoreData) setSecurityScore(scoreData);
        
        // Fetch password health
        const healthData = await passwordHealthApi.get('/api/security/password-health');
        if (healthData) setPasswordHealth(healthData);
        
        // Fetch sessions
        const sessionsData = await sessionsApi.get('/api/sessions');
        if (sessionsData) setSessions(sessionsData);
        
        // Fetch security events
        const eventsData = await securityEventsApi.get('/api/security/events?limit=5');
        if (eventsData) setSecurityEvents(eventsData);
      } catch (error) {
        console.error('Failed to fetch security data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSecurityData();
  }, []);
  
  const handleRevokeSession = async (sessionId: string) => {
    try {
      await sessionsApi.post(`/api/sessions/${sessionId}/revoke`, {});
      // Refresh sessions list
      const sessionsData = await sessionsApi.get('/api/sessions');
      if (sessionsData) setSessions(sessionsData);
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  };
  
  const handleRevokeAllSessions = async () => {
    try {
      await sessionsApi.post('/api/auth/logout-all', {});
      // Refresh sessions list
      const sessionsData = await sessionsApi.get('/api/sessions');
      if (sessionsData) setSessions(sessionsData);
      setSessionDialogOpen(false);
    } catch (error) {
      console.error('Failed to revoke all sessions:', error);
    }
  };
  
  const getScoreColor = (score: number): string => {
    if (score >= 80) return theme.palette.success.main;
    if (score >= 60) return theme.palette.warning.main;
    return theme.palette.error.main;
  };
  
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };
  
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login':
        return <Check color="success" />;
      case 'login_failed':
        return <Warning color="error" />;
      case 'password_changed':
        return <VpnKey color="primary" />;
      case 'logout':
        return <LockOpen color="info" />;
      case '2fa_enabled':
      case '2fa_disabled':
        return <Security color="secondary" />;
      default:
        return <Info color="action" />;
    }
  };
  
  const getEventDescription = (event: SecurityEvent): string => {
    switch (event.eventType) {
      case 'login':
        return `Successful login from ${event.ipAddress}`;
      case 'login_failed':
        return `Failed login attempt from ${event.ipAddress}`;
      case 'password_changed':
        return 'Password was changed';
      case 'logout':
        return 'Logged out';
      case '2fa_enabled':
        return 'Two-factor authentication enabled';
      case '2fa_disabled':
        return 'Two-factor authentication disabled';
      default:
        return event.details || 'Unknown event';
    }
  };
  
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Security Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Security Score */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={0} 
            variant="outlined" 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                position: 'relative',
                display: 'inline-flex',
                mb: 2,
              }}
            >
              <CircularProgress
                variant="determinate"
                value={securityScore?.overall || 0}
                size={120}
                thickness={5}
                sx={{ color: getScoreColor(securityScore?.overall || 0) }}
              />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h4" component="div" color="text.primary">
                  {securityScore?.overall || 0}%
                </Typography>
              </Box>
            </Box>
            <Typography variant="h6" gutterBottom>
              Security Score
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {securityScore?.overall && securityScore.overall >= 80
                ? 'Your account is well protected'
                : securityScore?.overall && securityScore.overall >= 60
                ? 'Your account security needs improvement'
                : 'Your account security is at risk'}
            </Typography>
            <Button 
              variant="outlined" 
              sx={{ mt: 2 }}
              onClick={() => navigate('/settings')}
            >
              Improve Security
            </Button>
          </Paper>
        </Grid>
        
        {/* Security Status */}
        <Grid item xs={12} md={8}>
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Security Status
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      {securityScore?.twoFactorEnabled ? (
                        <Check color="success" />
                      ) : (
                        <Warning color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary="Two-Factor Authentication"
                      secondary={securityScore?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {securityScore?.recentPasswordChange ? (
                        <Check color="success" />
                      ) : (
                        <Warning color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary="Password Last Changed"
                      secondary={securityScore?.recentPasswordChange ? 'Recently' : 'Over 90 days ago'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {securityScore?.unusedBackupCodes > 0 ? (
                        <Check color="success" />
                      ) : (
                        <Warning color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary="Backup Recovery Codes"
                      secondary={securityScore?.unusedBackupCodes > 0 
                        ? `${securityScore.unusedBackupCodes} available` 
                        : 'None available'}
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} sm={6}>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      {(securityScore?.activeSessions || 0) <= 2 ? (
                        <Check color="success" />
                      ) : (
                        <Warning color="warning" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary="Active Sessions"
                      secondary={`${securityScore?.activeSessions || 0} device(s)`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {(securityScore?.weakPasswords || 0) === 0 ? (
                        <Check color="success" />
                      ) : (
                        <Warning color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary="Weak Passwords"
                      secondary={`${securityScore?.weakPasswords || 0} found`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {(securityScore?.duplicatePasswords || 0) === 0 ? (
                        <Check color="success" />
                      ) : (
                        <Warning color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary="Duplicate Passwords"
                      secondary={`${securityScore?.duplicatePasswords || 0} found`}
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* Password Health */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Password Health</Typography>
              <Button 
                size="small" 
                onClick={() => setPasswordHealthDialogOpen(true)}
                endIcon={<Refresh />}
              >
                Details
              </Button>
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Strong: {passwordHealth?.strong || 0} passwords
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={(passwordHealth?.strong || 0) / (passwordHealth?.total || 1) * 100} 
                color="success"
                sx={{ height: 8, borderRadius: 4, mb: 1 }}
              />
              
              <Typography variant="body2" gutterBottom>
                Medium: {passwordHealth?.medium || 0} passwords
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={(passwordHealth?.medium || 0) / (passwordHealth?.total || 1) * 100} 
                color="warning"
                sx={{ height: 8, borderRadius: 4, mb: 1 }}
              />
              
              <Typography variant="body2" gutterBottom>
                Weak: {passwordHealth?.weak || 0} passwords
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={(passwordHealth?.weak || 0) / (passwordHealth?.total || 1) * 100} 
                color="error"
                sx={{ height: 8, borderRadius: 4, mb: 1 }}
              />
            </Box>
            
            {passwordHealth?.weak && passwordHealth.weak > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                You have {passwordHealth.weak} weak passwords that need attention.
              </Alert>
            )}
            
            {passwordHealth?.expired && passwordHealth.expired > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                You have {passwordHealth.expired} expired passwords that should be updated immediately.
              </Alert>
            )}
            
            {passwordHealth?.expiringSoon && passwordHealth.expiringSoon > 0 && (
              <Alert severity="info">
                You have {passwordHealth.expiringSoon} passwords expiring soon.
              </Alert>
            )}
          </Paper>
        </Grid>
        
        {/* Recent Security Events */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Recent Security Events</Typography>
              <Button 
                size="small" 
                onClick={() => setEventsDialogOpen(true)}
                endIcon={<Refresh />}
              >
                View All
              </Button>
            </Box>
            <List dense>
              {securityEvents.length > 0 ? (
                securityEvents.map((event) => (
                  <ListItem key={event.id}>
                    <ListItemIcon>
                      {getEventIcon(event.eventType)}
                    </ListItemIcon>
                    <ListItemText
                      primary={getEventDescription(event)}
                      secondary={formatDate(event.timestamp)}
                    />
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="No recent security events" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
        
        {/* Active Sessions */}
        <Grid item xs={12}>
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Active Sessions</Typography>
              <Button 
                size="small" 
                onClick={() => setSessionDialogOpen(true)}
                endIcon={<Refresh />}
                disabled={sessions.length <= 1}
              >
                Manage All
              </Button>
            </Box>
            <Grid container spacing={2}>
              {sessions.length > 0 ? (
                sessions.slice(0, 3).map((session) => (
                  <Grid item xs={12} sm={6} md={4} key={session.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="subtitle1">
                            {session.userAgent.split(' ')[0]}
                          </Typography>
                          {session.isCurrent && (
                            <Chip label="Current" size="small" color="primary" />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          IP: {session.ipAddress}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Last Active: {formatDate(session.lastActive)}
                        </Typography>
                        {!session.isCurrent && (
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<Delete />}
                            onClick={() => handleRevokeSession(session.id)}
                            sx={{ mt: 1 }}
                            fullWidth
                          >
                            Revoke
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Typography>No active sessions found</Typography>
                </Grid>
              )}
              {sessions.length > 3 && (
                <Grid item xs={12}>
                  <Button 
                    variant="text" 
                    onClick={() => setSessionDialogOpen(true)}
                  >
                    View All {sessions.length} Sessions
                  </Button>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Sessions Dialog */}
      <Dialog open={sessionDialogOpen} onClose={() => setSessionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Manage Active Sessions</DialogTitle>
        <DialogContent>
          <List>
            {sessions.map((session) => (
              <ListItem key={session.id}>
                <ListItemIcon>
                  <DevicesOther />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center">
                      <Typography variant="body1">
                        {session.userAgent}
                        {session.isCurrent && (
                          <Chip
                            label="Current"
                            size="small"
                            color="primary"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="caption" display="block">
                        IP: {session.ipAddress}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Created: {formatDate(session.createdAt)}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Last Active: {formatDate(session.lastActive)}
                      </Typography>
                    </>
                  }
                />
                {!session.isCurrent && (
                  <ListItemSecondaryAction>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleRevokeSession(session.id)}
                    >
                      Revoke
                    </Button>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSessionDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleRevokeAllSessions}
            disabled={sessions.length <= 1}
          >
            Revoke All Other Sessions
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Security Events Dialog */}
      <Dialog open={eventsDialogOpen} onClose={() => setEventsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Security Event History</DialogTitle>
        <DialogContent>
          <List>
            {securityEvents.length > 0 ? (
              securityEvents.map((event) => (
                <ListItem key={event.id}>
                  <ListItemIcon>
                    {getEventIcon(event.eventType)}
                  </ListItemIcon>
                  <ListItemText
                    primary={getEventDescription(event)}
                    secondary={
                      <>
                        <Typography variant="caption" display="block">
                          Time: {formatDate(event.timestamp)}
                        </Typography>
                        <Typography variant="caption" display="block">
                          IP: {event.ipAddress}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Device: {event.userAgent}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText primary="No security events found" />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Password Health Dialog */}
      <Dialog open={passwordHealthDialogOpen} onClose={() => setPasswordHealthDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Password Health Details</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Password Strength Distribution
          </Typography>
          <Box sx={{ mb: 4 }}>
            <Typography variant="body2" gutterBottom>
              Strong: {passwordHealth?.strong || 0} passwords ({Math.round((passwordHealth?.strong || 0) / (passwordHealth?.total || 1) * 100)}%)
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={(passwordHealth?.strong || 0) / (passwordHealth?.total || 1) * 100} 
              color="success"
              sx={{ height: 10, borderRadius: 5, mb: 1 }}
            />
            
            <Typography variant="body2" gutterBottom>
              Medium: {passwordHealth?.medium || 0} passwords ({Math.round((passwordHealth?.medium || 0) / (passwordHealth?.total || 1) * 100)}%)
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={(passwordHealth?.medium || 0) / (passwordHealth?.total || 1) * 100} 
              color="warning"
              sx={{ height: 10, borderRadius: 5, mb: 1 }}
            />
            
            <Typography variant="body2" gutterBottom>
              Weak: {passwordHealth?.weak || 0} passwords ({Math.round((passwordHealth?.weak || 0) / (passwordHealth?.total || 1) * 100)}%)
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={(passwordHealth?.weak || 0) / (passwordHealth?.total || 1) * 100} 
              color="error"
              sx={{ height: 10, borderRadius: 5, mb: 1 }}
            />
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Password Age
          </Typography>
          <Box sx={{ mb: 4 }}>
            <Typography variant="body2" gutterBottom>
              Expired: {passwordHealth?.expired || 0} passwords
            </Typography>
            <Typography variant="body2" gutterBottom>
              Expiring soon: {passwordHealth?.expiringSoon || 0} passwords
            </Typography>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Password Reuse
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Duplicate passwords: {passwordHealth?.duplicates || 0} instances
            </Typography>
          </Box>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            We recommend updating weak passwords, replacing expired passwords, and eliminating password reuse across different accounts.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordHealthDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              setPasswordHealthDialogOpen(false);
              navigate('/vault');
            }}
          >
            View Vault Entries
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SecurityDashboard;