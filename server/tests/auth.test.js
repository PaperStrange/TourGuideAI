/**
 * Authentication Tests
 * 
 * Tests for JWT-based authentication system for beta testers.
 */

const request = require('supertest');
const app = require('../server');
const betaUsers = require('../models/betaUsers');
const jwtAuth = require('../utils/jwtAuth');

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
      
      // Save token for later tests
      authToken = res.body.token;
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
      expect(res.body.user.id).toBe(userId);
    });
  });
  
  describe('POST /api/auth/logout', () => {
    it('should revoke the token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      
      // Try to use the revoked token
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(meRes.statusCode).toBe(401);
    });
  });
}); 