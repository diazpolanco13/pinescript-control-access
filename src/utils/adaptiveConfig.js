/**
 * 🎯 ADAPTIVE CONFIGURATION
 * Based on real-world testing with rate limits
 * 
 * TradingView has different limits for different operations:
 * - Validation: Very permissive (29+ concurrent OK)
 * - Remove: Permissive (10+ concurrent OK)  
 * - Grant: Restrictive (triggers 429 with high concurrency)
 */

module.exports = {
  // Operation-specific configurations
  operations: {
    // VALIDATION - Very permissive
    validate: {
      maxConcurrent: 20,
      minDelay: 0,
      batchSize: 30,
      description: 'User validation - TradingView is very permissive'
    },
    
    // REMOVE ACCESS - Moderately permissive
    remove: {
      maxConcurrent: 10,
      minDelay: 50,
      batchSize: 15,
      description: 'Remove access - TradingView allows good concurrency'
    },
    
    // GRANT ACCESS - Restrictive (triggers rate limits)
    grant: {
      maxConcurrent: 5,  // Reduced from 29 to avoid 429 errors
      minDelay: 200,     // Increased delay to avoid rate limits
      batchSize: 5,      // Smaller batches for stability
      description: 'Grant access - TradingView has strict rate limits'
    },
    
    // MIXED OPERATIONS - Conservative
    mixed: {
      maxConcurrent: 4,
      minDelay: 300,
      batchSize: 5,
      description: 'Mixed operations - Conservative for stability'
    }
  },
  
  // Adaptive settings based on response
  adaptive: {
    // If we get 429 errors, apply these multipliers
    rateLimitBackoff: {
      delayMultiplier: 2,      // Double the delay
      concurrencyDivisor: 2,   // Half the concurrency
      cooldownPeriod: 5000     // Wait 5 seconds before resuming
    },
    
    // If operations are succeeding, gradually increase speed
    successAcceleration: {
      delayMultiplier: 0.9,    // Reduce delay by 10%
      concurrencyMultiplier: 1.1, // Increase concurrency by 10%
      maxConcurrent: 10,       // Never exceed this for grant operations
      minDelay: 100            // Never go below this for grant operations
    }
  },
  
  // Smart mode selection
  selectConfig(operation, userCount) {
    // For small operations, use FAST mode regardless
    if (userCount <= 3) {
      return {
        maxConcurrent: userCount,
        minDelay: 0,
        batchSize: userCount,
        mode: 'FAST'
      };
    }
    
    // For larger operations, use operation-specific config
    const config = this.operations[operation] || this.operations.mixed;
    
    // Adjust based on user count
    if (userCount <= 10) {
      return {
        ...config,
        maxConcurrent: Math.min(config.maxConcurrent, userCount),
        mode: 'OPTIMIZED'
      };
    }
    
    // For very large operations, be more conservative
    if (userCount > 100) {
      return {
        ...config,
        maxConcurrent: Math.min(config.maxConcurrent, 3),
        minDelay: config.minDelay * 1.5,
        mode: 'CONSERVATIVE'
      };
    }
    
    return { ...config, mode: 'STANDARD' };
  },
  
  // Performance expectations with adaptive config
  expectedPerformance: {
    validate: {
      '10_users': '0.5 seconds',
      '100_users': '5 seconds',
      '1000_users': '50 seconds'
    },
    remove: {
      '10_users': '2 seconds',
      '100_users': '20 seconds',
      '1000_users': '200 seconds'
    },
    grant: {
      '10_users': '5-10 seconds (with rate limit handling)',
      '100_users': '50-100 seconds',
      '1000_users': '500-1000 seconds'
    }
  },
  
  // Summary of findings
  findings: {
    date: '2025-09-29',
    key_discoveries: [
      'TradingView has different rate limits per operation type',
      'Validation is nearly unlimited (29+ concurrent OK)',
      'Remove operations are moderately permissive',
      'Grant operations trigger 429 errors with high concurrency',
      'Retry mechanism successfully handles 429 errors',
      'System achieves 100% success rate with proper retry logic'
    ],
    recommendations: [
      'Use different configurations per operation type',
      'Keep grant operations at 5 concurrent max',
      'Implement adaptive throttling based on 429 responses',
      'Monitor and adjust based on time of day',
      'Consider caching validation results'
    ]
  }
};
