/**
 * 🚀 Smoke Tests - Critical Path Validation
 *
 * Fast, reliable tests that validate core functionality
 * These tests should always pass and run quickly
 */

const request = require('supertest');
const app = require('../src/server');

describe('🚀 Smoke Tests - Core Functionality', () => {
  test('✅ Server starts and responds to health check', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'running');
    expect(response.body).toHaveProperty('version');
  });

  test('✅ API has all required endpoints documented', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    expect(response.body.endpoints).toHaveProperty('validate');
    expect(response.body.endpoints).toHaveProperty('access');
    expect(response.body.endpoints).toHaveProperty('bulk');
  });

  test('✅ Invalid endpoints return proper 404', async () => {
    const response = await request(app)
      .get('/nonexistent-endpoint')
      .expect(404);

    expect(response.body).toHaveProperty('error', 'Endpoint not found');
  });

  test('✅ Rate limiting is active', async () => {
    // Make several requests quickly
    const promises = Array(10).fill().map(() =>
      request(app).get('/api/validate/testuser')
    );

    const results = await Promise.allSettled(promises);
    const rateLimited = results.some(result =>
      result.status === 'fulfilled' && result.value.status === 429
    );

    // Should trigger rate limiting
    expect(rateLimited).toBe(true);
  });

  test('✅ Bulk endpoint accepts proper payload structure', async () => {
    const response = await request(app)
      .post('/api/access/bulk')
      .set('X-API-Key', 'your_ultra_secure_api_key_2025')
      .send({
        users: ['test'],
        pine_ids: ['PUB;test'],
        duration: '7D'
      })
      .expect(200);

    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('total');
  });

  test('✅ Bulk endpoint rejects invalid payload', async () => {
    const response = await request(app)
      .post('/api/access/bulk')
      .set('X-API-Key', 'your_ultra_secure_api_key_2025')
      .send({})
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('✅ Performance: Simple requests complete within 2 seconds', async () => {
    const startTime = Date.now();

    await request(app)
      .get('/')
      .expect(200);

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(2000);
  });
});
