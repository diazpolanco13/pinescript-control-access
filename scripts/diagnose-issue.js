#!/usr/bin/env node

/**
 * 🔍 DIAGNOSE ISSUE - Debug grant access problems
 * 
 * Tests individual operations to identify the exact problem
 * Usage: node scripts/diagnose-issue.js
 */

require('dotenv').config();
const tradingViewService = require('../src/services/tradingViewService');

async function diagnoseIssue() {
  console.log('🔍 DIAGNOSTIC TEST - Finding Grant Access Issues');
  console.log('='.repeat(70));
  
  try {
    // Test users - mix of likely valid and potentially problematic
    const testUsers = [
      'apidevs',           // Known good user
      'TradingView',       // Official account
      'appleemail1196',    // User that failed in previous test
      'ALEX-GARCIA'        // Random user from list
    ];
    
    const testPineId = 'PUB;ebd861d70a9f478bb06fe60c5d8f469c';
    const duration = '1D';
    
    // Initialize service
    await tradingViewService.init();
    console.log('✅ Service initialized\n');
    
    // Check authentication status
    console.log('🔐 CHECKING AUTHENTICATION:');
    const isAuth = tradingViewService.isAuthenticated();
    console.log(`   Authenticated: ${isAuth ? '✅ YES' : '❌ NO'}`);
    
    if (!isAuth) {
      console.log('\n❌ NOT AUTHENTICATED!');
      console.log('💡 You need to update cookies from the admin panel:');
      console.log('   1. Go to http://localhost:5001/admin');
      console.log('   2. Update sessionid and sessionid_sign cookies');
      return;
    }
    
    // Get profile data to verify session
    try {
      const profile = await tradingViewService.getProfileData();
      if (profile) {
        console.log(`   Logged in as: @${profile.username}`);
        console.log(`   Partner Status: ${profile.partner_status === 1 ? '✅' : '❌'}`);
      }
    } catch (e) {
      console.log('   ⚠️  Could not get profile data');
    }
    console.log('');
    
    // Test each user individually
    console.log('🧪 TESTING INDIVIDUAL OPERATIONS:\n');
    
    for (const username of testUsers) {
      console.log(`Testing: ${username}`);
      console.log('-'.repeat(40));
      
      // Step 1: Validate user
      console.log('1️⃣ Validating user...');
      let isValid = false;
      try {
        isValid = await tradingViewService.validateUsername(username);
        console.log(`   Result: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
      } catch (error) {
        console.log(`   Error: ${error.message}`);
      }
      
      if (!isValid) {
        console.log('   ⏭️  Skipping invalid user\n');
        continue;
      }
      
      // Step 2: Get current access details
      console.log('2️⃣ Getting current access...');
      let accessDetails = null;
      try {
        accessDetails = await tradingViewService.getAccessDetails(username, testPineId);
        console.log(`   Has Access: ${accessDetails.hasAccess ? '✅ YES' : '❌ NO'}`);
        if (accessDetails.hasAccess) {
          console.log(`   Expires: ${accessDetails.currentExpiration || 'Never'}`);
        }
      } catch (error) {
        console.log(`   Error: ${error.message}`);
      }
      
      // Step 3: Try to grant access
      console.log('3️⃣ Attempting to grant access...');
      try {
        const startTime = Date.now();
        const result = await tradingViewService.grantAccess(username, testPineId, duration);
        const elapsed = Date.now() - startTime;
        
        console.log(`   Status: ${result.status}`);
        console.log(`   Time: ${elapsed}ms`);
        
        if (result.status === 'Success') {
          console.log(`   ✅ SUCCESS - Access granted`);
          if (result.expiration) {
            console.log(`   New Expiration: ${result.expiration}`);
          }
        } else if (result.status === 'Not Applied') {
          console.log(`   ⚠️  NOT APPLIED - Access not granted`);
          console.log(`   💡 Possible reasons:`);
          console.log(`      - User already has lifetime access`);
          console.log(`      - Pine script doesn't allow this operation`);
          console.log(`      - Permission issue with your account`);
        } else {
          console.log(`   ❌ FAILED - ${result.status}`);
        }
        
        // Log full result for debugging
        console.log(`   Full Result:`, JSON.stringify(result, null, 2));
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        if (error.response) {
          console.log(`   HTTP Status: ${error.response.status}`);
          console.log(`   Response:`, error.response.data);
        }
      }
      
      console.log('');
      
      // Small delay between users
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Check if the pine_id is correct
    console.log('📊 CHECKING PINE SCRIPT ID:');
    console.log(`   ID: ${testPineId}`);
    console.log(`   Format: ${testPineId.startsWith('PUB;') ? '✅ Correct' : '❌ Invalid'}`);
    console.log('');
    
    // Recommendations
    console.log('💡 DIAGNOSTIC SUMMARY:');
    console.log('='.repeat(70));
    
    console.log('\nPOSSIBLE ISSUES:');
    console.log('1. 🍪 COOKIES: Your session cookies might be expired or invalid');
    console.log('2. 📊 PINE SCRIPT: The indicator ID might not be yours or might not exist');
    console.log('3. 👤 PERMISSIONS: Your TradingView account might not have permission');
    console.log('4. 🔄 ALREADY GRANTED: Users might already have access');
    console.log('5. 🚫 RATE LIMIT: TradingView might have stricter limits for grant operations');
    
    console.log('\n📝 RECOMMENDED ACTIONS:');
    console.log('1. Update your cookies from the admin panel');
    console.log('2. Verify you own the Pine script indicator');
    console.log('3. Try with your own test indicator');
    console.log('4. Check if these users already have access');
    console.log('5. Try with completely new usernames');
    
    console.log('\n🔧 TO UPDATE COOKIES:');
    console.log('1. Open TradingView in your browser');
    console.log('2. Log in to your account');
    console.log('3. Open DevTools (F12) → Application → Cookies');
    console.log('4. Find "sessionid" and "sessionid_sign" cookies');
    console.log('5. Copy their values');
    console.log('6. Go to http://localhost:5001/admin');
    console.log('7. Update the cookies there');
    
  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run diagnostic
if (require.main === module) {
  diagnoseIssue()
    .then(() => {
      console.log('\n✅ Diagnostic completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { diagnoseIssue };
