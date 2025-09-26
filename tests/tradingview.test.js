/**
 * 🧪 TradingView Access Management API - Comprehensive Test Suite
 *
 * Best Practices Implemented:
 * - ✅ Descriptive test names and structure
 * - ✅ Proper setup/teardown with beforeEach/afterEach
 * - ✅ Comprehensive error handling tests
 * - ✅ Mock implementations for external dependencies
 * - ✅ Performance assertions
 * - ✅ Edge case coverage
 * - ✅ Concurrent test execution where appropriate
 * - ✅ Test isolation and cleanup
 * - ✅ Custom matchers and utilities
 */

const request = require('supertest');
const axios = require('axios');
const app = require('../src/server');
const tradingViewService = require('../src/services/tradingViewService');

// Mock external dependencies
jest.mock('axios');
jest.mock('../src/services/tradingViewService');

// Test constants
const TEST_USERS = {
  valid: 'trendoscope',
  invalid: 'nonexistentuser12345',
  withSpecialChars: 'test_user@example.com'
};

const TEST_PINE_IDS = {
  valid: 'PUB;ebd861d70a9f478bb06fe60c5d8f469c',
  invalid: 'INVALID_ID',
  another: 'PUB;test12345678901234567890'
};

const TEST_DURATIONS = {
  valid: ['7D', '1M', '3M', '1Y', '1L'],
  invalid: ['7', 'DD', '7X', 'invalid']
};

describe('🚀 TradingView Access Management API v2.0', () => {
  let server;

  beforeAll(async () => {
    // Start server for integration tests
    server = app.listen(0); // Use random available port
  }, 30000);

  afterAll(async () => {
    // Cleanup server
    await new Promise(resolve => server.close(resolve));
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default axios mocks
    axios.get.mockResolvedValue(global.testUtils.mockTradingViewResponse(200, []));
    axios.post.mockResolvedValue(global.testUtils.mockTradingViewResponse(200, { results: [] }));
  });

  describe('🏠 Root Endpoint (GET /)', () => {
    test('✅ should return API information with correct structure', async () => {
      const response = await request(app)
        .get('/')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        message: expect.stringContaining('TradingView'),
        version: '2.0.0',
        status: 'running',
        timestamp: expect.any(String)
      });

      expect(response.body.endpoints).toHaveProperty('health', 'GET /');
      expect(response.body.endpoints).toHaveProperty('validate');
      expect(response.body.endpoints).toHaveProperty('access');
      expect(response.body.endpoints).toHaveProperty('bulk');
    });

    test('✅ should handle CORS headers correctly', async () => {
      const response = await request(app)
        .options('/')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('🔍 User Validation (GET /api/validate/:username)', () => {
    describe('✅ Valid usernames', () => {
      test.concurrent('should validate existing TradingView user', async () => {
        axios.get.mockResolvedValueOnce({
          status: 200,
          data: [{ username: TEST_USERS.valid }]
        });

        const response = await request(app)
          .get(`/api/validate/${TEST_USERS.valid}`)
          .expect(200);

        expect(response.body).toEqual({
          validuser: true,
          verifiedUserName: TEST_USERS.valid
        });
      });

      test.concurrent('should handle username case insensitivity', async () => {
        const username = 'Trendoscope';
        axios.get.mockResolvedValueOnce({
          status: 200,
          data: [{ username: username.toLowerCase() }]
        });

        const response = await request(app)
          .get(`/api/validate/${username}`)
          .expect(200);

        expect(response.body.validuser).toBe(true);
        expect(response.body.verifiedUserName).toBe(username.toLowerCase());
      });
    });

    describe('❌ Invalid usernames', () => {
      test.concurrent('should return invalid for non-existent user', async () => {
        axios.get.mockResolvedValueOnce({
          status: 200,
          data: []
        });

        const response = await request(app)
          .get(`/api/validate/${TEST_USERS.invalid}`)
          .expect(200);

        expect(response.body).toEqual({
          validuser: false,
          verifiedUserName: ''
        });
      });

      test.concurrent('should handle API errors gracefully', async () => {
        axios.get.mockRejectedValueOnce(new Error('Network error'));

        const response = await request(app)
          .get(`/api/validate/${TEST_USERS.valid}`)
          .expect(500);

        expect(response.body).toHaveProperty('errorMessage');
        expect(response.body.details).toBe('Network error');
      });
    });

    describe('🔧 Edge cases', () => {
      test.concurrent('should handle special characters in username', async () => {
        axios.get.mockResolvedValueOnce({
          status: 200,
          data: [{ username: TEST_USERS.withSpecialChars }]
        });

        const response = await request(app)
          .get(`/api/validate/${encodeURIComponent(TEST_USERS.withSpecialChars)}`)
          .expect(200);

        expect(response.body.validuser).toBe(true);
      });

      test.concurrent('should handle empty username parameter', async () => {
        const response = await request(app)
          .get('/api/validate/')
          .expect(404); // Express routing will handle this
      });
    });
  });

  describe('📊 Access Management (GET /api/access/:username)', () => {
    describe('✅ Successful access queries', () => {
      test('should return access details for valid user and pine IDs', async () => {
        const mockAccessDetails = {
          pine_id: TEST_PINE_IDS.valid,
          username: TEST_USERS.valid,
          hasAccess: true,
          noExpiration: false,
          currentExpiration: '2025-10-03T08:00:25+00:00'
        };

        tradingViewService.getAccessDetails.mockResolvedValue(mockAccessDetails);

        const response = await request(app)
          .get(`/api/access/${TEST_USERS.valid}`)
          .send({ pine_ids: [TEST_PINE_IDS.valid] })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body[0]).toMatchObject({
          pine_id: TEST_PINE_IDS.valid,
          username: TEST_USERS.valid,
          hasAccess: expect.any(Boolean),
          noExpiration: expect.any(Boolean),
          currentExpiration: expect.any(String)
        });
      });

      test('should handle multiple pine IDs', async () => {
        const pineIds = [TEST_PINE_IDS.valid, TEST_PINE_IDS.another];
        const mockResponses = pineIds.map(pineId => ({
          pine_id: pineId,
          username: TEST_USERS.valid,
          hasAccess: false,
          noExpiration: false,
          currentExpiration: new Date().toISOString()
        }));

        tradingViewService.getAccessDetails
          .mockResolvedValueOnce(mockResponses[0])
          .mockResolvedValueOnce(mockResponses[1]);

        const response = await request(app)
          .get(`/api/access/${TEST_USERS.valid}`)
          .send({ pine_ids: pineIds })
          .expect(200);

        expect(response.body).toHaveLength(2);
        expect(response.body[0].pine_id).toBe(pineIds[0]);
        expect(response.body[1].pine_id).toBe(pineIds[1]);
      });
    });

    describe('❌ Error handling', () => {
      test('should return 400 for missing pine_ids', async () => {
        const response = await request(app)
          .get(`/api/access/${TEST_USERS.valid}`)
          .send({})
          .expect(400);

        expect(response.body.error).toMatch(/pine_ids.*required/i);
      });

      test('should return 400 for empty pine_ids array', async () => {
        const response = await request(app)
          .get(`/api/access/${TEST_USERS.valid}`)
          .send({ pine_ids: [] })
          .expect(400);

        expect(response.body.error).toMatch(/pine_ids.*required/i);
      });

      test('should handle service errors gracefully', async () => {
        tradingViewService.getAccessDetails.mockRejectedValue(
          new Error('TradingView API error')
        );

        const response = await request(app)
          .get(`/api/access/${TEST_USERS.valid}`)
          .send({ pine_ids: [TEST_PINE_IDS.valid] })
          .expect(200); // API returns array with error entries

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body[0]).toHaveProperty('error');
      });
    });
  });

  describe('➕ Access Granting (POST /api/access/:username)', () => {
    describe('✅ Successful access grants', () => {
      test('should grant access with valid duration', async () => {
        const mockResult = {
          pine_id: TEST_PINE_IDS.valid,
          username: TEST_USERS.valid,
          hasAccess: true,
          noExpiration: false,
          expiration: '2025-10-03T08:00:25+00:00',
          status: 'Success'
        };

        tradingViewService.grantAccess.mockResolvedValue(mockResult);

        const response = await request(app)
          .post(`/api/access/${TEST_USERS.valid}`)
          .send({
            pine_ids: [TEST_PINE_IDS.valid],
            duration: '7D'
          })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body[0]).toEqual(mockResult);
      });

      test.each(TEST_DURATIONS.valid)('should accept valid duration format: %s', async (duration) => {
        tradingViewService.grantAccess.mockResolvedValue({
          status: 'Success',
          duration
        });

        const response = await request(app)
          .post(`/api/access/${TEST_USERS.valid}`)
          .send({
            pine_ids: [TEST_PINE_IDS.valid],
            duration
          })
          .expect(200);

        expect(response.body[0].status).toBe('Success');
      });
    });

    describe('❌ Error handling', () => {
      test.each(TEST_DURATIONS.invalid)('should reject invalid duration format: %s', async (duration) => {
        const response = await request(app)
          .post(`/api/access/${TEST_USERS.valid}`)
          .send({
            pine_ids: [TEST_PINE_IDS.valid],
            duration
          })
          .expect(400);

        expect(response.body.error).toMatch(/invalid duration format/i);
      });

      test('should return 400 for missing duration', async () => {
        const response = await request(app)
          .post(`/api/access/${TEST_USERS.valid}`)
          .send({
            pine_ids: [TEST_PINE_IDS.valid]
            // duration missing
          })
          .expect(400);

        expect(response.body.error).toMatch(/duration.*required/i);
      });

      test('should handle service failures', async () => {
        tradingViewService.grantAccess.mockRejectedValue(new Error('API limit exceeded'));

        const response = await request(app)
          .post(`/api/access/${TEST_USERS.valid}`)
          .send({
            pine_ids: [TEST_PINE_IDS.valid],
            duration: '7D'
          })
          .expect(200);

        expect(response.body[0]).toHaveProperty('status', 'Failure');
        expect(response.body[0]).toHaveProperty('error');
      });
    });
  });

  describe('🗑️ Access Removal (DELETE /api/access/:username)', () => {
    test('should remove access successfully', async () => {
      const mockResult = {
        pine_id: TEST_PINE_IDS.valid,
        username: TEST_USERS.valid,
        hasAccess: false,
        status: 'Success'
      };

      tradingViewService.getAccessDetails.mockResolvedValue({
        pine_id: TEST_PINE_IDS.valid,
        username: TEST_USERS.valid,
        hasAccess: true,
        noExpiration: false,
        currentExpiration: new Date().toISOString()
      });

      tradingViewService.removeAccess.mockResolvedValue(mockResult);

      const response = await request(app)
        .delete(`/api/access/${TEST_USERS.valid}`)
        .send({ pine_ids: [TEST_PINE_IDS.valid] })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toEqual(mockResult);
    });

    test('should skip users without access', async () => {
      tradingViewService.getAccessDetails.mockResolvedValue({
        pine_id: TEST_PINE_IDS.valid,
        username: TEST_USERS.valid,
        hasAccess: false,
        noExpiration: false,
        currentExpiration: null
      });

      const response = await request(app)
        .delete(`/api/access/${TEST_USERS.valid}`)
        .send({ pine_ids: [TEST_PINE_IDS.valid] })
        .expect(200);

      expect(response.body[0]).toHaveProperty('status', 'Success');
      // Should not call removeAccess if no access exists
    });
  });

  describe('📦 Bulk Operations (POST /api/access/bulk)', () => {
    test('should handle bulk access grant', async () => {
      const users = ['user1', 'user2', 'user3'];
      const pineIds = [TEST_PINE_IDS.valid];

      tradingViewService.bulkGrantAccess.mockResolvedValue({
        total: 3,
        success: 3,
        errors: 0,
        duration: 2000,
        successRate: 100
      });

      const response = await request(app)
        .post('/api/access/bulk')
        .send({
          users,
          pine_ids: pineIds,
          duration: '7D'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        total: 3,
        success: 3,
        errors: 0
      });
    });

    test('should validate bulk request parameters', async () => {
      const response = await request(app)
        .post('/api/access/bulk')
        .send({
          users: [],
          pine_ids: [],
          duration: 'invalid'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('🛡️ Rate Limiting', () => {
    test('should enforce rate limits for API endpoints', async () => {
      // Make multiple requests quickly
      const requests = Array(150).fill().map(() =>
        request(app).get(`/api/validate/${TEST_USERS.valid}`)
      );

      const results = await Promise.allSettled(requests);

      const rateLimited = results.some(result =>
        result.status === 'fulfilled' && result.value.status === 429
      );

      expect(rateLimited).toBe(true);
    });
  });

  describe('🚫 Error Handling & Edge Cases', () => {
    test('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Endpoint not found');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post(`/api/access/${TEST_USERS.valid}`)
        .set('Content-Type', 'application/json')
        .send('{invalid json}')
        .expect(400);
    });

    test('should handle very long usernames', async () => {
      const longUsername = 'a'.repeat(100);

      const response = await request(app)
        .get(`/api/validate/${longUsername}`)
        .expect(200);

      // Should handle gracefully regardless of API response
      expect(response.body).toHaveProperty('validuser');
    });
  });

  describe('⚡ Performance Tests', () => {
    test('should respond within acceptable time for single operations', async () => {
      const startTime = Date.now();

      await request(app)
        .get(`/api/validate/${TEST_USERS.valid}`)
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 5;
      const startTime = Date.now();

      const requests = Array(concurrentRequests).fill().map(() =>
        request(app).get(`/api/validate/${TEST_USERS.valid}`)
      );

      await Promise.all(requests);

      const totalDuration = Date.now() - startTime;
      const avgDuration = totalDuration / concurrentRequests;

      expect(avgDuration).toBeLessThan(2000); // Average under 2 seconds
    });
  });
});