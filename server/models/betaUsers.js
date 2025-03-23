/**
 * Beta Users Model
 * 
 * Simple in-memory storage for beta users with methods to manage user accounts.
 * In a production environment, this would use a database.
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

// In-memory store for beta users
// In production, this would be a database
const betaUsers = new Map();

// Default admin user for testing
const SALT_ROUNDS = 10;

/**
 * Initialize the beta users store
 */
const initialize = async () => {
  try {
    // Create a default admin user if configured in env
    if (process.env.DEFAULT_ADMIN_EMAIL && process.env.DEFAULT_ADMIN_PASSWORD) {
      const adminExists = Array.from(betaUsers.values()).some(
        user => user.email === process.env.DEFAULT_ADMIN_EMAIL
      );
      
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD, SALT_ROUNDS);
        const adminUser = {
          id: uuidv4(),
          email: process.env.DEFAULT_ADMIN_EMAIL,
          passwordHash: hashedPassword,
          role: 'admin',
          betaAccess: true,
          createdAt: new Date().toISOString(),
          lastLogin: null
        };
        
        betaUsers.set(adminUser.id, adminUser);
        logger.info('Default admin user created');
      }
    }
  } catch (error) {
    logger.error('Error initializing beta users store', { error });
  }
};

/**
 * Create a new beta user
 * @param {Object} userData - User data including email and password
 * @returns {Object} Created user object (without password)
 */
const createUser = async (userData) => {
  try {
    // Check if email already exists
    const emailExists = Array.from(betaUsers.values()).some(
      user => user.email === userData.email
    );
    
    if (emailExists) {
      throw new Error('Email already registered');
    }
    
    // Hash the password
    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);
    
    // Create user object
    const newUser = {
      id: uuidv4(),
      email: userData.email,
      name: userData.name || userData.email.split('@')[0], // Use name or fallback to email username
      passwordHash,
      role: userData.role || 'beta-tester',
      betaAccess: true,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };
    
    // Store user
    betaUsers.set(newUser.id, newUser);
    
    // Return user without sensitive data
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  } catch (error) {
    logger.error('Error creating beta user', { error });
    throw error;
  }
};

/**
 * Find a user by email
 * @param {string} email - User email
 * @returns {Object|null} User object or null if not found
 */
const findUserByEmail = (email) => {
  const user = Array.from(betaUsers.values()).find(user => user.email === email);
  return user || null;
};

/**
 * Find a user by ID
 * @param {string} id - User ID
 * @returns {Object|null} User object or null if not found
 */
const findUserById = (id) => {
  return betaUsers.get(id) || null;
};

/**
 * Validate user credentials
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object|null} User object (without password) or null if invalid
 */
const validateCredentials = async (email, password) => {
  try {
    const user = findUserByEmail(email);
    
    if (!user) {
      return null;
    }
    
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (!passwordMatch) {
      return null;
    }
    
    // Update last login
    user.lastLogin = new Date().toISOString();
    betaUsers.set(user.id, user);
    
    // Return user without password
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    logger.error('Error validating credentials', { error });
    return null;
  }
};

module.exports = {
  initialize,
  createUser,
  findUserByEmail,
  findUserById,
  validateCredentials
}; 