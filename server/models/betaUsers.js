/**
 * Beta Users Model
 * 
 * Simple in-memory storage for beta users with methods to manage user accounts.
 * In a production environment, this would use a database.
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const logger = require('../utils/logger');

// In-memory store for beta users
// In production, this would be a database
const betaUsers = new Map();

// Password reset tokens storage
const passwordResetTokens = new Map();

// Configuration
const SALT_ROUNDS = 10;
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

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
          name: 'Admin User',
          role: 'admin',
          betaAccess: true,
          emailVerified: true,
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
    
    // Generate email verification token if email verification is enabled
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Create user object
    const newUser = {
      id: uuidv4(),
      email: userData.email,
      name: userData.name || userData.email.split('@')[0], // Use name or fallback to email username
      passwordHash,
      role: userData.role || 'beta-tester',
      betaAccess: true,
      isEmailVerified: false, // Default to unverified email
      emailVerificationToken,
      emailVerificationExpires,
      passwordResetToken: null,
      passwordResetExpires: null,
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

/**
 * Find a user by email verification token
 * @param {string} token - Email verification token
 * @returns {Object|null} User object or null if not found or token expired
 */
const findUserByVerificationToken = (token) => {
  const user = Array.from(betaUsers.values()).find(user => 
    user.emailVerificationToken === token && 
    user.emailVerificationExpires > new Date()
  );
  return user || null;
};

/**
 * Find a user by password reset token
 * @param {string} token - Password reset token
 * @returns {Object|null} User object or null if not found or token expired
 */
const findUserByResetToken = (token) => {
  const user = Array.from(betaUsers.values()).find(user => 
    user.passwordResetToken === token && 
    user.passwordResetExpires > new Date()
  );
  return user || null;
};

/**
 * Mark a user's email as verified
 * @param {string} userId - User ID
 * @returns {Object|null} Updated user object or null if user not found
 */
const markEmailVerified = async (userId) => {
  try {
    const user = findUserById(userId);
    
    if (!user) {
      return null;
    }
    
    // Update email verification status
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    
    // Save changes
    betaUsers.set(userId, user);
    
    // Return updated user without password
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    logger.error('Error marking email as verified', { error, userId });
    return null;
  }
};

/**
 * Set password reset token for a user
 * @param {string} email - User email
 * @returns {string|null} Reset token or null if user not found
 */
const createPasswordResetToken = async (email) => {
  try {
    const user = findUserByEmail(email);
    
    if (!user) {
      return null;
    }
    
    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set token and expiry
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRY);
    
    // Save user
    betaUsers.set(user.id, user);
    
    return resetToken;
  } catch (error) {
    logger.error('Error creating password reset token', { error });
    return null;
  }
};

/**
 * Reset a user's password using a token
 * @param {string} token - Password reset token
 * @param {string} newPassword - New password
 * @returns {boolean} Whether the password was reset successfully
 */
const resetPassword = async (token, newPassword) => {
  try {
    // Find user by reset token
    const user = findUserByResetToken(token);
    
    if (!user) {
      return false;
    }
    
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // Update the user's password and clear reset token
    user.passwordHash = passwordHash;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    
    // Save changes
    betaUsers.set(user.id, user);
    
    // Delete token from token storage
    passwordResetTokens.delete(token);
    
    return true;
  } catch (error) {
    logger.error('Error resetting password', { error });
    return false;
  }
};

/**
 * Change a user's password (authenticated)
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {boolean} Whether the password was changed successfully
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    const user = findUserById(userId);
    
    if (!user) {
      return false;
    }
    
    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    
    if (!passwordMatch) {
      return false;
    }
    
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // Update password
    user.passwordHash = passwordHash;
    
    // Save changes
    betaUsers.set(userId, user);
    
    return true;
  } catch (error) {
    logger.error('Error changing password', { error, userId });
    return false;
  }
};

/**
 * Update a user's profile
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update (name, etc.)
 * @returns {Object|null} Updated user object or null if user not found
 */
const updateProfile = async (userId, updates) => {
  try {
    const user = findUserById(userId);
    
    if (!user) {
      return null;
    }
    
    // Apply updates (only allow certain fields to be updated)
    if (updates.name) {
      user.name = updates.name;
    }
    
    // Add other updateable fields as needed
    
    // Save changes
    betaUsers.set(userId, user);
    
    // Return updated user without password
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    logger.error('Error updating user profile', { error, userId });
    return null;
  }
};

/**
 * Update user properties
 * @param {string} userId - User ID
 * @param {Object} updates - Object with properties to update
 * @returns {Object|null} Updated user object or null if user not found
 */
const updateUser = async (userId, updates) => {
  try {
    const user = findUserById(userId);
    
    if (!user) {
      return null;
    }
    
    // Apply updates
    Object.assign(user, updates);
    
    // Store updated user
    betaUsers.set(userId, user);
    
    // Return user without password
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    logger.error('Error updating user', { error, userId });
    return null;
  }
};

module.exports = {
  initialize,
  createUser,
  findUserByEmail,
  findUserById,
  validateCredentials,
  findUserByVerificationToken,
  findUserByResetToken,
  markEmailVerified,
  createPasswordResetToken,
  resetPassword,
  changePassword,
  updateProfile,
  updateUser
}; 