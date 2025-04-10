const { describe, test, expect, beforeEach } = require('@jest/globals');
const { routeManagementService } = require('../services/routeManagementService');
const { RouteModel } = require('../models/RouteModel');
const userService = require('../services/userService');

// Mock dependencies
jest.mock('../models/RouteModel', () => ({
  RouteModel: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    create: jest.fn(),
    find: jest.fn()
  }
}));

jest.mock('../services/userService', () => ({
  getUserRoutes: jest.fn(),
  addRouteToUser: jest.fn(),
  removeRouteFromUser: jest.fn(),
  getUser: jest.fn()
}));

describe('Route Management Service', () => {
  // Sample test data
  const mockUserId = 'user123';
  const mockRouteId = 'route123';
  
  const mockRoute = {
    _id: mockRouteId,
    route_name: 'Tokyo Adventure',
    destination: 'Tokyo, Japan',
    duration: '5',
    start_date: '2023-10-15',
    end_date: '2023-10-20',
    overview: 'Exploring Tokyo\'s modern and traditional sides',
    user_id: mockUserId,
    is_favorite: false,
    last_modified: new Date(),
    created_at: new Date(),
    daily_itinerary: [
      {
        day_title: 'Tokyo Highlights',
        description: 'Visiting the most famous spots',
        day_number: 1,
        activities: [
          { name: 'Shibuya Crossing', description: 'Famous intersection', time: '10:00 AM' }
        ]
      }
    ]
  };
  
  const mockRoutes = [
    mockRoute,
    {
      _id: 'route456',
      route_name: 'Kyoto Temples',
      destination: 'Kyoto, Japan',
      duration: '3',
      user_id: mockUserId,
      is_favorite: true
    }
  ];
  
  const mockUser = {
    _id: mockUserId,
    email: 'test@example.com',
    routes: [mockRouteId, 'route456'],
    favorite_routes: ['route456']
  };
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set default mock implementations
    RouteModel.findById.mockResolvedValue(mockRoute);
    RouteModel.findByIdAndUpdate.mockResolvedValue(mockRoute);
    RouteModel.findByIdAndDelete.mockResolvedValue({ acknowledged: true });
    RouteModel.create.mockResolvedValue(mockRoute);
    RouteModel.find.mockResolvedValue(mockRoutes);
    
    userService.getUserRoutes.mockResolvedValue(mockRoutes);
    userService.getUser.mockResolvedValue(mockUser);
    userService.addRouteToUser.mockResolvedValue({ success: true });
    userService.removeRouteFromUser.mockResolvedValue({ success: true });
  });
  
  test('getRouteById should return route by ID', async () => {
    const result = await routeManagementService.getRouteById(mockRouteId);
    
    expect(RouteModel.findById).toHaveBeenCalledWith(mockRouteId);
    expect(result).toEqual(mockRoute);
  });
  
  test('getRouteById should throw error for non-existent route', async () => {
    // Mock no route found
    RouteModel.findById.mockResolvedValueOnce(null);
    
    await expect(routeManagementService.getRouteById(mockRouteId)).rejects.toThrow(
      'Route not found'
    );
  });
  
  test('getUserRoutes should retrieve all routes for a user', async () => {
    const result = await routeManagementService.getUserRoutes(mockUserId);
    
    expect(userService.getUserRoutes).toHaveBeenCalledWith(mockUserId);
    expect(result).toEqual(mockRoutes);
    expect(result).toHaveLength(2);
  });
  
  test('getFavoriteRoutes should filter favorite routes', async () => {
    const result = await routeManagementService.getFavoriteRoutes(mockUserId);
    
    expect(userService.getUserRoutes).toHaveBeenCalledWith(mockUserId);
    expect(result).toHaveLength(1);
    expect(result[0].is_favorite).toBe(true);
    expect(result[0].route_name).toBe('Kyoto Temples');
  });
  
  test('createRoute should create a new route', async () => {
    const newRouteData = {
      route_name: 'New Adventure',
      destination: 'Seoul, South Korea',
      duration: '4',
      overview: 'Exploring Seoul'
    };
    
    await routeManagementService.createRoute(mockUserId, newRouteData);
    
    expect(RouteModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUserId,
        ...newRouteData
      })
    );
    expect(userService.addRouteToUser).toHaveBeenCalledWith(mockUserId, mockRouteId);
  });
  
  test('updateRoute should update an existing route', async () => {
    const updateData = {
      route_name: 'Updated Tokyo Adventure',
      overview: 'New overview of Tokyo'
    };
    
    await routeManagementService.updateRoute(mockRouteId, updateData);
    
    expect(RouteModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockRouteId,
      expect.objectContaining({
        ...updateData,
        last_modified: expect.any(Date)
      }),
      { new: true }
    );
  });
  
  test('updateRoute should validate user ownership', async () => {
    // Mock a route with different user ID
    RouteModel.findById.mockResolvedValueOnce({
      ...mockRoute,
      user_id: 'different_user'
    });
    
    await expect(routeManagementService.updateRoute(mockRouteId, { route_name: 'New Name' }, mockUserId)).rejects.toThrow(
      'User does not have permission to update this route'
    );
  });
  
  test('deleteRoute should remove a route', async () => {
    await routeManagementService.deleteRoute(mockRouteId, mockUserId);
    
    expect(RouteModel.findById).toHaveBeenCalledWith(mockRouteId);
    expect(RouteModel.findByIdAndDelete).toHaveBeenCalledWith(mockRouteId);
    expect(userService.removeRouteFromUser).toHaveBeenCalledWith(mockUserId, mockRouteId);
  });
  
  test('addToFavorites should mark a route as favorite', async () => {
    await routeManagementService.addToFavorites(mockRouteId, mockUserId);
    
    expect(RouteModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockRouteId,
      { is_favorite: true },
      { new: true }
    );
  });
  
  test('removeFromFavorites should unmark a route as favorite', async () => {
    await routeManagementService.removeFromFavorites(mockRouteId, mockUserId);
    
    expect(RouteModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockRouteId,
      { is_favorite: false },
      { new: true }
    );
  });
  
  test('searchRoutes should find routes by keyword', async () => {
    const searchTerm = 'Tokyo';
    
    RouteModel.find.mockResolvedValueOnce([mockRoute]);
    
    const result = await routeManagementService.searchRoutes(mockUserId, searchTerm);
    
    expect(RouteModel.find).toHaveBeenCalledWith({
      user_id: mockUserId,
      $or: [
        { route_name: expect.objectContaining({ $regex: searchTerm }) },
        { destination: expect.objectContaining({ $regex: searchTerm }) },
        { overview: expect.objectContaining({ $regex: searchTerm }) }
      ]
    });
    
    expect(result).toHaveLength(1);
    expect(result[0].destination).toBe('Tokyo, Japan');
  });
  
  test('duplicateRoute should create a copy of an existing route', async () => {
    const newRouteId = 'new_route_id';
    RouteModel.create.mockResolvedValueOnce({ ...mockRoute, _id: newRouteId });
    
    await routeManagementService.duplicateRoute(mockRouteId, mockUserId);
    
    const expectedNewRoute = {
      ...mockRoute,
      route_name: `Copy of ${mockRoute.route_name}`,
      _id: undefined,
      id: undefined,
      created_at: expect.any(Date),
      last_modified: expect.any(Date)
    };
    
    expect(RouteModel.create).toHaveBeenCalledWith(
      expect.objectContaining(expectedNewRoute)
    );
    expect(userService.addRouteToUser).toHaveBeenCalledWith(mockUserId, newRouteId);
  });
  
  test('shareRoute should generate a sharing token', async () => {
    const result = await routeManagementService.shareRoute(mockRouteId, mockUserId);
    
    expect(RouteModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockRouteId,
      expect.objectContaining({
        share_token: expect.any(String),
        is_shared: true
      }),
      { new: true }
    );
    
    expect(result).toEqual(expect.objectContaining({
      shareUrl: expect.stringContaining(mockRouteId)
    }));
  });
  
  test('getRouteByShareToken should retrieve a shared route', async () => {
    const shareToken = 'abc123';
    RouteModel.find.mockResolvedValueOnce([mockRoute]);
    
    const result = await routeManagementService.getRouteByShareToken(shareToken);
    
    expect(RouteModel.find).toHaveBeenCalledWith({ share_token: shareToken });
    expect(result).toEqual(mockRoute);
  });
  
  test('getRouteAnalytics should return usage statistics', async () => {
    const result = await routeManagementService.getRouteAnalytics(mockUserId);
    
    expect(userService.getUserRoutes).toHaveBeenCalledWith(mockUserId);
    expect(result).toEqual(expect.objectContaining({
      totalRoutes: 2,
      favoriteRoutes: 1,
      mostCommonDestination: 'Japan',
      averageDuration: expect.any(Number)
    }));
  });
}); 