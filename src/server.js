/**
 * TradingView Access Management Server
 * High-performance Node.js implementation for bulk access operations
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const config = require('../config');
const { logger } = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimit');

// Routes
const validateRoutes = require('./routes/validate');
const accessRoutes = require('./routes/access');

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || false
    : true,
  credentials: true
}));

// Compression
app.use(compression());

// Rate limiting
app.use('/api/', apiLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Large limit for bulk operations
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }, 'Request completed');
  });

  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'TradingView Access Management API - Node.js',
    version: '2.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /',
      validate: 'GET /api/validate/:username',
      access: 'GET|POST|DELETE /api/access/:username',
      bulk: 'POST /api/access/bulk'
    }
  });
});

// API routes
app.use('/api/validate', validateRoutes);
app.use('/api/access', accessRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /',
      'GET /api/validate/:username',
      'GET /api/access/:username',
      'POST /api/access/:username',
      'DELETE /api/access/:username',
      'POST /api/access/bulk'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error({
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    ip: req.ip
  }, 'Unhandled error');

  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const server = app.listen(config.port, () => {
  logger.info({
    port: config.port,
    nodeEnv: config.nodeEnv,
    pid: process.pid
  }, '🚀 TradingView Access Management Server started');

  console.log(`🚀 Server running on port ${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🔧 PID: ${process.pid}`);
  console.log(`📝 Logs: ${config.logLevel} level`);
});

// Export for testing
module.exports = app;

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal({ error: error.message, stack: error.stack }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, 'Unhandled rejection');
  process.exit(1);
});
