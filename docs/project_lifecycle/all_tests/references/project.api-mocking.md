# API Mocking Guidelines

This document outlines the standardized approaches for mocking external and internal APIs in the TourGuideAI application.

## External API Mocking

### OpenAI API Mocking

For testing components and services that interact with the OpenAI API, we use a standard mock approach:

```javascript
// /src/tests/mocks/api/openai.mock.js
export const mockOpenAIResponse = {
  choices: [
    {
      message: {
        content: "This is a mock response from the OpenAI API. It simulates a tour description for Barcelona, highlighting the beautiful architecture, rich cultural heritage, and delicious cuisine that visitors can experience.",
        role: "assistant"
      },
      finish_reason: "stop",
      index: 0
    }
  ],
  created: 1677664795,
  id: "chatcmpl-7QyqpwdfhqwajicIEznoc6Q",
  model: "gpt-3.5-turbo-0613",
  object: "chat.completion",
  usage: {
    completion_tokens: 42,
    prompt_tokens: 21,
    total_tokens: 63
  }
};

export const mockEmbeddingResponse = {
  data: [
    {
      embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
      index: 0,
      object: "embedding"
    }
  ],
  model: "text-embedding-ada-002",
  object: "list",
  usage: {
    prompt_tokens: 8,
    total_tokens: 8
  }
};

export const mockOpenAIError = {
  error: {
    message: "The API key provided is invalid or has expired.",
    type: "invalid_request_error",
    param: null,
    code: "invalid_api_key"
  }
};
```

Usage in tests:

```javascript
// /src/tests/unit/services/ai-service.test.js
import axios from 'axios';
import { mockOpenAIResponse, mockEmbeddingResponse } from '../../mocks/api/openai.mock';
import { aiServiceInstance } from '../../../services/ai-service';

// Mock axios
jest.mock('axios');

describe('AI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should generate a tour description', async () => {
    // Setup the mock
    axios.post.mockResolvedValueOnce({ data: mockOpenAIResponse });
    
    const city = 'Barcelona';
    const tourType = 'cultural';
    
    const result = await aiServiceInstance.generateTourDescription(city, tourType);
    
    // Verify axios was called with the right parameters
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/chat/completions'),
      expect.objectContaining({
        model: expect.any(String),
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining(city),
            role: 'user'
          })
        ])
      }),
      expect.any(Object)
    );
    
    // Verify the result is as expected
    expect(result).toBe(mockOpenAIResponse.choices[0].message.content);
  });
  
  it('should generate embeddings for text', async () => {
    // Setup the mock
    axios.post.mockResolvedValueOnce({ data: mockEmbeddingResponse });
    
    const text = 'Barcelona cultural tour';
    
    const result = await aiServiceInstance.generateEmbedding(text);
    
    // Verify axios was called with the right parameters
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/embeddings'),
      expect.objectContaining({
        model: expect.any(String),
        input: text
      }),
      expect.any(Object)
    );
    
    // Verify the result is as expected
    expect(result).toEqual({
      embedding: mockEmbeddingResponse.data[0].embedding,
      usage: mockEmbeddingResponse.usage
    });
  });
  
  it('should handle API errors', async () => {
    // Setup the mock to simulate an error
    axios.post.mockRejectedValueOnce(new Error('API Error'));
    
    const city = 'Barcelona';
    const tourType = 'cultural';
    
    await expect(
      aiServiceInstance.generateTourDescription(city, tourType)
    ).rejects.toThrow('Failed to generate tour description');
  });
});
```

### Maps API Mocking

For components and services that interact with mapping APIs:

```javascript
// /src/tests/mocks/api/maps.mock.js
export const mockGeocodingResponse = {
  results: [
    {
      formatted_address: "Barcelona, Spain",
      geometry: {
        location: {
          lat: 41.3851,
          lng: 2.1734
        },
        location_type: "APPROXIMATE",
        viewport: {
          northeast: {
            lat: 41.4692,
            lng: 2.2268
          },
          southwest: {
            lat: 41.3203,
            lng: 2.0695
          }
        }
      },
      place_id: "ChIJ5TCOcRaYpBIRCmZHTz37sEQ"
    }
  ],
  status: "OK"
};

export const mockRouteResponse = {
  routes: [
    {
      legs: [
        {
          distance: {
            text: "2.1 km",
            value: 2100
          },
          duration: {
            text: "15 mins",
            value: 900
          },
          steps: [
            {
              distance: {
                text: "0.5 km",
                value: 500
              },
              duration: {
                text: "6 mins",
                value: 360
              },
              instructions: "Walk to Plaça de Catalunya",
              travel_mode: "WALKING"
            },
            {
              distance: {
                text: "1.6 km",
                value: 1600
              },
              duration: {
                text: "9 mins",
                value: 540
              },
              instructions: "Continue to La Sagrada Familia",
              travel_mode: "WALKING"
            }
          ]
        }
      ],
      summary: "Route from Plaça de Catalunya to La Sagrada Familia"
    }
  ],
  status: "OK"
};

export const mockNearbyPlacesResponse = {
  results: [
    {
      business_status: "OPERATIONAL",
      name: "La Sagrada Familia",
      place_id: "ChIJZ9rRX26jpBIRAIxJj7nn5R4",
      rating: 4.7,
      vicinity: "Carrer de Mallorca, 401, Barcelona",
      geometry: {
        location: {
          lat: 41.4036,
          lng: 2.1744
        }
      }
    },
    {
      business_status: "OPERATIONAL",
      name: "Park Güell",
      place_id: "ChIJZ5XER9GYpBIR-KKjDHGMjpM",
      rating: 4.5,
      vicinity: "08024 Barcelona, Spain",
      geometry: {
        location: {
          lat: 41.4145,
          lng: 2.1527
        }
      }
    }
  ],
  status: "OK"
};

export const mockMapsError = {
  error_message: "API key is invalid. Please pass a valid API key.",
  status: "REQUEST_DENIED"
};
```

## Internal API Mocking with MSW

We use [Mock Service Worker (MSW)](https://mswjs.io/) for mocking internal API requests in component tests:

### Setting up MSW Handlers

```javascript
// /src/tests/mocks/api/handlers.js
import { rest } from 'msw';
import { toursMockData } from '../data/tours.mock';
import { usersMockData } from '../data/users.mock';
import { bookingsMockData } from '../data/bookings.mock';

export const handlers = [
  // Tours API
  rest.get('/api/tours', (req, res, ctx) => {
    // Handle query parameters
    const city = req.url.searchParams.get('city');
    const type = req.url.searchParams.get('type');
    const minPrice = req.url.searchParams.get('minPrice');
    const maxPrice = req.url.searchParams.get('maxPrice');
    
    let filteredTours = [...toursMockData];
    
    if (city) {
      filteredTours = filteredTours.filter(tour => 
        tour.city.toLowerCase().includes(city.toLowerCase())
      );
    }
    
    if (type) {
      filteredTours = filteredTours.filter(tour => tour.type === type);
    }
    
    if (minPrice) {
      filteredTours = filteredTours.filter(tour => tour.price >= Number(minPrice));
    }
    
    if (maxPrice) {
      filteredTours = filteredTours.filter(tour => tour.price <= Number(maxPrice));
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        data: filteredTours,
        count: filteredTours.length,
        page: 1,
        totalPages: 1
      })
    );
  }),
  
  rest.get('/api/tours/:id', (req, res, ctx) => {
    const { id } = req.params;
    const tour = toursMockData.find(tour => tour.id === id);
    
    if (!tour) {
      return res(
        ctx.status(404),
        ctx.json({ message: 'Tour not found' })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json(tour)
    );
  }),
  
  rest.post('/api/tours', (req, res, ctx) => {
    const newTour = {
      id: `tour-${Date.now()}`,
      ...req.body,
      createdAt: new Date().toISOString()
    };
    
    return res(
      ctx.status(201),
      ctx.json(newTour)
    );
  }),
  
  // Authentication API
  rest.post('/api/auth/login', (req, res, ctx) => {
    const { email, password } = req.body;
    
    const user = usersMockData.find(user => user.email === email);
    
    if (!user || password !== 'test-password') {
      return res(
        ctx.status(401),
        ctx.json({ message: 'Invalid credentials' })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token: 'mock-jwt-token'
      })
    );
  }),
  
  rest.post('/api/auth/register', (req, res, ctx) => {
    const { email } = req.body;
    
    const existingUser = usersMockData.find(user => user.email === email);
    
    if (existingUser) {
      return res(
        ctx.status(409),
        ctx.json({ message: 'User with this email already exists' })
      );
    }
    
    const newUser = {
      id: `user-${Date.now()}`,
      ...req.body,
      role: 'USER',
      createdAt: new Date().toISOString()
    };
    
    return res(
      ctx.status(201),
      ctx.json({
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        },
        token: 'mock-jwt-token'
      })
    );
  }),
  
  // Bookings API
  rest.get('/api/bookings', (req, res, ctx) => {
    const userId = req.url.searchParams.get('userId');
    
    if (userId) {
      const userBookings = bookingsMockData.filter(booking => booking.userId === userId);
      
      return res(
        ctx.status(200),
        ctx.json({
          data: userBookings,
          count: userBookings.length
        })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        data: bookingsMockData,
        count: bookingsMockData.length
      })
    );
  }),
  
  rest.post('/api/bookings', (req, res, ctx) => {
    const { tourId, userId, date, participants } = req.body;
    
    const tour = toursMockData.find(tour => tour.id === tourId);
    
    if (!tour) {
      return res(
        ctx.status(404),
        ctx.json({ message: 'Tour not found' })
      );
    }
    
    const newBooking = {
      id: `booking-${Date.now()}`,
      tourId,
      userId,
      date,
      participants,
      totalPrice: tour.price * participants,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };
    
    return res(
      ctx.status(201),
      ctx.json(newBooking)
    );
  })
];
```

### Setting up MSW for Tests

```javascript
// /src/tests/mocks/api/server.js
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// This configures a Service Worker with the given request handlers.
export const server = setupServer(...handlers);
```

Usage in component tests:

```jsx
// /src/tests/unit/components/TourList.test.jsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { server } from '../../mocks/api/server';
import TourList from '../../../components/tour-list/TourList';

// Start the MSW server before all tests
beforeAll(() => server.listen());
// Reset handlers after each test
afterEach(() => server.resetHandlers());
// Close server after all tests
afterAll(() => server.close());

describe('TourList Component', () => {
  it('should fetch and display tours', async () => {
    render(
      <MemoryRouter>
        <TourList />
      </MemoryRouter>
    );
    
    // Check for loading indicator
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    
    // Wait for the tours to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
    
    // Check if tours are displayed
    expect(screen.getAllByTestId('tour-card')).toHaveLength(3); // Assuming 3 mock tours
    
    // Test filtering
    const cityFilterInput = screen.getByPlaceholderText('Filter by city');
    await userEvent.type(cityFilterInput, 'Barcelona');
    await userEvent.click(screen.getByText('Apply Filters'));
    
    // Wait for filtered results
    await waitFor(() => {
      const tourCards = screen.getAllByTestId('tour-card');
      expect(tourCards.length).toBeLessThanOrEqual(3); // Should filter out some tours
      
      // Check if all displayed tours mention Barcelona
      tourCards.forEach(card => {
        expect(card.textContent.toLowerCase()).toContain('barcelona');
      });
    });
  });
});
```

Usage in API hooks:

```jsx
// /src/tests/unit/hooks/useToursApi.test.js
import { renderHook, act, waitFor } from '@testing-library/react';
import { server } from '../../mocks/api/server';
import { rest } from 'msw';
import { useToursApi } from '../../../hooks/useToursApi';

// Start the MSW server before all tests
beforeAll(() => server.listen());
// Reset handlers after each test
afterEach(() => server.resetHandlers());
// Close server after all tests
afterAll(() => server.close());

describe('useToursApi Hook', () => {
  it('should fetch tours', async () => {
    const { result } = renderHook(() => useToursApi());
    
    // Initial state
    expect(result.current.loading).toBe(false);
    expect(result.current.tours).toEqual([]);
    expect(result.current.error).toBeNull();
    
    // Trigger the fetch
    act(() => {
      result.current.fetchTours();
    });
    
    // Check loading state
    expect(result.current.loading).toBe(true);
    
    // Wait for data to be loaded
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Verify data is loaded
    expect(result.current.tours.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
  });
  
  it('should handle fetch errors', async () => {
    // Override the default handler to return an error
    server.use(
      rest.get('/api/tours', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ message: 'Server error' })
        );
      })
    );
    
    const { result } = renderHook(() => useToursApi());
    
    // Trigger the fetch
    act(() => {
      result.current.fetchTours();
    });
    
    // Wait for request to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Verify error state
    expect(result.current.error).not.toBeNull();
    expect(result.current.tours).toEqual([]);
  });
});
```

## Testing API Error Handling

```javascript
// /src/tests/unit/services/ApiService.test.js
import axios from 'axios';
import ApiService from '../../../services/api-service';

// Mock axios
jest.mock('axios');

describe('API Service', () => {
  const apiService = new ApiService('/api');
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage mock
    localStorage.clear();
  });
  
  it('should handle 401 Unauthorized errors', async () => {
    // Mock a 401 response
    const error = {
      response: {
        status: 401,
        data: { message: 'Unauthorized' }
      }
    };
    
    axios.get.mockRejectedValueOnce(error);
    
    // Mock localStorage
    const mockLogout = jest.fn();
    apiService.setAuthErrorHandler(mockLogout);
    
    await expect(apiService.get('/test')).rejects.toThrow('Unauthorized');
    
    // Verify auth error handler was called
    expect(mockLogout).toHaveBeenCalled();
  });
  
  it('should handle 404 Not Found errors', async () => {
    // Mock a 404 response
    const error = {
      response: {
        status: 404,
        data: { message: 'Resource not found' }
      }
    };
    
    axios.get.mockRejectedValueOnce(error);
    
    await expect(apiService.get('/test')).rejects.toThrow('Resource not found');
  });
  
  it('should handle 500 Server errors', async () => {
    // Mock a 500 response
    const error = {
      response: {
        status: 500,
        data: { message: 'Server error' }
      }
    };
    
    axios.get.mockRejectedValueOnce(error);
    
    await expect(apiService.get('/test')).rejects.toThrow('Server error');
  });
  
  it('should handle network errors', async () => {
    // Mock a network error
    const error = new Error('Network Error');
    error.isAxiosError = true;
    error.response = undefined;
    
    axios.get.mockRejectedValueOnce(error);
    
    await expect(apiService.get('/test')).rejects.toThrow('Network Error');
  });
  
  it('should add auth token to headers if available', async () => {
    // Setup localStorage with a token
    localStorage.setItem('authToken', 'mock-token');
    
    // Mock a successful response
    axios.get.mockResolvedValueOnce({ data: { success: true } });
    
    await apiService.get('/test');
    
    // Verify the token was included in the headers
    expect(axios.get).toHaveBeenCalledWith('/api/test', {
      headers: expect.objectContaining({
        Authorization: 'Bearer mock-token'
      })
    });
  });
});
```

## Mock API Server for E2E Tests

For end-to-end tests, we can set up a dedicated mock API server:

```javascript
// /src/tests/e2e/setup/mock-api-server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { toursMockData } = require('../fixtures/tours.mock');
const { usersMockData } = require('../fixtures/users.mock');
const { bookingsMockData } = require('../fixtures/bookings.mock');

function createMockApiServer() {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(bodyParser.json());
  
  // Mock JWT verification middleware
  const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (token !== 'mock-jwt-token') {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
    
    // Set user info from the token
    req.user = {
      id: usersMockData[0].id,
      email: usersMockData[0].email,
      role: usersMockData[0].role
    };
    
    next();
  };
  
  // Tours endpoints
  app.get('/api/tours', (req, res) => {
    // Extract query parameters
    const { city, type, minPrice, maxPrice } = req.query;
    
    let filteredTours = [...toursMockData];
    
    if (city) {
      filteredTours = filteredTours.filter(tour => 
        tour.city.toLowerCase().includes(city.toLowerCase())
      );
    }
    
    if (type) {
      filteredTours = filteredTours.filter(tour => tour.type === type);
    }
    
    if (minPrice) {
      filteredTours = filteredTours.filter(tour => tour.price >= Number(minPrice));
    }
    
    if (maxPrice) {
      filteredTours = filteredTours.filter(tour => tour.price <= Number(maxPrice));
    }
    
    res.status(200).json({
      data: filteredTours,
      count: filteredTours.length,
      page: 1,
      totalPages: 1
    });
  });
  
  app.get('/api/tours/:id', (req, res) => {
    const { id } = req.params;
    const tour = toursMockData.find(tour => tour.id === id);
    
    if (!tour) {
      return res.status(404).json({ message: 'Tour not found' });
    }
    
    res.status(200).json(tour);
  });
  
  app.post('/api/tours', verifyToken, (req, res) => {
    // Check if user has admin role
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    
    const newTour = {
      id: `tour-${Date.now()}`,
      ...req.body,
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json(newTour);
  });
  
  // Auth endpoints
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    const user = usersMockData.find(user => user.email === email);
    
    if (!user || password !== 'test-password') {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token: 'mock-jwt-token'
    });
  });
  
  app.post('/api/auth/register', (req, res) => {
    const { email } = req.body;
    
    const existingUser = usersMockData.find(user => user.email === email);
    
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }
    
    const newUser = {
      id: `user-${Date.now()}`,
      ...req.body,
      role: 'USER',
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      },
      token: 'mock-jwt-token'
    });
  });
  
  // Bookings endpoints
  app.get('/api/bookings', verifyToken, (req, res) => {
    const { userId } = req.query;
    
    // If userId is provided, filter by that user
    // For admins, allow fetching any user's bookings
    // For non-admins, only allow fetching their own bookings
    if (userId && req.user.role !== 'ADMIN' && userId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: Cannot access other user bookings' });
    }
    
    let userBookings = bookingsMockData;
    
    if (userId) {
      userBookings = bookingsMockData.filter(booking => booking.userId === userId);
    } else if (req.user.role !== 'ADMIN') {
      // Non-admins without specified userId can only see their own bookings
      userBookings = bookingsMockData.filter(booking => booking.userId === req.user.id);
    }
    
    res.status(200).json({
      data: userBookings,
      count: userBookings.length
    });
  });
  
  app.post('/api/bookings', verifyToken, (req, res) => {
    const { tourId, date, participants } = req.body;
    
    const tour = toursMockData.find(tour => tour.id === tourId);
    
    if (!tour) {
      return res.status(404).json({ message: 'Tour not found' });
    }
    
    const newBooking = {
      id: `booking-${Date.now()}`,
      tourId,
      userId: req.user.id,
      date,
      participants,
      totalPrice: tour.price * participants,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json(newBooking);
  });
  
  return {
    start: (port = 3001) => {
      const server = app.listen(port, () => {
        console.log(`Mock API server running on port ${port}`);
      });
      
      return server;
    }
  };
}

module.exports = { createMockApiServer };
```

Usage in global setup and teardown scripts:

```javascript
// /src/tests/e2e/globalSetup.js
const { createMockApiServer } = require('./setup/mock-api-server');

module.exports = async function globalSetup() {
  // Start mock API server
  const mockApiServer = createMockApiServer();
  global.__MOCK_API_SERVER__ = mockApiServer.start(3001);
  
  console.log('End-to-end test environment setup complete');
};
```

```javascript
// /src/tests/e2e/globalTeardown.js
module.exports = async function globalTeardown() {
  // Close mock API server
  if (global.__MOCK_API_SERVER__) {
    global.__MOCK_API_SERVER__.close();
  }
  
  console.log('End-to-end test environment teardown complete');
};
```

## Related Documentation

- [Mock Strategies](/docs/project_lifecycle/all_tests/references/project.tests.mock-strategies.md)
- [Service Mocking](/docs/project_lifecycle/all_tests/references/project.service-mocking.md)
- [Data Mocking](/docs/project_lifecycle/all_tests/references/project.data-mocking.md) 