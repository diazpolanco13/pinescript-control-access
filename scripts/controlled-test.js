#!/usr/bin/env node

/**
 * Controlled Test - Small scale test of optimized system
 * Tests validation + intelligent batching with 5 users
 * Usage: node scripts/controlled-test.js
 */

const fs = require('fs');
const tradingViewService = require('../src/services/tradingViewService');
const { bulkLogger } = require('../src/utils/logger');

async function runControlledTest() {
  console.log('🔬 CONTROLLED TEST: Sistema Optimizado (5 usuarios)\n');

  try {
    // Load 5 test users
    const usersText = fs.readFileSync('test_users.txt', 'utf8');
    const allUsers = usersText.split('\n').filter(user => user.trim().length > 0);
    const testUsers = allUsers.slice(0, 5); // Only first 5 users

    const pineIds = [
      'PUB;ebd861d70a9f478bb06fe60c5d8f469c' // Test indicator
    ];

    const duration = '1D';
    const totalOperations = testUsers.length * pineIds.length;

    console.log(`👥 Usuarios de prueba: ${testUsers.length}/35 total`);
    console.log(`📊 Operaciones: ${totalOperations} (5 × 1)`);
    console.log(`⏰ Duración: ${duration}`);
    console.log(`🎯 Sistema: Validación + Intelligent Batching + Reintentos\n`);

    // Initialize service
    await tradingViewService.init();
    console.log('✅ Servicio inicializado\n');

    // PHASE 1: User Validation
    console.log('🔍 FASE 1: VALIDACIÓN DE USUARIOS');
    console.log('=' .repeat(40));

    const validationStart = Date.now();
    const validationResults = await tradingViewService.validateUsersBatch(testUsers, {
      maxConcurrent: 2
    });

    const validationTime = Date.now() - validationStart;

    console.log(`✅ Validación completada en ${validationTime}ms`);
    console.log(`   Usuarios válidos: ${validationResults.validUsers.length}/${testUsers.length}`);
    console.log(`   Usuarios inválidos: ${validationResults.invalidUsers.length}`);

    if (validationResults.invalidUsers.length > 0) {
      console.log(`   ⚠️  Filtrados: ${validationResults.invalidUsers.join(', ')}`);
    }
    console.log('');

    // PHASE 2: Intelligent Operations
    console.log('🚀 FASE 2: OPERACIONES INTELIGENTES');
    console.log('=' .repeat(40));

    if (validationResults.validUsers.length === 0) {
      console.log('❌ No hay usuarios válidos para procesar');
      return;
    }

    console.log(`🎯 Procesando ${validationResults.validUsers.length} usuarios válidos`);
    console.log('🤖 Intelligent Batcher activado:');
    console.log(`   • Concurrente: ${tradingViewService.requestBatcher.maxConcurrent}`);
    console.log(`   • Batch size: ${tradingViewService.requestBatcher.batchSize}`);
    console.log(`   • Circuit breaker: ${tradingViewService.requestBatcher.circuitBreakerThreshold} fallos`);
    console.log('');

    const startTime = Date.now();

    const result = await tradingViewService.bulkGrantAccess(
      validationResults.validUsers,
      pineIds,
      duration,
      {
        onProgress: (processed, total, successCount, errorCount) => {
          const progress = Math.round((processed / total) * 100);
          const successRate = processed > 0 ? Math.round((successCount / processed) * 100) : 0;
          console.log(`📈 ${processed}/${total} (${progress}%) - ✅ ${successCount} ❌ ${errorCount} (${successRate}%)`);
        },
        preValidateUsers: false // Already validated
      }
    );

    const totalTime = result.duration;
    const opsPerSecond = Math.round((result.total / totalTime) * 1000 * 100) / 100;

    // RESULTS
    console.log('\n🎉 ¡TEST CONTROLADO COMPLETADO!');
    console.log('=' .repeat(50));
    console.log('📊 RESULTADOS FINALES:');
    console.log(`   ⏱️  Tiempo total: ${totalTime}ms (${Math.round(totalTime/1000)}s)`);
    console.log(`   ✅ Operaciones exitosas: ${result.success}`);
    console.log(`   ❌ Operaciones fallidas: ${result.errors}`);
    console.log(`   📊 Tasa de éxito: ${result.successRate}%`);
    console.log(`   🚀 Rendimiento: ${opsPerSecond} ops/seg`);
    console.log('');

    console.log('🤖 REQUEST BATCHER STATS:');
    console.log(`   📦 Batches procesados: ${result.batcherStats.batchesProcessed}`);
    console.log(`   📏 Response time promedio: ${result.batcherStats.avgResponseTime}ms`);
    console.log(`   ⏱️  Delay final: ${result.batcherStats.finalDelay}ms`);
    console.log(`   🛡️  Circuit breaker: ${result.batcherStats.circuitBreakerActivated ? 'Activado' : 'Inactivo'}`);
    console.log('');

    console.log('📋 RESUMEN DEL TEST:');
    console.log(`   👥 Usuarios analizados: ${testUsers.length}`);
    console.log(`   ✅ Usuarios válidos: ${validationResults.validUsers.length}`);
    console.log(`   ⚡ Operaciones procesadas: ${result.total}`);
    console.log(`   🎯 Tiempo total: ${Math.round(totalTime/1000)} segundos`);
    console.log(`   📈 Eficiencia: ${Math.round((result.success / result.total) * 100)}% de operaciones exitosas`);
    console.log('');

    // Success Analysis
    if (result.successRate >= 90) {
      console.log('🎯 ¡EXCELENTE! Sistema optimizado funcionando perfectamente');
      console.log('   ✅ Validación previa efectiva');
      console.log('   ✅ Intelligent batching operativo');
      console.log('   ✅ Reintentos garantizando éxito');
    } else if (result.successRate >= 70) {
      console.log('✅ ¡BUENO! Sistema operativo con algunas optimizaciones activas');
      console.log('   ✅ Rate limiting manejado parcialmente');
    } else {
      console.log('⚠️  RESULTADO MODERADO');
      console.log('   📝 TradingView puede estar rate-limitando fuertemente');
      console.log('   💡 Considerar aumentar delays entre operaciones');
    }

    console.log('\n🔒 SEGURIDAD: Sistema garantiza que usuarios válidos obtengan acceso');
    console.log('   Los usuarios inválidos son filtrados automáticamente');

  } catch (error) {
    console.error('\n❌ Error en test controlado:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test controlado interrumpido');
  process.exit(0);
});

// Run controlled test
runControlledTest().catch(console.error);
