#!/usr/bin/env node

/**
 * Bulk Operations Test Script
 * Demonstrates high-performance bulk access granting
 * Usage: node scripts/bulk-test.js
 */

require('dotenv').config();
const tradingViewService = require('../src/services/tradingViewService');
const { logger, bulkLogger } = require('../src/utils/logger');

async function runBulkTest() {
  console.log('🚀 Iniciando prueba de operaciones masivas...\n');

  try {
    // Initialize service
    await tradingViewService.init();
    console.log('✅ Servicio inicializado\n');

    // Test parameters
    const users = [
      'apidevs',
      'apidev7loper', // This might not exist, but shows error handling
      'testuser1',
      'testuser2',
      'testuser3'
    ];

    const pineIds = [
      'PUB;ebd861d70a9f478bb06fe60c5d8f469c' // Test indicator from README
    ];

    const duration = '7D';

    console.log(`📊 Parámetros de prueba:`);
    console.log(`   👥 Usuarios: ${users.length}`);
    console.log(`   📈 Indicadores: ${pineIds.length}`);
    console.log(`   ⏰ Duración: ${duration}`);
    console.log(`   🔢 Total operaciones: ${users.length * pineIds.length}\n`);

    // Progress callback
    const progressCallback = (processed, total, successCount, errorCount) => {
      const progress = Math.round((processed / total) * 100);
      console.log(`📈 Progreso: ${processed}/${total} (${progress}%) - ✅ ${successCount} ❌ ${errorCount}`);
    };

    console.log('⚡ Ejecutando operación masiva...\n');

    const startTime = Date.now();

    const result = await tradingViewService.bulkGrantAccess(
      users,
      pineIds,
      duration,
      {
        batchSize: 2, // Small batch for testing
        delayMs: 500, // Small delay to avoid rate limits
        onProgress: progressCallback
      }
    );

    const totalTime = Date.now() - startTime;

    console.log('\n🎉 ¡Operación masiva completada!');
    console.log('📊 Resultados finales:');
    console.log(`   ⏱️  Tiempo total: ${totalTime}ms`);
    console.log(`   ✅ Exitosos: ${result.success}`);
    console.log(`   ❌ Errores: ${result.errors}`);
    console.log(`   📈 Tasa éxito: ${result.successRate}%`);
    console.log(`   🚀 Ops/segundo: ${Math.round((result.total / totalTime) * 1000)}\n`);

    // Performance analysis
    const avgTimePerOperation = totalTime / result.total;
    console.log('🔍 Análisis de rendimiento:');
    console.log(`   📏 Tiempo promedio por operación: ${avgTimePerOperation.toFixed(2)}ms`);
    console.log(`   🏃‍♂️ Rendimiento estimado para 25,000 ops: ~${Math.round(25000 * avgTimePerOperation / 1000 / 60)} minutos`);

    if (result.successRate >= 80) {
      console.log('\n🎯 ¡Excelente rendimiento! La implementación está optimizada.');
    } else {
      console.log('\n⚠️  Rendimiento aceptable. Considera revisar configuración de rate limiting.');
    }

  } catch (error) {
    console.error('\n❌ Error en la prueba masiva:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Prueba interrumpida por el usuario');
  process.exit(0);
});

// Run the test
runBulkTest().catch(console.error);
