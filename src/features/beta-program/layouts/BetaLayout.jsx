import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  IconButton, 
  Avatar, 
  Menu, 
  MenuItem, 
  Tooltip, 
  Badge,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FeedbackIcon from '@mui/icons-material/Feedback';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AssignmentIcon from '@mui/icons-material/Assignment';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate, useLocation } from 'react-router-dom';

const DRAWER_WIDTH = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${DRAWER_WIDTH}px`,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  }),
);

/**
 * Beta Program Layout
 * Main layout for all beta program pages
 */
const BetaLayout = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationsOpen = (event) => {
    setNotificationsAnchorEl(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setNotificationsAnchorEl(null);
  };

  const handleLogout = () => {
    // Handle logout logic
    handleProfileMenuClose();
    navigate('/login');
  };

  const handleProfileClick = () => {
    handleProfileMenuClose();
    navigate('/beta/profile');
  };

  const handleSettingsClick = () => {
    handleProfileMenuClose();
    navigate('/beta/settings');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/beta' },
    { text: 'Surveys', icon: <AssignmentIcon />, path: '/beta/surveys' },
    { text: 'Feature Requests', icon: <LightbulbIcon />, path: '/beta/feature-requests' },
    { text: 'Feedback', icon: <FeedbackIcon />, path: '/beta/feedback' },
  ];

  // Profile menu
  const profileMenu = (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleProfileMenuClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <MenuItem onClick={handleProfileClick}>
        <ListItemIcon>
          <AccountCircleIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Profile</ListItemText>
      </MenuItem>
      <MenuItem onClick={handleSettingsClick}>
        <ListItemIcon>
          <AccountCircleIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Settings</ListItemText>
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Logout</ListItemText>
      </MenuItem>
    </Menu>
  );

  // Notifications menu
  const notificationsMenu = (
    <Menu
      anchorEl={notificationsAnchorEl}
      open={Boolean(notificationsAnchorEl)}
      onClose={handleNotificationsClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <MenuItem onClick={handleNotificationsClose}>
        <Box>
          <Typography variant="subtitle2">New Survey Available</Typography>
          <Typography variant="body2" color="text.secondary">
            Complete the user experience feedback survey
          </Typography>
        </Box>
      </MenuItem>
      <MenuItem onClick={handleNotificationsClose}>
        <Box>
          <Typography variant="subtitle2">Feature Request Update</Typography>
          <Typography variant="body2" color="text.secondary">
            Your feature request "Offline Mode" is now planned
          </Typography>
        </Box>
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleNotificationsClose}>
        <Typography variant="body2" color="primary">
          View all notifications
        </Typography>
      </MenuItem>
    </Menu>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            TourGuideAI Beta Program
          </Typography>
          
          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton 
              color="inherit" 
              onClick={handleNotificationsOpen}
              size="large"
            >
              <Badge badgeContent={2} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          {/* Profile */}
          <Tooltip title="Account">
            <IconButton
              edge="end"
              aria-label="account of current user"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>B</Avatar>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      
      {/* Side Drawer */}
      <Drawer
        variant="persistent"
        open={drawerOpen}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem 
                button 
                key={item.text}
                onClick={() => navigate(item.path)}
                selected={location.pathname === item.path}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.action.selected,
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                    },
                  },
                }}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      
      {/* Main Content */}
      <Main open={drawerOpen}>
        <Toolbar /> {/* This is for spacing below the AppBar */}
        <Outlet />
      </Main>
      
      {/* Menus */}
      {profileMenu}
      {notificationsMenu}
    </Box>
  );
};

export default BetaLayout; 