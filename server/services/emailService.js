/**
 * Email Service
 * 
 * Handles email sending functionality using SendGrid
 */

const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');
const crypto = require('crypto');

// In-memory token storage (in production, use a database)
const emailVerificationTokens = new Map();

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send a generic email
 * @param {Object} emailData - Email data including to, subject, text and html
 * @returns {Promise<boolean>} Success status
 */
const sendEmail = async (emailData) => {
  try {
    const msg = {
      from: process.env.EMAIL_FROM,
      ...emailData
    };

    await sgMail.send(msg);
    logger.info('Email sent successfully', { to: emailData.to });
    return true;
  } catch (error) {
    logger.error('Error sending email', { error, to: emailData.to });
    return false;
  }
};

/**
 * Send welcome email to new user
 * @param {Object} user - User object with email and name
 * @returns {Promise<boolean>} Success status
 */
const sendWelcomeEmail = async (user) => {
  const subject = 'Welcome to TourGuideAI Beta Program';
  const text = `
    Hello ${user.name || 'there'},
    
    Welcome to the TourGuideAI Beta Program! We're excited to have you join us.
    
    Your feedback is incredibly valuable as we continue to improve our application.
    
    Best regards,
    The TourGuideAI Team
  `;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to the TourGuideAI Beta Program!</h2>
      <p>Hello ${user.name || 'there'},</p>
      <p>Welcome to the TourGuideAI Beta Program! We're excited to have you join us.</p>
      <p>Your feedback is incredibly valuable as we continue to improve our application.</p>
      <p>Best regards,<br>The TourGuideAI Team</p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject,
    text,
    html
  });
};

/**
 * Generate email verification token
 * @param {string} userId - User ID
 * @returns {string} Verification token
 */
const generateVerificationToken = (userId) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + parseInt(process.env.EMAIL_VERIFICATION_EXPIRY || '24h'));
  
  // Store token
  emailVerificationTokens.set(token, {
    userId,
    expiresAt
  });
  
  return token;
};

/**
 * Send email verification email
 * @param {string} email - User's email address
 * @param {string} verificationUrl - The complete verification URL with token
 * @param {string} name - User's name
 * @returns {Promise<boolean>} Success status
 */
const sendVerificationEmail = async (email, verificationUrl, name) => {
  try {
    const subject = 'Verify Your Email for TourGuideAI Beta';
    const text = `
      Hello ${name || 'there'},
      
      Please verify your email address by clicking the link below:
      
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      Best regards,
      The TourGuideAI Team
    `;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email for TourGuideAI Beta</h2>
        <p>Hello ${name || 'there'},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>Best regards,<br>The TourGuideAI Team</p>
      </div>
    `;

    return sendEmail({
      to: email,
      subject,
      text,
      html
    });
  } catch (error) {
    logger.error('Error sending verification email', { error, email });
    return false;
  }
};

/**
 * Verify email token
 * @param {string} token - Verification token
 * @returns {string|null} User ID if valid, null otherwise
 */
const verifyEmailToken = (token) => {
  try {
    const tokenData = emailVerificationTokens.get(token);
    
    if (!tokenData) return null;
    
    // Check if token has expired
    if (new Date(tokenData.expiresAt) < new Date()) {
      emailVerificationTokens.delete(token);
      return null;
    }
    
    // Delete token after use
    emailVerificationTokens.delete(token);
    
    return tokenData.userId;
  } catch (error) {
    logger.error('Error verifying email token', { error });
    return null;
  }
};

/**
 * Send invite code email
 * @param {string} email - Recipient email
 * @param {Object} inviteCode - Invite code object
 * @param {string} inviterName - Name of the person sending the invite
 * @returns {Promise<boolean>} Success status
 */
const sendInviteCodeEmail = async (email, inviteCode, inviterName = 'The TourGuideAI Team') => {
  try {
    const registrationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/beta/register?code=${inviteCode.code}`;
    
    const subject = 'Your TourGuideAI Beta Program Invitation';
    const text = `
      Hello,
      
      You've been invited to join the TourGuideAI Beta Program!
      
      Your invitation code is: ${inviteCode.code}
      
      Please use this code when registering at: ${registrationUrl}
      
      This code will expire in 14 days.
      
      Best regards,
      ${inviterName}
    `;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your TourGuideAI Beta Program Invitation</h2>
        <p>Hello,</p>
        <p>You've been invited to join the TourGuideAI Beta Program!</p>
        <p>Your invitation code is:</p>
        <div style="text-align: center; margin: 20px 0;">
          <div style="background-color: #f0f0f0; padding: 12px; font-size: 24px; font-weight: bold; letter-spacing: 2px; border-radius: 4px;">${inviteCode.code}</div>
        </div>
        <p>Please use this code when registering at our beta portal:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${registrationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Register Now</a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${registrationUrl}</p>
        <p>This code will expire in 14 days.</p>
        <p>Best regards,<br>${inviterName}</p>
      </div>
    `;

    return sendEmail({
      to: email,
      subject,
      text,
      html
    });
  } catch (error) {
    logger.error('Error sending invite code email', { error, email });
    return false;
  }
};

/**
 * Send feedback received confirmation email
 * @param {Object} user - User who submitted feedback
 * @param {Object} feedback - Feedback details
 * @returns {Promise<boolean>} Success status
 */
const sendFeedbackConfirmationEmail = async (user, feedback) => {
  try {
    const subject = 'We received your feedback - TourGuideAI Beta';
    const text = `
      Hello ${user.name || 'there'},
      
      Thank you for your feedback in the TourGuideAI Beta Program!
      
      We've received your submission regarding "${feedback.category}: ${feedback.title}".
      
      Our team will review your feedback and take appropriate action.
      
      Best regards,
      The TourGuideAI Team
    `;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>We Received Your Feedback</h2>
        <p>Hello ${user.name || 'there'},</p>
        <p>Thank you for your feedback in the TourGuideAI Beta Program!</p>
        <p>We've received your submission regarding:</p>
        <div style="background-color: #f0f0f0; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p><strong>Category:</strong> ${feedback.category}</p>
          <p><strong>Title:</strong> ${feedback.title}</p>
        </div>
        <p>Our team will review your feedback and take appropriate action.</p>
        <p>Best regards,<br>The TourGuideAI Team</p>
      </div>
    `;

    return sendEmail({
      to: user.email,
      subject,
      text,
      html
    });
  } catch (error) {
    logger.error('Error sending feedback confirmation email', { error, userId: user.id });
    return false;
  }
};

/**
 * Send password reset email
 * @param {string} email - User's email address
 * @param {string} resetUrl - The complete reset URL with token
 * @param {string} name - User's name
 * @returns {Promise<boolean>} Success status
 */
const sendPasswordResetEmail = async (email, resetUrl, name) => {
  try {
    const subject = 'Reset Your TourGuideAI Beta Password';
    const text = `
      Hello ${name || 'there'},
      
      You recently requested to reset your password for your TourGuideAI Beta account.
      
      Please click the link below to reset your password:
      
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you did not request a password reset, please ignore this email or contact support if you have concerns.
      
      Best regards,
      The TourGuideAI Team
    `;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your TourGuideAI Beta Password</h2>
        <p>Hello ${name || 'there'},</p>
        <p>You recently requested to reset your password for your TourGuideAI Beta account.</p>
        <p>Please click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>Best regards,<br>The TourGuideAI Team</p>
      </div>
    `;

    return sendEmail({
      to: email,
      subject,
      text,
      html
    });
  } catch (error) {
    logger.error('Error sending password reset email', { error, email });
    return false;
  }
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  verifyEmailToken,
  sendInviteCodeEmail,
  sendFeedbackConfirmationEmail,
  sendPasswordResetEmail
}; 