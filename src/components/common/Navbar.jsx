import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemText, 
  Box,
  useMediaQuery,
  Container,
  Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Link, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import { AuthButtons } from '../../features/beta-program/components/auth';

/**
 * Navbar component
 * Provides navigation for the application with responsive design
 */
const Navbar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Define navigation links
  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Chat', path: '/chat' },
    { name: 'Map', path: '/map' },
    { name: 'Profile', path: '/profile' },
    { name: 'Beta Program', path: '/beta' }
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Safely render AuthButtons component
  const renderAuthButtons = (props) => {
    try {
      return <AuthButtons {...props} />;
    } catch (error) {
      console.warn('Error rendering AuthButtons:', error);
      return (
        <Button color="inherit" component={Link} to="/">
          Home
        </Button>
      );
    }
  };

  const drawer = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
    >
      <List>
        {navLinks.map((link) => (
          <ListItem 
            button 
            component={Link} 
            to={link.path} 
            key={link.name}
            selected={isActive(link.path)}
            onClick={handleDrawerToggle}
          >
            <ListItemText primary={link.name} />
          </ListItem>
        ))}
      </List>
      
      <Divider />
      
      {/* Mobile auth buttons */}
      {renderAuthButtons({ isMobile: true, onMobileItemClick: handleDrawerToggle })}
    </Box>
  );

  return (
    <AppBar position="static" className="navbar">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Logo and mobile menu button */}
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              mr: 2,
              display: 'flex',
              fontWeight: 700,
              color: 'white',
              textDecoration: 'none',
              flexGrow: { xs: 1, md: 0 }
            }}
            className="logo-link"
          >
            TourGuideAI
          </Typography>

          {isMobile ? (
            <>
              <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="menu"
                onClick={handleDrawerToggle}
                sx={{ ml: 'auto' }}
              >
                <MenuIcon />
              </IconButton>
              <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={handleDrawerToggle}
              >
                {drawer}
              </Drawer>
            </>
          ) : (
            <>
              {/* Desktop menu */}
              <Box sx={{ flexGrow: 1, display: 'flex' }}>
                {navLinks.map((link) => (
                  <Button
                    key={link.name}
                    component={Link}
                    to={link.path}
                    sx={{ 
                      my: 2, 
                      color: 'white', 
                      display: 'block',
                      mx: 1,
                      borderBottom: isActive(link.path) ? '2px solid white' : 'none',
                      borderRadius: 0,
                      '&:hover': {
                        borderBottom: '2px solid white',
                      }
                    }}
                  >
                    {link.name}
                  </Button>
                ))}
              </Box>

              {/* Auth buttons */}
              {renderAuthButtons()}
            </>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar; 