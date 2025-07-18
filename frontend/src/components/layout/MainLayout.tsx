import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Container,
  Avatar,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Breadcrumbs,
  Link,
  Paper,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  VpnKey as VpnKeyIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  Home as HomeIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeContext } from '../../theme/ThemeProvider';

const drawerWidth = 240;

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { toggleColorMode, mode } = useThemeContext();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleLogout = () => {
    handleCloseUserMenu();
    logout();
    navigate('/login');
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleNavigate = (path: string) => () => {
    navigate(path);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  // Generate breadcrumbs based on current location
  const generateBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter((x) => x);
    
    return (
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link 
          color="inherit" 
          sx={{ display: 'flex', alignItems: 'center' }}
          onClick={() => navigate('/')}
          underline="hover"
          style={{ cursor: 'pointer' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Home
        </Link>
        {pathnames.map((name, index) => {
          const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          
          // Format the breadcrumb text (capitalize and replace hyphens with spaces)
          const formattedName = name
            .split('-')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
          
          return isLast ? (
            <Typography key={routeTo} color="text.primary">
              {formattedName}
            </Typography>
          ) : (
            <Link
              key={routeTo}
              color="inherit"
              onClick={() => navigate(routeTo)}
              underline="hover"
              style={{ cursor: 'pointer' }}
            >
              {formattedName}
            </Link>
          );
        })}
      </Breadcrumbs>
    );
  };

  const drawer = (
    <>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Vault Whisper
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem button onClick={handleNavigate('/dashboard')}>
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button onClick={handleNavigate('/vault-entries')}>
          <ListItemIcon>
            <VpnKeyIcon />
          </ListItemIcon>
          <ListItemText primary="Vault Entries" />
        </ListItem>
        <ListItem button onClick={handleNavigate('/security')}>
          <ListItemIcon>
            <SecurityIcon />
          </ListItemIcon>
          <ListItemText primary="Security" />
        </ListItem>
        <ListItem button onClick={handleNavigate('/profile')}>
          <ListItemIcon>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText primary="Profile" />
        </ListItem>
        {user?.role === 'ADMIN' && (
          <ListItem button onClick={handleNavigate('/admin')}>
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText primary="Admin" />
          </ListItem>
        )}
      </List>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` },
          ml: { md: `${drawerOpen ? drawerWidth : 0}px` },
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {isMobile ? 'Vault Whisper' : ''}
          </Typography>
          
          <IconButton onClick={toggleColorMode} color="inherit">
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          
          <Box sx={{ flexGrow: 0, ml: 1 }}>
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar alt={user?.firstName || 'User'} src="/static/images/avatar/2.jpg">
                  {user?.firstName?.charAt(0) || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/profile'); }}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                <Typography textAlign="center">Profile</Typography>
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <Typography textAlign="center">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { md: drawerOpen ? drawerWidth : 0 }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={isMobile && drawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="persistent"
          open={drawerOpen}
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` },
          ml: { md: `${drawerOpen ? drawerWidth : 0}px` },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar /> {/* This is for spacing below the AppBar */}
        {generateBreadcrumbs()}
        <Paper elevation={0} sx={{ p: 2, minHeight: 'calc(100vh - 180px)' }}>
          <Outlet />
        </Paper>
      </Box>
    </Box>
  );
};

export default MainLayout;