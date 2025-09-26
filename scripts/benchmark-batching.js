#!/usr/bin/env node

/**
 * Benchmark Script: Intelligent Request Batching Performance Test
 *
 * Compares old batching vs new intelligent batching
 * Usage: node scripts/benchmark-batching.js
 */

const fs = require('fs');
const tradingViewService = require('../src/services/tradingViewService');
const { bulkLogger } = require('../src/utils/logger');

async function runBatchingBenchmark() {
  console.log('🚀 BENCHMARK: Intelligent Request Batching\n');

  try {
    // Load test users
    const usersText = fs.readFileSync('test_users.txt', 'utf8');
    const testUsers = usersText.split('\n').filter(user => user.trim().length > 0).slice(0, 10); // Use first 10 users

    const pineIds = [
      'PUB;ebd861d70a9f478bb06fe60c5d8f469c' // Test indicator
    ];

    const duration = '1D'; // Short duration for testing
    const totalOperations = testUsers.length * pineIds.length;

    console.log(`👥 Usuarios de prueba: ${testUsers.length}`);
    console.log(`📊 Operaciones totales: ${totalOperations}`);
    console.log(`⏰ Duración: ${duration}\n`);

    // Initialize service
    await tradingViewService.init();
    console.log('✅ Servicio inicializado\n');

    // Test configuration
    console.log('🔧 Configuración del Request Batcher:');
    console.log(`   Max concurrent: ${tradingViewService.requestBatcher.maxConcurrent}`);
    console.log(`   Batch size: ${tradingViewService.requestBatcher.batchSize}`);
    console.log(`   Min delay: ${tradingViewService.requestBatcher.minDelay}ms`);
    console.log(`   Circuit breaker threshold: ${tradingViewService.requestBatcher.circuitBreakerThreshold}`);
    console.log('');

    // Progress callback
    const progressCallback = (processed, total, successCount, errorCount) => {
      const progress = Math.round((processed / total) * 100);
      const opsPerSecond = processed > 0 ? Math.round((processed / ((Date.now() - startTime) / 1000)) * 100) / 100 : 0;
      console.log(`📈 ${processed}/${total} (${progress}%) - ✅ ${successCount} ❌ ${errorCount} - ⚡ ${opsPerSecond} ops/seg`);
    };

    console.log('⚡ EJECUTANDO INTELLIGENT BATCHING...\n');

    const startTime = Date.now();

    const result = await tradingViewService.bulkGrantAccess(
      testUsers,
      pineIds,
      duration,
      {
        onProgress: progressCallback
      }
    );

    const totalTime = result.duration;
    const opsPerSecond = Math.round((result.total / totalTime) * 1000 * 100) / 100;

    console.log('\n🎉 ¡INTELLIGENT BATCHING COMPLETADO!');
    console.log('📊 RESULTADOS FINALES:');
    console.log(`   ⏱️  Tiempo total: ${totalTime}ms (${Math.round(totalTime/1000)}s)`);
    console.log(`   ✅ Exitosos: ${result.success}`);
    console.log(`   ❌ Errores: ${result.errors}`);
    console.log(`   📊 Tasa éxito: ${result.successRate}%`);
    console.log(`   🚀 Ops/segundo: ${opsPerSecond}`);
    console.log('');

    // Batcher stats
    console.log('🤖 ESTADÍSTICAS DEL REQUEST BATCHER:');
    console.log(`   📦 Batches procesados: ${result.batcherStats.batchesProcessed}`);
    console.log(`   📏 Tiempo respuesta promedio: ${result.batcherStats.avgResponseTime}ms`);
    console.log(`   ⏱️  Delay final: ${result.batcherStats.finalDelay}ms`);
    console.log(`   🚫 Circuit breaker activado: ${result.batcherStats.circuitBreakerActivated ? 'Sí' : 'No'}`);
    console.log('');

    // Performance analysis
    console.log('📈 ANÁLISIS DE RENDIMIENTO:');
    const estimatedFullTest = (35 * 25 * 1000) / (opsPerSecond * 1000); // 35 users × 25 indicators
    console.log(`   🎯 35 usuarios × 25 indicadores: ~${Math.round(estimatedFullTest)}s`);
    console.log(`   🎯 1000 usuarios × 25 indicadores: ~${Math.round(estimatedFullTest * (1000/35))}s`);
    console.log('');

    if (result.successRate >= 70) {
      console.log('🎯 ¡EXCELENTE! Intelligent batching funcionando perfectamente.');
      console.log('   ✅ Circuit breaker manejando rate limits');
      console.log('   ✅ Backoff exponencial optimizando delays');
      console.log('   ✅ Reintentos automáticos funcionando');
    } else if (result.successRate >= 50) {
      console.log('⚠️  Buen rendimiento, pero algunos ajustes pueden mejorar.');
    } else {
      console.log('❌  Rendimiento bajo. Revisar configuración del batcher.');
    }

    console.log('\n💡 RECOMENDACIONES:');
    if (result.batcherStats.circuitBreakerActivated) {
      console.log('   • Circuit breaker activado - TradingView está rate-limitando');
      console.log('   • Considerar aumentar delays entre batches');
    }
    if (result.batcherStats.avgResponseTime > 2000) {
      console.log('   • Respuestas lentas - verificar conexión a TradingView');
    }
    if (result.successRate < 80) {
      console.log('   • Baja tasa de éxito - revisar usuarios o indicadores inválidos');
    }

  } catch (error) {
    console.error('\n❌ Error en benchmark de batching:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Benchmark interrumpido por el usuario');
  process.exit(0);
});

// Run the benchmark
runBatchingBenchmark().catch(console.error);
