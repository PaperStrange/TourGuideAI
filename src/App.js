import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import ChatPage from './pages/ChatPage';
import MapPage from './pages/MapPage';
import ProfilePage from './pages/ProfilePage';
import Login from './components/auth/Login';
// Simple auth context
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './styles/App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Simplified Navigation Bar for MVP
function SimpleNavbar() {
  const { isAuthenticated, logout, user } = useAuth();

  const handleLogout = () => {
    logout();
  };

  if (!isAuthenticated) {
    return null; // Hide navbar when not authenticated
  }

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          TourGuide AI - MVP
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button color="inherit" href="/chat">
            Chat
          </Button>
          <Button color="inherit" href="/map">
            Map
          </Button>
          <Button color="inherit" href="/profile">
            Profile
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Logout ({user?.email})
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

// Simple route protection component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
}

// Welcome/Home page for MVP
function MVPHomePage() {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/chat" />;
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '80vh',
      padding: 3 
    }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Welcome to TourGuide AI
      </Typography>
      <Typography variant="h6" component="p" gutterBottom color="text.secondary">
        Your AI-powered travel planning assistant
      </Typography>
      <Typography variant="body1" component="p" gutterBottom color="text.secondary" sx={{ maxWidth: 600, textAlign: 'center', mb: 4 }}>
        Experience the power of AI-driven travel planning with integrated chat, interactive maps, 
        and personalized route optimization. Start your journey today!
      </Typography>
      <Box sx={{ mt: 4 }}>
        <Button variant="contained" size="large" href="/login">
          Get Started
        </Button>
      </Box>
    </Box>
  );
}

function AppContent() {
  return (
    <div className="App">
      <SimpleNavbar />
      <main className="main-content">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<MVPHomePage />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes - MVP core features only */}
          <Route path="/chat" element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          } />
          
          <Route path="/map" element={
            <ProtectedRoute>
              <MapPage />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          
          {/* Catch-all - redirect to home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 