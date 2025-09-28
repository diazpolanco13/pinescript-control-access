/**
 * Metrics and Monitoring Routes
 * Endpoints para monitoring desde tu e-commerce
 */

const express = require('express');
const router = express.Router();
const os = require('os');
const tradingViewService = require('../services/tradingViewService');
const { apiAuth } = require('../middleware/apiAuth');
const { logger } = require('../utils/logger');

// Métricas en tiempo real para dashboard de e-commerce
router.get('/stats', apiAuth, async (req, res) => {
  try {
    const batcherStats = tradingViewService.requestBatcher.getStats();
    
    const stats = {
      // Performance metrics
      performance: {
        operations_per_second: calculateOpsPerSecond(),
        avg_response_time: batcherStats.avgResponseTime || 0,
        success_rate_current: batcherStats.successRate || 0,
        circuit_breaker_status: batcherStats.circuitOpen ? 'OPEN' : 'CLOSED'
      },
      
      // System health
      system: {
        uptime_seconds: Math.floor(process.uptime()),
        uptime_human: formatUptime(process.uptime()),
        memory_usage: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
        },
        cpu_info: {
          cores: os.cpus().length,
          load_average: os.loadavg().map(load => Math.round(load * 100) / 100),
          platform: os.platform(),
          arch: os.arch()
        }
      },
      
      // Request batcher detailed stats
      batcher: {
        total_processed: batcherStats.totalProcessed || 0,
        successful: batcherStats.successful || 0,
        failed: batcherStats.failed || 0,
        current_delay: batcherStats.currentDelay || 0,
        active_requests: batcherStats.activeRequests || 0,
        queue_size: batcherStats.queueSize || 0,
        batches_processed: batcherStats.currentBatch || 0,
        circuit_breaker: {
          open: batcherStats.circuitOpen || false,
          failures: batcherStats.consecutiveFailures || 0,
          threshold: tradingViewService.requestBatcher.circuitBreakerThreshold,
          open_until: batcherStats.circuitOpenUntil || null
        }
      },
      
      // Connection pool status
      connection_pool: {
        https_agent: getAgentStats(require('axios').defaults.httpsAgent),
        http_agent: getAgentStats(require('axios').defaults.httpAgent)
      },
      
      // Timestamp
      last_updated: new Date().toISOString()
    };
    
    res.json(stats);
    
    logger.debug({ 
      endpoint: '/metrics/stats',
      response_time: Date.now() - req.start_time 
    }, 'Metrics stats served');
    
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to generate stats');
    res.status(500).json({ 
      error: 'Failed to generate metrics',
      details: error.message 
    });
  }
});

// Health check específico para e-commerce monitoring
router.get('/health', apiAuth, async (req, res) => {
  try {
    const healthStart = Date.now();
    
    // Test rápido de conexión a TradingView
    const testResult = await tradingViewService.validateUsername('apidevs');
    const healthTime = Date.now() - healthStart;
    const batcherStats = tradingViewService.requestBatcher.getStats();
    
    const health = {
      status: 'healthy',
      tradingview_connection: testResult.validuser ? 'active' : 'degraded',
      response_time_ms: healthTime,
      last_check: new Date().toISOString(),
      components: {
        api_server: 'healthy',
        tradingview_session: tradingViewService.sessionId ? 'active' : 'inactive',
        request_batcher: batcherStats.circuitOpen ? 'degraded' : 'healthy',
        http_pool: 'active'
      }
    };
    
    const statusCode = health.components.tradingview_session === 'active' ? 200 : 503;
    
    res.status(statusCode).json(health);
    
    logger.info({ 
      health_status: health.status,
      response_time: healthTime,
      tradingview_test: testResult.validuser
    }, 'Health check completed');
    
  } catch (error) {
    logger.error({ error: error.message }, 'Health check failed');
    
    res.status(503).json({
      status: 'unhealthy',
      tradingview_connection: 'failed',
      error: error.message,
      last_check: new Date().toISOString(),
      components: {
        api_server: 'healthy',
        tradingview_session: 'error',
        request_batcher: 'unknown',
        http_pool: 'unknown'
      }
    });
  }
});

// Métricas específicas para business intelligence
router.get('/business', apiAuth, async (req, res) => {
  try {
    // Aquí podrías integrar con una BD para métricas de negocio
    const businessMetrics = {
      operations_today: await getOperationsToday(),
      revenue_processed_today: await getRevenueProcessedToday(),
      customers_activated_today: await getCustomersActivatedToday(),
      average_operation_value: await getAverageOperationValue(),
      top_performing_indicators: await getTopPerformingIndicators()
    };
    
    res.json(businessMetrics);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to generate business metrics');
    res.status(500).json({ 
      error: 'Failed to generate business metrics',
      details: error.message 
    });
  }
});

// Funciones auxiliares
function calculateOpsPerSecond() {
  const stats = tradingViewService.requestBatcher.getStats();
  if (!stats.totalProcessed || !stats.startTime) return 0;
  
  const elapsedSeconds = (Date.now() - stats.startTime) / 1000;
  return Math.round((stats.totalProcessed / elapsedSeconds) * 100) / 100;
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getAgentStats(agent) {
  if (!agent) return null;
  
  return {
    max_sockets: agent.maxSockets || 'N/A',
    max_free_sockets: agent.maxFreeSockets || 'N/A',
    timeout: agent.timeout || 'N/A',
    active_sockets: agent.sockets ? Object.keys(agent.sockets).length : 0,
    free_sockets: agent.freeSockets ? Object.keys(agent.freeSockets).length : 0,
    pending_requests: agent.requests ? Object.keys(agent.requests).length : 0
  };
}

// Funciones de business metrics (implementar según tu BD)
async function getOperationsToday() {
  // TODO: Integrar con tu sistema de logging o BD
  return 0; // Placeholder
}

async function getRevenueProcessedToday() {
  // TODO: Calcular basado en operaciones exitosas × valor promedio
  return 0; // Placeholder
}

async function getCustomersActivatedToday() {
  // TODO: Contar usuarios únicos procesados exitosamente hoy
  return 0; // Placeholder
}

async function getAverageOperationValue() {
  // TODO: Revenue promedio por operación exitosa
  return 0; // Placeholder
}

async function getTopPerformingIndicators() {
  // TODO: Indicadores más solicitados/exitosos
  return []; // Placeholder
}

module.exports = router;
