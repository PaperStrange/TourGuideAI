import { localStorageService } from './LocalStorageService';

describe('LocalStorageService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Basic Storage Operations', () => {
    test('should save and retrieve data', () => {
      const testData = { key: 'value' };
      const success = localStorageService.saveData('test_key', testData);
      expect(success).toBe(true);
      expect(localStorageService.getData('test_key')).toEqual(testData);
    });

    test('should handle invalid JSON data', () => {
      const invalidData = 'invalid json';
      localStorage.setItem('test_key', invalidData);
      expect(localStorageService.getData('test_key')).toBeNull();
    });

    test('should remove data', () => {
      localStorageService.saveData('test_key', { key: 'value' });
      const success = localStorageService.removeData('test_key');
      expect(success).toBe(true);
      expect(localStorageService.getData('test_key')).toBeNull();
    });
  });

  describe('Route Operations', () => {
    const mockRoute = {
      id: 'route1',
      name: 'Test Route',
      destination: 'Test Destination'
    };

    test('should save and retrieve a route', () => {
      const success = localStorageService.saveRoute(mockRoute);
      expect(success).toBe(true);
      const retrievedRoute = localStorageService.getRoute('route1');
      expect(retrievedRoute).toEqual({
        ...mockRoute,
        lastUpdated: expect.any(String)
      });
    });

    test('should get all routes', () => {
      localStorageService.saveRoute(mockRoute);
      const routes = localStorageService.getAllRoutes();
      expect(routes).toEqual({
        route1: {
          ...mockRoute,
          lastUpdated: expect.any(String)
        }
      });
    });

    test('should return null for non-existent route', () => {
      expect(localStorageService.getRoute('non_existent')).toBeNull();
    });
  });

  describe('Timeline Operations', () => {
    const mockTimeline = {
      days: [
        { day: 1, activities: [] },
        { day: 2, activities: [] }
      ]
    };

    test('should save and retrieve a timeline', () => {
      const success = localStorageService.saveTimeline('route1', mockTimeline);
      expect(success).toBe(true);
      const retrievedTimeline = localStorageService.getTimeline('route1');
      expect(retrievedTimeline).toEqual({
        ...mockTimeline,
        lastUpdated: expect.any(String)
      });
    });

    test('should return null for non-existent timeline', () => {
      expect(localStorageService.getTimeline('non_existent')).toBeNull();
    });
  });

  describe('Favorites Operations', () => {
    test('should add and remove favorites', () => {
      localStorageService.addFavorite('route1');
      expect(localStorageService.getFavorites()).toEqual(['route1']);
      
      localStorageService.addFavorite('route2');
      expect(localStorageService.getFavorites()).toEqual(['route1', 'route2']);
      
      localStorageService.removeFavorite('route1');
      expect(localStorageService.getFavorites()).toEqual(['route2']);
    });

    test('should not add duplicate favorites', () => {
      localStorageService.addFavorite('route1');
      localStorageService.addFavorite('route1');
      expect(localStorageService.getFavorites()).toEqual(['route1']);
    });
  });

  describe('Settings Operations', () => {
    const mockSettings = {
      theme: 'dark',
      language: 'en'
    };

    test('should save and retrieve settings', () => {
      const success = localStorageService.saveSettings(mockSettings);
      expect(success).toBe(true);
      expect(localStorageService.getSettings()).toEqual(mockSettings);
    });

    test('should return empty object when no settings exist', () => {
      expect(localStorageService.getSettings()).toEqual({});
    });
  });

  describe('Sync Operations', () => {
    test('should update and retrieve last sync timestamp', () => {
      localStorageService.updateLastSync();
      const lastSync = localStorageService.getLastSync();
      expect(lastSync).toBeTruthy();
      expect(new Date(lastSync)).toBeInstanceOf(Date);
    });

    test('should return null when no sync has occurred', () => {
      expect(localStorageService.getLastSync()).toBeNull();
    });
  });

  describe('Clear Operations', () => {
    test('should clear all data', () => {
      // Use service methods to save data that will be cleared
      localStorageService.saveRoute({ id: 'route1', name: 'Test' });
      localStorageService.addFavorite('route1');
      localStorageService.saveSettings({ theme: 'dark' });
      
      const success = localStorageService.clearAllData();
      expect(success).toBe(true);
      expect(localStorageService.getRoute('route1')).toBeNull();
      expect(localStorageService.getFavorites()).toEqual([]);
      expect(localStorageService.getSettings()).toEqual({});
    });
  });
}); 