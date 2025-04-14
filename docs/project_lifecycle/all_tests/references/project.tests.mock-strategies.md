# TourGuideAI Mock Strategies

This document outlines the strategies and patterns used for mocking and test data management within the TourGuideAI project.

## Mock Data Organization

All mock data is organized in the following structure:

```
/src/tests/mocks/
├── api/              # API response mocks
├── data/             # Data model mocks
├── services/         # Service layer mocks
└── fixtures/         # Test fixtures for specific test scenarios
```

## API Mocking Strategy

### External API Mocks

For external APIs (OpenAI, Maps API, etc.), we use the following approach:

```javascript
// /src/tests/mocks/api/openai.mock.js
const openAIMock = {
  generateCompletion: jest.fn().mockResolvedValue({
    text: 'This is a mock completion response',
    usage: { total_tokens: 150 }
  }),
  
  generateEmbedding: jest.fn().mockResolvedValue({
    embedding: [0.1, 0.2, 0.3, 0.4],
    usage: { total_tokens: 8 }
  })
};

export default openAIMock;
```

Implementation in tests:

```javascript
// /src/tests/unit/services/ai-service.test.js
import openAIMock from '../../mocks/api/openai.mock';
import { AIService } from '../../../services/ai-service';

jest.mock('../../../lib/openai', () => openAIMock);

describe('AIService', () => {
  beforeEach(() => {
    openAIMock.generateCompletion.mockClear();
  });

  it('should generate tour descriptions', async () => {
    const aiService = new AIService();
    const result = await aiService.generateTourDescription('Paris');
    
    expect(openAIMock.generateCompletion).toHaveBeenCalledWith(
      expect.stringContaining('Paris')
    );
    expect(result).toContain('mock completion response');
  });
});
```

### Internal API Mocks

For internal API endpoints, we use MSW (Mock Service Worker):

```javascript
// /src/tests/mocks/api/handlers.js
import { rest } from 'msw';
import { toursMockData } from '../data/tours.mock';

export const handlers = [
  rest.get('/api/tours', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(toursMockData)
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
  })
];
```

Setup in tests:

```javascript
// /src/tests/setup.js
import { setupServer } from 'msw/node';
import { handlers } from './mocks/api/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Data Mocking

### Model/Entity Mocks

Data models are mocked as follows:

```javascript
// /src/tests/mocks/data/tours.mock.js
export const toursMockData = [
  {
    id: 'tour-1',
    name: 'Historic Paris Walking Tour',
    description: 'Explore the rich history of Paris...',
    duration: 180,
    price: 49.99,
    rating: 4.8,
    locations: [
      { name: 'Eiffel Tower', lat: 48.8584, lng: 2.2945 },
      { name: 'Louvre Museum', lat: 48.8606, lng: 2.3376 }
    ],
    guideId: 'guide-1'
  },
  {
    id: 'tour-2',
    name: 'Roman Colosseum Tour',
    description: 'Step back in time at the iconic Colosseum...',
    duration: 120,
    price: 39.99,
    rating: 4.7,
    locations: [
      { name: 'Colosseum', lat: 41.8902, lng: 12.4922 },
      { name: 'Roman Forum', lat: 41.8925, lng: 12.4853 }
    ],
    guideId: 'guide-2'
  }
];

export const createMockTour = (overrides = {}) => ({
  id: `tour-${Math.floor(Math.random() * 1000)}`,
  name: 'New Mock Tour',
  description: 'This is a dynamically created mock tour',
  duration: 120,
  price: 29.99,
  rating: 0,
  locations: [],
  guideId: 'guide-1',
  ...overrides
});
```

### Factory Pattern for Mock Data

For complex or varied test data needs, we use a factory pattern:

```javascript
// /src/tests/mocks/data/factory.js
import { createMockTour } from './tours.mock';
import { createMockUser } from './users.mock';

export const createMockTourWithGuide = (tourOverrides = {}, guideOverrides = {}) => {
  const guide = createMockUser({ role: 'GUIDE', ...guideOverrides });
  return {
    ...createMockTour({ guideId: guide.id, ...tourOverrides }),
    guide
  };
};

export const createMockBooking = (userOverrides = {}, tourOverrides = {}) => {
  const user = createMockUser(userOverrides);
  const tour = createMockTour(tourOverrides);
  
  return {
    id: `booking-${Math.floor(Math.random() * 1000)}`,
    userId: user.id,
    tourId: tour.id,
    date: new Date().toISOString(),
    participants: 2,
    totalPrice: tour.price * 2,
    status: 'CONFIRMED',
    user,
    tour
  };
};
```

## Service Mocking

Services are mocked using Jest's mocking capabilities:

```javascript
// /src/tests/mocks/services/tour-service.mock.js
export const tourServiceMock = {
  findTourById: jest.fn(),
  searchTours: jest.fn(),
  createTour: jest.fn(),
  updateTour: jest.fn(),
  deleteTour: jest.fn()
};

// /src/tests/unit/controllers/tour-controller.test.js
import { tourServiceMock } from '../../mocks/services/tour-service.mock';
import { tourController } from '../../../controllers/tour-controller';
import { toursMockData } from '../../mocks/data/tours.mock';

jest.mock('../../../services/tour-service', () => tourServiceMock);

describe('Tour Controller', () => {
  beforeEach(() => {
    tourServiceMock.findTourById.mockReset();
    tourServiceMock.searchTours.mockReset();
  });
  
  it('should get tour by id', async () => {
    const mockTour = toursMockData[0];
    tourServiceMock.findTourById.mockResolvedValue(mockTour);
    
    const req = { params: { id: mockTour.id } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    
    await tourController.getTourById(req, res);
    
    expect(tourServiceMock.findTourById).toHaveBeenCalledWith(mockTour.id);
    expect(res.json).toHaveBeenCalledWith(mockTour);
  });
});
```

## Database Mocking

For database interactions, we use the following approaches:

### In-Memory Database

For integration tests:

```javascript
// /src/tests/config/test-db.js
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

export const connectTestDb = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  await mongoose.connect(uri);
};

export const disconnectTestDb = async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
};

export const clearTestDb = async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};
```

Usage in tests:

```javascript
// /src/tests/integration/repositories/tour-repository.test.js
import { connectTestDb, disconnectTestDb, clearTestDb } from '../../config/test-db';
import { TourRepository } from '../../../repositories/tour-repository';
import { toursMockData } from '../../mocks/data/tours.mock';

describe('Tour Repository', () => {
  beforeAll(async () => {
    await connectTestDb();
  });
  
  afterAll(async () => {
    await disconnectTestDb();
  });
  
  beforeEach(async () => {
    await clearTestDb();
  });
  
  it('should create a new tour', async () => {
    const repository = new TourRepository();
    const mockTour = toursMockData[0];
    
    const createdTour = await repository.create(mockTour);
    
    expect(createdTour.id).toBeDefined();
    expect(createdTour.name).toBe(mockTour.name);
    
    const retrievedTour = await repository.findById(createdTour.id);
    expect(retrievedTour).toMatchObject(mockTour);
  });
});
```

### Repository Mocking

For unit tests that don't need actual database interactions:

```javascript
// /src/tests/mocks/repositories/tour-repository.mock.js
export const tourRepositoryMock = {
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

// /src/tests/unit/services/tour-service.test.js
import { tourRepositoryMock } from '../../mocks/repositories/tour-repository.mock';
import { TourService } from '../../../services/tour-service';
import { toursMockData, createMockTour } from '../../mocks/data/tours.mock';

jest.mock('../../../repositories/tour-repository', () => ({
  TourRepository: jest.fn().mockImplementation(() => tourRepositoryMock)
}));

describe('Tour Service', () => {
  let tourService;
  
  beforeEach(() => {
    tourRepositoryMock.findById.mockReset();
    tourRepositoryMock.findAll.mockReset();
    tourRepositoryMock.create.mockReset();
    
    tourService = new TourService();
  });
  
  it('should find tour by id', async () => {
    const mockTour = toursMockData[0];
    tourRepositoryMock.findById.mockResolvedValue(mockTour);
    
    const result = await tourService.findTourById(mockTour.id);
    
    expect(tourRepositoryMock.findById).toHaveBeenCalledWith(mockTour.id);
    expect(result).toEqual(mockTour);
  });
  
  it('should create a new tour', async () => {
    const newTourData = {
      name: 'New Tour',
      description: 'New tour description',
      price: 59.99
    };
    
    const createdTour = createMockTour(newTourData);
    tourRepositoryMock.create.mockResolvedValue(createdTour);
    
    const result = await tourService.createTour(newTourData);
    
    expect(tourRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining(newTourData)
    );
    expect(result).toEqual(createdTour);
  });
});
```

## Component Testing Mocks

For React component testing, we use both MSW and component-specific mocks:

```javascript
// /src/tests/mocks/contexts/auth-context.mock.jsx
import React from 'react';
import { AuthContext } from '../../../contexts/auth-context';

export const createAuthContextMock = (overrides = {}) => ({
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'USER'
  },
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
  signup: jest.fn(),
  ...overrides
});

export const AuthContextMockProvider = ({ children, value = {} }) => {
  const contextValue = createAuthContextMock(value);
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
```

Usage in component tests:

```javascript
// /src/tests/unit/components/tour-list.test.jsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthContextMockProvider } from '../../mocks/contexts/auth-context.mock';
import { TourList } from '../../../components/tour-list';
import { toursMockData } from '../../mocks/data/tours.mock';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/tours', (req, res, ctx) => {
    return res(ctx.json(toursMockData));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('TourList Component', () => {
  it('should render tours from API', async () => {
    render(
      <AuthContextMockProvider>
        <TourList />
      </AuthContextMockProvider>
    );
    
    expect(screen.getByText('Loading tours...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(toursMockData[0].name)).toBeInTheDocument();
    });
    
    expect(screen.getByText(toursMockData[1].name)).toBeInTheDocument();
  });
  
  it('should handle API errors', async () => {
    server.use(
      rest.get('/api/tours', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    render(
      <AuthContextMockProvider>
        <TourList />
      </AuthContextMockProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Error loading tours')).toBeInTheDocument();
    });
  });
});
```

## E2E Testing Mock Strategy

For end-to-end tests using Playwright, we use the following approach:

```javascript
// /src/tests/e2e/setup/global-setup.js
const { chromium } = require('@playwright/test');
const { setupMockApi } = require('./mock-api');

async function globalSetup(config) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Setup mock API endpoints
  await setupMockApi(page);
  
  // Seed mock data
  await page.goto('http://localhost:3000/api/test/seed');
  
  await browser.close();
}

module.exports = globalSetup;
```

```javascript
// /src/tests/e2e/tests/tour-booking.spec.js
const { test, expect } = require('@playwright/test');
const { loginAsMockUser } = require('../helpers/auth');

test.describe('Tour Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMockUser(page);
  });

  test('User can book a tour', async ({ page }) => {
    await page.goto('/tours');
    
    // Click on the first tour
    await page.click('.tour-card:first-child');
    
    // Fill booking details
    await page.fill('[data-testid="booking-date"]', '2023-12-15');
    await page.fill('[data-testid="participants"]', '2');
    
    // Submit booking
    await page.click('[data-testid="book-now-button"]');
    
    // Assert success
    await expect(page.locator('.booking-confirmation')).toBeVisible();
    await expect(page.locator('.booking-id')).toBeVisible();
  });
});
```

## Related Documentation

- [Test Execution Environments](/docs/project_lifecycle/all_tests/references/project.test-execution-environments.md)
- [End-to-End Testing Guide](/docs/project_lifecycle/all_tests/references/project.e2e-test-guide.md)
- [API Mocking Guidelines](/docs/project_lifecycle/development/references/project.api-mocking.md) 