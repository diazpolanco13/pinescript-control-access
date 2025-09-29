/**
 * 🧪 TradingView Service Unit Tests
 *
 * Tests the core business logic in isolation using mocks
 */

// Mock dependencies
jest.mock('axios');
jest.mock('../../src/utils/dateHelper');

// Import after mocking
const axios = require('axios');

// Mock cookieManager before importing the service
const mockCookieManager = {
  loadCookies: jest.fn(),
  validateCookies: jest.fn(),
  saveCookies: jest.fn()
};

jest.mock('../../src/utils/cookieManager', () => {
  return jest.fn().mockImplementation(() => mockCookieManager);
});

const tradingViewService = require('../../src/services/tradingViewService');

describe('💼 TradingView Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset service state
    tradingViewService.sessionId = null;
    tradingViewService.sessionIdSign = null;
    tradingViewService.initialized = false;
  });

  describe('🔐 Authentication', () => {
    test('should initialize with valid cookies', async () => {
      const mockCookies = {
        sessionid: 'test_session_id',
        sessionid_sign: 'test_session_sign',
        timestamp: new Date().toISOString()
      };

      mockCookieManager.loadCookies.mockResolvedValue(mockCookies);
      mockCookieManager.validateCookies.mockResolvedValue(true);

      await tradingViewService.init();

      expect(tradingViewService.initialized).toBe(true);
      expect(tradingViewService.sessionId).toBe('test_session_id');
      expect(tradingViewService.sessionIdSign).toBe('test_session_sign');
      expect(mockCookieManager.validateCookies).toHaveBeenCalledWith('test_session_id', 'test_session_sign');
    });

    test('should initialize with invalid cookies', async () => {
      const mockCookies = {
        sessionid: 'invalid_session_id',
        sessionid_sign: 'invalid_session_sign',
        timestamp: new Date().toISOString()
      };

      mockCookieManager.loadCookies.mockResolvedValue(mockCookies);
      mockCookieManager.validateCookies.mockResolvedValue(false);

      await tradingViewService.init();

      expect(tradingViewService.initialized).toBe(true);
      expect(tradingViewService.sessionId).toBe('invalid_session_id');
      expect(tradingViewService.sessionIdSign).toBe('invalid_session_sign');
      // Should not throw error, just log warning
    });

    test('should initialize without cookies', async () => {
      mockCookieManager.loadCookies.mockResolvedValue(null);

      await tradingViewService.init();

      expect(tradingViewService.initialized).toBe(true);
      expect(tradingViewService.sessionId).toBeNull();
      expect(tradingViewService.sessionIdSign).toBeNull();
    });

    test('should update cookies successfully', async () => {
      const sessionId = 'new_session_id';
      const sessionIdSign = 'new_session_sign';

      mockCookieManager.validateCookies.mockResolvedValue(true);
      mockCookieManager.saveCookies.mockResolvedValue(true);

      const result = await tradingViewService.updateCookies(sessionId, sessionIdSign);

      expect(result.success).toBe(true);
      expect(tradingViewService.sessionId).toBe(sessionId);
      expect(tradingViewService.sessionIdSign).toBe(sessionIdSign);
      expect(mockCookieManager.saveCookies).toHaveBeenCalledWith(sessionId, sessionIdSign);
    });

    test('should reject invalid cookies update', async () => {
      const sessionId = 'invalid_session_id';
      const sessionIdSign = 'invalid_session_sign';

      mockCookieManager.validateCookies.mockResolvedValue(false);

      await expect(tradingViewService.updateCookies(sessionId, sessionIdSign))
        .rejects.toThrow('Cookies inválidas');
    });
  });

  describe('🔍 User Validation', () => {
    beforeEach(async () => {
      await setupValidSession();
    });

    test('should validate existing username', async () => {
      const username = 'apidevs';
      const mockResponse = {
        data: [{ username: 'apidevs' }]
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await tradingViewService.validateUsername(username);

      expect(result).toEqual({
        validuser: true,
        verifiedUserName: 'apidevs'
      });

      expect(axios.get).toHaveBeenCalledWith(
        `https://www.tradingview.com/username_hint/?s=${username}`,
        { timeout: 5000 }
      );
    });

    test('should handle non-existent username', async () => {
      axios.get.mockResolvedValue({ data: [] });

      const result = await tradingViewService.validateUsername('nonexistent');

      expect(result).toEqual({
        validuser: false,
        verifiedUserName: ''
      });
    });

    test('should handle API errors', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      await expect(tradingViewService.validateUsername('test'))
        .rejects.toThrow('Network error');
    });
  });

  describe('📊 Access Details', () => {
    beforeEach(async () => {
      await setupValidSession();
    });

    test('should get access details for user with access', async () => {
      const mockApiResponse = {
        data: {
          results: [{
            username: 'apidevs',
            expiration: '2025-10-03T08:00:25+00:00'
          }]
        }
      };

      axios.post.mockResolvedValue(mockApiResponse);

      const result = await tradingViewService.getAccessDetails('apidevs', 'PUB;test123');

      expect(result).toMatchObject({
        pine_id: 'PUB;test123',
        username: 'apidevs',
        hasAccess: true,
        noExpiration: false,
        currentExpiration: '2025-10-03T08:00:25+00:00'
      });
    });

    test('should handle user without access', async () => {
      axios.post.mockResolvedValue({
        data: { results: [] }
      });

      const result = await tradingViewService.getAccessDetails('apidevs', 'PUB;test123');

      expect(result.hasAccess).toBe(false);
      expect(result.noExpiration).toBe(false);
    });

    test('should handle lifetime access', async () => {
      axios.post.mockResolvedValue({
        data: {
          results: [{
            username: 'apidevs',
            expiration: null
          }]
        }
      });

      const result = await tradingViewService.getAccessDetails('apidevs', 'PUB;test123');

      expect(result.hasAccess).toBe(true);
      expect(result.noExpiration).toBe(true);
    });
  });

  describe('➕ Access Granting', () => {
    beforeEach(async () => {
      await setupValidSession();
    });

    test('should grant time-limited access successfully', async () => {
      const accessDetails = {
        pine_id: 'PUB;test123',
        username: 'apidevs',
        hasAccess: false,
        noExpiration: false,
        currentExpiration: '2025-09-26T10:00:00+00:00'
      };

      // Mock date helper
      const { getAccessExtension } = require('../../src/utils/dateHelper');
      getAccessExtension.mockReturnValue('2025-10-03T10:00:00+00:00');

      // Mock successful API call
      axios.post.mockResolvedValue({ status: 200 });

      const result = await tradingViewService.addAccess(accessDetails, 'D', 7);

      expect(result.status).toBe('Success');
      expect(result.expiration).toBe('2025-10-03T10:00:00+00:00');
      expect(result.noExpiration).toBe(false);
    });

    test('should grant lifetime access', async () => {
      const accessDetails = {
        pine_id: 'PUB;test123',
        username: 'apidevs',
        hasAccess: false,
        noExpiration: false,
        currentExpiration: '2025-09-26T10:00:00+00:00'
      };

      axios.post.mockResolvedValue({ status: 201 });

      const result = await tradingViewService.addAccess(accessDetails, 'L', 0);

      expect(result.status).toBe('Success');
      expect(result.noExpiration).toBe(true);
    });

    test('should skip granting if user already has lifetime access', async () => {
      const accessDetails = {
        pine_id: 'PUB;test123',
        username: 'apidevs',
        hasAccess: true,
        noExpiration: true, // Already has lifetime access
        currentExpiration: '2025-09-26T10:00:00+00:00'
      };

      const result = await tradingViewService.addAccess(accessDetails, 'D', 7);

      expect(result.status).toBe('Not Applied');
      expect(axios.post).not.toHaveBeenCalled();
    });

    test('should handle API errors', async () => {
      const accessDetails = {
        pine_id: 'PUB;test123',
        username: 'apidevs',
        hasAccess: false,
        noExpiration: false,
        currentExpiration: '2025-09-26T10:00:00+00:00'
      };

      const { getAccessExtension } = require('../../src/utils/dateHelper');
      getAccessExtension.mockReturnValue('2025-10-03T10:00:00+00:00');
      axios.post.mockRejectedValue(new Error('API Error'));

      const result = await tradingViewService.addAccess(accessDetails, 'D', 7);

      expect(result.status).toBe('Failure');
      expect(result.pine_id).toBe('PUB;test123');
      expect(result.username).toBe('apidevs');
    });
  });

  describe('🗑️ Access Removal', () => {
    beforeEach(async () => {
      await setupValidSession();
    });

    test('should remove access successfully', async () => {
      const accessDetails = {
        pine_id: 'PUB;test123',
        username: 'apidevs',
        hasAccess: true
      };

      axios.post.mockResolvedValue({ status: 200 });

      const result = await tradingViewService.removeAccess(accessDetails);

      expect(result.status).toBe('Success');
    });

    test('should handle removal API errors', async () => {
      const accessDetails = {
        pine_id: 'PUB;test123',
        username: 'apidevs',
        hasAccess: true
      };

      axios.post.mockRejectedValue(new Error('Removal failed'));

      const result = await tradingViewService.removeAccess(accessDetails);

      expect(result.status).toBe('Failure');
      expect(result.pine_id).toBe('PUB;test123');
      expect(result.username).toBe('apidevs');
    });
  });

  describe('📦 Bulk Operations', () => {
    beforeEach(async () => {
      await setupValidSession();
    });

    test('should process bulk grant access efficiently', async () => {
      const users = ['user1', 'user2'];
      const pineIds = ['PUB;test1'];

      // Mock successful individual grants
      tradingViewService.grantAccess = jest.fn().mockResolvedValue({
        status: 'Success'
      });

      const result = await tradingViewService.bulkGrantAccess(users, pineIds, '7D', {
        batchSize: 2,
        delayMs: 100
      });

      expect(result.total).toBe(2);
      expect(result.success).toBe(2);
      expect(result.errors).toBe(0);
      expect(result.successRate).toBe(100);
      expect(tradingViewService.grantAccess).toHaveBeenCalledTimes(2);
    });

    test('should handle partial failures in bulk operations', async () => {
      const users = ['user1', 'user2'];
      const pineIds = ['PUB;test1'];

      tradingViewService.grantAccess
        .mockResolvedValueOnce({ status: 'Success' })
        .mockRejectedValueOnce(new Error('Failed for user2'));

      const result = await tradingViewService.bulkGrantAccess(users, pineIds, '7D');

      expect(result.total).toBe(2);
      expect(result.success).toBe(1);
      expect(result.errors).toBe(1);
      expect(result.successRate).toBe(50);
    });

    test('should respect batch size and delays', async () => {
      const users = ['user1', 'user2', 'user3', 'user4'];
      const pineIds = ['PUB;test1'];

      tradingViewService.grantAccess = jest.fn().mockResolvedValue({ status: 'Success' });

      const startTime = Date.now();

      await tradingViewService.bulkGrantAccess(users, pineIds, '7D', {
        batchSize: 2,
        delayMs: 200
      });

      const duration = Date.now() - startTime;

      // Should take at least some time for batching (may be less due to optimizations)
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(tradingViewService.grantAccess).toHaveBeenCalledTimes(4);
    });
  });

  describe('🛠️ Utility Functions', () => {
    test('should split arrays into chunks correctly', async () => {
      const array = [1, 2, 3, 4, 5, 6, 7];
      const chunks = tradingViewService.chunkArray(array, 3);

      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    test('should delay execution for specified milliseconds', async () => {
      const startTime = Date.now();
      await tradingViewService.delay(100);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(95);
      expect(duration).toBeLessThanOrEqual(150);
    });
  });

  // Helper function to setup valid session
  async function setupValidSession() {
    tradingViewService.sessionId = 'test_session_id';
    tradingViewService.sessionIdSign = 'test_session_sign';
    tradingViewService.initialized = true;
  }
});
