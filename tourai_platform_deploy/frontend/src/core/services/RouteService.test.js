import { routeService } from './RouteService';
import { localStorageService } from './storage/LocalStorageService';

// Mock the localStorageService
jest.mock('./storage/LocalStorageService', () => ({
  localStorageService: {
    getAllRoutes: jest.fn()
  }
}));

describe('RouteService', () => {
  const mockRoutes = [
    {
      id: 'route1',
      name: 'Rome Adventure',
      created_date: '2023-01-01',
      upvotes: 50,
      views: 200,
      sites_included_in_routes: ['Colosseum', 'Vatican', 'Trevi Fountain'],
      route_duration: '3 days',
      estimated_cost: '500'
    },
    {
      id: 'route2',
      name: 'Paris Weekend',
      created_date: '2023-02-15',
      upvotes: 100,
      views: 150,
      sites_included_in_routes: ['Eiffel Tower', 'Louvre'],
      route_duration: '2 days',
      estimated_cost: '400'
    },
    {
      id: 'route3',
      name: 'Tokyo Explorer',
      created_date: '2022-12-10',
      upvotes: 75,
      views: 300,
      sites_included_in_routes: ['Tokyo Tower', 'Shibuya Crossing', 'Senso-ji Temple', 'Meiji Shrine'],
      route_duration: '4 days',
      estimated_cost: '800'
    }
  ];

  describe('rankRoutes', () => {
    test('should sort routes by upvotes in descending order by default', () => {
      const sortedRoutes = routeService.rankRoutes(mockRoutes);
      expect(sortedRoutes[0].id).toBe('route2');
      expect(sortedRoutes[1].id).toBe('route3');
      expect(sortedRoutes[2].id).toBe('route1');
    });

    test('should sort routes by upvotes in ascending order', () => {
      const sortedRoutes = routeService.rankRoutes(mockRoutes, 'upvotes', 'asc');
      expect(sortedRoutes[0].id).toBe('route1');
      expect(sortedRoutes[1].id).toBe('route3');
      expect(sortedRoutes[2].id).toBe('route2');
    });

    test('should sort routes by created_date', () => {
      const sortedRoutes = routeService.rankRoutes(mockRoutes, 'created_date', 'desc');
      expect(sortedRoutes[0].id).toBe('route2');
      expect(sortedRoutes[1].id).toBe('route1');
      expect(sortedRoutes[2].id).toBe('route3');
    });

    test('should sort routes by views', () => {
      const sortedRoutes = routeService.rankRoutes(mockRoutes, 'views', 'desc');
      expect(sortedRoutes[0].id).toBe('route3');
      expect(sortedRoutes[1].id).toBe('route1');
      expect(sortedRoutes[2].id).toBe('route2');
    });

    test('should handle missing fields gracefully', () => {
      const routesWithMissingFields = [
        { id: 'route1', upvotes: 50 },
        { id: 'route2' }, // No upvotes field
        { id: 'route3', upvotes: 75 }
      ];
      
      const sortedRoutes = routeService.rankRoutes(routesWithMissingFields);
      expect(sortedRoutes[0].id).toBe('route3');
      expect(sortedRoutes[1].id).toBe('route1');
      expect(sortedRoutes[2].id).toBe('route2');
    });
  });

  describe('getRankedRoutes', () => {
    beforeEach(() => {
      localStorageService.getAllRoutes.mockReturnValue(mockRoutes);
    });

    test('should get routes from localStorage and rank them', () => {
      const rankedRoutes = routeService.getRankedRoutes();
      expect(localStorageService.getAllRoutes).toHaveBeenCalled();
      expect(rankedRoutes.length).toBe(3);
      expect(rankedRoutes[0].id).toBe('route2');
    });

    test('should handle empty routes array', () => {
      localStorageService.getAllRoutes.mockReturnValue([]);
      const rankedRoutes = routeService.getRankedRoutes();
      expect(rankedRoutes).toEqual([]);
    });

    test('should handle null routes', () => {
      localStorageService.getAllRoutes.mockReturnValue(null);
      const rankedRoutes = routeService.getRankedRoutes();
      expect(rankedRoutes).toEqual([]);
    });
  });

  describe('calculateRouteStatistics', () => {
    test('should calculate correct statistics for a route', () => {
      const stats = routeService.calculateRouteStatistics(mockRoutes[0]);
      expect(stats.total_sites).toBe(3);
      expect(stats.duration_days).toBe(3);
      expect(stats.estimated_cost).toBe(360); // (3 * 100) + (3 * 20)
    });

    test('should handle route with no sites', () => {
      const route = {
        id: 'route4',
        name: 'Empty Route',
        route_duration: '2 days'
      };
      
      const stats = routeService.calculateRouteStatistics(route);
      expect(stats.total_sites).toBe(0);
      expect(stats.duration_days).toBe(2);
      expect(stats.estimated_cost).toBe(200); // (2 * 100) + (0 * 20)
    });

    test('should handle route with no duration', () => {
      const route = {
        id: 'route4',
        name: 'No Duration Route',
        sites_included_in_routes: ['Site 1', 'Site 2']
      };
      
      const stats = routeService.calculateRouteStatistics(route);
      expect(stats.total_sites).toBe(2);
      expect(stats.duration_days).toBe(0);
      expect(stats.estimated_cost).toBe(40); // (0 * 100) + (2 * 20)
    });

    test('should handle completely empty route', () => {
      const stats = routeService.calculateRouteStatistics({});
      expect(stats.total_sites).toBe(0);
      expect(stats.duration_days).toBe(0);
      expect(stats.estimated_cost).toBe(0);
    });
  });
}); 