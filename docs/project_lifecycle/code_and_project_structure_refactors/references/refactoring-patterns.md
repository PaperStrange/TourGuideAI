# Refactoring Patterns for Improved Testability

This document outlines common refactoring patterns that can be applied to improve the testability of code. Each pattern includes example code transformations and the specific test improvements that can be expected.

## Table of Contents

1. [Dependency Injection](#dependency-injection)
2. [Pure Functions](#pure-functions)
3. [Component Decomposition](#component-decomposition)
4. [Factory Functions](#factory-functions)
5. [Service Extraction](#service-extraction)
6. [State Isolation](#state-isolation)
7. [Async Handling Improvements](#async-handling-improvements)
8. [Test-Specific Extension Points](#test-specific-extension-points)
9. [Facade Pattern](#facade-pattern)
10. [Command-Query Separation](#command-query-separation)

## Dependency Injection

### Problem

Components with hard-coded dependencies are difficult to test because you cannot substitute real implementations with test doubles.

### Solution

Explicitly pass dependencies as parameters or configuration, allowing them to be replaced during tests.

### Example

**Before:**

```javascript
class UserService {
  constructor() {
    this.httpClient = new HttpClient();
    this.logger = new Logger();
  }
  
  async getUser(id) {
    this.logger.log(`Fetching user ${id}`);
    return await this.httpClient.get(`/users/${id}`);
  }
}
```

**After:**

```javascript
class UserService {
  constructor(dependencies = {}) {
    this.httpClient = dependencies.httpClient || new HttpClient();
    this.logger = dependencies.logger || new Logger();
  }
  
  async getUser(id) {
    this.logger.log(`Fetching user ${id}`);
    return await this.httpClient.get(`/users/${id}`);
  }
}
```

### Test Improvements

- **Before:** Complex mocking using jest.spyOn() or manual module mocking
- **After:** Simple dependency injection in test setup

```javascript
// Easy to test with mocks
const mockHttpClient = { get: jest.fn() };
const mockLogger = { log: jest.fn() };
const userService = new UserService({ 
  httpClient: mockHttpClient,
  logger: mockLogger
});

test('getUser calls the correct endpoint', async () => {
  mockHttpClient.get.mockResolvedValue({ id: '123', name: 'Test User' });
  const result = await userService.getUser('123');
  expect(mockHttpClient.get).toHaveBeenCalledWith('/users/123');
  expect(result).toEqual({ id: '123', name: 'Test User' });
});
```

## Pure Functions

### Problem

Functions with side effects or that depend on global state are difficult to test in isolation.

### Solution

Refactor to use pure functions that depend only on their inputs and produce outputs without side effects.

### Example

**Before:**

```javascript
// Global state
let currentUser = null;

// Function with side effects
function formatUserDisplay() {
  if (!currentUser) return 'Not logged in';
  return `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})`;
}
```

**After:**

```javascript
// Pure function
function formatUserDisplay(user) {
  if (!user) return 'Not logged in';
  return `${user.firstName} ${user.lastName} (${user.role})`;
}
```

### Test Improvements

- **Before:** Tests needed to set up and clean up global state
- **After:** Simple input/output testing

```javascript
test('formatUserDisplay shows proper format for user', () => {
  const user = { firstName: 'John', lastName: 'Doe', role: 'Admin' };
  expect(formatUserDisplay(user)).toBe('John Doe (Admin)');
});

test('formatUserDisplay shows not logged in message', () => {
  expect(formatUserDisplay(null)).toBe('Not logged in');
});
```

## Component Decomposition

### Problem

Large components with multiple responsibilities are hard to test because they require complex setup and have too many test cases.

### Solution

Break down large components into smaller, focused components that each handle a single responsibility.

### Example

**Before:**

```jsx
function UserDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activities, setActivities] = useState([]);
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const userData = await fetchUser();
        setUser(userData);
        const activitiesData = await fetchActivities(userData.id);
        setActivities(activitiesData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);
  
  // Render complex UI with user profile, activities, stats
  // ...
}
```

**After:**

```jsx
function UserDashboard() {
  // Just composition of smaller components
  return (
    <div>
      <UserProfile />
      <UserActivities />
      <UserStats />
    </div>
  );
}

function UserProfile() {
  const { user, loading, error } = useUserData();
  // Render just the profile part
}

function UserActivities() {
  const { activities, loading, error } = useUserActivities();
  // Render just the activities part
}

// Custom hooks extract data fetching logic
function useUserData() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Fetch user logic
  }, []);
  
  return { user, loading, error };
}
```

### Test Improvements

- **Before:** Complex test setup for the entire dashboard
- **After:** Focused tests for each component and custom hook

```javascript
// Test just the profile component
test('UserProfile displays user information when loaded', () => {
  // Mock the custom hook
  jest.spyOn(hooks, 'useUserData').mockReturnValue({
    user: { name: 'Test User', email: 'test@example.com' },
    loading: false,
    error: null
  });
  
  render(<UserProfile />);
  expect(screen.getByText('Test User')).toBeInTheDocument();
  expect(screen.getByText('test@example.com')).toBeInTheDocument();
});
```

## Factory Functions

### Problem

Classes with complex inheritance or that use the singleton pattern create testing challenges.

### Solution

Use factory functions to create objects with clear interfaces and controlled dependencies.

### Example

**Before:**

```javascript
// Singleton pattern
class AuthService {
  static instance;
  
  constructor() {
    if (AuthService.instance) return AuthService.instance;
    AuthService.instance = this;
    this.initialized = false;
  }
  
  init() {
    this.initialized = true;
    this.tokenStorage = localStorage;
  }
  
  login(credentials) {
    // Implementation
  }
}
```

**After:**

```javascript
// Factory function
function createAuthService(dependencies = {}) {
  const {
    tokenStorage = localStorage,
    apiClient = defaultApiClient,
    // Other dependencies
  } = dependencies;
  
  return {
    login(credentials) {
      // Implementation using injected dependencies
    }
    // Other methods
  };
}
```

### Test Improvements

- **Before:** Tests interfere with each other through shared singleton
- **After:** Each test can create a fresh instance with controlled dependencies

```javascript
test('login stores token on successful authentication', async () => {
  const mockTokenStorage = {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn()
  };
  
  const mockApiClient = {
    post: jest.fn().mockResolvedValue({ token: 'test-token' })
  };
  
  const authService = createAuthService({
    tokenStorage: mockTokenStorage,
    apiClient: mockApiClient
  });
  
  await authService.login({ username: 'test', password: 'password' });
  
  expect(mockApiClient.post).toHaveBeenCalledWith(
    '/auth/login', 
    { username: 'test', password: 'password' }
  );
  expect(mockTokenStorage.setItem).toHaveBeenCalledWith(
    'auth_token', 
    'test-token'
  );
});
```

## Service Extraction

### Problem

Business logic embedded in UI components creates testing complexity.

### Solution

Extract business logic into separate service modules that can be tested in isolation.

### Example

**Before:**

```jsx
function PaymentForm() {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation logic
    if (cardNumber.length !== 16) {
      setError('Card number must be 16 digits');
      return;
    }
    
    // More validation logic...
    
    // Process payment
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ cardNumber, expiryDate, cvv }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Payment failed');
      
      // Handle success
    } catch (err) {
      setError(err.message);
    }
  };
  
  // Render form...
}
```

**After:**

```jsx
// Extracted service
export const paymentService = {
  validateCardDetails(details) {
    const { cardNumber, expiryDate, cvv } = details;
    
    if (cardNumber.length !== 16) {
      return { valid: false, error: 'Card number must be 16 digits' };
    }
    
    // More validation logic...
    
    return { valid: true };
  },
  
  async processPayment(details) {
    const response = await fetch('/api/payments', {
      method: 'POST',
      body: JSON.stringify(details),
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Payment failed');
    return await response.json();
  }
};

// Simplified component
function PaymentForm() {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const details = { cardNumber, expiryDate, cvv };
    const validationResult = paymentService.validateCardDetails(details);
    
    if (!validationResult.valid) {
      setError(validationResult.error);
      return;
    }
    
    try {
      await paymentService.processPayment(details);
      // Handle success
    } catch (err) {
      setError(err.message);
    }
  };
  
  // Render form...
}
```

### Test Improvements

- **Before:** Testing required rendering the component and simulating user interactions
- **After:** Business logic can be tested separately from UI

```javascript
// Service tests
test('validateCardDetails returns error for invalid card number', () => {
  const result = paymentService.validateCardDetails({
    cardNumber: '123', // Too short
    expiryDate: '12/25',
    cvv: '123'
  });
  
  expect(result.valid).toBe(false);
  expect(result.error).toBe('Card number must be 16 digits');
});

// Component tests are simpler
test('PaymentForm displays validation error', async () => {
  // Mock the service
  jest.spyOn(paymentService, 'validateCardDetails').mockReturnValue({
    valid: false,
    error: 'Test validation error'
  });
  
  render(<PaymentForm />);
  
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(screen.getByText('Test validation error')).toBeInTheDocument();
});
```

## State Isolation

### Problem

Shared state between components or tests causes unpredictable behavior.

### Solution

Isolate state management to prevent leakage between tests.

### Example

**Before:**

```javascript
// Global store
const store = {
  user: null,
  isAuthenticated: false,
  
  setUser(user) {
    this.user = user;
    this.isAuthenticated = !!user;
  },
  
  clearUser() {
    this.user = null;
    this.isAuthenticated = false;
  }
};

// Components use the global store
function UserProfile() {
  const { user } = store;
  // Render based on user...
}
```

**After:**

```javascript
// Context-based state management
const UserContext = React.createContext();

function UserProvider({ children, initialState = {} }) {
  const [user, setUser] = useState(initialState.user || null);
  const isAuthenticated = !!user;
  
  const contextValue = {
    user,
    isAuthenticated,
    setUser,
    clearUser: () => setUser(null)
  };
  
  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

// Components use the context
function UserProfile() {
  const { user } = useContext(UserContext);
  // Render based on user...
}
```

### Test Improvements

- **Before:** Tests had to reset global state manually 
- **After:** Each test can set up its own isolated state

```javascript
test('UserProfile displays user details', () => {
  render(
    <UserProvider initialState={{ user: { name: 'Test User' } }}>
      <UserProfile />
    </UserProvider>
  );
  
  expect(screen.getByText('Test User')).toBeInTheDocument();
});

test('UserProfile shows login prompt when no user', () => {
  render(
    <UserProvider initialState={{ user: null }}>
      <UserProfile />
    </UserProvider>
  );
  
  expect(screen.getByText('Please log in')).toBeInTheDocument();
});
```

## Async Handling Improvements

### Problem

Poor async code handling leads to flaky tests and race conditions.

### Solution

Improve async code with proper awaiting, error handling, and loading states.

### Example

**Before:**

```javascript
function DataList() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // No proper error handling or loading state
    fetch('/api/data')
      .then(res => res.json())
      .then(json => setData(json));
  }, []);
  
  return (
    <ul>
      {data.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

**After:**

```javascript
function DataList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    let isMounted = true;
    
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch('/api/data');
        
        if (!response.ok) throw new Error('Failed to fetch data');
        
        const json = await response.json();
        if (isMounted) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <ul>
      {data.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### Test Improvements

- **Before:** Tests were flaky and had race conditions
- **After:** Tests can reliably check loading, error, and success states

```javascript
test('DataList shows loading state initially', () => {
  // Mock fetch to never resolve during this test
  jest.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));
  
  render(<DataList />);
  
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});

test('DataList shows error when fetch fails', async () => {
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('API error'));
  
  render(<DataList />);
  
  // Wait for the error state
  expect(await screen.findByText('Error: API error')).toBeInTheDocument();
});

test('DataList displays items when fetch succeeds', async () => {
  const mockData = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
  ];
  
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => mockData
  });
  
  render(<DataList />);
  
  // Check that both items are rendered
  expect(await screen.findByText('Item 1')).toBeInTheDocument();
  expect(screen.getByText('Item 2')).toBeInTheDocument();
});
```

## Test-Specific Extension Points

### Problem

Code that's difficult to put into test states or observe internal behavior.

### Solution

Add test-specific extension points that are only used during testing.

### Example

**Before:**

```javascript
class DataProcessor {
  process(data) {
    // Complex multi-step processing
    const step1Result = this.preprocessData(data);
    const step2Result = this.transformData(step1Result);
    const step3Result = this.validateData(step2Result);
    return this.formatOutput(step3Result);
  }
  
  preprocessData(data) {
    // Complex logic
  }
  
  transformData(data) {
    // Complex logic
  }
  
  validateData(data) {
    // Complex logic
  }
  
  formatOutput(data) {
    // Complex logic
  }
}
```

**After:**

```javascript
class DataProcessor {
  constructor(options = {}) {
    this.options = options;
  }
  
  process(data) {
    // Allow injection of intermediate results for testing
    let currentStep = 'preprocess';
    let step1Result = this.options.testOverrides?.step1Result || this.preprocessData(data);
    
    currentStep = 'transform';
    let step2Result = this.options.testOverrides?.step2Result || this.transformData(step1Result);
    
    currentStep = 'validate';
    let step3Result = this.options.testOverrides?.step3Result || this.validateData(step2Result);
    
    currentStep = 'format';
    let result = this.formatOutput(step3Result);
    
    // Capture intermediate results for test observation if requested
    if (this.options.captureIntermediateResults) {
      this.intermediateResults = {
        step1Result,
        step2Result,
        step3Result
      };
    }
    
    return result;
  }
  
  // Implementation of steps...
}
```

### Test Improvements

- **Before:** Could only test the entire process end-to-end
- **After:** Can test each step independently and observe intermediate results

```javascript
test('preprocessData handles invalid input', () => {
  const processor = new DataProcessor();
  expect(() => processor.preprocessData(null)).toThrow('Invalid input');
});

test('process can continue from step 2 with test data', () => {
  const testStep1Result = { foo: 'bar' };
  
  const processor = new DataProcessor({
    testOverrides: {
      step1Result: testStep1Result
    }
  });
  
  const result = processor.process({});
  // Test result without relying on preprocessData
});

test('intermediate processing steps are correct', () => {
  const processor = new DataProcessor({
    captureIntermediateResults: true
  });
  
  processor.process({ /* test data */ });
  
  // Now we can assert on the intermediate steps
  expect(processor.intermediateResults.step1Result).toEqual(/* expected */);
  expect(processor.intermediateResults.step2Result).toEqual(/* expected */);
});
```

## Facade Pattern

### Problem

Direct usage of complex external libraries makes testing difficult.

### Solution

Create a facade that simplifies the interface to external libraries and makes them easier to mock.

### Example

**Before:**

```javascript
import * as awsSdk from 'aws-sdk';

function uploadFile(file, bucket) {
  const s3 = new awsSdk.S3();
  return s3.upload({
    Bucket: bucket,
    Key: file.name,
    Body: file,
    ContentType: file.type
  }).promise();
}
```

**After:**

```javascript
// s3-service.js
export class S3Service {
  constructor(s3Client) {
    this.s3Client = s3Client || new awsSdk.S3();
  }
  
  uploadFile(file, bucket) {
    return this.s3Client.upload({
      Bucket: bucket,
      Key: file.name,
      Body: file,
      ContentType: file.type
    }).promise();
  }
}

// In component
import { S3Service } from './s3-service';

const s3Service = new S3Service();

function uploadFile(file, bucket) {
  return s3Service.uploadFile(file, bucket);
}
```

### Test Improvements

- **Before:** Required complex mocking of AWS SDK
- **After:** Can easily provide a mock S3 client

```javascript
test('uploadFile calls S3 with correct parameters', async () => {
  const mockUpload = jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({ Location: 'https://example.com/file.txt' })
  });
  
  const mockS3Client = {
    upload: mockUpload
  };
  
  const s3Service = new S3Service(mockS3Client);
  const file = { name: 'file.txt', type: 'text/plain' };
  
  await s3Service.uploadFile(file, 'test-bucket');
  
  expect(mockUpload).toHaveBeenCalledWith({
    Bucket: 'test-bucket',
    Key: 'file.txt',
    Body: file,
    ContentType: 'text/plain'
  });
});
```

## Command-Query Separation

### Problem

Methods that both change state and return values are difficult to test.

### Solution

Separate commands (methods that change state) from queries (methods that return values).

### Example

**Before:**

```javascript
class ShoppingCart {
  constructor() {
    this.items = [];
  }
  
  addItem(item) {
    this.items.push(item);
    return this.calculateTotal(); // Changes state and returns a value
  }
  
  removeItem(itemId) {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index !== -1) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }
  
  calculateTotal() {
    return this.items.reduce((total, item) => total + item.price, 0);
  }
}
```

**After:**

```javascript
class ShoppingCart {
  constructor() {
    this.items = [];
  }
  
  // Command - changes state, returns void
  addItem(item) {
    this.items.push(item);
  }
  
  // Command - changes state, returns void
  removeItem(itemId) {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
  }
  
  // Query - returns whether an item exists
  hasItem(itemId) {
    return this.items.some(item => item.id === itemId);
  }
  
  // Query - returns data without changing state
  calculateTotal() {
    return this.items.reduce((total, item) => total + item.price, 0);
  }
  
  // Query - returns data without changing state
  getItems() {
    return [...this.items]; // Return a copy to prevent external modification
  }
}
```

### Test Improvements

- **Before:** Difficult to test state changes separately from calculations
- **After:** Can test commands and queries independently

```javascript
test('addItem adds the item to the cart', () => {
  const cart = new ShoppingCart();
  const item = { id: '1', name: 'Product', price: 10 };
  
  cart.addItem(item);
  
  expect(cart.getItems()).toContainEqual(item);
});

test('calculateTotal returns sum of all item prices', () => {
  const cart = new ShoppingCart();
  cart.addItem({ id: '1', price: 10 });
  cart.addItem({ id: '2', price: 15 });
  
  expect(cart.calculateTotal()).toBe(25);
});

test('removeItem removes an item from the cart', () => {
  const cart = new ShoppingCart();
  const item = { id: '1', name: 'Product', price: 10 };
  cart.addItem(item);
  
  cart.removeItem('1');
  
  expect(cart.hasItem('1')).toBe(false);
  expect(cart.getItems()).toHaveLength(0);
});
```

## References

- [Refactoring: Improving the Design of Existing Code](https://martinfowler.com/books/refactoring.html) by Martin Fowler
- [Working Effectively with Legacy Code](https://www.goodreads.com/book/show/44919.Working_Effectively_with_Legacy_Code) by Michael Feathers
- [Test-Driven Development: By Example](https://www.goodreads.com/book/show/387190.Test_Driven_Development) by Kent Beck
- [Clean Code](https://www.goodreads.com/book/show/3735293-clean-code) by Robert C. Martin 