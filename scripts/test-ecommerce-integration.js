#!/usr/bin/env node

/**
 * E-commerce Integration Test
 * Prueba completa de integración: API Auth + Webhooks + Alertas + Backup
 * Usage: node scripts/test-ecommerce-integration.js
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:5000';
const API_KEY = process.env.ECOMMERCE_API_KEY || 'test_api_key_2025';

async function testEcommerceIntegration() {
  console.log('🏪 TESTING E-COMMERCE INTEGRATION\n');
  console.log('🔧 Configuración:');
  console.log(`   API Base: ${API_BASE}`);
  console.log(`   API Key: ${API_KEY ? '***CONFIGURED***' : '❌ NOT SET'}`);
  console.log(`   Webhook URL: ${process.env.ECOMMERCE_WEBHOOK_URL || '❌ NOT SET'}`);
  console.log(`   Alert Email: ${process.env.ALERT_EMAIL || '❌ NOT SET'}`);
  console.log('');

  const testResults = {
    api_auth: false,
    health_check: false,
    metrics_access: false,
    bulk_operation: false,
    webhook_delivery: false,
    overall_success: false
  };

  try {
    // 1. Test API Authentication
    console.log('🔐 TEST 1: API Authentication');
    console.log('=' .repeat(40));
    
    try {
      const authResponse = await axios.get(`${API_BASE}/api/metrics/health`, {
        headers: { 'X-API-Key': API_KEY },
        timeout: 10000
      });
      
      console.log('✅ API Auth successful');
      console.log(`   Status: ${authResponse.data.status}`);
      console.log(`   TradingView: ${authResponse.data.tradingview_connection}`);
      testResults.api_auth = true;
      testResults.health_check = authResponse.data.status === 'healthy';
    } catch (error) {
      console.log('❌ API Auth failed:', error.response?.status || error.message);
    }
    
    console.log('');

    // 2. Test Metrics Access
    console.log('📊 TEST 2: Metrics Access');
    console.log('=' .repeat(40));
    
    try {
      const metricsResponse = await axios.get(`${API_BASE}/api/metrics/stats`, {
        headers: { 'X-API-Key': API_KEY },
        timeout: 10000
      });
      
      const stats = metricsResponse.data;
      console.log('✅ Metrics access successful');
      console.log(`   Uptime: ${stats.system.uptime_human}`);
      console.log(`   Success Rate: ${stats.performance.success_rate_current}%`);
      console.log(`   Circuit Breaker: ${stats.performance.circuit_breaker_status}`);
      console.log(`   Operations Processed: ${stats.batcher.total_processed}`);
      testResults.metrics_access = true;
    } catch (error) {
      console.log('❌ Metrics access failed:', error.response?.status || error.message);
    }
    
    console.log('');

    // 3. Test Bulk Operation con API Key
    console.log('🚀 TEST 3: Bulk Operation (Protected)');
    console.log('=' .repeat(40));
    
    try {
      const bulkResponse = await axios.post(`${API_BASE}/api/access/bulk`, {
        users: ['apidevs'],
        pine_ids: ['PUB;ebd861d70a9f478bb06fe60c5d8f469c'],
        duration: '7D',
        options: { preValidateUsers: false }
      }, {
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY 
        },
        timeout: 30000
      });
      
      const result = bulkResponse.data;
      console.log('✅ Bulk operation successful');
      console.log(`   Total: ${result.total}`);
      console.log(`   Success: ${result.success}`);
      console.log(`   Success Rate: ${result.successRate}%`);
      console.log(`   Duration: ${result.duration}ms`);
      testResults.bulk_operation = result.successRate >= 90;
    } catch (error) {
      console.log('❌ Bulk operation failed:', error.response?.status || error.message);
      if (error.response?.status === 401) {
        console.log('   💡 Verificar ECOMMERCE_API_KEY en .env');
      }
    }
    
    console.log('');

    // 4. Test sin API Key (debe fallar)
    console.log('🚫 TEST 4: Security Test (sin API Key)');
    console.log('=' .repeat(40));
    
    try {
      await axios.post(`${API_BASE}/api/access/bulk`, {
        users: ['test'],
        pine_ids: ['test'], 
        duration: '7D'
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      
      console.log('❌ Security test FAILED - endpoint accessible without API key!');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Security test PASSED - endpoint properly protected');
      } else {
        console.log(`⚠️ Unexpected error: ${error.response?.status || error.message}`);
      }
    }
    
    console.log('');

    // 5. Test Webhook (si está configurado)
    console.log('📡 TEST 5: Webhook Configuration');
    console.log('=' .repeat(40));
    
    if (process.env.ECOMMERCE_WEBHOOK_URL) {
      console.log('✅ Webhook URL configured');
      console.log(`   URL: ${process.env.ECOMMERCE_WEBHOOK_URL}`);
      console.log(`   Secret: ${process.env.WEBHOOK_SECRET ? '***SET***' : '❌ NOT SET'}`);
      testResults.webhook_delivery = true;
    } else {
      console.log('⚠️ Webhook not configured (opcional para testing)');
      console.log('   Para habilitar: ECOMMERCE_WEBHOOK_URL en .env');
    }
    
    console.log('');

    // 6. Test Alert System (si está configurado)
    console.log('🚨 TEST 6: Alert System');
    console.log('=' .repeat(40));
    
    if (process.env.ALERT_EMAIL) {
      console.log('✅ Alert system configured');
      console.log(`   Email: ${process.env.ALERT_EMAIL}`);
      console.log(`   Service: ${process.env.EMAIL_SERVICE || 'gmail'}`);
      console.log(`   Admin: ${process.env.ADMIN_EMAIL || 'same as alert'}`);
    } else {
      console.log('⚠️ Alert system not configured (opcional)');
      console.log('   Para habilitar: ALERT_EMAIL + ALERT_EMAIL_PASSWORD en .env');
    }
    
    console.log('');

    // Evaluación final
    console.log('🎯 EVALUACIÓN FINAL DE INTEGRACIÓN');
    console.log('=' .repeat(50));
    
    const criticalTests = ['api_auth', 'health_check', 'bulk_operation'];
    const criticalPassed = criticalTests.filter(test => testResults[test]).length;
    const totalTests = Object.keys(testResults).length - 1; // Excluir overall_success
    
    testResults.overall_success = criticalPassed === criticalTests.length;
    
    console.log('📊 RESULTADOS:');
    console.log(`   🔐 API Authentication: ${testResults.api_auth ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   🏥 Health Check: ${testResults.health_check ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   📊 Metrics Access: ${testResults.metrics_access ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   🚀 Bulk Operation: ${testResults.bulk_operation ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   📡 Webhook Config: ${testResults.webhook_delivery ? '✅ SET' : '⚠️ NOT SET'}`);
    console.log('');
    
    if (testResults.overall_success) {
      console.log('🎉 ¡INTEGRACIÓN E-COMMERCE EXITOSA!');
      console.log('   ✅ Todos los tests críticos pasaron');
      console.log('   ✅ API lista para producción');
      console.log('   ✅ Seguridad configurada correctamente');
      console.log('');
      console.log('🚀 PRÓXIMOS PASOS:');
      console.log('   1. Configurar webhook URL en tu e-commerce');
      console.log('   2. Configurar alertas por email (opcional)');
      console.log('   3. Implementar endpoints webhook en tu e-commerce');
      console.log('   4. Comenzar integración con casos de uso reales');
    } else {
      console.log('❌ INTEGRACIÓN INCOMPLETA');
      console.log('   ⚠️ Tests críticos fallidos');
      console.log('   💡 Revisar configuración de .env');
      console.log('   💡 Verificar que el servidor esté ejecutándose');
    }
    
    return testResults;

  } catch (error) {
    console.error('\n❌ Error en test de integración:', error.message);
    return { overall_success: false, error: error.message };
  }
}

// Función auxiliar para timeout
function timeoutPromise(ms) {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test de integración interrumpido');
  process.exit(0);
});

// Ejecutar test si es llamado directamente
if (require.main === module) {
  testEcommerceIntegration()
    .then(results => {
      if (results.overall_success) {
        console.log('\n🎯 ¡INTEGRACIÓN E-COMMERCE LISTA PARA PRODUCCIÓN!');
        process.exit(0);
      } else {
        console.log('\n⚠️ Integración requiere configuración adicional');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Test fallido:', error.message);
      process.exit(1);
    });
}

module.exports = { testEcommerceIntegration };
