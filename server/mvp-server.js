const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Simple in-memory user store (replace with database in production)
const users = [
  {
    id: 1,
    email: 'demo@example.com',
    password: 'demo123', // In production, hash passwords!
    name: 'Demo User'
  }
];

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../build')));

// JWT secret (use a secure secret in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Simple authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name }
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  // Check if user already exists
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Create new user
  const newUser = {
    id: users.length + 1,
    email,
    password, // In production, hash this!
    name
  };
  users.push(newUser);

  const token = jwt.sign(
    { sub: newUser.id, email: newUser.email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: { id: newUser.id, email: newUser.email, name: newUser.name }
  });
});

// OpenAI API proxy (protected)
app.post('/api/openai/chat', authenticateToken, async (req, res) => {
  try {
    const { OpenAI } = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: req.body.messages,
      max_tokens: req.body.max_tokens || 150,
    });

    res.json(response);
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ 
      message: 'OpenAI API error', 
      error: error.message 
    });
  }
});

// Google Maps API proxy (protected)
app.get('/api/maps/places', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    // Simple proxy to Google Places API
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!googleMapsApiKey) {
      return res.status(500).json({ message: 'Google Maps API key not configured' });
    }

    // In a real app, you'd make the actual API call here
    res.json({ 
      message: 'Google Maps API proxy endpoint',
      query,
      note: 'Implement actual Google Places API call here'
    });
  } catch (error) {
    console.error('Google Maps API error:', error);
    res.status(500).json({ 
      message: 'Google Maps API error', 
      error: error.message 
    });
  }
});

// User profile endpoint (protected)
app.get('/api/user/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.sub);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name
  });
});

app.put('/api/user/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.sub);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { name } = req.body;
  user.name = name || user.name;

  res.json({
    id: user.id,
    email: user.email,
    name: user.name
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MVP Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Available endpoints:');
  console.log('- POST /api/auth/login');
  console.log('- POST /api/auth/register'); 
  console.log('- POST /api/openai/chat (protected)');
  console.log('- GET /api/maps/places (protected)');
  console.log('- GET /api/user/profile (protected)');
  console.log('- PUT /api/user/profile (protected)');
}); 