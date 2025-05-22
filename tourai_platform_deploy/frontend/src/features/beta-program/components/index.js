/**
 * Export file for all beta program components
 * Provides easy access to all components related to the beta program
 */

// Main portal component
export { default as BetaPortal } from './BetaPortal';
export { default as RegistrationForm } from './RegistrationForm';
export { default as OnboardingFlow } from './onboarding/OnboardingFlow';

// Onboarding components
export * from './onboarding';

// Feature request components
export * from './feature-request';

// Survey components
export * from './survey';

// Community components  
export * from './community';

// Analytics components
export * from './analytics';

// Authentication components
export * from './auth';

// User components
export * from './user';

// Feedback components
export * from './feedback';

// Task prompt components
export * from './task-prompts';

// Admin dashboard components
export { default as BetaProgramDashboard } from './dashboard/BetaProgramDashboard';
export { default as BetaUserList } from './dashboard/BetaUserList';
export { default as BetaCodeManager } from './dashboard/BetaCodeManager';
export { default as BetaMetricsDisplay } from './dashboard/BetaMetricsDisplay';
export { default as BetaFeedbackSummary } from './dashboard/BetaFeedbackSummary';
export { default as ComponentEvaluationTool } from './analytics/ComponentEvaluationTool';
export { default as ABTestReporting } from './analytics/ABTestReporting';
export { default as UserSentimentDashboard } from './analytics/UserSentimentDashboard'; 