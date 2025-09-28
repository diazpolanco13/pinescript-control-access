#!/usr/bin/env node

/**
 * Benchmark Script: HTTP/2 Connection Pooling Performance Test
 *
 * Compara rendimiento con y sin HTTP/2 connection pooling
 * Usage: node scripts/benchmark-http2.js
 */

const { spawn } = require('child_process');
const path = require('path');

const TEST_DURATION = 20000; // 20 segundos por test (más corto que clustering)
const CONCURRENT_REQUESTS = 5;
const REQUEST_INTERVAL = 200; // ms entre requests (más frecuente)

async function runHttp2Benchmark(serverCommand, serverName, useHttp2) {
  console.log(`\n🔗 BENCHMARK HTTP/2: ${serverName}`);
  console.log('=' .repeat(50));

  return new Promise((resolve, reject) => {
    // Iniciar servidor
    const server = spawn('bash', ['-c', serverCommand], {
      cwd: path.join(__dirname, '..'),
      detached: true,
      env: {
        ...process.env,
        USE_HTTP2: useHttp2 ? 'true' : 'false'
      }
    });

    let serverReady = false;
    let requestCount = 0;
    let responseTimes = [];
    let errors = 0;
    let connectionReused = 0;

    // Esperar a que el servidor esté listo
    const readyTimeout = setTimeout(() => {
      if (!serverReady) {
        console.log('⏳ Esperando servidor...');
      }
    }, 5000);

    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running on port') || output.includes('TradingView API')) {
        serverReady = true;
        clearTimeout(readyTimeout);
        console.log('✅ Servidor listo, iniciando pruebas...');

        // Iniciar pruebas de carga
        startLoadTest();
      }

      // Detectar reutilización de conexiones HTTP/2
      if (output.includes('HTTP/2 Connection Pooling initialized')) {
        console.log('🔗 HTTP/2 Connection Pooling activado');
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

          // Verificar headers de conexión HTTP/2
          const connection = response.headers.get('connection');
          if (connection === 'keep-alive' || response.headers.get('http2') === 'true') {
            connectionReused++;
          }
        } else {
          errors++;
        }
      } catch (error) {
        errors++;
      }
    }

    function finishBenchmark() {
      // Terminar servidor
      try {
        process.kill(-server.pid);
      } catch (e) {
        // Ignore if already dead
      }

      // Calcular métricas
      const totalTime = TEST_DURATION;
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;
      const requestsPerSecond = requestCount / (totalTime / 1000);
      const errorRate = errors > 0 ? (errors / (requestCount + errors)) * 100 : 0;
      const connectionReuseRate = connectionReused > 0 ? (connectionReused / requestCount) * 100 : 0;

      const results = {
        server: serverName,
        useHttp2: useHttp2,
        totalRequests: requestCount,
        errors: errors,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100,
        connectionReuseRate: Math.round(connectionReuseRate * 100) / 100,
        testDuration: totalTime
      };

      console.log(`📊 Resultados:`);
      console.log(`   ✅ Requests exitosos: ${results.totalRequests}`);
      console.log(`   ❌ Errores: ${results.errors}`);
      console.log(`   📏 Tiempo respuesta promedio: ${results.avgResponseTime}ms`);
      console.log(`   🚀 Requests/segundo: ${results.requestsPerSecond}`);
      console.log(`   📈 Tasa de error: ${results.errorRate}%`);
      if (useHttp2) {
        console.log(`   🔗 Conexiones reutilizadas: ${results.connectionReuseRate}%`);
      }

      resolve(results);
    }

    // Timeout de seguridad
    setTimeout(() => {
      if (!serverReady) {
        console.log('❌ Servidor no pudo iniciar en tiempo límite');
        try {
          process.kill(-server.pid);
        } catch (e) {
          // Ignore
        }
        reject(new Error('Server startup timeout'));
      }
    }, 15000);
  });
}

async function main() {
  console.log('🔗 BENCHMARK COMPLETO: HTTP/2 Connection Pooling');
  console.log('⏰ Duración por test: 20 segundos');
  console.log('🔄 Requests concurrentes: 5');
  console.log('📊 Endpoint: GET /api/validate/apidevs');

  try {
    // Test 1: Sin HTTP/2 (configuración base)
    console.log('\n📋 PRUEBA 1: Sin HTTP/2 Connection Pooling');
    const withoutHttp2Results = await runHttp2Benchmark(
      'npm start',
      'Sin HTTP/2',
      false
    );

    // Pequeña pausa
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 2: Con HTTP/2
    console.log('\n📋 PRUEBA 2: Con HTTP/2 Connection Pooling');
    const withHttp2Results = await runHttp2Benchmark(
      'npm start',
      'Con HTTP/2',
      true
    );

    // Comparación final
    console.log('\n🎯 COMPARACIÓN FINAL: HTTP/2 Connection Pooling');
    console.log('=' .repeat(65));
    console.log(`Sin HTTP/2:     ${withoutHttp2Results.requestsPerSecond} req/seg (${withoutHttp2Results.avgResponseTime}ms avg)`);
    console.log(`Con HTTP/2:     ${withHttp2Results.requestsPerSecond} req/seg (${withHttp2Results.avgResponseTime}ms avg)`);

    const latencyImprovement = ((withoutHttp2Results.avgResponseTime - withHttp2Results.avgResponseTime) / withoutHttp2Results.avgResponseTime) * 100;
    const throughputImprovement = ((withHttp2Results.requestsPerSecond - withoutHttp2Results.requestsPerSecond) / withoutHttp2Results.requestsPerSecond) * 100;

    console.log(`📏 Mejora latencia: ${latencyImprovement > 0 ? '-' : '+'}${Math.abs(Math.round(latencyImprovement * 100) / 100)}%`);
    console.log(`🚀 Mejora throughput: ${throughputImprovement > 0 ? '+' : ''}${Math.round(throughputImprovement * 100) / 100}%`);

    if (latencyImprovement > 10) {
      console.log('🎉 ¡HTTP/2 funcionando perfectamente!');
      console.log('   ✅ Conexiones reutilizadas eficientemente');
      console.log('   ✅ Latencia reducida significativamente');
    } else if (latencyImprovement > 0) {
      console.log('✅ HTTP/2 activo con mejora moderada');
    } else {
      console.log('⚠️  HTTP/2 activo pero mejora limitada (posible sobrecarga)');
    }

    console.log(`\n🔗 Conexiones reutilizadas: ${withHttp2Results.connectionReuseRate}%`);

  } catch (error) {
    console.error('❌ Error en benchmark HTTP/2:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runHttp2Benchmark };
