/**
 * 🧪 TEST COMPREHENSIVO: Todos los Endpoints de Grant
 * 
 * Verifica que el fix funciona en TODOS los endpoints que conceden acceso:
 * 1. POST /api/access/:username (individual)
 * 2. POST /api/access/bulk (masivo)
 * 3. POST /api/access/replace (reemplazo)
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5001';
const API_KEY = process.env.ECOMMERCE_API_KEY || 'your_ultra_secure_api_key_2025';

const TEST_USER = 'testuser1';
const TEST_USER2 = 'testuser2';
const TEST_PINE_IDS = ['PUB;ebd861d70a9f478bb06fe60c5d8f469c'];

async function cleanup() {
  console.log('🧹 Limpiando accesos previos...');
  try {
    await axios.post(`${BASE_URL}/api/access/bulk-remove`, {
      users: [TEST_USER, TEST_USER2],
      pine_ids: TEST_PINE_IDS
    }, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Limpieza completada\n');
  } catch (error) {
    console.log('⚠️  Sin accesos previos (OK)\n');
  }
}

async function testIndividualEndpoint() {
  console.log('═'.repeat(60));
  console.log('📝 TEST 1: POST /api/access/:username (Individual)');
  console.log('═'.repeat(60));

  try {
    const response = await axios.post(
      `${BASE_URL}/api/access/${TEST_USER}`,
      {
        pine_ids: TEST_PINE_IDS,
        duration: '7D'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data[0];
    console.log('\n📊 Respuesta:');
    console.log(`   Status: ${result.status}`);
    console.log(`   hasAccess: ${result.hasAccess} ${result.hasAccess ? '✅' : '❌'}`);
    console.log(`   currentExpiration: ${result.currentExpiration}`);

    if (result.status === 'Success' && result.hasAccess === true) {
      console.log('\n✅ ENDPOINT INDIVIDUAL: FIX FUNCIONANDO');
      return true;
    } else {
      console.log('\n❌ ENDPOINT INDIVIDUAL: BUG DETECTADO');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return false;
  }
}

async function testBulkEndpoint() {
  console.log('\n' + '═'.repeat(60));
  console.log('📝 TEST 2: POST /api/access/bulk (Masivo)');
  console.log('═'.repeat(60));

  try {
    const response = await axios.post(
      `${BASE_URL}/api/access/bulk`,
      {
        users: [TEST_USER2],
        pine_ids: TEST_PINE_IDS,
        duration: '7D',
        options: {
          preValidateUsers: false,
          onProgress: false
        }
      },
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data.results[0];
    console.log('\n📊 Respuesta:');
    console.log(`   Status: ${result.status}`);
    console.log(`   hasAccess: ${result.hasAccess} ${result.hasAccess ? '✅' : '❌'}`);
    console.log(`   currentExpiration: ${result.currentExpiration}`);
    console.log(`   Success rate: ${response.data.successRate}%`);

    if (result.status === 'Success' && result.hasAccess === true) {
      console.log('\n✅ ENDPOINT BULK: FIX FUNCIONANDO');
      return true;
    } else {
      console.log('\n❌ ENDPOINT BULK: BUG DETECTADO');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return false;
  }
}

async function testReplaceEndpoint() {
  console.log('\n' + '═'.repeat(60));
  console.log('📝 TEST 3: POST /api/access/replace (Reemplazo)');
  console.log('═'.repeat(60));

  try {
    // Primero dar acceso inicial
    await axios.post(
      `${BASE_URL}/api/access/bulk`,
      {
        users: [TEST_USER],
        pine_ids: TEST_PINE_IDS,
        duration: '1D'
      },
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('   Acceso inicial concedido (1 día)');

    // Ahora reemplazar con 7 días
    const response = await axios.post(
      `${BASE_URL}/api/access/replace`,
      {
        users: [TEST_USER],
        pine_ids: TEST_PINE_IDS,
        duration: '7D',
        options: {
          preValidateUsers: false
        }
      },
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\n📊 Respuesta:');
    console.log(`   Total operaciones: ${response.data.total}`);
    console.log(`   Exitosas: ${response.data.success}`);
    console.log(`   Success rate: ${response.data.successRate}%`);
    console.log(`   Remove phase: ${response.data.phases.remove.successRate}%`);
    console.log(`   Add phase: ${response.data.phases.add.successRate}%`);

    // Verificar el estado final
    const verifyResponse = await axios.get(
      `${BASE_URL}/api/access/${TEST_USER}?pine_ids=${JSON.stringify(TEST_PINE_IDS)}`
    );
    
    const finalState = verifyResponse.data[0];
    console.log(`\n   Estado final hasAccess: ${finalState.hasAccess} ${finalState.hasAccess ? '✅' : '❌'}`);

    if (response.data.successRate === 100 && finalState.hasAccess === true) {
      console.log('\n✅ ENDPOINT REPLACE: FIX FUNCIONANDO');
      return true;
    } else {
      console.log('\n❌ ENDPOINT REPLACE: BUG DETECTADO');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   TEST COMPREHENSIVO: Todos los Endpoints Grant           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`API URL: ${BASE_URL}\n`);

  await cleanup();

  const results = {
    individual: await testIndividualEndpoint(),
    bulk: await testBulkEndpoint(),
    replace: await testReplaceEndpoint()
  };

  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMEN FINAL');
  console.log('═'.repeat(60));
  console.log(`Individual (POST /api/access/:username): ${results.individual ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Bulk (POST /api/access/bulk):            ${results.bulk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Replace (POST /api/access/replace):      ${results.replace ? '✅ PASS' : '❌ FAIL'}`);
  console.log('═'.repeat(60));

  const allPassed = Object.values(results).every(r => r === true);
  
  if (allPassed) {
    console.log('\n🎉 ¡TODOS LOS TESTS PASARON!');
    console.log('   El fix funciona correctamente en TODOS los endpoints.\n');
  } else {
    console.log('\n⚠️  ALGUNOS TESTS FALLARON');
    console.log('   Revisar los endpoints que no pasaron.\n');
    process.exit(1);
  }
}

runAllTests();

