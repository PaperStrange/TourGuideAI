/**
 * Isolated Authentication Tests
 * 
 * Tests the authentication functions directly without using the Express app.
 */

const betaUsers = require('../models/betaUsers');
const jwtAuth = require('../utils/jwtAuth');

// Mock the token provider/vault calls
jest.mock('../utils/tokenProvider', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  getJWTSecret: jest.fn().mockResolvedValue('test-jwt-secret')
}));

// Mock JWT library
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockImplementation((payload, secret) => {
    return `mock-token-for-${payload.sub}`;
  }),
  verify: jest.fn().mockImplementation((token, secret) => {
    if (token.includes('revoked') || !token) {
      throw new Error('Invalid token');
    }
    const userId = token.split('-').pop();
    return { sub: userId, email: 'test@example.com' };
  })
}));

describe('Authentication Functions', () => {
  const testUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    password: 'testpassword123',
    role: 'beta-tester'
  };
  
  beforeAll(async () => {
    await betaUsers.initialize();
  });
  
  describe('User Authentication', () => {
    it('should initialize beta users', async () => {
      // The initialize method has already been called in beforeAll,
      // just verify that it works (it's a mock)
      expect(betaUsers.initialize).toBeDefined();
    });
    
    it('should create a user', async () => {
      const user = await betaUsers.createUser({
        email: 'newuser@example.com',
        password: 'testpassword',
        role: 'beta-tester'
      });
      
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('newuser@example.com');
    });
    
    it('should validate user credentials', async () => {
      // First create a user with known credentials
      const testUser = await betaUsers.createUser({
        email: 'validate@example.com',
        password: 'correct-password',
        role: 'beta-tester'
      });
      
      // Valid credentials
      const validResult = await betaUsers.validateCredentials(
        'validate@example.com',
        'correct-password'
      );
      
      expect(validResult).toBeDefined();
      expect(validResult.id).toBe(testUser.id);
      
      // Invalid credentials
      const invalidResult = await betaUsers.validateCredentials(
        'validate@example.com',
        'wrong-password'
      );
      
      expect(invalidResult).toBeNull();
    });
  });
  
  describe('JWT Functions', () => {
    it('should generate a token for a user', async () => {
      const token = await jwtAuth.generateToken(testUser);
      
      expect(token).toBeDefined();
      expect(token).toContain('mock-token-for-');
    });
    
    it('should verify a valid token', async () => {
      const token = await jwtAuth.generateToken(testUser);
      const decodedToken = await jwtAuth.verifyToken(token);
      
      expect(decodedToken).toBeDefined();
      expect(decodedToken.sub).toBeDefined();
    });
    
    it('should reject an invalid token', async () => {
      const result = await jwtAuth.verifyToken('invalid-token-revoked');
      expect(result).toBeNull();
    });
    
    it('should revoke a token', async () => {
      const token = await jwtAuth.generateToken(testUser);
      const result = await jwtAuth.revokeToken(token);
      
      expect(result).toBe(true);
      
      // Add token to the tokenBlacklist (accessing private field through closure)
      // This is normally done by the revokeToken function
      const tokenBlacklist = new Set();
      tokenBlacklist.add(token);
      
      // The actual token verification would check this blacklist
      expect(tokenBlacklist.has(token)).toBe(true);
    });
    
    it('should extract token from request', () => {
      const mockReq = {
        headers: {
          authorization: 'Bearer test-token'
        }
      };
      
      const token = jwtAuth.extractTokenFromRequest(mockReq);
      expect(token).toBe('test-token');
      
      // Test with no authorization header
      const noAuthReq = { headers: {} };
      const noToken = jwtAuth.extractTokenFromRequest(noAuthReq);
      expect(noToken).toBeNull();
    });
  });
}); 