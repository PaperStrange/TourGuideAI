import { syncService } from './SyncService';
import { localStorageService } from './LocalStorageService';

// Mock API client
const mockApiClient = {
  getRoutes: jest.fn(),
  updateRoute: jest.fn(),
  getTimelines: jest.fn(),
  updateTimeline: jest.fn(),
  getFavorites: jest.fn(),
  updateFavorites: jest.fn()
};

// Mock server data
const mockServerRoutes = [
  { id: 'route1', name: 'Updated Route' },
  { id: 'route2', name: 'New Route' }
];

const mockServerTimelines = {
  route1: { days: [{ day: 1, activities: [] }] },
  route2: { days: [{ day: 1, activities: [] }] }
};

const mockServerFavorites = ['route1', 'route2'];

describe('SyncService', () => {
  beforeEach(() => {
    // Clear localStorage and reset mocks
    localStorage.clear();
    jest.clearAllMocks();
    
    // Initialize sync service with mock API client
    syncService.initialize(mockApiClient);
    
    // Set up default mock responses
    mockApiClient.getRoutes.mockResolvedValue(mockServerRoutes);
    mockApiClient.getTimelines.mockResolvedValue(mockServerTimelines);
    mockApiClient.getFavorites.mockResolvedValue(mockServerFavorites);
    mockApiClient.updateRoute.mockResolvedValue({ success: true });
    mockApiClient.updateTimeline.mockResolvedValue({ success: true });
    mockApiClient.updateFavorites.mockResolvedValue({ success: true });
    
    // Mock implementation of setInterval for testing
    jest.spyOn(global, 'setInterval').mockImplementation((callback, delay) => {
      return 1; // Return a dummy interval ID
    });
    
    // Mock implementation of setTimeout for testing
    jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
      return 1; // Return a dummy timeout ID
    });
  });

  afterEach(() => {
    // Restore original timer functions
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with API client', () => {
      expect(syncService.apiClient).toBe(mockApiClient);
    });

    test('should start periodic sync', () => {
      syncService.startPeriodicSync();
      expect(global.setInterval).toHaveBeenCalled();
    });
  });

  describe('Queue Management', () => {
    test('should add items to sync queue', () => {
      syncService.queueForSync('route', 'route1');
      syncService.queueForSync('timeline', 'route1');
      expect(syncService.syncQueue.size).toBe(2);
      expect(syncService.syncQueue.has('route:route1')).toBe(true);
      expect(syncService.syncQueue.has('timeline:route1')).toBe(true);
    });
  });

  describe('Route Synchronization', () => {
    test('should sync routes from server', async () => {
      await syncService.syncRoutes(null);
      
      expect(mockApiClient.getRoutes).toHaveBeenCalledWith({ since: null });
      
      // Verify the routes were saved to local storage
      const route1 = localStorageService.getRoute('route1');
      const route2 = localStorageService.getRoute('route2');
      
      expect(route1).toEqual(expect.objectContaining({
        id: 'route1',
        name: 'Updated Route'
      }));
      
      expect(route2).toEqual(expect.objectContaining({
        id: 'route2',
        name: 'New Route'
      }));
    });

    test('should sync local routes to server', async () => {
      const localRoute = {
        id: 'route1',
        name: 'Local Route',
        lastUpdated: new Date().toISOString()
      };
      localStorageService.saveRoute(localRoute);
      
      await syncService.syncRoutes(null);
      
      expect(mockApiClient.updateRoute).toHaveBeenCalledWith('route1', expect.objectContaining({
        id: 'route1',
        name: 'Local Route'
      }));
    });
  });

  describe('Timeline Synchronization', () => {
    test('should sync timelines from server', async () => {
      await syncService.syncTimelines(null);
      
      expect(mockApiClient.getTimelines).toHaveBeenCalledWith({ since: null });
      
      // Verify the timelines were saved to local storage
      const timeline1 = localStorageService.getTimeline('route1');
      const timeline2 = localStorageService.getTimeline('route2');
      
      expect(timeline1).toEqual(expect.objectContaining({
        days: [{ day: 1, activities: [] }]
      }));
      
      expect(timeline2).toEqual(expect.objectContaining({
        days: [{ day: 1, activities: [] }]
      }));
    });

    test('should sync local timelines to server', async () => {
      const localTimeline = {
        days: [{ day: 1, activities: [{ name: 'Local Activity' }] }],
        lastUpdated: new Date().toISOString()
      };
      localStorageService.saveTimeline('route1', localTimeline);
      
      await syncService.syncTimelines(null);
      
      expect(mockApiClient.updateTimeline).toHaveBeenCalledWith('route1', expect.objectContaining({
        days: [{ day: 1, activities: [{ name: 'Local Activity' }] }]
      }));
    });
  });

  describe('Favorites Synchronization', () => {
    test('should sync favorites from server', async () => {
      await syncService.syncFavorites();
      
      expect(mockApiClient.getFavorites).toHaveBeenCalled();
      
      // Verify the favorites were saved to local storage
      const favorites = localStorageService.getFavorites();
      expect(favorites).toContain('route1');
      expect(favorites).toContain('route2');
    });

    test('should sync local favorites to server', async () => {
      localStorageService.addFavorite('route1');
      localStorageService.addFavorite('route3');
      
      await syncService.syncFavorites();
      
      expect(mockApiClient.updateFavorites).toHaveBeenCalledWith(
        expect.arrayContaining(['route1', 'route3'])
      );
    });
  });

  describe('Sync Queue Processing', () => {
    test('should process sync queue', async () => {
      const mockRoute = { id: 'route1', name: 'Test Route' };
      localStorageService.saveRoute(mockRoute);
      syncService.queueForSync('route', 'route1');
      
      await syncService.processSyncQueue();
      
      expect(mockApiClient.updateRoute).toHaveBeenCalledWith('route1', expect.objectContaining({
        id: 'route1',
        name: 'Test Route'
      }));
      expect(syncService.syncQueue.size).toBe(0);
    });

    test('should handle failed syncs', async () => {
      const mockError = new Error('Sync failed');
      mockApiClient.updateRoute.mockRejectedValueOnce(mockError);
      
      localStorageService.saveRoute({ id: 'route1', name: 'Test Route' });
      syncService.queueForSync('route', 'route1');
      
      await syncService.processSyncQueue();
      
      expect(syncService.syncQueue.size).toBe(1);
      expect(syncService.syncQueue.has('route:route1')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle sync errors and retry', async () => {
      const mockError = new Error('Sync failed');
      mockApiClient.getRoutes.mockRejectedValueOnce(mockError);
      
      await syncService.sync();
      
      expect(global.setTimeout).toHaveBeenCalled();
    });

    test('should force immediate sync', async () => {
      const mockRoute = { id: 'route1', name: 'Test Route' };
      localStorageService.saveRoute(mockRoute);
      syncService.queueForSync('route', 'route1');
      
      await syncService.forceSync();
      
      expect(syncService.syncQueue.size).toBe(0);
      expect(mockApiClient.updateRoute).toHaveBeenCalledWith('route1', expect.objectContaining({
        id: 'route1',
        name: 'Test Route'
      }));
    });
  });
}); 