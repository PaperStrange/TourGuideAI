/**
 * Integration Test Setup
 * 
 * This file contains setup and teardown for integration tests
 */

// Extend Jest timeout for integration tests
jest.setTimeout(30000);

// Mock fetch globally
global.fetch = jest.fn(() => 
  Promise.resolve({
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    ok: true,
    status: 200,
    headers: new Headers()
  })
);

// Set up local storage mock
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
}

global.IntersectionObserver = MockIntersectionObserver;

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

console.log('Integration test setup complete'); 