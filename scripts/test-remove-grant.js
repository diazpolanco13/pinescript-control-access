#!/usr/bin/env node

/**
 * 🔄 TEST REMOVE + GRANT - Complete cycle test
 * 
 * Tests removing access first, then granting it again
 * This ensures we're testing real operations, not hitting "already has access" issues
 * 
 * Usage: node scripts/test-remove-grant.js
 */

require('dotenv').config();
const fs = require('fs');
const tradingViewService = require('../src/services/tradingViewService');
const { bulkLogger } = require('../src/utils/logger');

async function testRemoveAndGrant() {
  console.log('🔄 REMOVE + GRANT TEST - Complete Access Cycle');
  console.log('='.repeat(70));
  console.log('This test will REMOVE access first, then GRANT it again\n');

  try {
    // Load users
    const usersJson = fs.readFileSync('test_users.txt', 'utf8');
    const allUsers = JSON.parse(usersJson);
    
    // Select 10 random users
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

    const pineIds = ['PUB;ebd861d70a9f478bb06fe60c5d8f469c'];
    const duration = '7D'; // 7 days for better testing

    // Initialize service
    await tradingViewService.init();
    console.log('✅ Service initialized');
    
    // Check authentication
    const isAuth = tradingViewService.isAuthenticated();
    if (!isAuth) {
      console.log('❌ Not authenticated! Update cookies from admin panel.');
      return;
    }
    
    const profile = await tradingViewService.getProfileData();
    console.log(`✅ Authenticated as: @${profile.username}\n`);

    // PHASE 1: VALIDATE USERS
    console.log('🔍 PHASE 1: VALIDATING USERS');
    console.log('─'.repeat(50));
    
    const validUsers = [];
    const invalidUsers = [];
    
    for (const user of testUsers) {
      try {
        const isValid = await tradingViewService.validateUsername(user);
        if (isValid) {
          validUsers.push(user);
          console.log(`   ✅ ${user}`);
        } else {
          invalidUsers.push(user);
          console.log(`   ❌ ${user} - Invalid`);
        }
      } catch (error) {
        invalidUsers.push(user);
        console.log(`   ❌ ${user} - Error`);
      }
    }
    
    console.log(`\nResults: ${validUsers.length} valid, ${invalidUsers.length} invalid`);
    
    if (validUsers.length === 0) {
      console.log('❌ No valid users found!');
      return;
    }
    
    const finalUsers = validUsers;
    console.log(`\n📊 Working with ${finalUsers.length} valid users\n`);

    // PHASE 2: REMOVE ACCESS
    console.log('🗑️ PHASE 2: REMOVING ACCESS (Cleanup)');
    console.log('─'.repeat(50));
    
    const removeStartTime = Date.now();
    
    const removeResult = await tradingViewService.bulkRemoveAccess(
      finalUsers,
      pineIds,
      {
        preValidateUsers: false,
        onProgress: (processed, total, success, errors) => {
          const progress = Math.round((processed / total) * 100);
          console.log(`   Removing: ${processed}/${total} (${progress}%) - ✅ ${success} ❌ ${errors}`);
        }
      }
    );
    
    const removeTime = Date.now() - removeStartTime;
    
    console.log(`\n📊 Remove Results:`);
    console.log(`   Time: ${removeTime}ms (${(removeTime/1000).toFixed(2)}s)`);
    console.log(`   Success: ${removeResult.success}/${removeResult.total} (${removeResult.successRate}%)`);
    console.log(`   Speed: ${(removeResult.total / (removeTime / 1000)).toFixed(2)} ops/s`);
    
    // Wait a bit before granting
    console.log('\n⏳ Waiting 2 seconds before granting access...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // PHASE 3: GRANT ACCESS
    console.log('✅ PHASE 3: GRANTING ACCESS (Testing Speed)');
    console.log('─'.repeat(50));
    
    const grantStartTime = Date.now();
    
    const grantResult = await tradingViewService.bulkGrantAccess(
      finalUsers,
      pineIds,
      duration,
      {
        preValidateUsers: false,
        onProgress: (processed, total, success, errors) => {
          const progress = Math.round((processed / total) * 100);
          console.log(`   Granting: ${processed}/${total} (${progress}%) - ✅ ${success} ❌ ${errors}`);
        }
      }
    );
    
    const grantTime = Date.now() - grantStartTime;
    
    console.log(`\n📊 Grant Results:`);
    console.log(`   Time: ${grantTime}ms (${(grantTime/1000).toFixed(2)}s)`);
    console.log(`   Success: ${grantResult.success}/${grantResult.total} (${grantResult.successRate}%)`);
    console.log(`   Speed: ${(grantResult.total / (grantTime / 1000)).toFixed(2)} ops/s`);
    
    // FINAL ANALYSIS
    console.log('\n' + '='.repeat(70));
    console.log('📊 COMPLETE CYCLE ANALYSIS');
    console.log('='.repeat(70));
    
    const totalTime = removeTime + grantTime + 2000; // Including wait time
    const totalOps = removeResult.total + grantResult.total;
    
    console.log('\n🔄 COMPLETE CYCLE:');
    console.log(`   Total Operations: ${totalOps}`);
    console.log(`   Total Time: ${(totalTime/1000).toFixed(2)}s`);
    console.log(`   Remove Time: ${(removeTime/1000).toFixed(2)}s`);
    console.log(`   Grant Time: ${(grantTime/1000).toFixed(2)}s`);
    console.log(`   Average Speed: ${(totalOps / (totalTime / 1000)).toFixed(2)} ops/s`);
    
    console.log('\n📈 PERFORMANCE COMPARISON:');
    const oldSystemTime = finalUsers.length * 4000; // ~4s per user (old system estimate)
    const speedup = (oldSystemTime / grantTime).toFixed(1);
    console.log(`   Old System (estimated): ~${(oldSystemTime/1000).toFixed(0)}s`);
    console.log(`   New System (actual): ${(grantTime/1000).toFixed(2)}s`);
    console.log(`   Speedup: ${speedup}x faster! 🚀`);
    
    console.log('\n✅ SUCCESS RATES:');
    console.log(`   Remove Success: ${removeResult.successRate}%`);
    console.log(`   Grant Success: ${grantResult.successRate}%`);
    console.log(`   Overall Success: ${((removeResult.successRate + grantResult.successRate) / 2).toFixed(1)}%`);
    
    // Evaluation
    console.log('\n🎯 EVALUATION:');
    if (grantResult.successRate >= 95 && grantTime < 3000) {
      console.log('   🏆 EXCELLENT! System is working perfectly!');
      console.log('   ✅ Optimizations are highly effective');
      console.log('   ✅ Ready for production use');
    } else if (grantResult.successRate >= 80) {
      console.log('   ✅ GOOD! System is working well');
      console.log('   💡 Minor adjustments might improve performance');
    } else {
      console.log('   ⚠️ NEEDS ATTENTION');
      console.log('   💡 Check for errors or rate limits');
    }
    
    // Daily limit info
    const opsUsed = totalOps;
    const remaining = 1000 - opsUsed;
    console.log('\n📊 DAILY LIMIT STATUS:');
    console.log(`   Operations Used: ${opsUsed}/1000 (${(opsUsed/10).toFixed(1)}%)`);
    console.log(`   Remaining: ${remaining}`);
    console.log(`   Tests Remaining: ~${Math.floor(remaining / (finalUsers.length * 2))} full cycles`);
    
    return { removeResult, grantResult };

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
  testRemoveAndGrant()
    .then(() => {
      console.log('\n✅ Complete cycle test finished successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test error:', error);
      process.exit(1);
    });
}

module.exports = { testRemoveAndGrant };
