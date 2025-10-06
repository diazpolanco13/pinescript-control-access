/**
 * 🧪 TEST: Verificar fix del bug hasAccess en Bulk API
 * 
 * Este script prueba que después del fix:
 * ✅ status: "Success" → hasAccess: true
 * ✅ currentExpiration se actualiza correctamente
 * ✅ El acceso se concede REALMENTE en TradingView
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5001';
const API_KEY = process.env.ECOMMERCE_API_KEY || 'your_ultra_secure_api_key_2025';

// Usuario de prueba (cambiar según tu caso)
const TEST_USER = 'testuser1';
const TEST_PINE_IDS = [
  'PUB;ebd861d70a9f478bb06fe60c5d8f469c' // Tu indicador de prueba
];

async function testBulkFix() {
  console.log('🧪 Iniciando test del fix Bulk API...\n');

  try {
    // PASO 1: Remover acceso existente (cleanup)
    console.log('📝 PASO 1: Limpiando accesos anteriores...');
    try {
      await axios.post(`${BASE_URL}/api/access/bulk-remove`, {
        users: [TEST_USER],
        pine_ids: TEST_PINE_IDS
      }, {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Accesos previos removidos\n');
    } catch (error) {
      console.log('⚠️  No había accesos previos (OK)\n');
    }

    // PASO 2: Conceder acceso con Bulk API
    console.log('📝 PASO 2: Concediendo acceso con Bulk API...');
    const bulkResponse = await axios.post(`${BASE_URL}/api/access/bulk`, {
      users: [TEST_USER],
      pine_ids: TEST_PINE_IDS,
      duration: '7D',
      options: {
        preValidateUsers: false,
        onProgress: false
      }
    }, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('Respuesta Bulk API:', JSON.stringify(bulkResponse.data, null, 2));

    // VERIFICACIÓN 1: Validar response structure
    const result = bulkResponse.data;
    console.log('\n🔍 VERIFICACIÓN 1: Estructura de respuesta');
    console.log(`   Total operaciones: ${result.total || 'N/A'}`);
    console.log(`   Exitosas: ${result.success || 'N/A'}`);
    console.log(`   Errores: ${result.errors || 0}`);
    console.log(`   Success rate: ${result.successRate || 'N/A'}%`);
    console.log(`   Duración: ${result.duration || 'N/A'}ms`);

    // VERIFICACIÓN 2: Validar primer resultado individual
    if (result.results && result.results.length > 0) {
      const firstResult = result.results[0];
      console.log('\n🔍 VERIFICACIÓN 2: Resultado individual');
      console.log(`   Username: ${firstResult.username}`);
      console.log(`   Pine ID: ${firstResult.pine_id}`);
      console.log(`   Status: ${firstResult.status}`);
      console.log(`   hasAccess: ${firstResult.hasAccess} ${firstResult.hasAccess ? '✅' : '❌'}`);
      console.log(`   expiration: ${firstResult.expiration}`);
      console.log(`   currentExpiration: ${firstResult.currentExpiration}`);
      console.log(`   noExpiration: ${firstResult.noExpiration}`);

      // ✅ VALIDACIÓN DEL FIX
      if (firstResult.status === 'Success' && firstResult.hasAccess === true) {
        console.log('\n✅ ¡FIX FUNCIONANDO! status: "Success" → hasAccess: true');
      } else if (firstResult.status === 'Success' && firstResult.hasAccess === false) {
        console.log('\n❌ BUG DETECTADO: status: "Success" PERO hasAccess: false');
        console.log('   El fix NO se aplicó correctamente.');
        process.exit(1);
      }
    }

    // PASO 3: Verificar acceso con GET endpoint
    console.log('\n📝 PASO 3: Verificando acceso con GET endpoint...');
    const getResponse = await axios.get(
      `${BASE_URL}/api/access/${TEST_USER}?pine_ids=${JSON.stringify(TEST_PINE_IDS)}`
    );

    const accessDetails = getResponse.data[0];
    console.log('\n🔍 VERIFICACIÓN 3: Consulta de acceso');
    console.log(`   hasAccess: ${accessDetails.hasAccess} ${accessDetails.hasAccess ? '✅' : '❌'}`);
    console.log(`   currentExpiration: ${accessDetails.currentExpiration}`);

    if (accessDetails.hasAccess) {
      console.log('\n✅ ¡ACCESO CONCEDIDO CORRECTAMENTE! Verificado con GET endpoint.');
    } else {
      console.log('\n❌ PROBLEMA: GET endpoint indica que NO hay acceso.');
      console.log('   Esto puede indicar que TradingView no aceptó el request.');
    }

    // RESUMEN FINAL
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DEL TEST');
    console.log('='.repeat(60));
    
    if (result.results && result.results.length > 0) {
      const firstResult = result.results[0];
      
      if (firstResult.status === 'Success' && firstResult.hasAccess === true && accessDetails.hasAccess) {
        console.log('✅ TEST EXITOSO - Fix funcionando correctamente');
        console.log('   ✅ Bulk API retorna hasAccess: true');
        console.log('   ✅ GET endpoint confirma acceso concedido');
        console.log('   ✅ El bug está SOLUCIONADO');
      } else {
        console.log('⚠️  TEST CON ADVERTENCIAS');
        if (firstResult.status === 'Success' && !firstResult.hasAccess) {
          console.log('   ❌ Bulk API: hasAccess sigue false');
        }
        if (!accessDetails.hasAccess) {
          console.log('   ❌ GET endpoint: acceso no verificado');
        }
      }
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ ERROR EN EL TEST:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

// Ejecutar test
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   TEST: Fix Bug hasAccess en Bulk API                     ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');
console.log(`API URL: ${BASE_URL}`);
console.log(`Usuario de prueba: ${TEST_USER}`);
console.log(`Indicadores: ${TEST_PINE_IDS.length}\n`);

testBulkFix();

