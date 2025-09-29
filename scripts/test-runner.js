#!/usr/bin/env node

/**
 * Test Runner - Unified testing interface
 * Allows running different types of tests from a single script
 * Usage: node scripts/test-runner.js [test-type]
 */

const { execSync } = require('child_process');
const path = require('path');

const TEST_TYPES = {
    'status': {
        script: 'status-check.js',
        description: 'System health and status check'
    },
    'controlled': {
        script: 'controlled-test.js',
        description: 'Small scale test (5 users) with validation + batching'
    },
    'smart': {
        script: 'smart-bulk-test.js',
        description: 'Intelligent bulk test with real users and validation'
    },
    'real': {
        script: 'real-users-test.js',
        description: 'Full production simulation (35 users)'
    },
    'ecommerce': {
        script: 'test-ecommerce-integration.js',
        description: 'E-commerce webhook and integration testing'
    },
    'cluster': {
        script: 'benchmark-cluster.js',
        description: 'Clustering performance benchmark'
    },
    'calibrate': {
        script: 'calibration-test.js',
        description: 'Scientific calibration of TradingView limits'
    },
    'diagnose': {
        script: 'diagnose-issue.js',
        description: 'Diagnose grant access issues'
    },
    'adaptive': {
        script: 'test-remove-grant.js',
        description: 'Complete remove+grant cycle test'
    }
};

function showUsage() {
    console.log('🚀 Test Runner - Unified Testing Interface\n');
    console.log('Usage: node scripts/test-runner.js [test-type]\n');
    console.log('Available test types:\n');

    Object.entries(TEST_TYPES).forEach(([key, info]) => {
        console.log(`  ${key.padEnd(12)} - ${info.description}`);
    });

    console.log('\nExamples:');
    console.log('  node scripts/test-runner.js status     # System health check');
    console.log('  node scripts/test-runner.js controlled # Small scale test');
    console.log('  node scripts/test-runner.js smart      # Intelligent bulk test');
    console.log('  node scripts/test-runner.js real       # Production simulation');
    console.log('\nUse individual scripts for advanced options.');
}

function runTest(testType) {
    const testInfo = TEST_TYPES[testType];

    if (!testInfo) {
        console.error(`❌ Unknown test type: ${testType}`);
        showUsage();
        process.exit(1);
    }

    console.log(`🚀 Running: ${testInfo.description}\n`);
    console.log('='.repeat(60));

    try {
        const scriptPath = path.join(__dirname, testInfo.script);
        execSync(`node ${scriptPath}`, { stdio: 'inherit' });
    } catch (error) {
        console.error(`❌ Test failed with exit code: ${error.status}`);
        process.exit(1);
    }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
    showUsage();
} else if (args[0] === '--help' || args[0] === '-h') {
    showUsage();
} else {
    runTest(args[0]);
}
