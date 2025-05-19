/**
 * Token Provider Service
 * 
 * A centralized service for providing API tokens and secrets to the application.
 * This service interacts with the vault to retrieve and manage tokens securely.
 * 
 * Features:
 * - Cached token retrieval to minimize vault access
 * - Automatic token rotation handling
 * - Environment-specific token management
 * - Support for multiple token types and services
 */

const vaultService = require('./vaultService');
const logger = require('./logger');

// Cache tokens in memory to reduce vault access
const tokenCache = new Map();
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

class TokenProvider {
  constructor() {
    this.initialized = false;
    this.serviceNames = {
      OPENAI: 'openai',
      GOOGLE_MAPS: 'google_maps',
      JWT: 'auth_jwt',
      ENCRYPTION: 'data_encryption',
      SENDGRID: 'sendgrid'
    };
    
    // Map service names to environment variables for legacy support
    this.envMapping = {
      [this.serviceNames.OPENAI]: 'OPENAI_API_KEY',
      [this.serviceNames.GOOGLE_MAPS]: 'GOOGLE_MAPS_API_KEY',
      [this.serviceNames.JWT]: 'JWT_SECRET',
      [this.serviceNames.ENCRYPTION]: 'ENCRYPTION_KEY',
      [this.serviceNames.SENDGRID]: 'SENDGRID_API_KEY'
    };
    
    // Map service names to secret IDs
    this.secretIdMapping = {};
  }

  /**
   * Initialize the token provider
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Initialize the vault service
      await vaultService.initialize();
      
      // Load secret mappings
      await this.loadSecretMappings();
      
      // Import secrets from environment if needed
      if (process.env.IMPORT_ENV_SECRETS === 'true') {
        await vaultService.importFromEnvironment();
        await this.loadSecretMappings(); // Reload mappings after import
      }
      
      this.initialized = true;
      logger.info('Token provider initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize token provider', { error });
      throw new Error(`Token provider initialization failed: ${error.message}`);
    }
  }

  /**
   * Load secret ID mappings from vault
   */
  async loadSecretMappings() {
    const secrets = await vaultService.listSecrets();
    
    // Reset mappings
    this.secretIdMapping = {};
    
    // Build mappings based on secret names
    for (const secret of secrets) {
      if (Object.values(this.serviceNames).includes(secret.name)) {
        this.secretIdMapping[secret.name] = secret.secretId;
      }
    }
  }

  /**
   * Get a token for a service
   */
  async getToken(serviceName) {
    if (!this.initialized) await this.initialize();
    
    // Check cache first
    const cachedToken = this.getCachedToken(serviceName);
    if (cachedToken) {
      return cachedToken;
    }
    
    // Get from vault if we have a secret ID
    if (this.secretIdMapping[serviceName]) {
      try {
        const token = await vaultService.getSecret(this.secretIdMapping[serviceName]);
        this.cacheToken(serviceName, token);
        return token;
      } catch (error) {
        logger.error(`Failed to get token for ${serviceName} from vault`, { error });
        // Fall back to environment variable
      }
    }
    
    // Fall back to environment variable for legacy support
    if (process.env[this.envMapping[serviceName]]) {
      const token = process.env[this.envMapping[serviceName]];
      this.cacheToken(serviceName, token);
      return token;
    }
    
    // No token found
    throw new Error(`Token not found for service: ${serviceName}`);
  }

  /**
   * Get a token from cache
   */
  getCachedToken(serviceName) {
    const cached = tokenCache.get(serviceName);
    if (cached && cached.expiry > Date.now()) {
      return cached.token;
    }
    return null;
  }

  /**
   * Cache a token with TTL
   */
  cacheToken(serviceName, token) {
    tokenCache.set(serviceName, {
      token,
      expiry: Date.now() + TOKEN_CACHE_TTL
    });
  }

  /**
   * Store a new token in the vault
   */
  async storeToken(serviceName, token) {
    if (!this.initialized) await this.initialize();
    
    try {
      const secretType = vaultService.secretTypes.API_KEY;
      // For JWT and encryption keys, use appropriate types
      if (serviceName === this.serviceNames.JWT) {
        secretType = vaultService.secretTypes.JWT_SECRET;
      } else if (serviceName === this.serviceNames.ENCRYPTION) {
        secretType = vaultService.secretTypes.ENCRYPTION_KEY;
      }
      
      // If we already have a secret ID, update it
      if (this.secretIdMapping[serviceName]) {
        await vaultService.updateSecret(this.secretIdMapping[serviceName], token);
      } else {
        // Otherwise create a new secret
        const secretId = await vaultService.storeSecret(secretType, serviceName, token);
        this.secretIdMapping[serviceName] = secretId;
      }
      
      // Update cache
      this.cacheToken(serviceName, token);
      
      return true;
    } catch (error) {
      const sanitizedServiceName = serviceName.replace(/[\n\r]/g, "");
      logger.error(`Failed to store token for service: "${sanitizedServiceName}"`, { error });
      throw error;
    }
  }

  /**
   * Rotate a token
   */
  async rotateToken(serviceName, newToken) {
    if (!this.initialized) await this.initialize();
    
    if (!this.secretIdMapping[serviceName]) {
      throw new Error(`No existing token found for ${serviceName}`);
    }
    
    try {
      await vaultService.rotateSecret(this.secretIdMapping[serviceName], newToken);
      
      // Update cache
      this.cacheToken(serviceName, newToken);
      
      return true;
    } catch (error) {
      const sanitizedServiceName = serviceName.replace(/[\n\r]/g, "");
      logger.error(`Failed to rotate token for ${sanitizedServiceName}`, { error });
      throw error;
    }
  }

  /**
   * Get tokens that need rotation
   */
  async getTokensNeedingRotation() {
    if (!this.initialized) await this.initialize();
    
    const secretsNeedingRotation = await vaultService.getSecretsNeedingRotation();
    
    return secretsNeedingRotation
      .filter(secret => Object.values(this.secretIdMapping).includes(secret.secretId))
      .map(secret => {
        const serviceName = Object.entries(this.secretIdMapping)
          .find(([_, id]) => id === secret.secretId)[0];
        
        return {
          serviceName,
          secretId: secret.secretId,
          lastUsed: secret.lastUsed,
          rotationDue: secret.rotationDue
        };
      });
  }
  
  /**
   * Convenience methods for common tokens
   */
  async getOpenAIToken() {
    return this.getToken(this.serviceNames.OPENAI);
  }
  
  async getGoogleMapsToken() {
    return this.getToken(this.serviceNames.GOOGLE_MAPS);
  }
  
  async getJWTSecret() {
    return this.getToken(this.serviceNames.JWT);
  }
  
  async getEncryptionKey() {
    return this.getToken(this.serviceNames.ENCRYPTION);
  }
  
  async getSendGridToken() {
    return this.getToken(this.serviceNames.SENDGRID);
  }
}

// Export singleton instance
module.exports = new TokenProvider(); 