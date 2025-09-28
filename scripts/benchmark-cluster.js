#!/usr/bin/env node

/**
 * Benchmark Script: Clustering Performance Comparison
 *
 * Compara rendimiento con y sin clustering
 * Usage: node scripts/benchmark-cluster.js
 */

const { spawn } = require('child_process');
const path = require('path');

const TEST_DURATION = 30000; // 30 segundos por test
const CONCURRENT_REQUESTS = 10;
const REQUEST_INTERVAL = 100; // ms entre requests

async function runBenchmark(serverCommand, serverName) {
  console.log(`\n🚀 BENCHMARK: ${serverName}`);
  console.log('=' .repeat(50));

  return new Promise((resolve, reject) => {
    // Iniciar servidor
    const server = spawn('bash', ['-c', serverCommand], {
      cwd: path.join(__dirname, '..'),
      detached: true
    });

    let serverReady = false;
    let requestCount = 0;
    let responseTimes = [];
    let errors = 0;

    // Esperar a que el servidor esté listo
    const readyTimeout = setTimeout(() => {
      if (!serverReady) {
        console.log('⏳ Esperando servidor...');
      }
    }, 3000);

    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running on port') || output.includes('TradingView API con Clustering')) {
        serverReady = true;
        clearTimeout(readyTimeout);
        console.log('✅ Servidor listo, iniciando pruebas...');

        // Iniciar pruebas de carga
        startLoadTest();
      }
    });

    server.stderr.on('data', (data) => {
      console.error(`Server error: ${data}`);
    });

    function startLoadTest() {
      const startTime = Date.now();
      let activeRequests = 0;

      const interval = setInterval(() => {
        if (activeRequests < CONCURRENT_REQUESTS) {
          activeRequests++;
          makeRequest().finally(() => {
            activeRequests--;
          });
        }

        // Verificar si terminó el test
        if (Date.now() - startTime >= TEST_DURATION) {
          clearInterval(interval);

          // Esperar a que terminen las requests activas
          const finishCheck = setInterval(() => {
            if (activeRequests === 0) {
              clearInterval(finishCheck);
              finishBenchmark();
            }
          }, 100);
        }
      }, REQUEST_INTERVAL);
    }

    async function makeRequest() {
      const requestStart = Date.now();

      try {
        const response = await fetch('http://localhost:5000/api/validate/apidevs');
        const requestEnd = Date.now();

        if (response.ok) {
          requestCount++;
          responseTimes.push(requestEnd - requestStart);
        } else {
          errors++;
        }
      } catch (error) {
        errors++;
      }
    }

    function finishBenchmark() {
      // Terminar servidor
      process.kill(-server.pid);

      // Calcular métricas
      const totalTime = Date.now() - Date.now() + TEST_DURATION; // Ajuste aproximado
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;
      const requestsPerSecond = requestCount / (totalTime / 1000);
      const errorRate = errors > 0 ? (errors / (requestCount + errors)) * 100 : 0;

      const results = {
        server: serverName,
        totalRequests: requestCount,
        errors: errors,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100,
        testDuration: totalTime
      };

      console.log(`📊 Resultados:`);
      console.log(`   ✅ Requests exitosos: ${results.totalRequests}`);
      console.log(`   ❌ Errores: ${results.errors}`);
      console.log(`   📏 Tiempo respuesta promedio: ${results.avgResponseTime}ms`);
      console.log(`   🚀 Requests/segundo: ${results.requestsPerSecond}`);
      console.log(`   📈 Tasa de error: ${results.errorRate}%`);

      resolve(results);
    }

    // Timeout de seguridad
    setTimeout(() => {
      if (!serverReady) {
        console.log('❌ Servidor no pudo iniciar en tiempo límite');
        process.kill(-server.pid);
        reject(new Error('Server startup timeout'));
      }
    }, 10000);
  });
}

async function main() {
  console.log('🧪 BENCHMARK COMPLETO: Comparación Single-threaded vs Clustering');
  console.log('⏰ Duración por test: 30 segundos');
  console.log('🔄 Requests concurrentes: 10');
  console.log('📊 Endpoint: GET /api/validate/apidevs');

  try {
    // Test 1: Single-threaded
    const singleResults = await runBenchmark(
      'npm run start',
      'Single-threaded (1 core)'
    );

    // Pequeña pausa
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Clustering (2 workers)
    const clusterResults = await runBenchmark(
      'MAX_WORKERS=2 npm run start:cluster',
      'Clustering (2 cores)'
    );

    // Comparación final
    console.log('\n🎯 COMPARACIÓN FINAL:');
    console.log('=' .repeat(60));
    console.log(`Single-threaded: ${singleResults.requestsPerSecond} req/seg`);
    console.log(`Clustering (2x):   ${clusterResults.requestsPerSecond} req/seg`);

    const improvement = ((clusterResults.requestsPerSecond - singleResults.requestsPerSecond) / singleResults.requestsPerSecond) * 100;
    console.log(`📈 Mejora: ${improvement > 0 ? '+' : ''}${Math.round(improvement * 100) / 100}%`);

    if (improvement > 50) {
      console.log('🎉 ¡Clustering funcionando perfectamente!');
    } else if (improvement > 0) {
      console.log('✅ Clustering activo, mejora moderada');
    } else {
      console.log('⚠️  Clustering activo pero sin mejora significativa');
    }

  } catch (error) {
    console.error('❌ Error en benchmark:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runBenchmark };
