/**
 * UX Audit System Mock Data
 * Contains realistic mock data for UX audit system tests
 */

// Session recording mock data
export const sessionRecordingMocks = {
  recordingId: "rec-12345",
  duration: 180000, // 3 minutes in ms
  startTime: new Date("2023-04-15T14:30:00Z").getTime(),
  endTime: new Date("2023-04-15T14:33:00Z").getTime(),
  userId: "user-789",
  deviceInfo: {
    browser: "Chrome",
    browserVersion: "98.0.4758.102",
    os: "Windows",
    screenResolution: "1920x1080",
    deviceType: "desktop"
  },
  events: [
    {
      type: "click",
      timestamp: new Date("2023-04-15T14:30:05Z").getTime(),
      target: ".nav-menu-item",
      position: { x: 150, y: 75 }
    },
    {
      type: "scroll",
      timestamp: new Date("2023-04-15T14:30:12Z").getTime(),
      scrollTop: 120,
      scrollHeight: 1200
    },
    {
      type: "input",
      timestamp: new Date("2023-04-15T14:30:25Z").getTime(),
      target: "#search-input",
      value: "attractions"
    },
    // More events would follow...
  ]
};

// Heatmap visualization data
export const heatmapMocks = {
  lowDensity: {
    width: 1200,
    height: 800,
    points: [
      { x: 250, y: 150, value: 5 },
      { x: 300, y: 200, value: 3 },
      { x: 600, y: 400, value: 8 },
      { x: 800, y: 600, value: 2 },
      { x: 1000, y: 200, value: 4 }
    ]
  },
  mediumDensity: {
    width: 1200,
    height: 800,
    points: Array(50).fill().map((_, i) => ({
      x: Math.floor(Math.random() * 1200),
      y: Math.floor(Math.random() * 800),
      value: Math.floor(Math.random() * 10) + 1
    }))
  },
  highDensity: {
    width: 1200,
    height: 800,
    points: Array(200).fill().map((_, i) => ({
      x: Math.floor(Math.random() * 1200),
      y: Math.floor(Math.random() * 800),
      value: Math.floor(Math.random() * 10) + 1
    }))
  }
};

// UX metrics evaluation data
export const uxMetricsMocks = {
  timeOnPage: {
    average: 120, // seconds
    breakdown: [
      { page: "/home", average: 45 },
      { page: "/attractions", average: 180 },
      { page: "/booking", average: 240 },
      { page: "/profile", average: 90 }
    ]
  },
  clickAccuracy: {
    average: 0.86,
    breakdown: [
      { element: "primary-cta", accuracy: 0.92 },
      { element: "nav-menu", accuracy: 0.88 },
      { element: "search-button", accuracy: 0.79 },
      { element: "dropdown-select", accuracy: 0.72 }
    ]
  },
  userFlow: [
    { from: "/home", to: "/attractions", count: 156 },
    { from: "/attractions", to: "/details", count: 98 },
    { from: "/details", to: "/booking", count: 54 },
    { from: "/booking", to: "/confirmation", count: 32 }
  ]
};

// Mock dashboard data
export const dashboardMocks = {
  userId: "admin-123",
  projectId: "proj-456",
  dateRange: {
    start: new Date("2023-04-01"),
    end: new Date("2023-04-15")
  },
  summary: {
    totalSessions: 342,
    avgSessionDuration: 312, // seconds
    bounceRate: 0.32,
    conversionRate: 0.08
  }
}; 