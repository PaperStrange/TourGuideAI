import * as openaiApi from '../../api/openaiApi';

describe('OpenAI API', () => {
  // Mock the fetch API
  global.fetch = jest.fn();
  
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

  describe('API Configuration', () => {
    test('should set and get API key', () => {
      const testKey = 'test-api-key';
      const result = openaiApi.setApiKey(testKey);
      expect(result).toBe(true);
      
      const status = openaiApi.getStatus();
      expect(status.isConfigured).toBe(true);
    });

    test('should reject invalid API key', () => {
      expect(() => openaiApi.setApiKey('')).toThrow();
      expect(() => openaiApi.setApiKey(null)).toThrow();
      expect(() => openaiApi.setApiKey(123)).toThrow();
    });

    test('should set debug mode', () => {
      openaiApi.setDebugMode(true);
      const status = openaiApi.getStatus();
      expect(status.debug).toBe(true);
      
      openaiApi.setDebugMode(false);
      const updatedStatus = openaiApi.getStatus();
      expect(updatedStatus.debug).toBe(false);
    });
  });

  describe('Route Generation', () => {
    beforeEach(() => {
      openaiApi.setApiKey('test-api-key');
    });

    test('should generate route based on user query', async () => {
      const query = 'Show me a 3-day tour of Rome';
      const result = await openaiApi.generateRoute(query);
      
      expect(fetch).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('should generate random route', async () => {
      const result = await openaiApi.generateRandomRoute();
      
      expect(fetch).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('should handle API errors', async () => {
      // Mock API error
      fetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: { message: 'Bad request' } })
        })
      );
      
      await expect(openaiApi.generateRoute('test query')).rejects.toThrow();
    });

    test('should handle network errors', async () => {
      // Mock network error
      fetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));
      
      await expect(openaiApi.generateRoute('test query')).rejects.toThrow('Network error');
    });
  });

  describe('Timeline Generation', () => {
    test('should split route by day', async () => {
      const route = {
        destination: 'Rome',
        duration: '3 days',
        sites: ['Colosseum', 'Vatican', 'Trevi Fountain']
      };
      
      const result = await openaiApi.splitRouteByDay(route);
      
      expect(fetch).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('Intent Recognition', () => {
    test('should recognize user intent from query', async () => {
      const query = 'I want to visit Paris for 3 days in December';
      
      const result = await openaiApi.recognizeIntent(query);
      
      expect(fetch).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
}); 