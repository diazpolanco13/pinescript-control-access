#!/usr/bin/env node

/**
 * 🔬 CALIBRATION TEST - Scientific TradingView Rate Limit Discovery
 * 
 * Este script encuentra los límites óptimos de TradingView mediante
 * pruebas incrementales y análisis de respuestas.
 * 
 * Usage: node scripts/calibration-test.js
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  // Start conservative, increase gradually
  initialConcurrency: 1,
  maxConcurrency: 30,
  concurrencyStep: 2,
  
  // Delays to test
  delaysToTest: [0, 50, 100, 200, 300, 500, 1000],
  
  // Test duration
  requestsPerTest: 20,
  
  // Test users (necesitamos usuarios reales)
  testUsers: ['apidevs', 'apidevelopers', 'TradingView'],
  testPineId: 'PUB;ebd861d70a9f478bb06fe60c5d8f469c',
  
  // Results file
  resultsFile: 'calibration-results.json'
};

// Results storage
const calibrationResults = {
  timestamp: new Date().toISOString(),
  tests: [],
  optimal: null,
  recommendations: {}
};

/**
 * Test a specific configuration
 */
async function testConfiguration(concurrency, delay, batchSize = 10) {
  console.log(`\n🧪 Testing: Concurrency=${concurrency}, Delay=${delay}ms, Batch=${batchSize}`);
  console.log('─'.repeat(60));
  
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;
  let rateLimitCount = 0;
  let timeouts = 0;
  const responseTimes = [];
  const errors = [];
  
  // Initialize service (necesitamos acceso al servicio)
  const tradingViewService = require('../src/services/tradingViewService');
  await tradingViewService.init();
  
  // Create test operations
  const operations = [];
  for (let i = 0; i < TEST_CONFIG.requestsPerTest; i++) {
    const user = TEST_CONFIG.testUsers[i % TEST_CONFIG.testUsers.length];
    operations.push({
      user,
      pineId: TEST_CONFIG.testPineId,
      index: i
    });
  }
  
  // Process with specified concurrency
  const results = [];
  for (let i = 0; i < operations.length; i += concurrency) {
    const batch = operations.slice(i, Math.min(i + concurrency, operations.length));
    
    const batchPromises = batch.map(async (op) => {
      const opStart = Date.now();
      try {
        // Validate user (lighter operation for testing)
        const isValid = await tradingViewService.validateUsername(op.user);
        const opTime = Date.now() - opStart;
        
        responseTimes.push(opTime);
        successCount++;
        
        return {
          success: true,
          time: opTime,
          user: op.user
        };
      } catch (error) {
        errorCount++;
        const opTime = Date.now() - opStart;
        
        // Analyze error type
        if (error.message?.includes('429') || error.message?.includes('rate')) {
          rateLimitCount++;
        } else if (error.message?.includes('timeout')) {
          timeouts++;
        }
        
        errors.push({
          user: op.user,
          error: error.message,
          time: opTime
        });
        
        return {
          success: false,
          error: error.message,
          time: opTime
        };
      }
    });
    
    // Wait for batch to complete
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);
    
    // Apply delay between batches
    if (delay > 0 && i + concurrency < operations.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  const totalTime = Date.now() - startTime;
  const avgResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 0;
  
  const testResult = {
    config: {
      concurrency,
      delay,
      batchSize
    },
    results: {
      totalRequests: TEST_CONFIG.requestsPerTest,
      successCount,
      errorCount,
      rateLimitCount,
      timeouts,
      successRate: (successCount / TEST_CONFIG.requestsPerTest) * 100,
      totalTime,
      avgResponseTime: Math.round(avgResponseTime),
      requestsPerSecond: (TEST_CONFIG.requestsPerTest / totalTime) * 1000
    },
    analysis: {
      stable: rateLimitCount === 0 && errorCount < 2,
      fast: avgResponseTime < 500,
      efficient: successCount >= TEST_CONFIG.requestsPerTest * 0.95
    }
  };
  
  // Display results
  console.log(`✅ Success: ${successCount}/${TEST_CONFIG.requestsPerTest} (${testResult.results.successRate.toFixed(1)}%)`);
  console.log(`❌ Errors: ${errorCount} (Rate limits: ${rateLimitCount}, Timeouts: ${timeouts})`);
  console.log(`⚡ Performance: ${testResult.results.requestsPerSecond.toFixed(2)} req/s`);
  console.log(`📏 Avg Response: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`⏱️  Total Time: ${totalTime}ms`);
  
  if (rateLimitCount > 0) {
    console.log(`⚠️  RATE LIMIT DETECTED - Too aggressive!`);
  }
  
  calibrationResults.tests.push(testResult);
  return testResult;
}

/**
 * Find optimal concurrency level
 */
async function findOptimalConcurrency() {
  console.log('🎯 PHASE 1: Finding Optimal Concurrency Level');
  console.log('='.repeat(70));
  
  let optimalConcurrency = 1;
  let lastGoodConfig = null;
  
  // Test increasing concurrency with moderate delay
  const testDelay = 100; // Fixed delay for concurrency testing
  
  for (let concurrency = TEST_CONFIG.initialConcurrency; 
       concurrency <= TEST_CONFIG.maxConcurrency; 
       concurrency += TEST_CONFIG.concurrencyStep) {
    
    const result = await testConfiguration(concurrency, testDelay);
    
    // If we hit rate limits or errors, we've gone too far
    if (result.results.rateLimitCount > 0 || result.results.errorCount > 2) {
      console.log(`\n🛑 Limit reached at concurrency=${concurrency}`);
      break;
    }
    
    // If this is better than last, update optimal
    if (result.analysis.stable && result.analysis.efficient) {
      optimalConcurrency = concurrency;
      lastGoodConfig = result;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n✅ Optimal Concurrency Found: ${optimalConcurrency}`);
  return optimalConcurrency;
}

/**
 * Find optimal delay for given concurrency
 */
async function findOptimalDelay(concurrency) {
  console.log(`\n🎯 PHASE 2: Finding Optimal Delay for Concurrency=${concurrency}`);
  console.log('='.repeat(70));
  
  let optimalDelay = 1000;
  let bestResult = null;
  
  // Test different delays
  for (const delay of TEST_CONFIG.delaysToTest) {
    const result = await testConfiguration(concurrency, delay);
    
    // Find the minimum delay that maintains stability
    if (result.analysis.stable && result.analysis.efficient) {
      if (!bestResult || result.results.requestsPerSecond > bestResult.results.requestsPerSecond) {
        optimalDelay = delay;
        bestResult = result;
      }
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n✅ Optimal Delay Found: ${optimalDelay}ms`);
  return { delay: optimalDelay, result: bestResult };
}

/**
 * Test edge cases
 */
async function testEdgeCases(optimalConfig) {
  console.log(`\n🎯 PHASE 3: Testing Edge Cases`);
  console.log('='.repeat(70));
  
  // Test 1: Burst mode (all at once)
  console.log('\n📊 Edge Case 1: Burst Mode (all parallel)');
  const burstResult = await testConfiguration(TEST_CONFIG.requestsPerTest, 0);
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 2: Conservative mode (sequential)
  console.log('\n📊 Edge Case 2: Conservative Mode (sequential)');
  const conservativeResult = await testConfiguration(1, 500);
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 3: Optimal config with more requests
  console.log('\n📊 Edge Case 3: Optimal Config with 2x load');
  const originalRequests = TEST_CONFIG.requestsPerTest;
  TEST_CONFIG.requestsPerTest = originalRequests * 2;
  const stressResult = await testConfiguration(optimalConfig.concurrency, optimalConfig.delay);
  TEST_CONFIG.requestsPerTest = originalRequests;
  
  return {
    burst: burstResult,
    conservative: conservativeResult,
    stress: stressResult
  };
}

/**
 * Generate recommendations
 */
function generateRecommendations(optimal, edgeCases) {
  const recommendations = {
    production: {
      maxConcurrent: Math.floor(optimal.concurrency * 0.8), // 80% of optimal for safety
      minDelay: optimal.delay,
      batchSize: Math.min(optimal.concurrency * 2, 20),
      circuitBreakerThreshold: 5,
      backoffMultiplier: 1.5
    },
    development: {
      maxConcurrent: optimal.concurrency,
      minDelay: Math.max(optimal.delay - 50, 0),
      batchSize: optimal.concurrency * 2,
      circuitBreakerThreshold: 3,
      backoffMultiplier: 2
    },
    conservative: {
      maxConcurrent: Math.max(Math.floor(optimal.concurrency * 0.5), 2),
      minDelay: optimal.delay * 2,
      batchSize: 5,
      circuitBreakerThreshold: 2,
      backoffMultiplier: 2
    }
  };
  
  // Add performance metrics
  recommendations.metrics = {
    expectedRequestsPerSecond: optimal.result.results.requestsPerSecond,
    avgResponseTime: optimal.result.results.avgResponseTime,
    successRate: optimal.result.results.successRate,
    canHandleBurst: edgeCases.burst.analysis.stable,
    stableUnderLoad: edgeCases.stress.analysis.stable
  };
  
  return recommendations;
}

/**
 * Main calibration process
 */
async function runCalibration() {
  console.log('🔬 TRADINGVIEW CALIBRATION TEST');
  console.log('📊 Finding optimal parameters for maximum performance');
  console.log('⏱️  This will take approximately 3-5 minutes\n');
  
  try {
    // Phase 1: Find optimal concurrency
    const optimalConcurrency = await findOptimalConcurrency();
    
    // Phase 2: Find optimal delay for that concurrency
    const { delay: optimalDelay, result: optimalResult } = await findOptimalDelay(optimalConcurrency);
    
    // Store optimal configuration
    calibrationResults.optimal = {
      concurrency: optimalConcurrency,
      delay: optimalDelay,
      result: optimalResult
    };
    
    // Phase 3: Test edge cases
    const edgeCases = await testEdgeCases({
      concurrency: optimalConcurrency,
      delay: optimalDelay
    });
    
    calibrationResults.edgeCases = edgeCases;
    
    // Generate recommendations
    calibrationResults.recommendations = generateRecommendations(
      calibrationResults.optimal,
      edgeCases
    );
    
    // Save results
    fs.writeFileSync(
      TEST_CONFIG.resultsFile,
      JSON.stringify(calibrationResults, null, 2)
    );
    
    // Display final report
    console.log('\n' + '='.repeat(70));
    console.log('📊 CALIBRATION COMPLETE - FINAL REPORT');
    console.log('='.repeat(70));
    
    console.log('\n🎯 OPTIMAL CONFIGURATION FOUND:');
    console.log(`   Concurrency: ${optimalConcurrency} parallel requests`);
    console.log(`   Delay: ${optimalDelay}ms between batches`);
    console.log(`   Performance: ${optimalResult.results.requestsPerSecond.toFixed(2)} req/s`);
    console.log(`   Success Rate: ${optimalResult.results.successRate.toFixed(1)}%`);
    console.log(`   Avg Response: ${optimalResult.results.avgResponseTime}ms`);
    
    console.log('\n📋 RECOMMENDED SETTINGS:');
    console.log('\n🏭 PRODUCTION (Conservative):');
    console.log(`   maxConcurrent: ${calibrationResults.recommendations.production.maxConcurrent}`);
    console.log(`   minDelay: ${calibrationResults.recommendations.production.minDelay}ms`);
    console.log(`   batchSize: ${calibrationResults.recommendations.production.batchSize}`);
    
    console.log('\n🚀 DEVELOPMENT (Aggressive):');
    console.log(`   maxConcurrent: ${calibrationResults.recommendations.development.maxConcurrent}`);
    console.log(`   minDelay: ${calibrationResults.recommendations.development.minDelay}ms`);
    console.log(`   batchSize: ${calibrationResults.recommendations.development.batchSize}`);
    
    console.log('\n📊 PERFORMANCE EXPECTATIONS:');
    console.log(`   Requests/second: ${calibrationResults.recommendations.metrics.expectedRequestsPerSecond.toFixed(2)}`);
    console.log(`   100 users estimate: ${(100 / calibrationResults.recommendations.metrics.expectedRequestsPerSecond).toFixed(1)}s`);
    console.log(`   1000 users estimate: ${(1000 / calibrationResults.recommendations.metrics.expectedRequestsPerSecond / 60).toFixed(1)} minutes`);
    
    console.log('\n⚠️  LIMITS DETECTED:');
    if (!calibrationResults.recommendations.metrics.canHandleBurst) {
      console.log('   ❌ Cannot handle burst traffic - use batching');
    } else {
      console.log('   ✅ Can handle moderate burst traffic');
    }
    
    if (!calibrationResults.recommendations.metrics.stableUnderLoad) {
      console.log('   ❌ Unstable under heavy load - increase delays');
    } else {
      console.log('   ✅ Stable under 2x load');
    }
    
    console.log(`\n💾 Results saved to: ${TEST_CONFIG.resultsFile}`);
    console.log('\n🎯 NEXT STEPS:');
    console.log('   1. Update RequestBatcher configuration with recommended values');
    console.log('   2. Test with real operations (not just validation)');
    console.log('   3. Monitor for rate limits in production');
    console.log('   4. Adjust based on time of day (TradingView may have variable limits)');
    
  } catch (error) {
    console.error('\n❌ Calibration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Calibration interrupted');
  
  // Save partial results
  if (calibrationResults.tests.length > 0) {
    fs.writeFileSync(
      'calibration-partial.json',
      JSON.stringify(calibrationResults, null, 2)
    );
    console.log('💾 Partial results saved to calibration-partial.json');
  }
  
  process.exit(0);
});

// Run calibration
if (require.main === module) {
  runCalibration().catch(console.error);
}

module.exports = { testConfiguration, findOptimalConcurrency };
