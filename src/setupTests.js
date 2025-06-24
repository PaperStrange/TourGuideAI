// Jest setup file
import '@testing-library/jest-dom';

// Mock axios to prevent ES module issues
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    create: jest.fn(function() { return this; }),
    defaults: {
      headers: {
        common: {},
        get: {},
        post: {},
        put: {},
        delete: {}
      }
    },
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  },
  create: jest.fn(() => ({
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }))
}));

// Mock the apiClient specifically
jest.mock('./core/services/apiClient', () => ({
  apiHelpers: {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} }))
  }
}));

// Mock fetch API globally
global.fetch = jest.fn();

// Mock localStorage and sessionStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock // Can use the same mock for simplicity in tests
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
  }

  observe(target) {
    // Simulate intersection change if needed for tests
    // this.callback([{ isIntersecting: true, target }]);
  }

  unobserve(target) {}

  disconnect() {}
};

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', { value: jest.fn(), writable: true });

// Mock Performance API (basic)
Object.defineProperty(window, 'performance', {
  value: {
    mark: jest.fn(),
    measure: jest.fn(),
    now: jest.fn(() => Date.now()), // Simple timestamp
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  },
  writable: true,
});

// Mock URL.createObjectURL and revokeObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  value: jest.fn(() => 'blob:mockObjectUrl'),
  writable: true,
});
Object.defineProperty(window.URL, 'revokeObjectURL', {
  value: jest.fn(),
  writable: true,
});

// Mock Canvas API methods needed by heatmap.js and potentially chart.js
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn((x, y, w, h) => ({
    data: new Uint8ClampedArray(w * h * 4)
  })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: [] })),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
  // Add mocks for gradient methods
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  createRadialGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
}));

// Mock Google Maps API
window.google = {
  maps: {
    Geocoder: jest.fn().mockImplementation(() => ({
      geocode: jest.fn().mockImplementation((request, callback) => {
        callback([
          {
            formatted_address: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
            geometry: {
              location: {
                lat: () => 37.4224764,
                lng: () => -122.0842499,
                toJSON: () => ({ lat: 37.4224764, lng: -122.0842499 })
              }
            },
            place_id: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA'
          }
        ], 'OK');
      })
    })),
    DirectionsService: jest.fn().mockImplementation(() => ({
      route: jest.fn().mockImplementation((request, callback) => {
        callback({
          routes: [
            {
              legs: [
                {
                  distance: { text: '5 km', value: 5000 },
                  duration: { text: '10 mins', value: 600 }
                }
              ]
            }
          ]
        }, 'OK');
      })
    })),
    Map: jest.fn().mockImplementation(() => ({})),
    MapTypeId: { ROADMAP: 'roadmap' },
    GeocoderStatus: { OK: 'OK' },
    DirectionsStatus: { OK: 'OK' },
    places: {
      PlacesService: jest.fn().mockImplementation(() => ({
        nearbySearch: jest.fn().mockImplementation((request, callback) => {
          callback([
            {
              name: 'Test Point of Interest',
              vicinity: 'Test Address',
              types: ['tourist_attraction'],
              rating: 4.5,
              place_id: 'test-place-id'
            }
          ], 'OK');
        }),
        getDetails: jest.fn().mockImplementation((request, callback) => {
          callback({
            formatted_address: 'Test Address, Test City',
            name: 'Test Point of Interest',
            rating: 4.5,
            reviews: [{ text: 'Great place!', rating: 5 }],
            photos: [{ getUrl: () => 'test-photo-url' }]
          }, 'OK');
        })
      })),
      PlacesServiceStatus: { OK: 'OK' }
    }
  }
};

// Mock console methods to reduce noise in test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Only show errors in tests
console.error = (...args) => {
  if (
    args[0]?.includes?.('Warning:') ||
    args[0]?.includes?.('Failed prop type') ||
    args[0]?.includes?.('React does not recognize')
  ) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args) => {
  if (
    args[0]?.includes?.('Warning:') ||
    args[0]?.includes?.('deprecated')
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

// Disable most console.log output in tests
console.log = (...args) => {
  if (
    args[0]?.includes?.('[OpenAI API]') ||
    args[0]?.includes?.('[Google Maps API]') ||
    args[0]?.startsWith?.('API key')
  ) {
    return;
  }
  originalConsoleLog(...args);
};

// Add global flag to disable debug logs in tests unless explicitly needed
global.APP_CONFIG = {
  DEBUG_MODE: false
};

console.log("Debug mode disabled"); 