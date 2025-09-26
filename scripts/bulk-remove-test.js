#!/usr/bin/env node

/**
 * Bulk Access Removal Test
 * Tests bulk access removal with real TradingView users
 * Usage: node scripts/bulk-remove-test.js
 */

require('dotenv').config();
const fs = require('fs');
const tradingViewService = require('../src/services/tradingViewService');
const { bulkLogger } = require('../src/utils/logger');

async function runBulkRemoveTest() {
  console.log('🗑️  PRUEBA ELIMINACIÓN MASIVA: Removiendo accesos de 35 usuarios\n');

  try {
    // Load real users
    const usersText = fs.readFileSync('test_users.txt', 'utf8');
    const users = usersText.split('\n').filter(user => user.trim().length > 0);

    console.log(`👥 Usuarios cargados: ${users.length}`);
    console.log(`🗑️  Operación: Remover acceso al indicador de prueba`);
    console.log('');

    // Test with 1 indicator (the test indicator)
    const pineIds = [
      'PUB;ebd861d70a9f478bb06fe60c5d8f469c' // Test indicator from README
    ];

    console.log(`🎯 REMOVIENDO ACCESO: ${users.length} usuarios × ${pineIds.length} indicador`);
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

    console.log('🗑️  EJECUTANDO ELIMINACIÓN MASIVA...\n');

    const startTime = Date.now();

    // Remove access for each user individually (bulk remove not implemented yet)
    let successCount = 0;
    let errorCount = 0;
    let processed = 0;

    for (const user of users) {
      try {
        // Get current access details first
        const accessDetails = await tradingViewService.getAccessDetails(user, pineIds[0]);

        if (accessDetails.hasAccess) {
          // Remove access
          const result = await tradingViewService.removeAccess(accessDetails);
          if (result.status === 'Success') {
            successCount++;
          } else {
            errorCount++;
          }
        } else {
          // User didn't have access anyway
          successCount++;
        }

        processed++;
        progressCallback(processed, users.length, successCount, errorCount);

      } catch (error) {
        console.log(`❌ Error procesando ${user}: ${error.message}`);
        errorCount++;
        processed++;
      }
    }

    const totalTime = Date.now() - startTime;
    const opsPerSecond = Math.round((processed / totalTime) * 1000 * 100) / 100;

    console.log('\n🎉 ¡ELIMINACIÓN MASIVA COMPLETADA!');
    console.log('📊 RESULTADOS FINALES:');
    console.log(`   ⏱️  Tiempo total: ${totalTime}ms (${Math.round(totalTime/1000)}s)`);
    console.log(`   ✅ Exitosos: ${successCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   📈 Tasa éxito: ${Math.round((successCount/processed)*100)}%`);
    console.log(`   🚀 Ops/segundo: ${opsPerSecond}`);
    console.log('');

    if (successCount >= 30) {
      console.log('🎯 ¡REMOCIÓN MASIVA EXITOSA! Los accesos han sido eliminados.');
    } else {
      console.log('⚠️  Algunos errores en la remoción. Es normal si algunos usuarios no tenían acceso.');
    }

  } catch (error) {
    console.error('\n❌ Error en la eliminación masiva:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Eliminación interrumpida por el usuario');
  process.exit(0);
});

// Run the test
runBulkRemoveTest().catch(console.error);
