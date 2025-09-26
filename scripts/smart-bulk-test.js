#!/usr/bin/env node

/**
 * Smart Bulk Test - Intelligent Batching with User Validation
 * Tests the complete system: validation + intelligent batching + retries
 * Usage: node scripts/smart-bulk-test.js
 */

const fs = require('fs');
const tradingViewService = require('../src/services/tradingViewService');
const { bulkLogger } = require('../src/utils/logger');

async function runSmartBulkTest() {
  console.log('🧠 PRUEBA INTELIGENTE: Validación + Batching + Reintentos\n');

  try {
    // Load test users
    const usersText = fs.readFileSync('test_users.txt', 'utf8');
    const allUsers = usersText.split('\n').filter(user => user.trim().length > 0);

    // Use a subset for testing (first 15 users)
    const testUsers = allUsers.slice(0, 15);
    const pineIds = [
      'PUB;ebd861d70a9f478bb06fe60c5d8f469c' // Test indicator
    ];

    const duration = '1D';
    const totalPossibleOperations = testUsers.length * pineIds.length;

    console.log(`👥 Usuarios de prueba: ${testUsers.length}/${allUsers.length} total`);
    console.log(`📊 Operaciones potenciales: ${totalPossibleOperations}`);
    console.log(`⏰ Duración: ${duration}\n`);

    // Initialize service
    await tradingViewService.init();
    console.log('✅ Servicio inicializado\n');

    // FASE 1: Validación de usuarios
    console.log('🔍 FASE 1: VALIDACIÓN DE USUARIOS');
    console.log('=' .repeat(50));

    const validationStart = Date.now();
    const validationResults = await tradingViewService.validateUsersBatch(testUsers, {
      maxConcurrent: 2 // Conservative validation
    });

    const validationTime = Date.now() - validationStart;

    console.log(`✅ Validación completada en ${validationTime}ms`);
    console.log(`   👥 Usuarios válidos: ${validationResults.validUsers.length}/${testUsers.length}`);
    console.log(`   ❌ Usuarios inválidos: ${validationResults.invalidUsers.length}`);
    console.log(`   📊 Tasa de validez: ${Math.round((validationResults.validUsers.length / testUsers.length) * 100)}%\n`);

    if (validationResults.invalidUsers.length > 0) {
      console.log('🚫 Usuarios inválidos encontrados:');
      validationResults.invalidUsers.slice(0, 5).forEach(user => console.log(`   - ${user}`));
      if (validationResults.invalidUsers.length > 5) {
        console.log(`   ... y ${validationResults.invalidUsers.length - 5} más`);
      }
      console.log('');
    }

    // FASE 2: Operaciones inteligentes solo con usuarios válidos
    console.log('🚀 FASE 2: OPERACIONES INTELIGENTES');
    console.log('=' .repeat(50));

    if (validationResults.validUsers.length === 0) {
      console.log('❌ No hay usuarios válidos para procesar. Abortando.');
      return;
    }

    const progressCallback = (processed, total, successCount, errorCount) => {
      const progress = Math.round((processed / total) * 100);
      const successRate = processed > 0 ? Math.round((successCount / processed) * 100) : 0;
      const currentTime = Date.now();
      const opsPerSecond = processed > 0 ? Math.round((processed / ((currentTime - startTime) / 1000)) * 100) / 100 : 0;

      console.log(`📈 ${processed}/${total} (${progress}%) - ✅ ${successCount} ❌ ${errorCount} - 📊 ${successRate}% éxito - ⚡ ${opsPerSecond} ops/seg`);
    };

    console.log(`🎯 Procesando ${validationResults.validUsers.length} usuarios válidos...`);
    console.log('🤖 Sistema inteligente activo:');
    console.log(`   🔄 Concurrente: ${tradingViewService.requestBatcher.maxConcurrent} requests`);
    console.log(`   📦 Batch size: ${tradingViewService.requestBatcher.batchSize} requests`);
    console.log(`   ⏱️  Delay mínimo: ${tradingViewService.requestBatcher.minDelay}ms`);
    console.log(`   🔄 Reintentos: Hasta 3 por operación completa`);
    console.log(`   🛡️  Circuit breaker: ${tradingViewService.requestBatcher.circuitBreakerThreshold} fallos`);
    console.log('');

    const startTime = Date.now();

    const result = await tradingViewService.bulkGrantAccess(
      validationResults.validUsers,
      pineIds,
      duration,
      {
        onProgress: progressCallback,
        preValidateUsers: false // Ya validamos antes
      }
    );

    const totalTime = result.duration;
    const opsPerSecond = Math.round((result.total / totalTime) * 1000 * 100) / 100;

    // RESULTADOS FINALES
    console.log('\n🎉 ¡PRUEBA INTELIGENTE COMPLETADA!');
    console.log('=' .repeat(60));
    console.log('📊 RESULTADOS DE VALIDACIÓN:');
    console.log(`   👥 Usuarios analizados: ${testUsers.length}`);
    console.log(`   ✅ Usuarios válidos: ${validationResults.validUsers.length}`);
    console.log(`   ❌ Usuarios filtrados: ${validationResults.invalidUsers.length}`);
    console.log(`   ⏱️  Tiempo validación: ${validationTime}ms`);
    console.log('');

    console.log('📊 RESULTADOS DE OPERACIONES:');
    console.log(`   🎯 Operaciones procesadas: ${result.total}`);
    console.log(`   ✅ Operaciones exitosas: ${result.success}`);
    console.log(`   ❌ Operaciones fallidas: ${result.errors}`);
    console.log(`   📊 Tasa de éxito final: ${result.successRate}%`);
    console.log(`   🚀 Rendimiento: ${opsPerSecond} ops/seg`);
    console.log(`   ⏱️  Tiempo total: ${totalTime}ms (${Math.round(totalTime/1000)}s)`);
    console.log('');

    console.log('🤖 ESTADÍSTICAS DEL BATCHER:');
    console.log(`   📦 Batches procesados: ${result.batcherStats.batchesProcessed}`);
    console.log(`   📏 Tiempo respuesta promedio: ${result.batcherStats.avgResponseTime}ms`);
    console.log(`   ⏱️  Delay final: ${result.batcherStats.finalDelay}ms`);
    console.log(`   🛡️  Circuit breaker activado: ${result.batcherStats.circuitBreakerActivated ? 'Sí' : 'No'}`);
    console.log('');

    // CÁLCULOS DE EFICIENCIA
    const totalUsersProcessed = result.validUsersProcessed;
    const usersWithAccess = Math.floor(result.success / pineIds.length); // Usuarios que tienen acceso a todos los indicadores

    console.log('💡 ANÁLISIS DE EFICIENCIA:');
    console.log(`   🎯 Usuarios válidos procesados: ${totalUsersProcessed}`);
    console.log(`   ✅ Usuarios con acceso completo: ${usersWithAccess}`);
    console.log(`   📊 Cobertura de usuarios: ${Math.round((usersWithAccess / validationResults.validUsers.length) * 100)}%`);
    console.log('');

    // PROYECCIONES
    const estimatedFullScale = Math.round((allUsers.length / testUsers.length) * totalTime / 1000 / 60);
    console.log('🔮 PROYECCIONES PARA PRODUCCIÓN:');
    console.log(`   🎯 Todos los ${allUsers.length} usuarios: ~${estimatedFullScale} minutos`);
    console.log(`   🚀 Rendimiento esperado: ${Math.round(opsPerSecond * 0.8)} ops/seg (con variabilidad)`);
    console.log(`   📊 Tasa éxito esperada: ${result.successRate}% (con reintentos)`);
    console.log('');

    // EVALUACIÓN FINAL
    if (result.successRate >= 90) {
      console.log('🎯 ¡RESULTADO EXCELENTE!');
      console.log('   ✅ Sistema funcionando perfectamente');
      console.log('   ✅ Reintentos funcionando efectivamente');
      console.log('   ✅ Validación previa optimizando rendimiento');
    } else if (result.successRate >= 75) {
      console.log('✅ ¡BUEN RESULTADO!');
      console.log('   ✅ Sistema funcionando bien');
      console.log('   ✅ Mayoría de operaciones exitosas con reintentos');
    } else {
      console.log('⚠️  RESULTADO MODERADO');
      console.log('   📝 Posibles mejoras: ajustar delays o revisar rate limits');
    }

    console.log('\n🔒 SEGURIDAD: Los usuarios filtrados no pierden oportunidades futuras.');
    console.log('   Pueden ser reintentados más tarde o verificados manualmente.');

  } catch (error) {
    console.error('\n❌ Error en prueba inteligente:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Prueba inteligente interrumpida por el usuario');
  process.exit(0);
});

// Run the test
runSmartBulkTest().catch(console.error);
