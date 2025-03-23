/**
 * API Key Management Service
 * 
 * This service handles secure storage, rotation, and validation of API keys.
 * It uses encryption for storing keys and implements key rotation policies.
 */

const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);
const randomBytes = promisify(crypto.randomBytes);

class KeyManager {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY;
    this.salt = process.env.KEY_SALT;
    this.keyRotationInterval = parseInt(process.env.KEY_ROTATION_INTERVAL || '30', 10); // days
    this.keys = new Map();
  }

  /**
   * Encrypts an API key using scrypt
   */
  async encryptKey(key) {
    if (!this.encryptionKey || !this.salt) {
      throw new Error('Encryption configuration missing');
    }

    const derivedKey = await scrypt(this.encryptionKey, this.salt, 32);
    const iv = await randomBytes(16);
    
    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypts an API key
   */
  async decryptKey(encryptedData) {
    if (!this.encryptionKey || !this.salt) {
      throw new Error('Encryption configuration missing');
    }

    const derivedKey = await scrypt(this.encryptionKey, this.salt, 32);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Stores an API key with metadata
   */
  async storeKey(keyType, key, metadata = {}) {
    const encryptedData = await this.encryptKey(key);
    const keyId = crypto.randomBytes(16).toString('hex');
    
    this.keys.set(keyId, {
      type: keyType,
      encryptedData,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        usageCount: 0
      }
    });
    
    return keyId;
  }

  /**
   * Retrieves an API key by ID
   */
  async getKey(keyId) {
    const keyData = this.keys.get(keyId);
    if (!keyData) {
      throw new Error('Key not found');
    }

    // Update usage statistics
    keyData.metadata.lastUsed = new Date().toISOString();
    keyData.metadata.usageCount += 1;

    // Check if key needs rotation
    const createdAt = new Date(keyData.metadata.createdAt);
    const daysOld = (new Date() - createdAt) / (1000 * 60 * 60 * 24);
    
    if (daysOld >= this.keyRotationInterval) {
      throw new Error('Key needs rotation');
    }

    return await this.decryptKey(keyData.encryptedData);
  }

  /**
   * Rotates an API key
   */
  async rotateKey(keyId, newKey) {
    const keyData = this.keys.get(keyId);
    if (!keyData) {
      throw new Error('Key not found');
    }

    // Store the new key
    const newKeyId = await this.storeKey(keyData.type, newKey, {
      ...keyData.metadata,
      rotatedFrom: keyId,
      createdAt: new Date().toISOString()
    });

    // Mark the old key as rotated
    keyData.metadata.rotatedTo = newKeyId;
    keyData.metadata.rotatedAt = new Date().toISOString();

    return newKeyId;
  }

  /**
   * Validates an API key
   */
  async validateKey(keyId) {
    try {
      await this.getKey(keyId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets key usage statistics
   */
  getKeyStats(keyId) {
    const keyData = this.keys.get(keyId);
    if (!keyData) {
      throw new Error('Key not found');
    }

    return {
      type: keyData.type,
      createdAt: keyData.metadata.createdAt,
      lastUsed: keyData.metadata.lastUsed,
      usageCount: keyData.metadata.usageCount,
      daysUntilRotation: Math.max(0, this.keyRotationInterval - 
        ((new Date() - new Date(keyData.metadata.createdAt)) / (1000 * 60 * 60 * 24)))
    };
  }

  /**
   * Lists all active keys
   */
  listKeys() {
    return Array.from(this.keys.entries()).map(([keyId, keyData]) => ({
      keyId,
      type: keyData.type,
      createdAt: keyData.metadata.createdAt,
      lastUsed: keyData.metadata.lastUsed,
      usageCount: keyData.metadata.usageCount
    }));
  }
}

// Export singleton instance
module.exports = new KeyManager(); 