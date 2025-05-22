import { cacheService } from './CacheService';

describe('CacheService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    cacheService.initialize();
  });

  describe('Initialization', () => {
    test('should initialize with correct cache version', () => {
      expect(localStorage.getItem('tourguide_cache_version')).toBe('1.0.0');
    });

    test('should clear cache when version changes', () => {
      localStorage.setItem('tourguide_cache_version', '0.9.0');
      cacheService.initialize();
      expect(localStorage.getItem('tourguide_cache_version')).toBe('1.0.0');
    });
  });

  describe('Route Caching', () => {
    const mockRoute = {
      id: 'route1',
      name: 'Test Route',
      destination: 'Test Destination'
    };

    test('should cache and retrieve route', () => {
      const success = cacheService.cacheRoute(mockRoute);
      expect(success).toBe(true);
      
      const cachedRoute = cacheService.getCachedRoute('route1');
      expect(cachedRoute).toEqual(mockRoute);
    });

    test('should return null for non-existent route', () => {
      expect(cacheService.getCachedRoute('non_existent')).toBeNull();
    });

    test('should handle expired cache', () => {
      cacheService.cacheRoute(mockRoute);
      
      // Simulate time passing
      jest.advanceTimersByTime(25 * 60 * 60 * 1000); // 25 hours
      
      expect(cacheService.getCachedRoute('route1')).toBeNull();
    });
  });

  describe('Timeline Caching', () => {
    const mockTimeline = {
      days: [
        { day: 1, activities: [] },
        { day: 2, activities: [] }
      ]
    };

    test('should cache and retrieve timeline', () => {
      const success = cacheService.cacheTimeline('route1', mockTimeline);
      expect(success).toBe(true);
      
      const cachedTimeline = cacheService.getCachedTimeline('route1');
      expect(cachedTimeline).toEqual(mockTimeline);
    });

    test('should return null for non-existent timeline', () => {
      expect(cacheService.getCachedTimeline('non_existent')).toBeNull();
    });

    test('should handle expired cache', () => {
      cacheService.cacheTimeline('route1', mockTimeline);
      
      // Simulate time passing
      jest.advanceTimersByTime(25 * 60 * 60 * 1000); // 25 hours
      
      expect(cacheService.getCachedTimeline('route1')).toBeNull();
    });
  });

  describe('Favorites Caching', () => {
    const mockFavorites = ['route1', 'route2'];

    test('should cache and retrieve favorites', () => {
      const success = cacheService.cacheFavorites(mockFavorites);
      expect(success).toBe(true);
      
      const cachedFavorites = cacheService.getCachedFavorites();
      expect(cachedFavorites).toEqual(mockFavorites);
    });

    test('should return null when no favorites cached', () => {
      expect(cacheService.getCachedFavorites()).toBeNull();
    });

    test('should handle expired cache', () => {
      cacheService.cacheFavorites(mockFavorites);
      
      // Simulate time passing
      jest.advanceTimersByTime(25 * 60 * 60 * 1000); // 25 hours
      
      expect(cacheService.getCachedFavorites()).toBeNull();
    });
  });

  describe('Settings Caching', () => {
    const mockSettings = {
      theme: 'dark',
      language: 'en'
    };

    test('should cache and retrieve settings', () => {
      const success = cacheService.cacheSettings(mockSettings);
      expect(success).toBe(true);
      
      const cachedSettings = cacheService.getCachedSettings();
      expect(cachedSettings).toEqual(mockSettings);
    });

    test('should return null when no settings cached', () => {
      expect(cacheService.getCachedSettings()).toBeNull();
    });

    test('should handle expired cache', () => {
      cacheService.cacheSettings(mockSettings);
      
      // Simulate time passing
      jest.advanceTimersByTime(25 * 60 * 60 * 1000); // 25 hours
      
      expect(cacheService.getCachedSettings()).toBeNull();
    });
  });

  describe('Cache Management', () => {
    test('should clear all cache', () => {
      cacheService.cacheRoute({ id: 'route1', name: 'Test' });
      cacheService.cacheTimeline('route1', { days: [] });
      cacheService.cacheFavorites(['route1']);
      cacheService.cacheSettings({ theme: 'dark' });
      
      cacheService.clearCache();
      
      expect(cacheService.getCachedRoute('route1')).toBeNull();
      expect(cacheService.getCachedTimeline('route1')).toBeNull();
      expect(cacheService.getCachedFavorites()).toBeNull();
      expect(cacheService.getCachedSettings()).toBeNull();
    });

    test('should calculate cache size', () => {
      cacheService.cacheRoute({ id: 'route1', name: 'Test' });
      const size = cacheService.getCacheSize();
      expect(size).toBeGreaterThan(0);
    });

    test('should check if cache is full', () => {
      // Fill localStorage with test data
      const largeData = 'x'.repeat(51 * 1024 * 1024); // 51MB
      localStorage.setItem('test_data', largeData);
      
      expect(cacheService.isCacheFull()).toBe(true);
      
      localStorage.removeItem('test_data');
      expect(cacheService.isCacheFull()).toBe(false);
    });

    test('should clear oldest cache entries when full', () => {
      // Fill localStorage with test data
      const largeData = 'x'.repeat(51 * 1024 * 1024); // 51MB
      localStorage.setItem('test_data', largeData);
      
      cacheService.clearOldestCache();
      
      // Verify that some cache entries were cleared
      const size = cacheService.getCacheSize();
      expect(size).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON in cache', () => {
      localStorage.setItem('tourguide_route_cache', 'invalid json');
      expect(cacheService.getCache('tourguide_route_cache')).toBeNull();
    });

    test('should handle storage quota exceeded', () => {
      // Mock localStorage.setItem to throw quota exceeded error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('Quota exceeded');
      });
      
      expect(cacheService.setCache('test_key', { data: 'test' })).toBe(false);
      
      localStorage.setItem = originalSetItem;
    });
  });
}); 