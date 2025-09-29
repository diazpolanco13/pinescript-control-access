/**
 * TradingView Access Management Server
 * High-performance Node.js implementation for bulk access operations
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const axios = require('axios');

const config = require('../config');
const { logger } = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimit');
const { initAdminAuth } = require('./utils/adminAuth');

// Routes
const validateRoutes = require('./routes/validate');
const accessRoutes = require('./routes/access');
const metricsRoutes = require('./routes/metrics');
const configRoutes = require('./routes/config');
const { router: adminRoutes, setTradingViewService } = require('./routes/admin');

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

// Static files
app.use(express.static('public'));

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
        bulk: 'POST /api/access/bulk (OPTIMIZED + PROTECTED)',
        bulkRemove: 'POST /api/access/bulk-remove (PROTECTED)',
        replace: 'POST /api/access/replace (PROTECTED)',
        profileImage: 'GET /profile/:username (PUBLIC)',
        admin: 'GET /admin (REQUIRES TOKEN)',
        metrics: 'GET /api/metrics/stats (E-COMMERCE)',
        healthCheck: 'GET /api/metrics/health (E-COMMERCE)'
      }
  });
});

// Initialize admin authentication (similar al sistema Python)
const adminToken = initAdminAuth();

// Initialize TradingView service globally
const TradingViewService = require('./services/tradingViewService');
const tradingViewService = new TradingViewService();

// Connect TradingView service to admin routes
setTradingViewService(tradingViewService);

// Initialize TradingView service (carga cookies automáticamente)
tradingViewService.init().catch(error => {
  logger.error({ error: error.message }, 'Failed to initialize TradingView service');
});

// API routes
app.use('/api/validate', validateRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/config', configRoutes);

// Public profile image endpoint (no authentication required)
app.get('/profile/:username', async (req, res) => {
  const { username } = req.params;

  try {
    // 1. Fetch the public TradingView profile page
    const profileUrl = `https://www.tradingview.com/u/${username}/`;

    const response = await axios.get(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TradingView API)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 10000
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }

    // 2. Get the HTML content
    const html = response.data;

    // 3. Extract image URL using regex
    const imagePattern = /https:\/\/s3\.tradingview\.com\/userpics\/[^"']*/;
    const imageMatch = html.match(imagePattern);

    if (imageMatch) {
      // 4. Return success response
      res.json({
        success: true,
        username: username,
        profile_image: imageMatch[0],
        source: 'public_profile'
      });
    } else {
      // 5. No image found
      res.status(404).json({
        success: false,
        username: username,
        profile_image: null,
        message: 'Profile image not found or user does not exist'
      });
    }

  } catch (error) {
    // 6. Handle errors
    res.status(500).json({
      success: false,
      username: req.params.username,
      error: 'Failed to fetch profile image',
      message: error.message
    });
  }
});

// Admin routes (protected endpoints)
app.use('/admin', adminRoutes);

// Admin panel route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /',
      'GET /api/validate/:username',
      'GET /api/access/:username',
      'POST /api/access/bulk-remove',
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
const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info({
    port: config.port,
    nodeEnv: config.nodeEnv,
    pid: process.pid
  }, '🚀 TradingView Access Management Server started');

  console.log(`🚀 Server running on http://0.0.0.0:${config.port}`);
  console.log(`🌐 Access via: http://localhost:${config.port} or http://127.0.0.1:${config.port}`);
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
