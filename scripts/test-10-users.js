#!/usr/bin/env node

/**
 * 🧪 TEST WITH 10 USERS - Realistic Performance Test
 * 
 * Tests the optimized system with 10 real users
 * Conserves the 1000 daily access limit per indicator
 * 
 * Usage: node scripts/test-10-users.js
 */

require('dotenv').config();
const fs = require('fs');
const tradingViewService = require('../src/services/tradingViewService');
const { bulkLogger } = require('../src/utils/logger');

// Test indicators - rotate if needed to avoid limits
const TEST_INDICATORS = [
  'PUB;ebd861d70a9f478bb06fe60c5d8f469c',  // Primary test indicator
  // Add more indicators here if we hit limits
  // 'PUB;xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  // 'PUB;yyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
];

async function runTest10Users() {
  console.log('🧪 PERFORMANCE TEST: 10 Real Users');
  console.log('='.repeat(70));
  console.log('📊 Testing optimized system with realistic load\n');

  try {
    // Load users
    const usersJson = fs.readFileSync('test_users.txt', 'utf8');
    const allUsers = JSON.parse(usersJson);
    
    // Select 10 random users for testing
    const testUsers = [];
    const usedIndices = new Set();
    
    while (testUsers.length < 10) {
      const randomIndex = Math.floor(Math.random() * allUsers.length);
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex);
        testUsers.push(allUsers[randomIndex]);
      }
    }

    console.log('👥 Selected Test Users:');
    testUsers.forEach((user, i) => console.log(`   ${i + 1}. ${user}`));
    console.log('');

    // Use primary test indicator
    const pineIds = [TEST_INDICATORS[0]];
    const duration = '1D'; // 1 day access for testing

    const totalOperations = testUsers.length * pineIds.length;
    console.log(`📊 Test Configuration:`);
    console.log(`   Users: ${testUsers.length}`);
    console.log(`   Indicators: ${pineIds.length}`);
    console.log(`   Total Operations: ${totalOperations}`);
    console.log(`   Duration: ${duration}`);
    console.log(`   Daily Limit Usage: ${totalOperations}/1000 (${(totalOperations/10).toFixed(1)}%)\n`);

    // Initialize service
    await tradingViewService.init();
    console.log('✅ Service initialized\n');

    // VALIDATE USERS FIRST
    console.log('🔍 VALIDATING USERS...');
    const validUsers = [];
    const invalidUsers = [];
    
    for (const user of testUsers) {
      try {
        const isValid = await tradingViewService.validateUsername(user);
        if (isValid) {
          validUsers.push(user);
          console.log(`   ✅ ${user} - Valid`);
        } else {
          invalidUsers.push(user);
          console.log(`   ❌ ${user} - Invalid`);
        }
      } catch (error) {
        invalidUsers.push(user);
        console.log(`   ❌ ${user} - Error validating`);
      }
    }
    
    console.log(`\n📊 Validation Results:`);
    console.log(`   Valid: ${validUsers.length}/${testUsers.length}`);
    console.log(`   Invalid: ${invalidUsers.length}/${testUsers.length}`);
    
    if (validUsers.length === 0) {
      console.log('\n❌ No valid users found! Aborting test.');
      console.log('💡 The selected users might not exist on TradingView.');
      return;
    }
    
    if (invalidUsers.length > 0) {
      console.log(`\n⚠️  Continuing with ${validUsers.length} valid users only`);
    }
    
    // Update test users to only valid ones
    const finalTestUsers = validUsers;
    const finalTotalOperations = finalTestUsers.length * pineIds.length;
    
    console.log(`\n📊 Final Test Configuration:`);
    console.log(`   Valid Users: ${finalTestUsers.length}`);
    console.log(`   Indicators: ${pineIds.length}`);
    console.log(`   Total Operations: ${finalTotalOperations}`);
    console.log(`   Daily Limit Usage: ${finalTotalOperations}/1000 (${(finalTotalOperations/10).toFixed(1)}%)\n`);

    // Check if we should use FAST MODE or STANDARD MODE
    const willUseFastMode = finalTestUsers.length <= 5;
    console.log(`🚀 Mode: ${willUseFastMode ? 'FAST MODE (≤5 users)' : 'STANDARD MODE (>5 users)'}`);
    console.log(`   Expected time: ${willUseFastMode ? '<1 second' : '~1-2 seconds'}\n`);

    // Progress callback
    let progressUpdates = 0;
    const progressCallback = (processed, total, successCount, errorCount) => {
      progressUpdates++;
      const progress = Math.round((processed / total) * 100);
      const elapsed = Date.now() - startTime;
      const opsPerSecond = processed > 0 ? (processed / (elapsed / 1000)).toFixed(2) : 0;
      
      console.log(`📈 Progress: ${processed}/${total} (${progress}%) - ✅ ${successCount} ❌ ${errorCount} - ⚡ ${opsPerSecond} ops/s`);
    };

    console.log('⏱️  STARTING OPTIMIZED TEST...\n');
    const startTime = Date.now();

    // Run the bulk operation
    const result = await tradingViewService.bulkGrantAccess(
      finalTestUsers, // Use only validated users
      pineIds,
      duration,
      {
        onProgress: progressCallback,
        preValidateUsers: false // Already validated above
      }
    );

    const totalTime = Date.now() - startTime;
    const opsPerSecond = (result.total / (totalTime / 1000)).toFixed(2);

    // Display results
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(70));
    
    console.log('\n⏱️  PERFORMANCE:');
    console.log(`   Total Time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    console.log(`   Operations/Second: ${opsPerSecond}`);
    console.log(`   Avg Time per User: ${(totalTime / testUsers.length).toFixed(0)}ms`);
    
    console.log('\n✅ RESULTS:');
    console.log(`   Successful: ${result.success}/${result.total} (${result.successRate}%)`);
    console.log(`   Failed: ${result.errors}`);
    if (invalidUsers.length > 0) {
      console.log(`   Skipped Invalid Users: ${invalidUsers.length} (${invalidUsers.join(', ')})`);
    }
    
    if (result.batcherStats) {
      console.log('\n🤖 BATCHER STATS:');
      console.log(`   Batches Processed: ${result.batcherStats.batchesProcessed}`);
      console.log(`   Avg Response Time: ${result.batcherStats.avgResponseTime}ms`);
      console.log(`   Final Delay: ${result.batcherStats.finalDelay}ms`);
      console.log(`   Circuit Breaker: ${result.batcherStats.circuitBreakerActivated ? '⚠️ ACTIVATED' : '✅ OK'}`);
    }

    // Performance analysis
    console.log('\n📈 PERFORMANCE ANALYSIS:');
    
    const expectedTimeOld = testUsers.length * 2000; // ~2s per user (old system)
    const speedup = (expectedTimeOld / totalTime).toFixed(1);
    
    console.log(`   Old System (estimated): ~${(expectedTimeOld/1000).toFixed(0)}s`);
    console.log(`   New System (actual): ${(totalTime/1000).toFixed(2)}s`);
    console.log(`   Speedup: ${speedup}x faster! 🚀`);
    
    // Extrapolations
    console.log('\n🔮 EXTRAPOLATIONS:');
    const timeFor100 = (100 / testUsers.length) * totalTime;
    const timeFor1000 = (1000 / testUsers.length) * totalTime;
    
    console.log(`   100 users: ~${(timeFor100/1000).toFixed(0)}s (${(timeFor100/1000/60).toFixed(1)} minutes)`);
    console.log(`   1000 users: ~${(timeFor1000/1000).toFixed(0)}s (${(timeFor1000/1000/60).toFixed(1)} minutes)`);
    
    // Daily limit calculation
    console.log('\n📊 DAILY LIMIT MANAGEMENT:');
    const operationsUsed = totalOperations;
    const remainingToday = 1000 - operationsUsed;
    const testsRemaining = Math.floor(remainingToday / totalOperations);
    
    console.log(`   Operations used: ${operationsUsed}/1000`);
    console.log(`   Remaining today: ${remainingToday}`);
    console.log(`   Tests remaining: ${testsRemaining} more tests possible today`);
    
    // Success evaluation
    console.log('\n🎯 EVALUATION:');
    if (result.successRate === 100 && totalTime < 2000) {
      console.log('   🏆 EXCELLENT! Perfect success rate with amazing speed!');
      console.log('   ✅ System is production ready');
    } else if (result.successRate >= 95 && totalTime < 5000) {
      console.log('   ✅ VERY GOOD! High success rate with good speed');
      console.log('   ✅ System is stable and fast');
    } else if (result.successRate >= 90) {
      console.log('   ⚠️ GOOD but could be better');
      console.log('   💡 Consider adjusting delays or concurrency');
    } else {
      console.log('   ❌ NEEDS IMPROVEMENT');
      console.log('   💡 Check for rate limits or errors');
    }
    
    // Show failed users if any
    if (result.errors > 0) {
      console.log('\n❌ FAILED OPERATIONS:');
      const failedOps = result.results?.filter(r => r.status !== 'Success').slice(0, 5);
      failedOps?.forEach(op => {
        console.log(`   - ${op.username}: ${op.error || 'Unknown error'}`);
      });
      if (result.errors > 5) {
        console.log(`   ... and ${result.errors - 5} more`);
      }
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (totalTime < 1000) {
      console.log('   🚀 Performance is EXCELLENT - no changes needed');
    } else if (totalTime < 3000) {
      console.log('   ✅ Performance is good - system is well optimized');
    } else {
      console.log('   ⚠️ Performance could be improved');
      console.log('   💡 Try increasing concurrency or reducing delays');
    }
    
    // Next steps
    console.log('\n📝 NEXT STEPS:');
    console.log('   1. If results are good, test with more users (20-30)');
    console.log('   2. Test REMOVE operations (equally important)');
    console.log('   3. Test mixed operations (grant + remove)');
    console.log('   4. Monitor for any rate limit patterns');
    
    return result;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  process.exit(0);
});

// Run test
if (require.main === module) {
  runTest10Users()
    .then(() => {
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test error:', error);
      process.exit(1);
    });
}

module.exports = { runTest10Users };
