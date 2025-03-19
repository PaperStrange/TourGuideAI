/**
 * Tests for route generation and manipulation functions
 * 
 * This file includes tests for the API functions related to route generation,
 * route splitting, and timeline creation based on the testing-plan.md requirements.
 */

import * as openaiApi from '../../api/openaiApi';

// Mock the fetch API
global.fetch = jest.fn();

describe('Route Generation Functions', () => {
  beforeEach(() => {
    fetch.mockClear();
    // Mock successful API response
    fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify({ result: 'success' }) } }] })
      })
    );
  });

  describe('user_route_generate function', () => {
    test('should generate route based on user query', async () => {
      const userQuery = 'Show me a 3-day tour of Rome';
      
      // Mock the response with a complete route
      fetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            choices: [{ 
              message: { 
                content: JSON.stringify({
                  id: 'route-123',
                  name: 'Rome 3-Day Historical Tour',
                  destination: 'Rome, Italy',
                  sites_included_in_routes: ['Colosseum', 'Vatican', 'Trevi Fountain'],
                  route_duration: '3 days',
                  estimated_cost: '$1500'
                }) 
              } 
            }] 
          })
        })
      );
      
      const result = await openaiApi.generateRoute(userQuery);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Rome 3-Day Historical Tour');
      expect(result.destination).toBe('Rome, Italy');
      expect(Array.isArray(result.sites_included_in_routes)).toBe(true);
      expect(result.sites_included_in_routes.length).toBe(3);
      expect(result.route_duration).toBe('3 days');
    });
    
    test('should handle minimal user queries', async () => {
      const userQuery = 'Paris';
      
      // Mock the response with a complete route based on minimal info
      fetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            choices: [{ 
              message: { 
                content: JSON.stringify({
                  id: 'route-456',
                  name: 'Paris Highlights Tour',
                  destination: 'Paris, France',
                  sites_included_in_routes: ['Eiffel Tower', 'Louvre', 'Arc de Triomphe'],
                  route_duration: '2 days',
                  estimated_cost: '$1200'
                }) 
              } 
            }] 
          })
        })
      );
      
      const result = await openaiApi.generateRoute(userQuery);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Paris Highlights Tour');
      expect(result.destination).toBe('Paris, France');
    });
    
    test('should handle complex user preferences', async () => {
      const userQuery = 'I need a 5-day tour of London with family-friendly activities, historical sites, and good food';
      
      // Mock the response with complex preferences addressed
      fetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            choices: [{ 
              message: { 
                content: JSON.stringify({
                  id: 'route-789',
                  name: 'London Family-Friendly Historical Tour',
                  destination: 'London, UK',
                  sites_included_in_routes: [
                    'British Museum', 
                    'London Eye', 
                    'Natural History Museum',
                    'Tower of London',
                    'Borough Market'
                  ],
                  route_duration: '5 days',
                  family_friendly: true,
                  estimated_cost: '$3000',
                  food_highlights: ['Borough Market', 'Dishoom', 'Afternoon Tea']
                }) 
              } 
            }] 
          })
        })
      );
      
      const result = await openaiApi.generateRoute(userQuery);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('London Family-Friendly Historical Tour');
      expect(result.destination).toBe('London, UK');
      expect(result.sites_included_in_routes.length).toBe(5);
      expect(result.route_duration).toBe('5 days');
      expect(result.family_friendly).toBe(true);
      expect(Array.isArray(result.food_highlights)).toBe(true);
    });
  });
  
  describe('user_route_generate_randomly function', () => {
    test('should generate a random route', async () => {
      // Mock the response with a random route
      fetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            choices: [{ 
              message: { 
                content: JSON.stringify({
                  id: 'random-123',
                  name: 'Surprise Barcelona Trip',
                  destination: 'Barcelona, Spain',
                  sites_included_in_routes: ['Sagrada Familia', 'Park Güell', 'La Rambla'],
                  route_duration: '3 days',
                  route_type: 'random',
                  estimated_cost: '$1800'
                }) 
              } 
            }] 
          })
        })
      );
      
      const result = await openaiApi.generateRandomRoute();
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Surprise Barcelona Trip');
      expect(result.destination).toBe('Barcelona, Spain');
      expect(result.route_type).toBe('random');
    });
  });
  
  describe('user_route_split_by_day function', () => {
    test('should split route into days', async () => {
      const route = {
        id: 'route-123',
        name: 'Rome 3-Day Tour',
        destination: 'Rome, Italy',
        sites_included_in_routes: ['Colosseum', 'Vatican', 'Trevi Fountain', 'Spanish Steps', 'Roman Forum', 'Pantheon']
      };
      
      // Mock the response with a daily split
      fetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            choices: [{ 
              message: { 
                content: JSON.stringify({
                  travel_split_by_day: [
                    {
                      travel_day: 1,
                      current_date: '2025/03/10',
                      dairy_routes: [
                        {
                          route_id: 'day1-1',
                          departure_site: 'Hotel Rome',
                          arrival_site: 'Colosseum',
                          departure_time: '2025/03/10 9.00 AM(GMT+1)',
                          arrival_time: '2025/03/10 9.20 AM(GMT+1)',
                          transportation_type: 'walk',
                          duration: '20',
                          duration_unit: 'minute',
                          recommended_reason: 'Ancient amphitheater, a must-see Roman landmark'
                        },
                        {
                          route_id: 'day1-2',
                          departure_site: 'Colosseum',
                          arrival_site: 'Roman Forum',
                          departure_time: '2025/03/10 11.30 AM(GMT+1)',
                          arrival_time: '2025/03/10 11.40 AM(GMT+1)',
                          transportation_type: 'walk',
                          duration: '10',
                          duration_unit: 'minute',
                          recommended_reason: 'Historic heart of ancient Rome'
                        }
                      ]
                    },
                    {
                      travel_day: 2,
                      current_date: '2025/03/11',
                      dairy_routes: [
                        {
                          route_id: 'day2-1',
                          departure_site: 'Hotel Rome',
                          arrival_site: 'Vatican',
                          departure_time: '2025/03/11 9.00 AM(GMT+1)',
                          arrival_time: '2025/03/11 9.30 AM(GMT+1)',
                          transportation_type: 'subway',
                          duration: '30',
                          duration_unit: 'minute',
                          recommended_reason: 'Home to St. Peter\'s Basilica and Vatican Museums'
                        }
                      ]
                    },
                    {
                      travel_day: 3,
                      current_date: '2025/03/12',
                      dairy_routes: [
                        {
                          route_id: 'day3-1',
                          departure_site: 'Hotel Rome',
                          arrival_site: 'Trevi Fountain',
                          departure_time: '2025/03/12 9.00 AM(GMT+1)',
                          arrival_time: '2025/03/12 9.15 AM(GMT+1)',
                          transportation_type: 'walk',
                          duration: '15',
                          duration_unit: 'minute',
                          recommended_reason: 'Iconic baroque fountain from 1762'
                        },
                        {
                          route_id: 'day3-2',
                          departure_site: 'Trevi Fountain',
                          arrival_site: 'Spanish Steps',
                          departure_time: '2025/03/12 10.30 AM(GMT+1)',
                          arrival_time: '2025/03/12 10.40 AM(GMT+1)',
                          transportation_type: 'walk',
                          duration: '10',
                          duration_unit: 'minute',
                          recommended_reason: 'Elegant staircase connecting Piazza di Spagna and Trinità dei Monti church'
                        },
                        {
                          route_id: 'day3-3',
                          departure_site: 'Spanish Steps',
                          arrival_site: 'Pantheon',
                          departure_time: '2025/03/12 12.00 PM(GMT+1)',
                          arrival_time: '2025/03/12 12.15 PM(GMT+1)',
                          transportation_type: 'walk',
                          duration: '15',
                          duration_unit: 'minute',
                          recommended_reason: 'Well-preserved ancient Roman temple'
                        }
                      ]
                    }
                  ]
                }) 
              } 
            }] 
          })
        })
      );
      
      const result = await openaiApi.splitRouteByDay(route);
      
      expect(result).toBeDefined();
      expect(result.travel_split_by_day).toBeDefined();
      expect(result.travel_split_by_day.length).toBe(3);
      expect(result.travel_split_by_day[0].travel_day).toBe(1);
      expect(result.travel_split_by_day[1].travel_day).toBe(2);
      expect(result.travel_split_by_day[2].travel_day).toBe(3);
      
      // Verify first day details
      expect(result.travel_split_by_day[0].dairy_routes.length).toBe(2);
      expect(result.travel_split_by_day[0].dairy_routes[0].departure_site).toBe('Hotel Rome');
      expect(result.travel_split_by_day[0].dairy_routes[0].arrival_site).toBe('Colosseum');
      expect(result.travel_split_by_day[0].dairy_routes[0].transportation_type).toBe('walk');
      
      // Verify second day has Vatican visit
      expect(result.travel_split_by_day[1].dairy_routes[0].arrival_site).toBe('Vatican');
      
      // Verify third day includes Trevi Fountain, Spanish Steps, and Pantheon
      expect(result.travel_split_by_day[2].dairy_routes.length).toBe(3);
      expect(result.travel_split_by_day[2].dairy_routes[0].arrival_site).toBe('Trevi Fountain');
      expect(result.travel_split_by_day[2].dairy_routes[1].arrival_site).toBe('Spanish Steps');
      expect(result.travel_split_by_day[2].dairy_routes[2].arrival_site).toBe('Pantheon');
    });
  });
}); 