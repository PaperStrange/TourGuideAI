/**
 * Vault Service
 * 
 * A centralized secure vault for managing all API keys, tokens, and secrets.
 * This service provides a single point of security for all sensitive credentials.
 * 
 * Features:
 * - Encrypted storage of all sensitive credentials
 * - Automatic key rotation
 * - Usage tracking and monitoring
 * - Support for remote secret managers (AWS Secrets Manager, HashiCorp Vault, etc.)
 * - Environment-specific credential management
 */

const crypto = require('crypto');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const keyManager = require('./keyManager');
const logger = require('./logger');

// Promisify crypto functions
const scrypt = promisify(crypto.scrypt);
const randomBytes = promisify(crypto.randomBytes);

class VaultService {
  constructor() {
    this.initialized = false;
    this.vaultData = null;
    this.backendType = process.env.VAULT_BACKEND || 'local';
    this.encryptionKey = process.env.VAULT_ENCRYPTION_KEY;
    this.salt = process.env.VAULT_SALT;
    this.vaultPath = process.env.VAULT_PATH || path.join(os.homedir(), '.tourguideai', 'vault.enc');
    this.remoteEndpoint = process.env.VAULT_REMOTE_ENDPOINT;
    this.remoteToken = process.env.VAULT_REMOTE_TOKEN;
    this.inMemorySecrets = new Map();
    this.secretTypes = {
      API_KEY: 'api_key',
      JWT_SECRET: 'jwt_secret',
      ENCRYPTION_KEY: 'encryption_key',
      DATABASE: 'database',
      OAUTH: 'oauth',
      SSH_KEY: 'ssh_key',
      TOKEN: 'token'
    };
  }

  /**
   * Initialize the vault service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      switch (this.backendType) {
        case 'local':
          await this.initializeLocalVault();
          break;
        case 'aws':
          await this.initializeAwsVault();
          break;
        case 'hashicorp':
          await this.initializeHashiCorpVault();
          break;
        case 'in-memory':
          this.vaultData = {};
          break;
        default:
          throw new Error(`Unsupported vault backend: ${this.backendType}`);
      }

      this.initialized = true;
      logger.info('Vault service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize vault service', { error });
      throw new Error(`Vault initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize local file-based vault
   */
  async initializeLocalVault() {
    try {
      // Create vault directory if it doesn't exist
      const vaultDir = path.dirname(this.vaultPath);
      await fs.mkdir(vaultDir, { recursive: true });

      // Check if vault file exists
      try {
        await fs.access(this.vaultPath);
        // Load existing vault
        const encryptedVault = await fs.readFile(this.vaultPath, 'utf8');
        this.vaultData = await this.decryptVault(encryptedVault);
      } catch (error) {
        // Create new vault
        this.vaultData = {
          secrets: {},
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        };
        // Save the new vault
        await this.saveVault();
      }
    } catch (error) {
      logger.error('Failed to initialize local vault', { error });
      throw error;
    }
  }

  /**
   * Initialize AWS Secrets Manager vault
   */
  async initializeAwsVault() {
    // AWS implementation would be here
    // This is a placeholder for AWS Secrets Manager integration
    throw new Error('AWS Secrets Manager integration not implemented');
  }

  /**
   * Initialize HashiCorp Vault
   */
  async initializeHashiCorpVault() {
    // HashiCorp Vault implementation would be here
    // This is a placeholder for HashiCorp Vault integration
    throw new Error('HashiCorp Vault integration not implemented');
  }

  /**
   * Encrypt vault data
   */
  async encryptVault(data) {
    if (!this.encryptionKey || !this.salt) {
      throw new Error('Vault encryption configuration missing');
    }

    const jsonData = JSON.stringify(data);
    
    const derivedKey = await scrypt(this.encryptionKey, this.salt, 32);
    const iv = await randomBytes(16);
    
    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
    let encrypted = cipher.update(jsonData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      version: 1
    });
  }

  /**
   * Decrypt vault data
   */
  async decryptVault(encryptedData) {
    if (!this.encryptionKey || !this.salt) {
      throw new Error('Vault encryption configuration missing');
    }

    const parsedData = JSON.parse(encryptedData);
    
    const derivedKey = await scrypt(this.encryptionKey, this.salt, 32);
    const iv = Buffer.from(parsedData.iv, 'hex');
    const authTag = Buffer.from(parsedData.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(parsedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Save vault to storage
   */
  async saveVault() {
    if (this.backendType === 'local') {
      try {
        this.vaultData.metadata.updatedAt = new Date().toISOString();
        const encryptedVault = await this.encryptVault(this.vaultData);
        await fs.writeFile(this.vaultPath, encryptedVault, 'utf8');
        return true;
      } catch (error) {
        logger.error('Failed to save vault', { error });
        throw error;
      }
    } else if (this.backendType === 'in-memory') {
      return true; // Nothing to save for in-memory
    } else {
      // Other backends would implement their save logic
      throw new Error(`Save not implemented for backend: ${this.backendType}`);
    }
  }

  /**
   * Store a secret in the vault
   */
  async storeSecret(type, name, value, metadata = {}) {
    if (!this.initialized) await this.initialize();

    const secretId = crypto.randomBytes(8).toString('hex');
    
    // If using keyManager for encryption
    const encryptedData = await keyManager.encryptKey(value);
    
    this.vaultData.secrets[secretId] = {
      type,
      name,
      encryptedData,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        rotationDue: this.calculateNextRotationDate(type),
        usageCount: 0
      }
    };
    
    // For in-memory secrets, store in the map
    if (this.backendType === 'in-memory') {
      this.inMemorySecrets.set(secretId, value);
    }
    
    await this.saveVault();
    
    return secretId;
  }

  /**
   * Retrieve a secret from the vault
   */
  async getSecret(secretId) {
    if (!this.initialized) await this.initialize();

    const secretData = this.vaultData.secrets[secretId];
    if (!secretData) {
      throw new Error('Secret not found');
    }

    // For in-memory secrets, retrieve from the map
    if (this.backendType === 'in-memory') {
      return this.inMemorySecrets.get(secretId);
    }

    // Update usage statistics
    secretData.metadata.lastUsed = new Date().toISOString();
    secretData.metadata.usageCount += 1;
    await this.saveVault();

    // Check if the secret needs rotation
    if (this.isRotationNeeded(secretData)) {
      logger.warn('Secret needs rotation', { 
        secretId, 
        type: secretData.type, 
        name: secretData.name 
      });
    }

    // Decrypt and return the secret
    return await keyManager.decryptKey(secretData.encryptedData);
  }

  /**
   * Update a secret in the vault
   */
  async updateSecret(secretId, newValue, metadata = {}) {
    if (!this.initialized) await this.initialize();

    const secretData = this.vaultData.secrets[secretId];
    if (!secretData) {
      throw new Error('Secret not found');
    }

    // Encrypt the new value
    const encryptedData = await keyManager.encryptKey(newValue);
    
    // Update the secret data
    secretData.encryptedData = encryptedData;
    secretData.metadata = {
      ...secretData.metadata,
      ...metadata,
      updatedAt: new Date().toISOString(),
      rotationDue: this.calculateNextRotationDate(secretData.type)
    };
    
    // For in-memory secrets, update the map
    if (this.backendType === 'in-memory') {
      this.inMemorySecrets.set(secretId, newValue);
    }
    
    await this.saveVault();
    
    return true;
  }

  /**
   * Rotate a secret in the vault
   */
  async rotateSecret(secretId, newValue) {
    if (!this.initialized) await this.initialize();

    const secretData = this.vaultData.secrets[secretId];
    if (!secretData) {
      throw new Error('Secret not found');
    }

    // Create rotation history
    if (!secretData.metadata.rotationHistory) {
      secretData.metadata.rotationHistory = [];
    }
    
    secretData.metadata.rotationHistory.push({
      rotatedAt: new Date().toISOString(),
      previousRotationDue: secretData.metadata.rotationDue
    });
    
    // Update with new value
    return await this.updateSecret(secretId, newValue);
  }

  /**
   * Delete a secret from the vault
   */
  async deleteSecret(secretId) {
    if (!this.initialized) await this.initialize();

    if (!this.vaultData.secrets[secretId]) {
      throw new Error('Secret not found');
    }

    // For in-memory secrets, remove from the map
    if (this.backendType === 'in-memory') {
      this.inMemorySecrets.delete(secretId);
    }
    
    // Delete the secret and save
    delete this.vaultData.secrets[secretId];
    await this.saveVault();
    
    return true;
  }

  /**
   * Check if a secret needs rotation
   */
  isRotationNeeded(secretData) {
    const rotationDue = new Date(secretData.metadata.rotationDue);
    return rotationDue <= new Date();
  }

  /**
   * Calculate the next rotation date based on type
   */
  calculateNextRotationDate(type) {
    const now = new Date();
    const rotationIntervals = {
      [this.secretTypes.API_KEY]: 90, // 90 days
      [this.secretTypes.JWT_SECRET]: 180, // 180 days
      [this.secretTypes.ENCRYPTION_KEY]: 365, // 365 days
      [this.secretTypes.DATABASE]: 180, // 180 days
      [this.secretTypes.OAUTH]: 30, // 30 days
      [this.secretTypes.SSH_KEY]: 180, // 180 days
      [this.secretTypes.TOKEN]: 30, // 30 days
    };

    const days = rotationIntervals[type] || 90; // Default to 90 days
    now.setDate(now.getDate() + days);
    return now.toISOString();
  }

  /**
   * List all secrets in the vault
   */
  async listSecrets(typeFilter = null) {
    if (!this.initialized) await this.initialize();

    return Object.entries(this.vaultData.secrets)
      .filter(([_, data]) => !typeFilter || data.type === typeFilter)
      .map(([secretId, data]) => ({
        secretId,
        type: data.type,
        name: data.name,
        createdAt: data.metadata.createdAt,
        lastUsed: data.metadata.lastUsed,
        rotationDue: data.metadata.rotationDue,
        usageCount: data.metadata.usageCount,
        needsRotation: this.isRotationNeeded(data)
      }));
  }

  /**
   * Get secrets needing rotation
   */
  async getSecretsNeedingRotation() {
    const allSecrets = await this.listSecrets();
    return allSecrets.filter(secret => secret.needsRotation);
  }
  
  /**
   * Import secrets from environment variables (useful for initial setup)
   */
  async importFromEnvironment() {
    if (!this.initialized) await this.initialize();
    
    const envMapping = [
      { env: 'OPENAI_API_KEY', type: this.secretTypes.API_KEY, name: 'openai' },
      { env: 'GOOGLE_MAPS_API_KEY', type: this.secretTypes.API_KEY, name: 'google_maps' },
      { env: 'JWT_SECRET', type: this.secretTypes.JWT_SECRET, name: 'auth_jwt' },
      { env: 'ENCRYPTION_KEY', type: this.secretTypes.ENCRYPTION_KEY, name: 'data_encryption' },
      { env: 'SENDGRID_API_KEY', type: this.secretTypes.API_KEY, name: 'sendgrid' }
    ];
    
    const imported = [];
    
    for (const mapping of envMapping) {
      if (process.env[mapping.env]) {
        const secretId = await this.storeSecret(
          mapping.type,
          mapping.name,
          process.env[mapping.env],
          { source: 'environment_import' }
        );
        imported.push({ name: mapping.name, secretId });
      }
    }
    
    return imported;
  }
}

// Export singleton instance
module.exports = new VaultService(); 