import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Box, 
  Menu, 
  MenuItem, 
  Avatar, 
  Typography, 
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/AuthService';
import permissionsService from '../../services/PermissionsService';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CodeIcon from '@mui/icons-material/Code';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';

/**
 * AuthButtons Component
 * 
 * Displays login/logout buttons and user menu based on authentication status
 * Supports both desktop and mobile views
 * 
 * @param {Object} props Component props
 * @param {boolean} [props.isMobile=false] Whether to render mobile optimized version
 * @param {Function} [props.onMobileItemClick] Callback for mobile menu item clicks
 * @returns {React.ReactNode} Rendered component
 */
const AuthButtons = ({ isMobile = false, onMobileItemClick }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await authService.checkAuthStatus();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        // Get user info
        const user = authService.getCurrentUser();
        setUsername(user?.name || '');
        
        // Check roles for UI customization
        setIsAdmin(await permissionsService.isAdmin());
        setIsModerator(await permissionsService.isModerator());
        
        // Get user role label
        if (await permissionsService.isAdmin()) {
          setUserRole('Admin');
        } else if (await permissionsService.isModerator()) {
          setUserRole('Moderator');
        } else {
          setUserRole('Beta Tester');
        }
      }
    };
    
    checkAuth();
  }, []);

  const handleUserMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLoginClick = () => {
    navigate('/login');
    if (onMobileItemClick) onMobileItemClick();
  };

  const handleProfileClick = () => {
    navigate('/profile');
    handleMenuClose();
    if (onMobileItemClick) onMobileItemClick();
  };

  const handleAdminClick = () => {
    navigate('/admin');
    handleMenuClose();
    if (onMobileItemClick) onMobileItemClick();
  };

  const handleInviteCodesClick = () => {
    navigate('/admin/invite-codes');
    handleMenuClose();
    if (onMobileItemClick) onMobileItemClick();
  };

  const handleLogoutClick = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    handleMenuClose();
    navigate('/');
    if (onMobileItemClick) onMobileItemClick();
  };

  // Mobile view renders a list of items instead of buttons
  if (isMobile) {
    if (!isAuthenticated) {
      return (
        <List>
          <ListItem button onClick={handleLoginClick}>
            <ListItemIcon>
              <LoginIcon />
            </ListItemIcon>
            <ListItemText primary="Sign In" />
          </ListItem>
          <ListItem button onClick={() => { 
            navigate('/login', { state: { activeTab: 1 } });
            if (onMobileItemClick) onMobileItemClick();
          }}>
            <ListItemIcon>
              <AppRegistrationIcon />
            </ListItemIcon>
            <ListItemText primary="Join Beta" />
          </ListItem>
        </List>
      );
    }

    return (
      <List>
        <ListItem>
          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Avatar 
                sx={{ width: 32, height: 32, mr: 1, bgcolor: isAdmin ? 'error.main' : isModerator ? 'warning.main' : 'primary.main' }}
              >
                {username.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                {username}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {userRole}
            </Typography>
          </Box>
        </ListItem>
        
        <Divider />
        
        <ListItem button onClick={handleProfileClick}>
          <ListItemIcon>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText primary="Profile" />
        </ListItem>
        
        <ListItem button onClick={() => { 
          navigate('/beta'); 
          if (onMobileItemClick) onMobileItemClick();
        }}>
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Beta Portal" />
        </ListItem>
        
        {(isAdmin || isModerator) && (
          <>
            <Divider />
            {isAdmin && (
              <ListItem button onClick={handleAdminClick}>
                <ListItemIcon>
                  <DashboardIcon />
                </ListItemIcon>
                <ListItemText primary="Admin Dashboard" />
              </ListItem>
            )}
            <ListItem button onClick={handleInviteCodesClick}>
              <ListItemIcon>
                <CodeIcon />
              </ListItemIcon>
              <ListItemText primary="Manage Invite Codes" />
            </ListItem>
          </>
        )}
        
        <Divider />
        
        <ListItem button onClick={handleLogoutClick}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    );
  }

  // Desktop view
  if (!isAuthenticated) {
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button 
          variant="outlined" 
          color="inherit" 
          onClick={handleLoginClick}
        >
          Sign In
        </Button>
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={() => navigate('/login', { state: { activeTab: 1 } })}
        >
          Join Beta
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Button 
        variant="text" 
        color="inherit"
        onClick={handleUserMenuClick}
        startIcon={
          <Avatar 
            sx={{ width: 32, height: 32, bgcolor: isAdmin ? 'error.main' : isModerator ? 'warning.main' : 'primary.main' }}
          >
            {username.charAt(0).toUpperCase()}
          </Avatar>
        }
      >
        {username}
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {username}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {userRole}
          </Typography>
        </Box>
        
        <Divider />
        
        <MenuItem onClick={handleProfileClick}>Profile</MenuItem>
        <MenuItem onClick={() => { navigate('/beta'); handleMenuClose(); }}>Beta Portal</MenuItem>
        
        {(isAdmin || isModerator) && (
          <>
            <Divider />
            {isAdmin && <MenuItem onClick={handleAdminClick}>Admin Dashboard</MenuItem>}
            <MenuItem onClick={handleInviteCodesClick}>Manage Invite Codes</MenuItem>
          </>
        )}
        
        <Divider />
        
        <MenuItem onClick={handleLogoutClick}>Logout</MenuItem>
      </Menu>
    </Box>
  );
};

export default AuthButtons; 