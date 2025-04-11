/**
 * Tests for the KeyManager service
 */

const KeyManager = require('./keyManager');
const crypto = require('crypto');

// Create a new instance of KeyManager for testing
let keyManager;

describe('KeyManager', () => {
  // Mock environment variables and create a new instance before tests
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key';
    process.env.KEY_SALT = 'test-salt';
    process.env.KEY_ROTATION_INTERVAL = '1'; // 1 day for testing
    
    // Reset the module to pick up the environment variables
    jest.resetModules();
    keyManager = require('./keyManager');
  });

  // Clear keys between test sections
  beforeEach(() => {
    keyManager.keys.clear();
  });

  afterAll(() => {
    delete process.env.ENCRYPTION_KEY;
    delete process.env.KEY_SALT;
    delete process.env.KEY_ROTATION_INTERVAL;
  });

  describe('Key Storage and Retrieval', () => {
    it('should store and retrieve an API key', async () => {
      const testKey = 'test-api-key';
      const keyId = await keyManager.storeKey('openai', testKey);
      
      expect(keyId).toBeDefined();
      expect(typeof keyId).toBe('string');
      expect(keyId.length).toBe(32); // 16 bytes in hex

      const retrievedKey = await keyManager.getKey(keyId);
      expect(retrievedKey).toBe(testKey);
    });

    it('should throw error for non-existent key', async () => {
      const nonExistentKeyId = crypto.randomBytes(16).toString('hex');
      
      await expect(keyManager.getKey(nonExistentKeyId))
        .rejects
        .toThrow('Key not found');
    });

    it('should store metadata with the key', async () => {
      const testKey = 'test-api-key';
      const metadata = { description: 'Test key' };
      
      const keyId = await keyManager.storeKey('maps', testKey, metadata);
      
      // Get the key data directly from the map to verify metadata
      const keyData = keyManager.keys.get(keyId);
      expect(keyData.type).toBe('maps');
      expect(keyData.metadata.description).toBe('Test key');
      
      // Now check the stats which may have a different structure
      const stats = keyManager.getKeyStats(keyId);
      expect(stats.type).toBe('maps');
      expect(stats.createdAt).toBeDefined();
      expect(stats.lastUsed).toBeDefined();
      expect(stats.usageCount).toBe(0);
    });
  });

  describe('Key Rotation', () => {
    it('should rotate a key', async () => {
      const originalKey = 'original-api-key';
      const newKey = 'new-api-key';
      
      const originalKeyId = await keyManager.storeKey('openai', originalKey);
      const newKeyId = await keyManager.rotateKey(originalKeyId, newKey);
      
      expect(newKeyId).toBeDefined();
      expect(newKeyId).not.toBe(originalKeyId);
      
      const retrievedNewKey = await keyManager.getKey(newKeyId);
      expect(retrievedNewKey).toBe(newKey);
      
      // Get the key data directly from the map to verify rotation metadata
      const keyData = keyManager.keys.get(originalKeyId);
      expect(keyData.metadata.rotatedTo).toBe(newKeyId);
      expect(keyData.metadata.rotatedAt).toBeDefined();
    });

    it('should throw error when rotating non-existent key', async () => {
      const nonExistentKeyId = crypto.randomBytes(16).toString('hex');
      const newKey = 'new-api-key';
      
      await expect(keyManager.rotateKey(nonExistentKeyId, newKey))
        .rejects
        .toThrow('Key not found');
    });
  });

  describe('Key Validation', () => {
    it('should validate an existing key', async () => {
      const testKey = 'test-api-key';
      const keyId = await keyManager.storeKey('openai', testKey);
      
      const isValid = await keyManager.validateKey(keyId);
      expect(isValid).toBe(true);
    });

    it('should invalidate a non-existent key', async () => {
      const nonExistentKeyId = crypto.randomBytes(16).toString('hex');
      
      const isValid = await keyManager.validateKey(nonExistentKeyId);
      expect(isValid).toBe(false);
    });

    it('should invalidate an expired key', async () => {
      const testKey = 'test-api-key';
      const keyId = await keyManager.storeKey('openai', testKey);
      
      // Simulate key expiration by modifying the creation date
      const keyData = keyManager.keys.get(keyId);
      keyData.metadata.createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days old
      
      const isValid = await keyManager.validateKey(keyId);
      expect(isValid).toBe(false);
    });
  });

  describe('Usage Tracking', () => {
    it('should track key usage', async () => {
      const testKey = 'test-api-key';
      const keyId = await keyManager.storeKey('openai', testKey);
      
      // Use the key multiple times
      await keyManager.getKey(keyId);
      await keyManager.getKey(keyId);
      
      const stats = keyManager.getKeyStats(keyId);
      expect(stats.usageCount).toBe(2);
      expect(stats.lastUsed).toBeDefined();
    });
  });

  describe('Key Listing', () => {
    it('should list all active keys', async () => {
      // Store multiple keys
      await keyManager.storeKey('openai', 'key1');
      await keyManager.storeKey('maps', 'key2');
      
      const keys = keyManager.listKeys();
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThanOrEqual(2);
      
      const keyTypes = keys.map(k => k.type);
      expect(keyTypes).toContain('openai');
      expect(keyTypes).toContain('maps');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing encryption configuration', async () => {
      // Create a mock object without encryption configuration
      const tempKeyManager = {
        encryptKey: keyManager.encryptKey.bind({}),
        encryptionKey: null,
        salt: null
      };
      
      await expect(tempKeyManager.encryptKey('test-key'))
        .rejects
        .toThrow('Encryption configuration missing');
    });

    it('should handle invalid encrypted data', async () => {
      const invalidData = {
        encrypted: 'invalid',
        iv: 'invalid',
        authTag: 'invalid'
      };
      
      await expect(keyManager.decryptKey(invalidData))
        .rejects
        .toThrow();
    });
  });
}); 