/**
 * UX Audit Components
 * Exports all components related to UX auditing and analysis
 */

// Import from local components
export { default as SessionRecording } from './SessionRecording';
export { default as UXMetricsEvaluation } from './UXMetricsEvaluation';
export { default as UXHeatmap } from './UXHeatmap';

// Re-export analytics components for convenience
export { 
  HeatmapVisualization,
  SessionRecording as AnalyticsSessionRecording,
  UXMetricsEvaluation as AnalyticsUXMetricsEvaluation,
  UXAuditDashboard
} from '../analytics'; 