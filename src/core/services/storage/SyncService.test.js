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

describe('SyncService', () => {
  beforeEach(() => {
    // Clear localStorage and reset mocks
    localStorage.clear();
    jest.clearAllMocks();
    
    // Initialize sync service with mock API client
    syncService.initialize(mockApiClient);
  });

  describe('Initialization', () => {
    test('should initialize with API client', () => {
      expect(syncService.apiClient).toBe(mockApiClient);
    });

    test('should start periodic sync', () => {
      jest.useFakeTimers();
      syncService.startPeriodicSync();
      expect(setInterval).toHaveBeenCalled();
      jest.useRealTimers();
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
    const mockServerRoutes = [
      { id: 'route1', name: 'Updated Route' },
      { id: 'route2', name: 'New Route' }
    ];

    test('should sync routes from server', async () => {
      mockApiClient.getRoutes.mockResolvedValue(mockServerRoutes);
      
      await syncService.syncRoutes(null);
      
      expect(mockApiClient.getRoutes).toHaveBeenCalledWith({ since: null });
      expect(localStorageService.getRoute('route1')).toEqual({
        ...mockServerRoutes[0],
        lastUpdated: expect.any(String)
      });
      expect(localStorageService.getRoute('route2')).toEqual({
        ...mockServerRoutes[1],
        lastUpdated: expect.any(String)
      });
    });

    test('should sync local routes to server', async () => {
      const localRoute = {
        id: 'route1',
        name: 'Local Route',
        lastUpdated: new Date().toISOString()
      };
      localStorageService.saveRoute(localRoute);
      
      await syncService.syncRoutes(null);
      
      expect(mockApiClient.updateRoute).toHaveBeenCalledWith('route1', localRoute);
    });
  });

  describe('Timeline Synchronization', () => {
    const mockServerTimelines = {
      route1: { days: [{ day: 1, activities: [] }] },
      route2: { days: [{ day: 1, activities: [] }] }
    };

    test('should sync timelines from server', async () => {
      mockApiClient.getTimelines.mockResolvedValue(mockServerTimelines);
      
      await syncService.syncTimelines(null);
      
      expect(mockApiClient.getTimelines).toHaveBeenCalledWith({ since: null });
      expect(localStorageService.getTimeline('route1')).toEqual({
        ...mockServerTimelines.route1,
        lastUpdated: expect.any(String)
      });
      expect(localStorageService.getTimeline('route2')).toEqual({
        ...mockServerTimelines.route2,
        lastUpdated: expect.any(String)
      });
    });

    test('should sync local timelines to server', async () => {
      const localTimeline = {
        days: [{ day: 1, activities: [] }],
        lastUpdated: new Date().toISOString()
      };
      localStorageService.saveTimeline('route1', localTimeline);
      
      await syncService.syncTimelines(null);
      
      expect(mockApiClient.updateTimeline).toHaveBeenCalledWith('route1', localTimeline);
    });
  });

  describe('Favorites Synchronization', () => {
    const mockServerFavorites = ['route1', 'route2'];

    test('should sync favorites from server', async () => {
      mockApiClient.getFavorites.mockResolvedValue(mockServerFavorites);
      
      await syncService.syncFavorites();
      
      expect(mockApiClient.getFavorites).toHaveBeenCalled();
      expect(localStorageService.getFavorites()).toEqual(mockServerFavorites);
    });

    test('should sync local favorites to server', async () => {
      localStorageService.addFavorite('route1');
      localStorageService.addFavorite('route2');
      
      await syncService.syncFavorites();
      
      expect(mockApiClient.updateFavorites).toHaveBeenCalledWith(['route1', 'route2']);
    });
  });

  describe('Sync Queue Processing', () => {
    test('should process sync queue', async () => {
      const mockRoute = { id: 'route1', name: 'Test Route' };
      localStorageService.saveRoute(mockRoute);
      syncService.queueForSync('route', 'route1');
      
      await syncService.processSyncQueue();
      
      expect(mockApiClient.updateRoute).toHaveBeenCalledWith('route1', mockRoute);
      expect(syncService.syncQueue.size).toBe(0);
    });

    test('should handle failed syncs', async () => {
      const mockError = new Error('Sync failed');
      mockApiClient.updateRoute.mockRejectedValue(mockError);
      
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
      mockApiClient.getRoutes.mockRejectedValue(mockError);
      
      jest.useFakeTimers();
      await syncService.sync();
      
      expect(setTimeout).toHaveBeenCalled();
      jest.useRealTimers();
    });

    test('should force immediate sync', async () => {
      const mockRoute = { id: 'route1', name: 'Test Route' };
      localStorageService.saveRoute(mockRoute);
      syncService.queueForSync('route', 'route1');
      
      await syncService.forceSync();
      
      expect(syncService.syncQueue.size).toBe(0);
      expect(mockApiClient.updateRoute).toHaveBeenCalledWith('route1', mockRoute);
    });
  });
}); 