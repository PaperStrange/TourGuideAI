import { cacheService } from './CacheService';

describe('CacheService', () => {
  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear();
    await cacheService.initialize();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const result = await cacheService.initialize();
      expect(result).toBe(true);
    });

    test('should initialize with custom config', async () => {
      const customConfig = { defaultTTL: 3600 };
      const result = await cacheService.initialize(customConfig);
      expect(result).toBe(true);
      expect(cacheService.config.defaultTTL).toBe(3600);
    });
  });

  describe('Basic Cache Operations', () => {
    const mockData = {
      id: 'item1',
      name: 'Test Item',
      data: 'Test Data'
    };

    test('should cache and retrieve item', async () => {
      const success = await cacheService.setItem('test:item1', mockData);
      expect(success).toBe(true);
      
      const cachedItem = await cacheService.getItem('test:item1');
      expect(cachedItem).toEqual(mockData);
    });

    test('should return null for non-existent item', async () => {
      const result = await cacheService.getItem('test:non_existent');
      expect(result).toBeNull();
    });

    test('should remove item', async () => {
      await cacheService.setItem('test:item1', mockData);
      const success = await cacheService.removeItem('test:item1');
      expect(success).toBe(true);
      
      const result = await cacheService.getItem('test:item1');
      expect(result).toBeNull();
    });
  });

  describe('Cache Management', () => {
    test('should clear all cache', async () => {
      await cacheService.setItem('test:item1', { data: 'test1' });
      await cacheService.setItem('test:item2', { data: 'test2' });
      
      const success = await cacheService.clearCache();
      expect(success).toBe(true);
      
      const item1 = await cacheService.getItem('test:item1');
      const item2 = await cacheService.getItem('test:item2');
      expect(item1).toBeNull();
      expect(item2).toBeNull();
    });

    test('should get cache statistics', () => {
      const stats = cacheService.getCacheStats();
      expect(stats).toHaveProperty('totalItems');
      expect(stats).toHaveProperty('expiredItems');
      expect(stats).toHaveProperty('activeItems');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('usagePercentage');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid data gracefully', async () => {
      // Try to cache undefined
      const success = await cacheService.setItem('test:invalid', undefined);
      expect(success).toBe(true); // Should handle undefined gracefully
    });
  });
}); 