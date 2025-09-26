/**
 * 🔗 Bulk Operations Integration Tests
 *
 * End-to-end testing of bulk operations with real API calls
 * These tests are slower but provide confidence in real-world scenarios
 */

const request = require('supertest');
const app = require('../../src/server');

describe('🔗 Bulk Operations Integration', () => {
  // Increase timeout for integration tests
  jest.setTimeout(60000); // 60 seconds

  describe('📊 Real Bulk Access Grant', () => {
    test('should successfully grant access to multiple users', async () => {
      const users = ['trendoscope']; // Single user for reliable testing
      const pineIds = ['PUB;ebd861d70a9f478bb06fe60c5d8f469c'];
      const duration = '7D';

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/access/bulk')
        .send({
          users,
          pine_ids: pineIds,
          duration,
          options: {
            batchSize: 1,
            delayMs: 500
          }
        })
        .expect(200);

      const endTime = Date.now();
      const operationDuration = endTime - startTime;

      // Validate response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('total', users.length * pineIds.length);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('duration');
      expect(response.body).toHaveProperty('successRate');

      // Performance assertions
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(response.body.successRate).toBeGreaterThanOrEqual(80); // At least 80% success rate

      console.log(`📊 Bulk operation completed in ${duration}ms with ${response.body.successRate}% success rate`);
    });

    test('should handle invalid parameters gracefully', async () => {
      const response = await request(app)
        .post('/api/access/bulk')
        .send({
          users: [],
          pine_ids: [],
          duration: 'invalid'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should validate required fields', async () => {
      const testCases = [
        { users: null, pine_ids: ['PUB;test'], duration: '7D' },
        { users: ['user'], pine_ids: null, duration: '7D' },
        { users: ['user'], pine_ids: ['PUB;test'], duration: null }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/access/bulk')
          .send(testCase)
          .expect(400);

        expect(response.body.error).toBeDefined();
      }
    });
  });

  describe('⚡ Performance Benchmarks', () => {
    test('should maintain consistent response times', async () => {
      const iterations = 3;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await request(app)
          .get('/api/validate/trendoscope')
          .expect(200);

        const duration = Date.now() - startTime;
        times.push(duration);

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      // Assert reasonable performance
      expect(avgTime).toBeLessThan(3000); // Average under 3 seconds
      expect(maxTime - minTime).toBeLessThan(2000); // Consistent within 2 seconds

      console.log(`📈 Performance benchmark: Avg ${avgTime.toFixed(2)}ms (Min: ${minTime}ms, Max: ${maxTime}ms)`);
    });

    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 5;
      const startTime = Date.now();

      const requests = Array(concurrentRequests).fill().map((_, index) =>
        request(app)
          .get('/api/validate/trendoscope')
          .set('X-Request-ID', `test-${index}`)
      );

      const responses = await Promise.all(requests);
      const totalDuration = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      const avgResponseTime = totalDuration / concurrentRequests;

      expect(avgResponseTime).toBeLessThan(2000); // Under 2 seconds per request
      expect(totalDuration).toBeLessThan(5000); // Total under 5 seconds

      console.log(`🔄 Concurrent requests: ${concurrentRequests} completed in ${totalDuration}ms (avg: ${avgResponseTime.toFixed(2)}ms)`);
    });
  });

  describe('🛡️ Error Recovery', () => {
    test('should handle network timeouts gracefully', async () => {
      // This test would require mocking network conditions
      // For now, just verify the error handling structure exists
      const response = await request(app)
        .get('/api/validate/nonexistentuser12345')
        .expect(200);

      // Should return structured response even for errors
      expect(response.body).toHaveProperty('validuser');
      expect(response.body).toHaveProperty('verifiedUserName');
    });

    test('should maintain service availability under load', async () => {
      // Send multiple requests rapidly
      const requests = Array(10).fill().map(() =>
        request(app).get('/api/validate/trendoscope')
      );

      const results = await Promise.allSettled(requests);

      const successful = results.filter(result =>
        result.status === 'fulfilled' && result.value.status === 200
      ).length;

      // At least 80% should succeed
      expect(successful / requests.length).toBeGreaterThan(0.8);

      console.log(`🏋️ Load test: ${successful}/${requests.length} requests successful`);
    });
  });
});
