/**
 * Jest Configuration for Frontend Tests
 * 
 * This configuration is optimized for testing React components and frontend services.
 */

const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname, '../..'),
  testMatch: [
    '<rootDir>/src/**/*.test.{js,jsx}',
    '<rootDir>/src/tests/**/*.test.{js,jsx}',
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.js'
  ],
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!axios)/"
  ],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "axios": "axios/dist/node/axios.cjs"
  },
  moduleDirectories: ['node_modules', 'src'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.d.ts',
    '!src/index.js',
    '!src/reportWebVitals.js'
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70
    }
  },
  testEnvironment: 'jsdom',
  verbose: true
}; 