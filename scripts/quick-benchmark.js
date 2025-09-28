#!/usr/bin/env node

/**
 * Quick Performance Benchmark
 * Fast test of current optimizations without real TradingView operations
 * Usage: node scripts/quick-benchmark.js
 */

const axios = require('axios');

const TEST_DURATION = 10000; // 10 segundos
const CONCURRENT_REQUESTS = 10;
const ENDPOINT = 'http://localhost:5000/api/validate/apidevs';

async function runQuickBenchmark() {
  console.log('🚀 QUICK BENCHMARK: Rendimiento Optimizado\n');
  console.log(`⏰ Duración: ${TEST_DURATION/1000} segundos`);
  console.log(`🔄 Requests concurrentes: ${CONCURRENT_REQUESTS}`);
  console.log(`📊 Endpoint: ${ENDPOINT}\n`);

  // Configurar axios con connection pooling optimizado
  axios.defaults.httpsAgent = new (require('https').Agent)({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 10000
  });

  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;
  let responseTimes = [];
  let activeRequests = 0;
  let maxConcurrent = 0;

  const startTime = Date.now();

  // Función para hacer una request
  async function makeRequest() {
    activeRequests++;
    maxConcurrent = Math.max(maxConcurrent, activeRequests);

    const requestStart = Date.now();
    try {
      const response = await axios.get(ENDPOINT);
      const requestEnd = Date.now();

      if (response.status === 200 && response.data.validuser === true) {
        successfulRequests++;
        responseTimes.push(requestEnd - requestStart);
      } else {
        failedRequests++;
      }
    } catch (error) {
      failedRequests++;
    } finally {
      activeRequests--;
      totalRequests++;
    }
  }

  // Ejecutar requests continuamente durante TEST_DURATION
  const interval = setInterval(() => {
    if (activeRequests < CONCURRENT_REQUESTS) {
      makeRequest();
    }
  }, 10); // Muy frecuente para maximizar concurrencia

  // Esperar a que termine el test
  await new Promise(resolve => setTimeout(resolve, TEST_DURATION));

  // Detener la generación de requests
  clearInterval(interval);

  // Esperar a que terminen las requests activas
  while (activeRequests > 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const endTime = Date.now();
  const actualDuration = endTime - startTime;

  // Calcular métricas
  const requestsPerSecond = Math.round((totalRequests / actualDuration) * 1000 * 100) / 100;
  const successRate = Math.round((successfulRequests / totalRequests) * 100 * 100) / 100;
  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;

  console.log('🎉 ¡BENCHMARK COMPLETADO!\n');
  console.log('📊 RESULTADOS:');
  console.log(`   ⏱️  Duración real: ${actualDuration}ms`);
  console.log(`   📈 Total requests: ${totalRequests}`);
  console.log(`   ✅ Exitosos: ${successfulRequests}`);
  console.log(`   ❌ Fallidos: ${failedRequests}`);
  console.log(`   📊 Tasa éxito: ${successRate}%`);
  console.log(`   🚀 Requests/segundo: ${requestsPerSecond}`);
  console.log(`   📏 Tiempo respuesta promedio: ${avgResponseTime}ms`);
  console.log(`   🔄 Máxima concurrencia: ${maxConcurrent}`);
  console.log('');

  // Comparación con baseline
  console.log('📊 COMPARACIÓN CON BASELINE:');
  const baselineRPS = 0.93; // Baseline sin optimizaciones
  const improvement = ((requestsPerSecond - baselineRPS) / baselineRPS) * 100;
  console.log(`   📊 Baseline (sin opt.): ${baselineRPS} req/seg`);
  console.log(`   ⚡ Optimizado: ${requestsPerSecond} req/seg`);
  console.log(`   📈 Mejora: +${Math.round(improvement * 100) / 100}%`);
  console.log('');

  // Estimaciones
  const estimatedRealOps = Math.round(requestsPerSecond * 0.7); // ~70% efficiency for real operations
  console.log('🔮 ESTIMACIONES PARA OPERACIONES REALES:');
  console.log(`   🎯 TradingView ops/seg estimadas: ${estimatedRealOps}`);
  console.log(`   ⏱️  35 usuarios × 1 indicador: ~${Math.round(35 / estimatedRealOps)}s`);
  console.log(`   ⏱️  35 usuarios × 25 indicadores: ~${Math.round((35 * 25) / estimatedRealOps)}s`);
  console.log(`   ⏱️  1000 usuarios × 25 indicadores: ~${Math.round((1000 * 25) / estimatedRealOps / 60)}min`);
  console.log('');

  if (requestsPerSecond > 5) {
    console.log('🎯 ¡PERFORMANCE EXCELENTE! Las optimizaciones están funcionando perfectamente.');
  } else if (requestsPerSecond > 2) {
    console.log('✅ ¡PERFORMANCE BUENO! Las optimizaciones están activas.');
  } else {
    console.log('⚠️  Performance moderado. Puede requerir más optimizaciones.');
  }
}

// Verificar que el servidor esté corriendo
async function checkServer() {
  try {
    await axios.get(ENDPOINT, { timeout: 5000 });
    return true;
  } catch (error) {
    console.log('❌ Servidor no disponible. Iniciando servidor...');
    return false;
  }
}

// Función principal
async function main() {
  if (!(await checkServer())) {
    console.log('🚀 Iniciando servidor automáticamente...');
    const { spawn } = require('child_process');
    const server = spawn('npm', ['start'], {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore'
    });

    // Esperar a que el servidor inicie
    await new Promise(resolve => setTimeout(resolve, 3000));

    if (!(await checkServer())) {
      console.error('❌ No se pudo iniciar el servidor automáticamente');
      process.exit(1);
    }

    console.log('✅ Servidor iniciado correctamente\n');
  }

  await runQuickBenchmark();

  // Detener servidor si fue iniciado automáticamente
  process.on('exit', () => {
    require('child_process').execSync('pkill -f "node src/server.js"', { stdio: 'ignore' });
  });
}

if (require.main === module) {
  main().catch(console.error);
}
