# Service Mocking Guidelines

This document outlines the standardized approaches for mocking services in the TourGuideAI application.

## Service Layer Mocking

### General Approach

1. Create mock implementations of services in the `/src/tests/mocks/services/` directory
2. Use Jest's mocking capabilities to substitute real services with mocks
3. Provide mock implementations that simulate expected behavior without external dependencies

### Tour Service Mocking Example

```javascript
// /src/tests/mocks/services/tour-service.mock.js
import { toursMockData } from '../data/tours.mock';

export const tourServiceMock = {
  getTours: jest.fn().mockResolvedValue({
    data: toursMockData,
    count: toursMockData.length,
    page: 1,
    totalPages: 1
  }),

  getTourById: jest.fn().mockImplementation((id) => {
    const tour = toursMockData.find(tour => tour.id === id);
    if (!tour) {
      return Promise.reject(new Error('Tour not found'));
    }
    return Promise.resolve(tour);
  }),

  createTour: jest.fn().mockImplementation((tourData) => {
    return Promise.resolve({
      id: 'new-tour-id',
      ...tourData,
      createdAt: new Date().toISOString()
    });
  }),
  
  updateTour: jest.fn().mockImplementation((id, tourData) => {
    const tourIndex = toursMockData.findIndex(tour => tour.id === id);
    if (tourIndex === -1) {
      return Promise.reject(new Error('Tour not found'));
    }
    return Promise.resolve({
      ...toursMockData[tourIndex],
      ...tourData,
      updatedAt: new Date().toISOString()
    });
  }),
  
  deleteTour: jest.fn().mockImplementation((id) => {
    const tourIndex = toursMockData.findIndex(tour => tour.id === id);
    if (tourIndex === -1) {
      return Promise.reject(new Error('Tour not found'));
    }
    return Promise.resolve({ success: true });
  }),
  
  searchTours: jest.fn().mockImplementation((query) => {
    const { city, type, minPrice, maxPrice } = query;
    
    let filtered = [...toursMockData];
    
    if (city) {
      filtered = filtered.filter(tour => 
        tour.city.toLowerCase().includes(city.toLowerCase())
      );
    }
    
    if (type) {
      filtered = filtered.filter(tour => tour.type === type);
    }
    
    if (minPrice !== undefined) {
      filtered = filtered.filter(tour => tour.price >= minPrice);
    }
    
    if (maxPrice !== undefined) {
      filtered = filtered.filter(tour => tour.price <= maxPrice);
    }
    
    return Promise.resolve({
      data: filtered,
      count: filtered.length,
      page: 1,
      totalPages: 1
    });
  })
};
```

Usage in tests:

```javascript
// /src/tests/unit/controllers/tour-controller.test.js
import { tourControllerInstance } from '../../../controllers/tour-controller';
import { tourServiceMock } from '../../mocks/services/tour-service.mock';

// Mock TourService dependency
jest.mock('../../../services/tour-service', () => ({
  tourServiceInstance: tourServiceMock
}));

describe('Tour Controller', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });
  
  it('should get all tours', async () => {
    const mockReq = {
      query: {}
    };
    
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    await tourControllerInstance.getTours(mockReq, mockRes);
    
    expect(tourServiceMock.getTours).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.any(Array),
      count: expect.any(Number)
    }));
  });
  
  it('should get a tour by ID', async () => {
    const mockTourId = toursMockData[0].id;
    
    const mockReq = {
      params: { id: mockTourId }
    };
    
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    await tourControllerInstance.getTourById(mockReq, mockRes);
    
    expect(tourServiceMock.getTourById).toHaveBeenCalledWith(mockTourId);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: mockTourId })
    );
  });
  
  it('should handle tour not found error', async () => {
    const nonExistentId = 'non-existent-id';
    
    tourServiceMock.getTourById.mockRejectedValueOnce(
      new Error('Tour not found')
    );
    
    const mockReq = {
      params: { id: nonExistentId }
    };
    
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    await tourControllerInstance.getTourById(mockReq, mockRes);
    
    expect(tourServiceMock.getTourById).toHaveBeenCalledWith(nonExistentId);
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('not found') })
    );
  });
  
  it('should create a new tour', async () => {
    const mockTourData = {
      name: 'New Test Tour',
      city: 'Barcelona',
      description: 'A test tour',
      price: 99.99,
      duration: 3,
      type: 'CULTURAL'
    };
    
    const mockReq = {
      body: mockTourData
    };
    
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    await tourControllerInstance.createTour(mockReq, mockRes);
    
    expect(tourServiceMock.createTour).toHaveBeenCalledWith(mockTourData);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        ...mockTourData
      })
    );
  });
});
```

### User Service Mocking Example

```javascript
// /src/tests/mocks/services/user-service.mock.js
import { usersMockData } from '../data/users.mock';

export const userServiceMock = {
  getUserById: jest.fn().mockImplementation((id) => {
    const user = usersMockData.find(user => user.id === id);
    if (!user) {
      return Promise.reject(new Error('User not found'));
    }
    return Promise.resolve(user);
  }),
  
  getUserByEmail: jest.fn().mockImplementation((email) => {
    const user = usersMockData.find(user => user.email === email);
    if (!user) {
      return Promise.reject(new Error('User not found'));
    }
    return Promise.resolve(user);
  }),
  
  createUser: jest.fn().mockImplementation((userData) => {
    return Promise.resolve({
      id: 'new-user-id',
      ...userData,
      createdAt: new Date().toISOString()
    });
  }),
  
  updateUser: jest.fn().mockImplementation((id, userData) => {
    const userIndex = usersMockData.findIndex(user => user.id === id);
    if (userIndex === -1) {
      return Promise.reject(new Error('User not found'));
    }
    return Promise.resolve({
      ...usersMockData[userIndex],
      ...userData,
      updatedAt: new Date().toISOString()
    });
  }),
  
  deleteUser: jest.fn().mockImplementation((id) => {
    const userIndex = usersMockData.findIndex(user => user.id === id);
    if (userIndex === -1) {
      return Promise.reject(new Error('User not found'));
    }
    return Promise.resolve({ success: true });
  }),
  
  getUserBookings: jest.fn().mockImplementation((userId) => {
    return Promise.resolve([
      {
        id: 'booking1',
        userId,
        tourId: 'tour1',
        date: '2023-05-20T12:00:00.000Z',
        participants: 2,
        totalPrice: 199.98,
        status: 'CONFIRMED'
      },
      {
        id: 'booking2',
        userId,
        tourId: 'tour2',
        date: '2023-06-15T10:00:00.000Z',
        participants: 3,
        totalPrice: 149.97,
        status: 'PENDING'
      }
    ]);
  })
};
```

## Mocking Authentication Services

```javascript
// /src/tests/mocks/services/auth-service.mock.js
import { usersMockData } from '../data/users.mock';

export const authServiceMock = {
  login: jest.fn().mockImplementation((email, password) => {
    // Simplified mock implementation - in real tests would validate password
    const user = usersMockData.find(user => user.email === email);
    
    if (!user || password !== 'test-password') {
      return Promise.reject(new Error('Invalid credentials'));
    }
    
    return Promise.resolve({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token: 'mock-jwt-token'
    });
  }),
  
  register: jest.fn().mockImplementation((userData) => {
    // Check if user with this email already exists
    const existingUser = usersMockData.find(user => user.email === userData.email);
    
    if (existingUser) {
      return Promise.reject(new Error('User with this email already exists'));
    }
    
    const newUser = {
      id: 'new-user-id',
      ...userData,
      role: 'USER',
      createdAt: new Date().toISOString()
    };
    
    return Promise.resolve({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      },
      token: 'mock-jwt-token'
    });
  }),
  
  verifyToken: jest.fn().mockImplementation((token) => {
    if (token !== 'mock-jwt-token') {
      return Promise.reject(new Error('Invalid token'));
    }
    
    return Promise.resolve({
      id: usersMockData[0].id,
      email: usersMockData[0].email,
      role: usersMockData[0].role
    });
  }),
  
  refreshToken: jest.fn().mockImplementation((token) => {
    if (token !== 'mock-jwt-token') {
      return Promise.reject(new Error('Invalid token'));
    }
    
    return Promise.resolve({
      token: 'new-mock-jwt-token',
      user: {
        id: usersMockData[0].id,
        name: usersMockData[0].name,
        email: usersMockData[0].email,
        role: usersMockData[0].role
      }
    });
  }),
  
  changePassword: jest.fn().mockImplementation((userId, currentPassword, newPassword) => {
    const user = usersMockData.find(user => user.id === userId);
    
    if (!user) {
      return Promise.reject(new Error('User not found'));
    }
    
    if (currentPassword !== 'test-password') {
      return Promise.reject(new Error('Current password is incorrect'));
    }
    
    return Promise.resolve({ success: true });
  })
};
```

## Booking Service Mocking

```javascript
// /src/tests/mocks/services/booking-service.mock.js
import { bookingsMockData } from '../data/bookings.mock';
import { toursMockData } from '../data/tours.mock';

export const bookingServiceMock = {
  getBookings: jest.fn().mockResolvedValue({
    data: bookingsMockData,
    count: bookingsMockData.length
  }),
  
  getBookingById: jest.fn().mockImplementation((id) => {
    const booking = bookingsMockData.find(booking => booking.id === id);
    if (!booking) {
      return Promise.reject(new Error('Booking not found'));
    }
    return Promise.resolve(booking);
  }),
  
  getUserBookings: jest.fn().mockImplementation((userId) => {
    const userBookings = bookingsMockData.filter(booking => booking.userId === userId);
    return Promise.resolve({
      data: userBookings,
      count: userBookings.length
    });
  }),
  
  createBooking: jest.fn().mockImplementation((bookingData) => {
    const { tourId, participants } = bookingData;
    
    // Find the tour to calculate the price
    const tour = toursMockData.find(tour => tour.id === tourId);
    if (!tour) {
      return Promise.reject(new Error('Tour not found'));
    }
    
    const totalPrice = tour.price * participants;
    
    return Promise.resolve({
      id: 'new-booking-id',
      ...bookingData,
      totalPrice,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    });
  }),
  
  updateBookingStatus: jest.fn().mockImplementation((id, status) => {
    const bookingIndex = bookingsMockData.findIndex(booking => booking.id === id);
    if (bookingIndex === -1) {
      return Promise.reject(new Error('Booking not found'));
    }
    return Promise.resolve({
      ...bookingsMockData[bookingIndex],
      status,
      updatedAt: new Date().toISOString()
    });
  }),
  
  cancelBooking: jest.fn().mockImplementation((id) => {
    const bookingIndex = bookingsMockData.findIndex(booking => booking.id === id);
    if (bookingIndex === -1) {
      return Promise.reject(new Error('Booking not found'));
    }
    return Promise.resolve({
      ...bookingsMockData[bookingIndex],
      status: 'CANCELLED',
      updatedAt: new Date().toISOString()
    });
  })
};
```

## AI Service Mocking

```javascript
// /src/tests/mocks/services/ai-service.mock.js
export const aiServiceMock = {
  generateTourDescription: jest.fn().mockImplementation((city, tourType) => {
    return Promise.resolve(
      `This is a mock ${tourType} tour description for ${city}, featuring the main attractions and local insights. The tour includes visits to popular landmarks, historical sites, and opportunities to experience the local culture.`
    );
  }),
  
  generateTourItinerary: jest.fn().mockImplementation((city, days) => {
    const itinerary = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      activities: [
        {
          time: '09:00',
          description: `Visit the main attraction in ${city}`
        },
        {
          time: '12:00',
          description: 'Lunch at a local restaurant'
        },
        {
          time: '14:00',
          description: 'Cultural activity or museum visit'
        },
        {
          time: '19:00',
          description: 'Dinner and evening entertainment'
        }
      ]
    }));
    
    return Promise.resolve(itinerary);
  }),
  
  generatePersonalizedRecommendations: jest.fn().mockImplementation((userProfile, city) => {
    const { interests = [], previousVisits = [] } = userProfile;
    
    const hasPreviouslyVisited = previousVisits.includes(city);
    const recommendation = {
      tours: [
        {
          name: `${interests[0] || 'Cultural'} Tour of ${city}`,
          type: interests[0]?.toUpperCase() || 'CULTURAL',
          recommended: true
        },
        {
          name: `${interests[1] || 'Historical'} Experience in ${city}`,
          type: interests[1]?.toUpperCase() || 'HISTORICAL',
          recommended: true
        }
      ],
      offTheBeatenPath: hasPreviouslyVisited,
      accommodationTips: `Based on your preferences, we recommend staying in the ${
        interests.includes('luxury') ? 'luxury hotels' : 'comfortable accommodations'
      } in the center of ${city}.`,
      seasonalAdvice: 'This is a great time to visit. The weather is perfect for exploration.'
    };
    
    return Promise.resolve(recommendation);
  }),
  
  generateEmbedding: jest.fn().mockImplementation((text) => {
    // Generate mock embedding vector (simplistic random version)
    const embedding = new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
    
    return Promise.resolve({
      embedding,
      usage: { total_tokens: text.split(' ').length }
    });
  })
};
```

## Payment Service Mocking

```javascript
// /src/tests/mocks/services/payment-service.mock.js
export const paymentServiceMock = {
  createPaymentIntent: jest.fn().mockImplementation((amount, currency, metadata) => {
    return Promise.resolve({
      id: 'mock-payment-intent-id',
      amount,
      currency,
      metadata,
      status: 'requires_payment_method',
      client_secret: 'mock-client-secret',
      created: Date.now()
    });
  }),
  
  confirmPayment: jest.fn().mockImplementation((paymentIntentId) => {
    return Promise.resolve({
      id: paymentIntentId,
      status: 'succeeded',
      amount_received: 10000, // $100.00
      currency: 'usd',
      payment_method: 'mock-payment-method-id',
      created: Date.now(),
      metadata: {
        bookingId: 'booking-123',
        tourId: 'tour-456'
      }
    });
  }),
  
  refundPayment: jest.fn().mockImplementation((paymentIntentId, amount) => {
    return Promise.resolve({
      id: 'mock-refund-id',
      payment_intent: paymentIntentId,
      amount,
      status: 'succeeded',
      currency: 'usd',
      created: Date.now()
    });
  }),
  
  createCustomer: jest.fn().mockImplementation((userData) => {
    return Promise.resolve({
      id: 'mock-customer-id',
      email: userData.email,
      name: userData.name,
      created: Date.now(),
      metadata: {
        userId: userData.id
      }
    });
  }),
  
  getPaymentMethods: jest.fn().mockImplementation((customerId) => {
    return Promise.resolve([
      {
        id: 'mock-payment-method-1',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025
        },
        created: Date.now(),
        customer: customerId
      },
      {
        id: 'mock-payment-method-2',
        type: 'card',
        card: {
          brand: 'mastercard',
          last4: '5555',
          exp_month: 5,
          exp_year: 2024
        },
        created: Date.now() - 86400000, // 1 day ago
        customer: customerId
      }
    ]);
  })
};
```

## Mocking Services in React Components

### Using Context Providers for Mocking

```jsx
// /src/tests/mocks/contexts/tour-context.mock.jsx
import React from 'react';
import { TourContext } from '../../../contexts/TourContext';
import { tourServiceMock } from '../services/tour-service.mock';

export const MockTourProvider = ({ children, initialState = {}, mockTourService = tourServiceMock }) => {
  const defaultState = {
    tours: [],
    loading: false,
    error: null,
    currentTour: null,
    ...initialState
  };
  
  const [state, setState] = React.useState(defaultState);
  
  const contextValue = {
    ...state,
    
    fetchTours: async (filters) => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const result = await mockTourService.getTours(filters);
        setState(prev => ({ 
          ...prev, 
          tours: result.data, 
          loading: false 
        }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error.message, 
          loading: false 
        }));
      }
    },
    
    fetchTourById: async (id) => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const tour = await mockTourService.getTourById(id);
        setState(prev => ({ 
          ...prev, 
          currentTour: tour, 
          loading: false 
        }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error.message, 
          loading: false 
        }));
      }
    },
    
    createTour: async (tourData) => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const newTour = await mockTourService.createTour(tourData);
        setState(prev => ({ 
          ...prev, 
          tours: [...prev.tours, newTour], 
          loading: false 
        }));
        return newTour;
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error.message, 
          loading: false 
        }));
        throw error;
      }
    }
  };
  
  return (
    <TourContext.Provider value={contextValue}>
      {children}
    </TourContext.Provider>
  );
};
```

Usage in component tests:

```jsx
// /src/tests/unit/components/TourDetail.test.jsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MockTourProvider } from '../../mocks/contexts/tour-context.mock';
import { toursMockData } from '../../mocks/data/tours.mock';
import TourDetail from '../../../components/tour-detail/TourDetail';

describe('TourDetail Component', () => {
  const mockTour = toursMockData[0];
  
  it('should render tour details', async () => {
    const mockTourService = {
      getTourById: jest.fn().mockResolvedValue(mockTour)
    };
    
    render(
      <MockTourProvider mockTourService={mockTourService}>
        <MemoryRouter initialEntries={[`/tours/${mockTour.id}`]}>
          <Routes>
            <Route path="/tours/:id" element={<TourDetail />} />
          </Routes>
        </MemoryRouter>
      </MockTourProvider>
    );
    
    // Check loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Check tour details are displayed
    expect(screen.getByText(mockTour.name)).toBeInTheDocument();
    expect(screen.getByText(mockTour.description)).toBeInTheDocument();
    expect(screen.getByText(`$${mockTour.price}`)).toBeInTheDocument();
    expect(screen.getByText(`${mockTour.duration} hours`)).toBeInTheDocument();
    
    // Verify getTourById was called with correct ID
    expect(mockTourService.getTourById).toHaveBeenCalledWith(mockTour.id);
  });
  
  it('should handle errors', async () => {
    const mockError = 'Failed to load tour details';
    
    const mockTourService = {
      getTourById: jest.fn().mockRejectedValue(new Error(mockError))
    };
    
    render(
      <MockTourProvider mockTourService={mockTourService}>
        <MemoryRouter initialEntries={[`/tours/${mockTour.id}`]}>
          <Routes>
            <Route path="/tours/:id" element={<TourDetail />} />
          </Routes>
        </MemoryRouter>
      </MockTourProvider>
    );
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(mockError)).toBeInTheDocument();
    });
  });
});
```

### Auth Provider Mock

```jsx
// /src/tests/mocks/contexts/auth-context.mock.jsx
import React from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import { authServiceMock } from '../services/auth-service.mock';

export const MockAuthProvider = ({ children, isAuthenticated = false, userData = null, mockAuthService = authServiceMock }) => {
  const [user, setUser] = React.useState(userData);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [isLoggedIn, setIsLoggedIn] = React.useState(isAuthenticated);
  
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await mockAuthService.login(email, password);
      setUser(result.user);
      setIsLoggedIn(true);
      setLoading(false);
      return result;
    } catch (error) {
      setError(error.message);
      setLoading(false);
      throw error;
    }
  };
  
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await mockAuthService.register(userData);
      setUser(result.user);
      setIsLoggedIn(true);
      setLoading(false);
      return result;
    } catch (error) {
      setError(error.message);
      setLoading(false);
      throw error;
    }
  };
  
  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isLoggedIn,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
```

## Related Documentation

- [Mock Strategies](/docs/project_lifecycle/all_tests/references/project.tests.mock-strategies.md)
- [API Mocking](/docs/project_lifecycle/all_tests/references/project.api-mocking.md)
- [Data Mocking](/docs/project_lifecycle/all_tests/references/project.data-mocking.md) 