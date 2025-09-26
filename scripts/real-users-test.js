#!/usr/bin/env node

/**
 * Real Users Performance Test
 * Tests bulk access granting with actual TradingView users
 * Usage: node scripts/real-users-test.js
 */

require('dotenv').config();
const fs = require('fs');
const tradingViewService = require('../src/services/tradingViewService');
const { bulkLogger } = require('../src/utils/logger');

async function runRealUsersTest() {
  console.log('🚀 PRUEBA REAL: 35 Usuarios de TradingView\n');

  try {
    // Load real users
    const usersText = fs.readFileSync('test_users.txt', 'utf8');
    const users = usersText.split('\n').filter(user => user.trim().length > 0);

    console.log(`👥 Usuarios cargados: ${users.length}`);
    console.log(`📊 Total potencial: ${users.length} × 25 indicadores = ${users.length * 25} operaciones\n`);

    // Test with 1 indicator first (35 operations)
    const pineIds = [
      'PUB;ebd861d70a9f478bb06fe60c5d8f469c' // Test indicator from README
    ];

    const duration = '7D';

    console.log('🎯 PRUEBA INICIAL: 35 operaciones (1 indicador × 35 usuarios)');
    console.log('⏰ Duración:', duration);
    console.log('🧵 Indicadores:', pineIds.length);
    console.log('');

    // Initialize service
    await tradingViewService.init();
    console.log('✅ Servicio inicializado\n');

    // Progress callback
    const progressCallback = (processed, total, successCount, errorCount) => {
      const progress = Math.round((processed / total) * 100);
      const opsPerSecond = Math.round((processed / ((Date.now() - startTime) / 1000)) * 100) / 100;
      console.log(`📈 ${processed}/${total} (${progress}%) - ✅ ${successCount} ❌ ${errorCount} - ⚡ ${opsPerSecond} ops/seg`);
    };

    console.log('⚡ EJECUTANDO OPERACIONES MASIVAS...\n');

    const startTime = Date.now();

    const result = await tradingViewService.bulkGrantAccess(
      users,
      pineIds,
      duration,
      {
        batchSize: 5, // 5 users per batch
        delayMs: 200, // 200ms between batches
        onProgress: progressCallback
      }
    );

    const totalTime = Date.now() - startTime;
    const opsPerSecond = Math.round((result.total / totalTime) * 1000 * 100) / 100;

    console.log('\n🎉 ¡PRUEBA COMPLETADA!');
    console.log('📊 RESULTADOS FINALES:');
    console.log(`   ⏱️  Tiempo total: ${totalTime}ms (${Math.round(totalTime/1000)}s)`);
    console.log(`   ✅ Exitosos: ${result.success}`);
    console.log(`   ❌ Errores: ${result.errors}`);
    console.log(`   📈 Tasa éxito: ${result.successRate}%`);
    console.log(`   🚀 Ops/segundo: ${opsPerSecond}`);
    console.log('');

    // Performance extrapolation
    console.log('🔮 EXTRAPOLACIÓN PARA 25 INDICADORES:');
    const totalOperations25 = users.length * 25;
    const estimatedTime25 = (totalOperations25 / result.total) * totalTime;
    console.log(`   🎯 25 indicadores × 35 usuarios = ${totalOperations25} operaciones`);
    console.log(`   ⏱️  Tiempo estimado: ${Math.round(estimatedTime25/1000)}s (${Math.round(estimatedTime25/1000/60)}min)`);
    console.log(`   🚀 Rendimiento: ${Math.round(totalOperations25 / (estimatedTime25/1000))} ops/seg`);
    console.log('');

    console.log('🎯 EXTRAPOLACIÓN PARA 1000 USUARIOS:');
    const totalOperations1000 = 1000 * 25;
    const estimatedTime1000 = (totalOperations1000 / result.total) * totalTime;
    console.log(`   🎯 25 indicadores × 1000 usuarios = ${totalOperations1000} operaciones`);
    console.log(`   ⏱️  Tiempo estimado: ${Math.round(estimatedTime1000/1000/60)}min (${Math.round(estimatedTime1000/1000/60/60)}hrs)`);
    console.log(`   🚀 Rendimiento: ${Math.round(totalOperations1000 / (estimatedTime1000/1000))} ops/seg`);
    console.log('');

    if (result.successRate >= 80) {
      console.log('🎯 ¡PERFORMANCE EXCELENTE! La implementación Node.js está lista para producción.');
    } else {
      console.log('⚠️  Algunos errores detectados. Posibles causas: usuarios inexistentes o rate limits.');
    }

  } catch (error) {
    console.error('\n❌ Error en la prueba real:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Prueba interrumpida por el usuario');
  process.exit(0);
});

// Run the test
runRealUsersTest().catch(console.error);
