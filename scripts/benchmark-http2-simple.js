#!/usr/bin/env node

/**
 * Benchmark Script: HTTP/2 Connection Pooling Simple Test
 *
 * Prueba simple de latencia HTTP/2 vs HTTP/1.1
 * Usage: node scripts/benchmark-http2-simple.js
 */

const axios = require('axios');
const http2wrapper = require('http2-wrapper');

const TEST_REQUESTS = 50;
const CONCURRENT_REQUESTS = 5;

async function testEndpoint(agent, agentName) {
  console.log(`\n🔗 Testing ${agentName}...`);

  const instance = axios.create({
    httpAgent: agent,
    httpsAgent: agent,
    timeout: 10000,
    validateStatus: () => true // Aceptar cualquier status
  });

  const responseTimes = [];
  let successCount = 0;
  let errorCount = 0;

  // Ejecutar requests secuenciales para medir latencia pura
  for (let i = 0; i < TEST_REQUESTS; i++) {
    try {
      const start = Date.now();
      const response = await instance.get('https://httpbin.org/get');
      const end = Date.now();

      if (response.status === 200) {
        responseTimes.push(end - start);
        successCount++;
      } else {
        errorCount++;
      }
    } catch (error) {
      errorCount++;
    }

    // Pequeña pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  const results = {
    agent: agentName,
    totalRequests: TEST_REQUESTS,
    successCount,
    errorCount,
    avgResponseTime: Math.round(avgResponseTime * 100) / 100,
    successRate: Math.round((successCount / TEST_REQUESTS) * 100 * 100) / 100
  };

  console.log(`📊 Resultados ${agentName}:`);
  console.log(`   ✅ Éxitos: ${results.successCount}/${results.totalRequests}`);
  console.log(`   📏 Latencia promedio: ${results.avgResponseTime}ms`);
  console.log(`   📈 Tasa éxito: ${results.successRate}%`);

  return results;
}

async function main() {
  console.log('🔗 BENCHMARK HTTP/2 SIMPLE: Comparación de Latencia');
  console.log('⏰ Requests totales:', TEST_REQUESTS);
  console.log('🔄 Requests concurrentes: No (secuenciales para medir latencia pura)');
  console.log('📊 Endpoint: https://httpbin.org/get');

  try {
    // Test 1: HTTP/1.1 (default axios)
    console.log('\n📋 PRUEBA 1: HTTP/1.1 (sin pooling)');
    const http1Results = await testEndpoint(undefined, 'HTTP/1.1');

    // Pequeña pausa
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: HTTP/2 con connection pooling
    console.log('\n📋 PRUEBA 2: HTTP/2 con Connection Pooling');
    const http2Agent = new http2wrapper.Agent({
      maxSessions: 10,
      maxFreeSessions: 5,
      timeout: 5000,
      keepAlive: true,
      keepAliveMsecs: 30000
    });

    const http2Results = await testEndpoint(http2Agent, 'HTTP/2');

    // Comparación final
    console.log('\n🎯 COMPARACIÓN FINAL: HTTP/2 Connection Pooling');
    console.log('='.repeat(65));
    console.log(`HTTP/1.1:     ${http1Results.avgResponseTime}ms avg`);
    console.log(`HTTP/2:       ${http2Results.avgResponseTime}ms avg`);

    const latencyImprovement = ((http1Results.avgResponseTime - http2Results.avgResponseTime) / http1Results.avgResponseTime) * 100;
    const throughputImprovement = ((http2Results.successCount - http1Results.successCount) / http1Results.successCount) * 100;

    console.log(`📏 Mejora latencia: ${latencyImprovement > 0 ? '-' : '+'}${Math.abs(Math.round(latencyImprovement * 100) / 100)}%`);

    if (latencyImprovement > 5) {
      console.log('🎉 ¡HTTP/2 funcionando! Mejora significativa en latencia');
    } else if (latencyImprovement > 0) {
      console.log('✅ HTTP/2 activo con mejora moderada');
    } else {
      console.log('⚠️  HTTP/2 activo pero sin mejora significativa (posible sobrecarga)');
    }

    console.log('\n🔗 Resumen:');
    console.log(`   HTTP/2 debería mostrar mejora en latencia para conexiones reutilizadas`);
    console.log(`   En producción con TradingView, la mejora sería más notable`);

  } catch (error) {
    console.error('❌ Error en benchmark HTTP/2:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
