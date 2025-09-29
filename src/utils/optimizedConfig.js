/**
 * 🚀 OPTIMIZED CONFIGURATION
 * Based on calibration results from September 29, 2025
 * 
 * Calibration found TradingView can handle:
 * - Up to 29 concurrent requests without rate limits
 * - 0ms delay between requests works fine
 * - 100% success rate with proper configuration
 */

module.exports = {
  // 🏭 PRODUCTION CONFIGURATION (80% of optimal for safety)
  production: {
    maxConcurrent: 23,        // Was 4, now 23 (5.75x improvement!)
    batchSize: 20,           // Was 8, now 20 (2.5x improvement!)
    minDelay: 100,           // Keep 100ms for stability
    maxDelay: 5000,          // Keep max delay for backoff
    circuitBreakerThreshold: 5,
    backoffMultiplier: 1.5,
    
    // Expected performance
    expectedPerformance: {
      requestsPerSecond: 14.58,
      estimatedTime100Users: '7 seconds',
      estimatedTime1000Users: '69 seconds',
      estimatedTime25000Operations: '29 minutes'
    }
  },

  // 🚀 DEVELOPMENT CONFIGURATION (Full optimal)
  development: {
    maxConcurrent: 29,        // Was 4, now 29 (7.25x improvement!)
    batchSize: 58,           // Was 8, now 58 (7.25x improvement!)
    minDelay: 50,            // Reduced from 300ms to 50ms
    maxDelay: 3000,          // Reduced max delay
    circuitBreakerThreshold: 3,
    backoffMultiplier: 2,
    
    // Expected performance
    expectedPerformance: {
      requestsPerSecond: 17.47,  // Peak performance
      estimatedTime100Users: '6 seconds',
      estimatedTime1000Users: '57 seconds',
      estimatedTime25000Operations: '24 minutes'
    }
  },

  // 🛡️ CONSERVATIVE CONFIGURATION (50% of optimal)
  conservative: {
    maxConcurrent: 14,        // Was 4, now 14 (3.5x improvement!)
    batchSize: 5,            // Keep conservative batch size
    minDelay: 200,           // Conservative delay
    maxDelay: 10000,         // Higher max for safety
    circuitBreakerThreshold: 2,
    backoffMultiplier: 2,
    
    // Expected performance
    expectedPerformance: {
      requestsPerSecond: 7.25,
      estimatedTime100Users: '14 seconds',
      estimatedTime1000Users: '138 seconds',
      estimatedTime25000Operations: '57 minutes'
    }
  },

  // 🎯 FAST MODE CONFIGURATION (for ≤5 users)
  fastMode: {
    threshold: 5,            // Use FAST mode for ≤5 users
    maxConcurrent: 20,       // Can handle burst of 20 parallel
    delay: 0,               // No delay needed for small operations
    
    // Expected performance
    expectedPerformance: {
      time5Users: '0.3 seconds',  // Near instant
      time2Users: '0.15 seconds'   // Basically instant
    }
  },

  // 📊 CALIBRATION RESULTS SUMMARY
  calibrationSummary: {
    date: '2025-09-29',
    maxTestedConcurrency: 29,
    rateLimitsDetected: false,
    optimalConcurrency: 29,
    optimalDelay: 100,
    peakPerformance: '17.47 req/s',
    stablePerformance: '14.58 req/s',
    successRate: '100%',
    
    keyFindings: [
      'TradingView accepts up to 29 parallel requests without rate limiting',
      'No delay required between requests (0ms works)',
      '100ms delay provides best stability/performance balance',
      'System can handle burst traffic (20 parallel with 0 delay)',
      'Current configuration uses only 14% of available capacity'
    ],
    
    improvements: {
      concurrency: '7.25x improvement possible (4 → 29)',
      batchSize: '7.25x improvement possible (8 → 58)',
      delay: '6x improvement possible (300ms → 50ms)',
      overallSpeed: 'Up to 10x faster for typical operations'
    }
  }
};
