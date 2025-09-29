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
        documentation: 'GET /doc-endpoint (AI-READABLE DOCS)',
        admin: 'GET /admin (REQUIRES TOKEN)',
        validate: 'GET /api/validate/:username',
        access: 'GET|POST|DELETE /api/access/:username',
        bulk: 'POST /api/access/bulk (OPTIMIZED + PROTECTED)',
        bulkRemove: 'POST /api/access/bulk-remove (PROTECTED)',
        replace: 'POST /api/access/replace (PROTECTED)',
        profileImage: 'GET /profile/:username (PUBLIC)',
        metrics: 'GET /api/metrics/stats (E-COMMERCE)',
        healthCheck: 'GET /api/metrics/health (E-COMMERCE)'
      },
      quickLinks: {
        documentation: 'http://185.218.124.241:5001/doc-endpoint',
        adminPanel: 'http://185.218.124.241:5001/admin',
        examples: 'http://185.218.124.241:5001/doc-endpoint#examples'
      }
  });
});

// API Documentation endpoint - Machine readable documentation
app.get('/doc-endpoint', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TradingView Access Management API - Documentation</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .endpoint-card { transition: all 0.3s ease; }
        .endpoint-card:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        .code-block { background: #1f2937; border: 1px solid #374151; border-radius: 0.5rem; }
        .method-get { background: #10b981; color: white; }
        .method-post { background: #3b82f6; color: white; }
        .method-delete { background: #ef4444; color: white; }
        .param-required { border-left: 3px solid #ef4444; }
        .param-optional { border-left: 3px solid #6b7280; }
    </style>
</head>
<body class="bg-gray-900 text-white min-h-screen">
    <div class="container mx-auto px-4 py-8 max-w-6xl">
        <!-- Header -->
        <div class="text-center mb-12">
            <h1 class="text-4xl font-bold text-cyan-400 mb-4">🚀 TradingView Access Management API</h1>
            <p class="text-xl text-gray-300 mb-2">Documentación completa - Optimizada para IAs</p>
            <div class="text-sm text-gray-400 mb-4">
                Versión: 2.3.0 | Base URL: <code class="bg-gray-800 px-2 py-1 rounded">http://185.218.124.241:5001</code>
            </div>

            <!-- Quick Access Buttons -->
            <div class="flex flex-wrap justify-center gap-4 mb-6">
                <a href="/" class="inline-flex items-center px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                    🏠 Página Principal
                </a>
                <a href="/admin" class="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                    🎛️ Panel Admin
                </a>
                <a href="#examples" class="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                    💡 Ejemplos
                </a>
            </div>
        </div>

        <!-- Quick Navigation -->
        <div class="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 class="text-xl font-semibold text-cyan-300 mb-4">📋 Navegación Rápida</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <a href="#public-endpoints" class="text-cyan-400 hover:text-cyan-300">🔓 Endpoints Públicos</a>
                <a href="#validation-endpoints" class="text-cyan-400 hover:text-cyan-300">👤 Validación</a>
                <a href="#access-endpoints" class="text-cyan-400 hover:text-cyan-300">🔑 Gestión de Acceso</a>
                <a href="#bulk-endpoints" class="text-cyan-400 hover:text-cyan-300">🚀 Operaciones Masivas</a>
                <a href="#admin-endpoints" class="text-cyan-400 hover:text-cyan-300">🎛️ Administración</a>
                <a href="#metrics-endpoints" class="text-cyan-400 hover:text-cyan-300">📊 Métricas</a>
                <a href="#authentication" class="text-cyan-400 hover:text-cyan-300">🔐 Autenticación</a>
                <a href="#examples" class="text-cyan-400 hover:text-cyan-300">💡 Ejemplos</a>
            </div>
        </div>

        <!-- API Overview -->
        <div class="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/20 rounded-lg p-6 mb-8">
            <h2 class="text-2xl font-bold text-cyan-300 mb-4">🎯 Información General de la API</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 class="text-lg font-semibold mb-2">📊 Estadísticas de Rendimiento</h3>
                    <ul class="space-y-1 text-sm">
                        <li><strong>FAST Mode (≤5 usuarios):</strong> ~1 segundo</li>
                        <li><strong>STANDARD Mode (>5 usuarios):</strong> Escalabilidad automática</li>
                        <li><strong>Operaciones Máximas:</strong> 25,000+ accesos garantizados</li>
                        <li><strong>Optimización:</strong> 9x más rápido en operaciones pequeñas</li>
                    </ul>
                </div>
                <div>
                    <h3 class="text-lg font-semibold mb-2">🛡️ Características de Seguridad</h3>
                    <ul class="space-y-1 text-sm">
                        <li><strong>Rate Limiting:</strong> Circuit breaker automático</li>
                        <li><strong>Autenticación:</strong> X-API-Key para operaciones bulk</li>
                        <li><strong>Token Admin:</strong> Sesiones seguras con expiración</li>
                        <li><strong>Validación:</strong> Input sanitization completa</li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Endpoints Sections -->

        <!-- Public Endpoints -->
        <section id="public-endpoints" class="mb-12">
            <h2 class="text-3xl font-bold text-green-400 mb-6">🔓 Endpoints Públicos</h2>

            <!-- Health Check -->
            <div class="endpoint-card bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                <div class="flex items-center mb-4">
                    <span class="method-get px-3 py-1 rounded text-sm font-bold mr-3">GET</span>
                    <h3 class="text-xl font-semibold text-white">/</h3>
                </div>
                <p class="text-gray-300 mb-4">Endpoint de health check - Información general de la API</p>
                <div class="code-block p-4 mb-4">
                    <pre class="text-cyan-400"><code>GET http://185.218.124.241:5001/</code></pre>
                </div>
                <div class="text-sm text-gray-400">
                    <strong>Respuesta:</strong> JSON con versión, estado y lista de endpoints disponibles
                </div>
            </div>

            <!-- Profile Image -->
            <div class="endpoint-card bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                <div class="flex items-center mb-4">
                    <span class="method-get px-3 py-1 rounded text-sm font-bold mr-3">GET</span>
                    <h3 class="text-xl font-semibold text-white">/profile/{username}</h3>
                </div>
                <p class="text-gray-300 mb-4">Obtener URL de imagen de perfil de usuario de TradingView (sin autenticación)</p>
                <div class="code-block p-4 mb-4">
                    <pre class="text-cyan-400"><code>GET http://185.218.124.241:5001/profile/apidevelopers</code></pre>
                </div>
                <div class="text-sm text-gray-400">
                    <strong>Parámetros:</strong> username (string) - Nombre de usuario de TradingView<br>
                    <strong>Respuesta:</strong> JSON con URL de imagen de perfil
                </div>
            </div>
        </section>

        <!-- Validation Endpoints -->
        <section id="validation-endpoints" class="mb-12">
            <h2 class="text-3xl font-bold text-blue-400 mb-6">👤 Endpoints de Validación</h2>

            <div class="endpoint-card bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                <div class="flex items-center mb-4">
                    <span class="method-get px-3 py-1 rounded text-sm font-bold mr-3">GET</span>
                    <h3 class="text-xl font-semibold text-white">/api/validate/{username}</h3>
                </div>
                <p class="text-gray-300 mb-4">Verificar si un usuario existe en TradingView</p>
                <div class="code-block p-4 mb-4">
                    <pre class="text-cyan-400"><code>GET http://185.218.124.241:5001/api/validate/apidevelopers</code></pre>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <strong class="text-green-400">✅ Respuesta Exitosa:</strong>
                        <pre class="bg-gray-700 p-2 rounded mt-1 text-xs">{
  "validuser": true,
  "verifiedUserName": "apidevelopers"
}</pre>
                    </div>
                    <div>
                        <strong class="text-red-400">❌ Error:</strong>
                        <pre class="bg-gray-700 p-2 rounded mt-1 text-xs">{
  "errorMessage": "Username validation failed",
  "details": "User does not exist"
}</pre>
                    </div>
                </div>
            </div>
        </section>

        <!-- Access Management Endpoints -->
        <section id="access-endpoints" class="mb-12">
            <h2 class="text-3xl font-bold text-purple-400 mb-6">🔑 Gestión de Acceso Individual</h2>

            <!-- Check Access -->
            <div class="endpoint-card bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                <div class="flex items-center mb-4">
                    <span class="method-get px-3 py-1 rounded text-sm font-bold mr-3">GET</span>
                    <h3 class="text-xl font-semibold text-white">/api/access/{username}?pine_ids=["ID1","ID2"]</h3>
                </div>
                <p class="text-gray-300 mb-4">Consultar acceso actual de un usuario a indicadores específicos</p>
                <div class="code-block p-4 mb-4">
                    <pre class="text-cyan-400"><code>GET http://185.218.124.241:5001/api/access/apidevs?pine_ids=["PUB;ebd861d70a9f478bb06fe60c5d8f469c"]</code></pre>
                </div>
                <div class="text-sm text-gray-400 mb-4">
                    <strong>Query Params:</strong> pine_ids (JSON array string) - IDs de indicadores a consultar
                </div>
            </div>

            <!-- Grant Access -->
            <div class="endpoint-card bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                <div class="flex items-center mb-4">
                    <span class="method-post px-3 py-1 rounded text-sm font-bold mr-3">POST</span>
                    <h3 class="text-xl font-semibold text-white">/api/access/{username}</h3>
                </div>
                <p class="text-gray-300 mb-4">Conceder acceso temporal a indicadores</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="code-block p-4">
                        <pre class="text-cyan-400"><code>POST http://185.218.124.241:5001/api/access/apidevs
Content-Type: application/json

{
  "pine_ids": ["PUB;ebd861d70a9f478bb06fe60c5d8f469c"],
  "duration": "7D"
}</code></pre>
                    </div>
                    <div class="text-sm">
                        <strong>Duraciones válidas:</strong><br>
                        • "7D" - 7 días<br>
                        • "30D" - 30 días<br>
                        • "90D" - 90 días<br>
                        • "1Y" - 1 año<br>
                        • "1L" - Lifetime
                    </div>
                </div>
            </div>

            <!-- Remove Access -->
            <div class="endpoint-card bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                <div class="flex items-center mb-4">
                    <span class="method-delete px-3 py-1 rounded text-sm font-bold mr-3">DELETE</span>
                    <h3 class="text-xl font-semibold text-white">/api/access/{username}</h3>
                </div>
                <p class="text-gray-300 mb-4">Remover acceso a indicadores específicos</p>
                <div class="code-block p-4">
                    <pre class="text-cyan-400"><code>DELETE http://185.218.124.241:5001/api/access/apidevs
Content-Type: application/json

{
  "pine_ids": ["PUB;ebd861d70a9f478bb06fe60c5d8f469c"]
}</code></pre>
                </div>
            </div>
        </section>

        <!-- Bulk Operations -->
        <section id="bulk-endpoints" class="mb-12">
            <h2 class="text-3xl font-bold text-orange-400 mb-6">🚀 Operaciones Masivas (Optimizadas)</h2>

            <div class="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <div class="flex items-center">
                    <span class="text-yellow-400 mr-2">⚠️</span>
                    <strong class="text-yellow-300">IMPORTANTE:</strong>
                    <span class="text-gray-300 ml-2">Estos endpoints requieren autenticación X-API-Key</span>
                </div>
            </div>

            <!-- Bulk Grant -->
            <div class="endpoint-card bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                <div class="flex items-center mb-4">
                    <span class="method-post px-3 py-1 rounded text-sm font-bold mr-3">POST</span>
                    <h3 class="text-xl font-semibold text-white">/api/access/bulk</h3>
                    <span class="bg-green-600 text-white px-2 py-1 rounded text-xs ml-2">FAST/STANDARD</span>
                </div>
                <p class="text-gray-300 mb-4">Conceder acceso masivo con detección automática de modo óptimo</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="code-block p-4">
                        <pre class="text-cyan-400"><code>POST http://185.218.124.241:5001/api/access/bulk
Content-Type: application/json
X-API-Key: [TU_API_KEY_AQUI]

{
  "users": ["user1", "user2"],
  "pine_ids": ["PUB;xxx"],
  "duration": "7D",
  "options": {
    "preValidateUsers": false,
    "onProgress": false
  }
}</code></pre>
                    </div>
                    <div class="text-sm">
                        <strong>Modos Automáticos:</strong><br>
                        • ≤5 usuarios: <strong class="text-green-400">FAST Mode (~1s)</strong><br>
                        • >5 usuarios: <strong class="text-blue-400">STANDARD Mode (escalable)</strong><br><br>
                        <strong>Recomendaciones:</strong><br>
                        • preValidateUsers: false<br>
                        • onProgress: false
                    </div>
                </div>
            </div>

            <!-- Bulk Remove -->
            <div class="endpoint-card bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                <div class="flex items-center mb-4">
                    <span class="method-post px-3 py-1 rounded text-sm font-bold mr-3">POST</span>
                    <h3 class="text-xl font-semibold text-white">/api/access/bulk-remove</h3>
                </div>
                <p class="text-gray-300 mb-4">Remover acceso masivo (ideal para suscripciones vencidas)</p>
                <div class="code-block p-4">
                    <pre class="text-cyan-400"><code>POST http://185.218.124.241:5001/api/access/bulk-remove
Content-Type: application/json
X-API-Key: [TU_API_KEY_AQUI]

{
  "users": ["user1", "user2"],
  "pine_ids": ["PUB;xxx"],
  "options": {
    "preValidateUsers": false,
    "onProgress": false
  }
}</code></pre>
                </div>
            </div>

            <!-- Bulk Replace -->
            <div class="endpoint-card bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                <div class="flex items-center mb-4">
                    <span class="method-post px-3 py-1 rounded text-sm font-bold mr-3">POST</span>
                    <h3 class="text-xl font-semibold text-white">/api/access/replace</h3>
                </div>
                <p class="text-gray-300 mb-4">Reemplazar acceso completo (cambios de plan automatizados)</p>
                <div class="code-block p-4">
                    <pre class="text-cyan-400"><code>POST http://185.218.124.241:5001/api/access/replace
Content-Type: application/json
X-API-Key: [TU_API_KEY_AQUI]

{
  "users": ["user1"],
  "pine_ids": ["PUB;xxx"],
  "duration": "30D",
  "options": {
    "preValidateUsers": false
  }
}</code></pre>
                </div>
            </div>
        </section>

        <!-- Admin Endpoints -->
        <section id="admin-endpoints" class="mb-12">
            <h2 class="text-3xl font-bold text-red-400 mb-6">🎛️ Endpoints de Administración</h2>

            <div class="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
                <div class="flex items-center">
                    <span class="text-red-400 mr-2">🔐</span>
                    <strong class="text-red-300">REQUIEREN AUTENTICACIÓN:</strong>
                    <span class="text-gray-300 ml-2">X-Admin-Token header obligatorio</span>
                </div>
            </div>

            <!-- Admin Dashboard -->
            <div class="endpoint-card bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                <div class="flex items-center mb-4">
                    <span class="method-get px-3 py-1 rounded text-sm font-bold mr-3">GET</span>
                    <h3 class="text-xl font-semibold text-white">/admin</h3>
                </div>
                <p class="text-gray-300 mb-4">Panel de administración web completo</p>
                <div class="code-block p-4 mb-4">
                    <pre class="text-cyan-400"><code>GET http://185.218.124.241:5001/admin</code></pre>
                </div>
                <div class="text-sm text-gray-400">
                    <strong>Autenticación:</strong> Token de admin (se muestra en consola del servidor al iniciar)
                </div>
            </div>

            <!-- Cookie Status -->
            <div class="endpoint-card bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                <div class="flex items-center mb-4">
                    <span class="method-get px-3 py-1 rounded text-sm font-bold mr-3">GET</span>
                    <h3 class="text-xl font-semibold text-white">/admin/cookies/status</h3>
                </div>
                <p class="text-gray-300 mb-4">Verificar estado actual de las cookies de TradingView</p>
                <div class="code-block p-4">
                    <pre class="text-cyan-400"><code>GET http://185.218.124.241:5001/admin/cookies/status
X-Admin-Token: [tu_token_admin]</code></pre>
                </div>
            </div>

            <!-- Update Cookies -->
            <div class="endpoint-card bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                <div class="flex items-center mb-4">
                    <span class="method-post px-3 py-1 rounded text-sm font-bold mr-3">POST</span>
                    <h3 class="text-xl font-semibold text-white">/admin/cookies/update</h3>
                </div>
                <p class="text-gray-300 mb-4">Actualizar cookies manualmente</p>
                <div class="code-block p-4">
                    <pre class="text-cyan-400"><code>POST http://185.218.124.241:5001/admin/cookies/update
X-Admin-Token: [tu_token_admin]
Content-Type: application/json

{
  "sessionid": "valor_sessionid",
  "sessionid_sign": "valor_sessionid_sign"
}</code></pre>
                </div>
            </div>
        </section>

        <!-- Metrics Endpoints -->
        <section id="metrics-endpoints" class="mb-12">
            <h2 class="text-3xl font-bold text-pink-400 mb-6">📊 Endpoints de Métricas</h2>

            <div class="endpoint-card bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                <div class="flex items-center mb-4">
                    <span class="method-get px-3 py-1 rounded text-sm font-bold mr-3">GET</span>
                    <h3 class="text-xl font-semibold text-white">/api/metrics/stats</h3>
                </div>
                <p class="text-gray-300 mb-4">Estadísticas completas del sistema para e-commerce</p>
                <div class="code-block p-4 mb-4">
                    <pre class="text-cyan-400"><code>GET http://185.218.124.241:5001/api/metrics/stats</code></pre>
                </div>
                <div class="text-sm text-gray-400">
                    <strong>Respuesta:</strong> JSON con estadísticas de operaciones, rendimiento y estado del sistema
                </div>
            </div>

            <div class="endpoint-card bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                <div class="flex items-center mb-4">
                    <span class="method-get px-3 py-1 rounded text-sm font-bold mr-3">GET</span>
                    <h3 class="text-xl font-semibold text-white">/api/metrics/health</h3>
                </div>
                <p class="text-gray-300 mb-4">Health check avanzado del sistema</p>
                <div class="code-block p-4">
                    <pre class="text-cyan-400"><code>GET http://185.218.124.241:5001/api/metrics/health</code></pre>
                </div>
            </div>
        </section>

        <!-- Authentication Section -->
        <section id="authentication" class="mb-12">
            <h2 class="text-3xl font-bold text-yellow-400 mb-6">🔐 Autenticación y Seguridad</h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Admin Token -->
                <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 class="text-xl font-semibold text-yellow-300 mb-4">🎛️ Token de Administración</h3>
                    <div class="space-y-3 text-sm">
                        <div>
                            <strong>¿Dónde obtenerlo?</strong><br>
                            <span class="text-gray-300">Se muestra en la consola del servidor al iniciar</span>
                        </div>
                        <div>
                            <strong>¿Cómo usarlo?</strong><br>
                            <code class="bg-gray-700 px-2 py-1 rounded text-xs">X-Admin-Token: [token_value]</code>
                        </div>
                        <div>
                            <strong>¿Caduca?</strong><br>
                            <span class="text-gray-300">Cada vez que reinicia el servidor</span>
                        </div>
                    </div>
                </div>

                <!-- X-API-Key -->
                <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 class="text-xl font-semibold text-yellow-300 mb-4">🔑 X-API-Key (Bulk Operations)</h3>
                    <div class="space-y-3 text-sm">
                        <div>
                            <strong>Valor de producción:</strong><br>
                            <code class="bg-gray-700 px-2 py-1 rounded text-xs">🔐 API Key generada automáticamente (64 chars)</code>
                        </div>
                        <div>
                            <strong>¿Dónde configurarlo?</strong><br>
                            <span class="text-gray-300">Variable de entorno: <code>ECOMMERCE_API_KEY</code></span>
                        </div>
                        <div>
                            <strong>¿Dónde obtenerlo?</strong><br>
                            <span class="text-gray-300">Generado automáticamente en logs del servidor</span>
                        </div>
                        <div>
                            <strong>¿Cuándo usarlo?</strong><br>
                            <span class="text-gray-300">En todos los endpoints /api/access/bulk*</span>
                        </div>
                        <div>
                            <strong>¿Cómo usarlo?</strong><br>
                            <code class="bg-gray-700 px-2 py-1 rounded text-xs">X-API-Key: [tu_api_key_aqui]</code>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Rate Limiting -->
            <div class="bg-gray-800 rounded-lg p-6 mt-6 border border-gray-700">
                <h3 class="text-xl font-semibold text-yellow-300 mb-4">🛡️ Rate Limiting</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-400">100</div>
                        <div class="text-gray-300">requests/15min</div>
                        <div class="text-xs text-gray-400">API General</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-orange-400">5</div>
                        <div class="text-gray-300">requests/min</div>
                        <div class="text-xs text-gray-400">Bulk Operations</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-red-400">30</div>
                        <div class="text-gray-300">requests/min</div>
                        <div class="text-xs text-gray-400">TradingView API</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Examples Section -->
        <section id="examples" class="mb-12">
            <h2 class="text-3xl font-bold text-indigo-400 mb-6">💡 Ejemplos Prácticos</h2>

            <div class="space-y-6">
                <!-- Quick Start -->
                <div class="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-lg p-6">
                    <h3 class="text-xl font-semibold text-indigo-300 mb-4">🚀 Inicio Rápido (4 pasos)</h3>
                    <div class="space-y-4">
                        <div class="flex items-start space-x-3">
                            <span class="bg-indigo-500 text-white px-2 py-1 rounded text-sm font-bold">1</span>
                            <div>
                                <strong>Iniciar servidor:</strong><br>
                                <code class="bg-gray-800 px-2 py-1 rounded text-sm">npm start</code>
                            </div>
                        </div>
                        <div class="flex items-start space-x-3">
                            <span class="bg-indigo-500 text-white px-2 py-1 rounded text-sm font-bold">2</span>
                            <div>
                                <strong>Copiar token admin:</strong><br>
                                <span class="text-gray-300">Aparece en consola del servidor</span>
                            </div>
                        </div>
                        <div class="flex items-start space-x-3">
                            <span class="bg-indigo-500 text-white px-2 py-1 rounded text-sm font-bold">3</span>
                            <div>
                                <strong>Acceder al panel:</strong><br>
                                <code class="bg-gray-800 px-2 py-1 rounded text-sm">http://185.218.124.241:5001/admin</code>
                            </div>
                        </div>
                        <div class="flex items-start space-x-3">
                            <span class="bg-indigo-500 text-white px-2 py-1 rounded text-sm font-bold">4</span>
                            <div>
                                <strong>Probar endpoints públicos:</strong><br>
                                <code class="bg-gray-800 px-2 py-1 rounded text-sm">curl "http://185.218.124.241:5001/profile/apidevelopers"</code>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- cURL Examples -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <h4 class="text-lg font-semibold text-green-400 mb-3">✅ Validar Usuario</h4>
                        <pre class="bg-gray-900 p-3 rounded text-xs text-cyan-400"><code>curl -s "http://185.218.124.241:5001/api/validate/apidevelopers" | jq</code></pre>
                    </div>

                    <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <h4 class="text-lg font-semibold text-blue-400 mb-3">🔑 Consultar Acceso</h4>
                        <pre class="bg-gray-900 p-3 rounded text-xs text-cyan-400"><code>curl "http://185.218.124.241:5001/api/access/apidevs?pine_ids=[\"PUB;xxx\"]"</code></pre>
                    </div>

                    <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <h4 class="text-lg font-semibold text-orange-400 mb-3">🚀 Bulk Grant (FAST)</h4>
                        <pre class="bg-gray-900 p-3 rounded text-xs text-cyan-400"><code>curl -X POST "http://185.218.124.241:5001/api/access/bulk" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: [TU_API_KEY_AQUI]" \\
  -d '{"users":["user1","user2"],"pine_ids":["PUB;xxx"],"duration":"7D","options":{"preValidateUsers":false,"onProgress":false}}'</code></pre>
                    </div>

                    <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <h4 class="text-lg font-semibold text-purple-400 mb-3">🎛️ Verificar Estado Admin</h4>
                        <pre class="bg-gray-900 p-3 rounded text-xs text-cyan-400"><code>curl -H "X-Admin-Token: [tu_token]" \\
  "http://185.218.124.241:5001/admin/cookies/status"</code></pre>
                    </div>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <div class="text-center mt-12 pt-8 border-t border-gray-700">
            <div class="text-gray-400 text-sm">
                <p>🚀 <strong>TradingView Access Management API v2.3.0</strong></p>
                <p class="mt-2">Optimizada para IAs - Documentación auto-contenida</p>
                <p class="mt-2">📧 Contacto: diazpolanco13@github.com</p>
            </div>
        </div>
    </div>

    <script>
        // Auto-scroll to hash on load
        if (window.location.hash) {
            setTimeout(() => {
                const element = document.querySelector(window.location.hash);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        }

        // Copy to clipboard functionality for code blocks
        document.addEventListener('DOMContentLoaded', function() {
            const codeBlocks = document.querySelectorAll('pre code');
            codeBlocks.forEach(block => {
                block.addEventListener('click', function() {
                    navigator.clipboard.writeText(this.textContent).then(() => {
                        // Simple feedback
                        const original = this.style.background;
                        this.style.background = '#10b981';
                        setTimeout(() => {
                            this.style.background = original;
                        }, 200);
                    });
                });
                block.style.cursor = 'pointer';
                block.title = 'Click to copy';
            });
        });
    </script>
</body>
</html>
  `);
});

// Initialize admin authentication (similar al sistema Python)
const adminToken = initAdminAuth();

// Initialize TradingView service globally (singleton instance)
const tradingViewService = require('./services/tradingViewService');

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
