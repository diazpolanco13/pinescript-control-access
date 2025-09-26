/**
 * TradingView API Tests
 * Basic functionality tests for the Node.js implementation
 */

const request = require('supertest');
const app = require('../src/server');
const tradingViewService = require('../src/services/tradingViewService');

describe('TradingView Access Management API', () => {
  beforeAll(async () => {
    // Initialize service before tests
    await tradingViewService.init();
  }, 30000); // 30 second timeout for initialization

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version', '2.0.0');
      expect(response.body).toHaveProperty('status', 'running');
    });
  });

  describe('GET /api/validate/:username', () => {
    it('should validate existing username', async () => {
      const response = await request(app)
        .get('/api/validate/trendoscope')
        .expect(200);

      expect(response.body).toHaveProperty('validuser');
      expect(response.body).toHaveProperty('verifiedUserName');
    });

    it('should handle invalid username', async () => {
      const response = await request(app)
        .get('/api/validate/nonexistentuser12345')
        .expect(200);

      expect(response.body).toHaveProperty('validuser', false);
      expect(response.body).toHaveProperty('verifiedUserName', '');
    });
  });

  describe('GET /api/access/:username', () => {
    it('should get access details', async () => {
      const response = await request(app)
        .get('/api/access/trendoscope')
        .send({
          pine_ids: ['PUB;ebd861d70a9f478bb06fe60c5d8f469c']
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('pine_id');
      expect(response.body[0]).toHaveProperty('username');
      expect(response.body[0]).toHaveProperty('hasAccess');
    });

    it('should handle missing pine_ids', async () => {
      const response = await request(app)
        .get('/api/access/trendoscope')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/unknown-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Endpoint not found');
    });
  });
});

// Performance test for bulk operations (if needed)
/*
describe('Bulk Operations Performance', () => {
  it('should handle bulk access grant efficiently', async () => {
    const users = ['user1', 'user2', 'user3'];
    const pineIds = ['PUB;test1', 'PUB;test2'];

    const startTime = Date.now();

    const response = await request(app)
      .post('/api/access/bulk')
      .send({
        users,
        pine_ids: pineIds,
        duration: '7D'
      })
      .expect(200);

    const duration = Date.now() - startTime;

    expect(response.body).toHaveProperty('success', true);
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
  });
});
*/
