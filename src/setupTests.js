// Jest setup file
import '@testing-library/jest-dom';

// Mock fetch API globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key]),
    setItem: jest.fn((key, value) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

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

// Mock IntersectionObserver
class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    return null;
  }
  unobserve() {
    return null;
  }
  disconnect() {
    return null;
  }
}
window.IntersectionObserver = IntersectionObserver; 