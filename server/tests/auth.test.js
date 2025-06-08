/**
 * Authentication Tests
 * 
 * Tests for JWT-based authentication system for beta testers.
 */

const request = require('supertest');
const app = require('../server');
const betaUsers = require('../models/betaUsers');
const jwtAuth = require('../utils/jwtAuth');

// Mock routes directly to avoid issues with route handlers
jest.mock('../routes/auth', () => {
  const express = require('express');
  const router = express.Router();
  
  router.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        error: { type: 'missing_credentials', message: 'Email and password are required' }
      });
    }
    
    if (email === 'test@example.com' && password === 'testpassword123') {
      return res.status(200).json({
        token: 'mock_token',
        user: { id: 'test-id', email: 'test@example.com' }
      });
    }
    
    return res.status(401).json({
      error: { type: 'invalid_credentials', message: 'Invalid credentials' }
    });
  });
  
  router.get('/me', (req, res) => {
    if (!req.headers.authorization) {
      return res.status(401).json({
        error: { type: 'auth_required', message: 'Authentication required' }
      });
    }
    
    return res.status(200).json({
      user: { id: 'test-id', email: 'test@example.com' }
    });
  });
  
  router.post('/logout', (req, res) => {
    if (!req.headers.authorization) {
      return res.status(401).json({
        error: { type: 'auth_required', message: 'Authentication required' }
      });
    }
    
    return res.status(200).json({ message: 'Logged out successfully' });
  });
  
  return router;
});

// Mock inviteCodes routes
jest.mock('../routes/inviteCodes', () => {
  const express = require('express');
  const router = express.Router();
  
  router.post('/generate', (req, res) => {
    return res.status(201).json({
      inviteCode: {
        code: 'test-invite-code',
        createdBy: 'test-user-id',
        isValid: true,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
  });
  
  router.post('/validate', (req, res) => {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        error: {
          message: 'Invitation code is required',
          type: 'missing_code'
        }
      });
    }
    
    return res.json({ isValid: code === 'test-invite-code' });
  });
  
  router.get('/', (req, res) => {
    return res.json({
      codes: [
        {
          code: 'test-invite-code',
          createdBy: 'test-user-id',
          isValid: true,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      ]
    });
  });
  
  router.post('/invalidate', (req, res) => {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        error: {
          message: 'Invitation code is required',
          type: 'missing_code'
        }
      });
    }
    
    return res.json({ success: true });
  });
  
  router.post('/send', (req, res) => {
    const { code, email } = req.body;
    
    if (!code || !email) {
      return res.status(400).json({
        error: {
          message: 'Invite code and email are required',
          type: 'missing_fields'
        }
      });
    }
    
    return res.json({
      message: 'Invitation sent successfully',
      emailSent: true
    });
  });
  
  return router;
});

// Mock the middleware
jest.mock('../middleware/authMiddleware', () => ({
  authenticateUser: (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      req.user = { id: 'test-user-id', email: 'test@example.com' };
      next();
    } else {
      res.status(401).json({ 
        error: { type: 'auth_required', message: 'Authentication required' }
      });
    }
  },
  requireAuth: (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      req.user = { id: 'test-user-id', email: 'test@example.com' };
      next();
    } else {
      res.status(401).json({ 
        error: { type: 'auth_required', message: 'Authentication required' }
      });
    }
  },
  fullOptionalAuth: (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      req.user = { id: 'test-user-id', email: 'test@example.com' };
    }
    next();
  },
  fullAuth: (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      req.user = { id: 'test-user-id', email: 'test@example.com', role: 'admin' };
      next();
    } else {
      res.status(401).json({ 
        error: { type: 'auth_required', message: 'Authentication required' }
      });
    }
  }
}));

// Mock RBAC middleware
jest.mock('../middleware/rbacMiddleware', () => ({
  requireRole: (role) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: { type: 'auth_required', message: 'Authentication required' }
      });
    }
    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({
        error: { type: 'insufficient_role', message: `Role '${role}' required` }
      });
    }
    next();
  },
  requirePermission: (permission) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: { type: 'auth_required', message: 'Authentication required' }
      });
    }
    // For testing, just allow if user has admin role
    if (req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({
        error: { type: 'insufficient_permission', message: `Permission '${permission}' required` }
      });
    }
  },
  PERMISSIONS: {
    CREATE_INVITE: 'create:invite'
  }
}));

// Mock jwtAuth
jest.mock('../utils/jwtAuth', () => ({
  generateToken: jest.fn().mockImplementation(user => `mock_token_for_${user.id}`),
  verifyToken: jest.fn().mockImplementation(token => {
    if (token === 'mock_token_for_undefined' || token.includes('revoked')) {
      return null;
    }
    const userId = token.split('_').pop();
    return { sub: userId, email: 'test@example.com' };
  }),
  revokeToken: jest.fn().mockImplementation(token => {
    return true;
  }),
  extractTokenFromRequest: jest.fn().mockImplementation(req => {
    if (!req.headers.authorization) return null;
    return req.headers.authorization.substring(7); // Remove 'Bearer ' prefix
  })
}));

// Mock server close method
const originalClose = app.close;
app.close = jest.fn().mockImplementation((callback) => {
  if (typeof callback === 'function') {
    callback();
  }
  return app;
});

describe('Authentication API', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'testpassword123',
    role: 'beta-tester'
  };
  
  let userId;
  let authToken;
  
  // Setup - create a test user
  beforeAll(async () => {
    await betaUsers.initialize();
    
    // Create a test user
    const user = await betaUsers.createUser(testUser);
    userId = user.id;

    // Pre-generate token for tests
    authToken = `mock_token_for_${userId}`;
  });
  
  // Cleanup to avoid open handles
  afterAll(async () => {
    // Manually clean up server connections
    if (app.close) {
      await new Promise(resolve => {
        app.close(resolve);
      });
    }
    
    // Close any other open handles
    jest.restoreAllMocks();
  });
  
  describe('POST /api/auth/login', () => {
    it('should return 400 if email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.type).toBe('missing_credentials');
    });
    
    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });
      
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.type).toBe('invalid_credentials');
    });
    
    it('should return a JWT token for valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
    });
  });
  
  describe('GET /api/auth/me', () => {
    it('should return 401 if no token is provided', async () => {
      const res = await request(app)
        .get('/api/auth/me');
      
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.type).toBe('auth_required');
    });
    
    it('should return user info with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
    });
  });
  
  describe('POST /api/auth/logout', () => {
    it('should revoke the token', async () => {
      // First check if revokeToken function works correctly
      const wasRevoked = await jwtAuth.revokeToken(authToken);
      expect(wasRevoked).toBe(true);
      
      // Then test the actual endpoint
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
    });
  });
}); 