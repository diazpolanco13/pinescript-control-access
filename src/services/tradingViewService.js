/**
 * TradingView Service
 * Core business logic for TradingView access management
 * Migrated from Python tradingview.py with optimizations for bulk operations
 */

const axios = require('axios');
const FormData = require('form-data');
const os = require('os');
const https = require('https');
const http = require('http');
const { urls } = require('../../config/urls');
const config = require('../../config');
const sessionStorage = require('../utils/sessionStorage');
const { getAccessExtension, parseDuration, getCurrentUTCDate } = require('../utils/dateHelper');
const { authLogger, apiLogger, bulkLogger } = require('../utils/logger');
const RequestBatcher = require('../utils/requestBatcher');
const CookieManager = require('../utils/cookieManager');
const adaptiveConfig = require('../utils/adaptiveConfig');

/**
 * 🚀 HTTP/1.1 Connection Pooling Configuration (Optimized)
 * Optimizes connections to TradingView for reduced latency and better performance
 */

// Configurar axios con connection pooling optimizado
axios.defaults.httpsAgent = new https.Agent({
  keepAlive: true,              // Mantener conexiones vivas
  keepAliveMsecs: 30000,        // 30 segundos keep-alive
  maxSockets: 50,               // Máximo 50 conexiones por host
  maxFreeSockets: 10,           // 10 sockets libres mantenidos
  timeout: 10000,               // 10 segundos timeout
  scheduling: 'lifo'            // Last In, First Out para bulk operations
});

axios.defaults.httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 10000,
  scheduling: 'lifo'
});

axios.defaults.timeout = 15000; // 15 segundos timeout por request

apiLogger.info({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 10000
}, '🚀 HTTP Connection Pooling Optimized initialized');

/**
 * Monitor HTTP Connection Pool Status
 * Logs pool statistics every 60 seconds
 */
setInterval(() => {
  const httpsStats = {
    activeSockets: axios.defaults.httpsAgent.sockets ? Object.keys(axios.defaults.httpsAgent.sockets).length : 0,
    freeSockets: axios.defaults.httpsAgent.freeSockets ? Object.keys(axios.defaults.httpsAgent.freeSockets).length : 0,
    pendingRequests: axios.defaults.httpsAgent.requests ? Object.keys(axios.defaults.httpsAgent.requests).length : 0,
    totalSockets: axios.defaults.httpsAgent.totalSocketCount || 0
  };

  const httpStats = {
    activeSockets: axios.defaults.httpAgent.sockets ? Object.keys(axios.defaults.httpAgent.sockets).length : 0,
    freeSockets: axios.defaults.httpAgent.freeSockets ? Object.keys(axios.defaults.httpAgent.freeSockets).length : 0,
    pendingRequests: axios.defaults.httpAgent.requests ? Object.keys(axios.defaults.httpAgent.requests).length : 0,
    totalSockets: axios.defaults.httpAgent.totalSocketCount || 0
  };

  apiLogger.debug({ https: httpsStats, http: httpStats }, 'HTTP Connection Pool Stats');
}, 60000); // Log cada minuto

class TradingViewService {
  constructor() {
    this.sessionId = null;
    this.sessionIdSign = null;
    this.initialized = false;
    this.cookieManager = new CookieManager();

    // Initialize intelligent request batcher (OPTIMIZED for performance)
    // Initialize with default 'mixed' configuration
    this.initBatcher('mixed');
  }

  /**
   * Initialize service - load and validate cookies
   * Basado en el sistema Python funcional que evita CAPTCHA
   */

  /**
   * Initialize adaptive request batcher based on operation type
   * @param {string} operation - 'validate', 'grant', 'remove', or 'mixed'
   */
  initBatcher(operation = 'mixed') {
    // Check if adaptiveConfig exists, otherwise use default values
    if (!adaptiveConfig || !adaptiveConfig.operations) {
      // Fallback to optimized defaults if adaptiveConfig is not available
      this.requestBatcher = new RequestBatcher({
        maxConcurrent: 29,
        batchSize: 58,
        minDelay: 50,
        maxDelay: 3000,
        backoffMultiplier: 2,
        circuitBreakerThreshold: 3,
        circuitBreakerTimeout: 30000
      });
      return;
    }
    
    const config = adaptiveConfig.operations[operation] || adaptiveConfig.operations.mixed;
    
    this.requestBatcher = new RequestBatcher({
      maxConcurrent: config.maxConcurrent,
      batchSize: config.batchSize,
      minDelay: config.minDelay,
      maxDelay: config.minDelay * 10, // 10x min for backoff
      backoffMultiplier: 1.5,
      circuitBreakerThreshold: 3,
      circuitBreakerTimeout: 30000
    });
    
    apiLogger.info(`🎯 Adaptive batcher initialized for ${operation} operations`, {
      maxConcurrent: config.maxConcurrent,
      batchSize: config.batchSize,
      minDelay: config.minDelay
    });
  }

  async init() {
    if (this.initialized) return;

    try {
      authLogger.info('🔍 Initializing TradingView service with cookie authentication...');

      // Load cookies from storage (similar al sistema Python)
      const cookieData = await this.cookieManager.loadCookies();

      if (cookieData) {
        this.sessionId = cookieData.sessionid;
        this.sessionIdSign = cookieData.sessionid_sign;

        authLogger.debug({
          hasSessionId: !!this.sessionId,
          hasSessionIdSign: !!this.sessionIdSign,
          lastUpdated: cookieData.timestamp
        }, 'Cookies loaded from storage');

        // Validate cookies against TradingView API
        const isValid = await this.validateCookies();
        if (!isValid) {
          authLogger.warn('❌ Stored cookies are invalid or expired');
          // No hacer login automático - esperar actualización manual
        } else {
          authLogger.info('✅ Cookies are valid - ready for API calls');
        }
      } else {
        authLogger.info('⚠️ No cookies found - manual cookie update required via admin panel');
      }

      this.initialized = true;
      authLogger.info('TradingView service initialized successfully');
    } catch (error) {
      authLogger.error({ error: error.message }, 'Failed to initialize TradingView service');
      throw error;
    }
  }

  /**
   * Validate current cookies against TradingView API
   * Similar al sistema Python - usa ambas cookies sessionid y sessionid_sign
   */
  async validateCookies() {
    if (!this.sessionId || !this.sessionIdSign) {
      return false;
    }

    try {
      return await this.cookieManager.validateCookies(this.sessionId, this.sessionIdSign);
    } catch (error) {
      authLogger.debug({ error: error.message }, 'Cookie validation failed');
      return false;
    }
  }

  /**
   * Update cookies manually (similar al sistema Python)
   * @param {string} sessionid - Cookie sessionid del navegador
   * @param {string} sessionid_sign - Cookie sessionid_sign del navegador
   */
  async updateCookies(sessionid, sessionid_sign) {
    try {
      // Validar cookies antes de guardar
      const isValid = await this.cookieManager.validateCookies(sessionid, sessionid_sign);

      if (!isValid) {
        throw new Error('Cookies inválidas - verifica que hayas copiado correctamente las cookies del navegador');
      }

      // Guardar cookies
      const saved = await this.cookieManager.saveCookies(sessionid, sessionid_sign);

      if (saved) {
        // Actualizar propiedades de la instancia
        this.sessionId = sessionid;
        this.sessionIdSign = sessionid_sign;

        authLogger.info('✅ Cookies actualizadas exitosamente');
        return { success: true, message: 'Cookies actualizadas y validadas exitosamente' };
      } else {
        throw new Error('Error guardando cookies');
      }
    } catch (error) {
      authLogger.error({ error: error.message }, 'Error actualizando cookies');
      throw error;
    }
  }

  /**
   * Get TradingView profile data (similar al sistema Python)
   * Extrae balance, username, partner status, etc.
   */
  async getProfileData() {
    if (!this.sessionId || !this.sessionIdSign) {
      return null;
    }

    try {
      return await this.cookieManager.getProfileData(this.sessionId, this.sessionIdSign);
    } catch (error) {
      authLogger.debug({ error: error.message }, 'Error obteniendo datos del perfil');
      return null;
    }
  }

  /**
   * Check if cookies are available and valid
   */
  isAuthenticated() {
    return !!(this.sessionId && this.sessionIdSign);
  }

  /**
   * Validate cookies using Pine Script API (fallback when /tvcoins/details/ fails)
   * This method uses a read-only Pine Script endpoint to verify authentication
   */
  async validateCookiesWithPineAPI() {
    if (!this.sessionId || !this.sessionIdSign) {
      return { valid: false };
    }

    try {
      // Usar el endpoint de listado de usuarios que es de solo lectura
      // Esto debería funcionar si las cookies son válidas para Pine Script operations
      const response = await axios.get(urls.list_users, {
        params: { limit: 1 }, // Solo pedimos 1 usuario para minimizar carga
        headers: {
          'origin': 'https://www.tradingview.com',
          'cookie': `sessionid=${this.sessionId}; sessionid_sign=${this.sessionIdSign}`
        },
        timeout: 10000
      });

      if (response.status === 200) {
        const data = response.data;
        // Si la respuesta es exitosa, las cookies son válidas
        // Intentar extraer username si está disponible
        let username = null;
        if (data && Array.isArray(data) && data.length > 0 && data[0].username) {
          username = data[0].username;
        }

        authLogger.debug('Cookie validation successful via Pine API');
        return {
          valid: true,
          username: username,
          method: 'pine_api'
        };
      }
    } catch (error) {
      authLogger.debug({ error: error.message }, 'Cookie validation failed via Pine API');
    }

    return { valid: false };
  }

  /**
   * Validate username
   */
  async validateUsername(username) {
    try {
      const response = await axios.get(`${urls.username_hint}?s=${username}`, {
        timeout: 5000
      });

      const users = response.data;
      const validUser = users.find(user =>
        user.username.toLowerCase() === username.toLowerCase()
      );

      return {
        validuser: !!validUser,
        verifiedUserName: validUser ? validUser.username : ''
      };
    } catch (error) {
      apiLogger.error({ error: error.message, username }, 'Username validation failed');
      throw error;
    }
  }

  /**
   * Get access details for a user and pine ID
   */
  async getAccessDetails(username, pineId) {
    try {
      const payload = { pine_id: pineId, username };

      const response = await axios.post(
        `${urls.list_users}?limit=10&order_by=-created`,
        payload,
        {
          headers: {
            'origin': 'https://www.tradingview.com',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': `sessionid=${this.sessionId}; sessionid_sign=${this.sessionIdSign}`
          },
          timeout: 10000
        }
      );

      const userResponse = response.data;
      const users = userResponse.results || [];

      const accessDetails = { pine_id: pineId, username };
      let hasAccess = false;
      let noExpiration = false;
      let expiration = getCurrentUTCDate();

      for (const user of users) {
        if (user.username.toLowerCase() === username.toLowerCase()) {
          hasAccess = true;
          const strExpiration = user.expiration;
          if (strExpiration) {
            expiration = strExpiration;
          } else {
            noExpiration = true;
          }
          break;
        }
      }

      accessDetails.hasAccess = hasAccess;
      accessDetails.noExpiration = noExpiration;
      accessDetails.currentExpiration = expiration;

      return accessDetails;
    } catch (error) {
      apiLogger.error({
        error: error.message,
        username,
        pineId
      }, 'Failed to get access details');
      throw error;
    }
  }

  /**
   * Add/modify access for a user
   */
  async addAccess(accessDetails, extensionType, extensionLength) {
    try {
      const noExpiration = accessDetails.noExpiration;
      accessDetails.expiration = accessDetails.currentExpiration;
      accessDetails.status = 'Not Applied';

      if (!noExpiration) {
        const payload = {
          pine_id: accessDetails.pine_id,
          username_recip: accessDetails.username
        };

        // Calculate new expiration
        if (extensionType !== 'L') {
          const newExpiration = getAccessExtension(
            accessDetails.currentExpiration,
            extensionType,
            extensionLength
          );
          payload.expiration = newExpiration;
          accessDetails.expiration = newExpiration;
        } else {
          accessDetails.noExpiration = true;
        }

        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          formData.append(key, value);
        });

        const endpoint = accessDetails.hasAccess ? urls.modify_access : urls.add_access;

        const response = await axios.post(endpoint, formData, {
          headers: {
            ...formData.getHeaders(),
            'origin': 'https://www.tradingview.com',
            'cookie': `sessionid=${this.sessionId}; sessionid_sign=${this.sessionIdSign}`
          },
          timeout: 15000
        });

        accessDetails.status = (response.status === 200 || response.status === 201)
          ? 'Success'
          : 'Failure';
      }

      return accessDetails;
    } catch (error) {
      apiLogger.error({
        error: error.message,
        username: accessDetails.username,
        pineId: accessDetails.pine_id
      }, 'Failed to add/modify access');
      accessDetails.status = 'Failure';
      return accessDetails;
    }
  }

  /**
   * Remove access for a user
   */
  async removeAccess(accessDetails) {
    try {
      const payload = {
        pine_id: accessDetails.pine_id,
        username_recip: accessDetails.username
      };

      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await axios.post(urls.remove_access, formData, {
        headers: {
          ...formData.getHeaders(),
          'origin': 'https://www.tradingview.com',
          'cookie': `sessionid=${this.sessionId}`
        },
        timeout: 15000
      });

      accessDetails.status = response.status === 200 ? 'Success' : 'Failure';
      return accessDetails;
    } catch (error) {
      apiLogger.error({
        error: error.message,
        username: accessDetails.username,
        pineId: accessDetails.pine_id
      }, 'Failed to remove access');
      accessDetails.status = 'Failure';
      return accessDetails;
    }
  }

  /**
   * Grant access with duration string (e.g., "7D", "1M")
   */
  async grantAccess(username, pineId, duration) {
    await this.init();

    try {
      // Get current access details
      const accessDetails = await this.getAccessDetails(username, pineId);

      // Parse duration
      const { extensionType, extensionLength } = parseDuration(duration);

      // Grant access
      const result = await this.addAccess(accessDetails, extensionType, extensionLength);

      apiLogger.info({
        username,
        pineId,
        duration,
        status: result.status
      }, 'Access granted');

      return result;
    } catch (error) {
      apiLogger.error({
        error: error.message,
        username,
        pineId,
        duration
      }, 'Failed to grant access');
      throw error;
    }
  }

  /**
   * Bulk grant access to multiple users and pine IDs
   * This is the high-performance implementation for mass operations
   */
  /**
   * Pre-validate users before bulk operations
   */
  async validateUsersBatch(users, options = {}) {
    // UNIFIED MODE for validation (most permissive - no rate limits observed)
    const userCount = users.length;
    
    // Very aggressive config for validation (TradingView allows it)
    let config;
    if (userCount <= 10) {
      config = { maxConcurrent: userCount, minDelay: 0, batchSize: userCount };
    } else {
      config = { maxConcurrent: 20, minDelay: 0, batchSize: 30 };
    }
    
    // No need for full batcher for validation, but keeping for consistency
    this.requestBatcher = new RequestBatcher({
      maxConcurrent: config.maxConcurrent,
      batchSize: config.batchSize,
      minDelay: config.minDelay,
      maxDelay: 1000,
      backoffMultiplier: 1.2,
      circuitBreakerThreshold: 10,
      circuitBreakerTimeout: 10000
    });
    const { maxConcurrent = 8 } = options; // OPTIMIZADO: Más concurrencia
    const results = new Map();

    bulkLogger.info(`🔍 Pre-validating ${users.length} users before bulk operations`);

    // Process in optimized concurrent batches
    for (let i = 0; i < users.length; i += maxConcurrent) {
      const batch = users.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async (user) => {
        try {
          const isValid = await this.validateUsername(user);
          results.set(user, isValid);
          return { user, valid: isValid };
        } catch (error) {
          bulkLogger.warn(`Failed to validate user ${user}`, { error: error.message });
          results.set(user, false);
          return { user, valid: false };
        }
      });

      await Promise.allSettled(batchPromises);

      // OPTIMIZADO: Reduced delay between batches
      if (i + maxConcurrent < users.length) {
        await new Promise(resolve => setTimeout(resolve, 150)); // REDUCIDO de 500ms a 150ms
      }
    }

    const validUsers = Array.from(results.entries())
      .filter(([_, valid]) => valid)
      .map(([user, _]) => user);

    const invalidUsers = Array.from(results.entries())
      .filter(([_, valid]) => !valid)
      .map(([user, _]) => user);

    bulkLogger.info(`✅ User validation complete`, {
      total: users.length,
      valid: validUsers.length,
      invalid: invalidUsers.length,
      validPercent: Math.round((validUsers.length / users.length) * 100)
    });

    return {
      validUsers,
      invalidUsers,
      results
    };
  }

  /**
   * Handle 429 rate limit errors with smart backoff
   */
  async handle429Error(operation, retryCount = 0) {
    const backoffConfig = adaptiveConfig.adaptive.rateLimitBackoff;
    const baseDelay = this.requestBatcher.minDelay;
    const delay = baseDelay * Math.pow(backoffConfig.delayMultiplier, retryCount);
    
    bulkLogger.warn(`⚠️ Rate limit hit for ${operation}, backing off ${delay}ms`, {
      operation,
      retryCount,
      delay
    });
    
    // Temporarily reduce concurrency
    const originalConcurrent = this.requestBatcher.maxConcurrent;
    this.requestBatcher.maxConcurrent = Math.max(1, Math.floor(originalConcurrent / backoffConfig.concurrencyDivisor));
    
    // Wait with exponential backoff
    await new Promise(resolve => setTimeout(resolve, Math.min(delay, backoffConfig.cooldownPeriod)));
    
    // Restore concurrency gradually
    setTimeout(() => {
      this.requestBatcher.maxConcurrent = originalConcurrent;
      bulkLogger.info('✅ Restored original concurrency after cooldown');
    }, backoffConfig.cooldownPeriod);
  }


  async bulkGrantAccess(users, pineIds, duration, options = {}) {
    const {
      onProgress = null,
      preValidateUsers = false
    } = options;

    await this.init();

    // UNIFIED INTELLIGENT MODE - One mode that adapts to any size
    const userCount = users.length;
    const totalOps = users.length * pineIds.length;
    
    // Intelligent configuration based on operation size
    let config;
    let modeName;
    
    if (userCount <= 3) {
      config = { maxConcurrent: userCount, minDelay: 0, batchSize: userCount };
      modeName = 'ULTRA_FAST';
    } else if (userCount <= 10) {
      config = { maxConcurrent: 5, minDelay: 100, batchSize: 5 };
      modeName = 'FAST';
    } else if (userCount <= 50) {
      config = { maxConcurrent: 5, minDelay: 200, batchSize: 10 };
      modeName = 'BALANCED';
    } else {
      config = { maxConcurrent: 3, minDelay: 300, batchSize: 15 };
      modeName = 'CONSERVATIVE';
    }
    
    // Apply adaptive configuration
    this.requestBatcher = new RequestBatcher({
      maxConcurrent: config.maxConcurrent,
      batchSize: config.batchSize,
      minDelay: config.minDelay,
      maxDelay: config.minDelay * 10,
      backoffMultiplier: 1.5,
      circuitBreakerThreshold: 3,
      circuitBreakerTimeout: 30000
    });
    
    bulkLogger.info(`🎯 UNIFIED MODE: ${modeName} for ${userCount} users`, {
      users: userCount,
      pineIds: pineIds.length,
      totalOps: totalOps,
      config: config
    });

    // For very small operations (≤3 users), use direct parallel execution
    if (userCount <= 3) {
      return await this._bulkGrantAccessFast(users, pineIds, duration, options);
    }
    
    // For all other operations, use the intelligent batcher
    return await this._bulkGrantAccessStandard(users, pineIds, duration, options);
  }

  // FAST MODE: Direct processing without complex batching
  async _bulkGrantAccessFast(users, pineIds, duration, options = {}) {
    const { onProgress = null } = options;
    const startTime = Date.now();
    const totalOperations = users.length * pineIds.length;

    bulkLogger.info('⚡ FAST MODE OPTIMIZED: True parallel processing');

    // Create all operations
    const operations = [];
    for (const user of users) {
      for (const pineId of pineIds) {
        operations.push(this.grantAccess(user, pineId, duration));
      }
    }

    // Execute ALL in parallel (no sequential processing!)
    const results = await Promise.allSettled(operations);

    // Process results
    let successCount = 0;
    let errorCount = 0;
    const processedResults = results.map((result, index) => {
      const user = users[Math.floor(index / pineIds.length)];
      const pineId = pineIds[index % pineIds.length];
      
      if (result.status === 'fulfilled' && result.value?.status === 'Success') {
        successCount++;
        return result.value;
      } else {
        errorCount++;
        return {
          pine_id: pineId,
          username: user,
          hasAccess: false,
          status: 'Failure',
          error: result.reason?.message || 'Unknown error'
        };
      }
    });

    const executionTime = Date.now() - startTime;
    const successRate = Math.round((successCount / totalOperations) * 100);

    bulkLogger.info(`⚡ FAST MODE completed in ${executionTime}ms (${successRate}% success)`);

    return {
      total: totalOperations,
      success: successCount,
      errors: errorCount,
      duration: executionTime,
      successRate,
      results: processedResults,
      skippedUsers: [],
      totalUsersAttempted: users.length,
      validUsersProcessed: users.length,
      batcherStats: { 
        batchesProcessed: 1, 
        avgResponseTime: executionTime / totalOperations, 
        finalDelay: 0, 
        circuitBreakerActivated: false 
      }
    };
  }

  // STANDARD MODE: Original complex batching for large operations
  async _bulkGrantAccessStandard(users, pineIds, duration, options = {}) {
    const {
      onProgress = null,
      preValidateUsers = false
    } = options;

    // Pre-validate users if requested
    let usersToProcess = users;
    let validationResults = null;

    if (preValidateUsers && users.length > 1) {
      bulkLogger.info('🔍 Pre-validating users before bulk grant access');
      validationResults = await this.validateUsersBatch(users, { maxConcurrent: 8 });

      usersToProcess = validationResults.validUsers;

      if (validationResults.invalidUsers.length > 0) {
        bulkLogger.warn(`${validationResults.invalidUsers.length} invalid users skipped`, {
          invalidUsers: validationResults.invalidUsers.slice(0, 5),
          totalSkipped: validationResults.invalidUsers.length
        });
      }
    }

    const startTime = Date.now();
    const totalOperations = usersToProcess.length * pineIds.length;

    bulkLogger.logBulkStart('grant-access-intelligent', totalOperations);

    if (usersToProcess.length === 0) {
      bulkLogger.warn('No valid users to process after validation');
      return {
        total: 0,
        success: 0,
        errors: 0,
        duration: 0,
        successRate: 0,
        skippedUsers: validationResults?.invalidUsers || [],
        batcherStats: this.requestBatcher.getStats()
      };
    }

    try {
      let processed = 0;
      let successCount = 0;
      let errorCount = 0;

      // Create individual requests for each user+pineId combination (only valid users)
      const requests = [];
      for (const user of usersToProcess) {
        for (const pineId of pineIds) {
          requests.push({
            user,
            pineId,
            duration
          });
        }
      }

      bulkLogger.info(`🚀 Processing ${totalOperations} operations with intelligent batching`, {
        users: users.length,
        pineIds: pineIds.length,
        batcherConfig: {
          maxConcurrent: this.requestBatcher.maxConcurrent,
          batchSize: this.requestBatcher.batchSize,
          minDelay: this.requestBatcher.minDelay
        }
      });

      // Progress tracking for callback
      let lastProgressUpdate = 0;
      const progressInterval = 2000; // Update progress every 2 seconds

      // Process all requests through intelligent batcher
      const batchPromises = requests.map(async (requestData, index) => {
        let finalResult = null;
        let retryCount = 0;
        const maxOperationRetries = 3; // Máximo reintentos por operación completa

        while (retryCount < maxOperationRetries && !finalResult) {
          try {
            const result = await this.requestBatcher.add(
              async () => {
                // Execute the actual grant access operation
                return await this.grantAccess(
                  requestData.user,
                  requestData.pineId,
                  requestData.duration
                );
              },
              {
                priority: retryCount > 0 ? 1 : 0, // Prioridad más alta para reintentos
                maxRetries: retryCount > 0 ? 1 : 2 // Menos reintentos internos para reintentos externos
              }
            );

            if (result && result.status === 'Success') {
              finalResult = result;
            } else {
              retryCount++;
              if (retryCount < maxOperationRetries) {
                bulkLogger.warn(`Operation failed for ${requestData.user}, retrying (${retryCount}/${maxOperationRetries})`, {
                  user: requestData.user,
                  pineId: requestData.pineId,
                  attempt: retryCount + 1,
                  result: result
                });

                // Esperar antes del reintento (backoff exponencial)
                const retryDelay = Math.min(5000 * Math.pow(2, retryCount - 1), 30000);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
              }
            }
          } catch (error) {
            retryCount++;
            if (retryCount < maxOperationRetries) {
              bulkLogger.error(`Critical error for ${requestData.user}, retrying (${retryCount}/${maxOperationRetries})`, {
                user: requestData.user,
                pineId: requestData.pineId,
                error: error.message,
                attempt: retryCount + 1
              });

              // Esperar más tiempo para errores críticos
              const retryDelay = Math.min(10000 * Math.pow(2, retryCount - 1), 60000);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }
        }

        // Update progress counters
        processed++;
        if (finalResult && finalResult.status === 'Success') {
          successCount++;
        } else {
          errorCount++;
          bulkLogger.error(`Operation failed permanently for ${requestData.user}`, {
            user: requestData.user,
            pineId: requestData.pineId,
            totalRetries: retryCount,
            finalResult: finalResult
          });
        }

        // Progress callback (throttled)
        const now = Date.now();
        if (onProgress && (now - lastProgressUpdate > progressInterval || processed === totalOperations)) {
          onProgress(processed, totalOperations, successCount, errorCount);
          lastProgressUpdate = now;
        }

        // Log progress periodically
        if (processed % 5 === 0 || processed === totalOperations) {
          const progressPercent = Math.round((processed / totalOperations) * 100);
          bulkLogger.info(`📈 Intelligent batching progress: ${processed}/${totalOperations} (${progressPercent}%)`, {
            successful: successCount,
            errors: errorCount,
            successRate: Math.round((successCount / processed) * 100),
            batcherStats: this.requestBatcher.getStats()
          });
        }

        return finalResult;
      });

      // Wait for all operations to complete
      await Promise.allSettled(batchPromises);

      const totalDuration = Date.now() - startTime;

      // Get final batcher stats
      const batcherStats = this.requestBatcher.getStats();

      bulkLogger.logBulkComplete('grant-access-intelligent', processed, totalDuration, successCount, errorCount);

      bulkLogger.info('🎯 Intelligent batching completed', {
        totalDuration,
        operationsPerSecond: Math.round((totalOperations / totalDuration) * 1000 * 100) / 100,
        batcherStats: {
          totalBatches: batcherStats.currentBatch,
          avgResponseTime: Math.round(batcherStats.avgResponseTime),
          finalDelay: batcherStats.currentDelay,
          circuitBreakerTriggered: batcherStats.consecutiveFailures >= this.requestBatcher.circuitBreakerThreshold
        }
      });

      return {
        total: processed,
        success: successCount,
        errors: errorCount,
        duration: totalDuration,
        successRate: Math.round((successCount / processed) * 100),
        skippedUsers: validationResults?.invalidUsers || [],
        totalUsersAttempted: users.length,
        validUsersProcessed: usersToProcess.length,
        batcherStats: {
          batchesProcessed: batcherStats.currentBatch,
          avgResponseTime: Math.round(batcherStats.avgResponseTime),
          finalDelay: batcherStats.currentDelay,
          circuitBreakerActivated: batcherStats.circuitBreakerThreshold <= batcherStats.consecutiveFailures
        }
      };

    } catch (error) {
      bulkLogger.logBulkError('grant-access-intelligent', error);
      throw error;
    }
  }


  // Método duplicado eliminado - usando solo bulkGrantAccess optimizado

  /**
   * Bulk Remove Access - High-performance mass access removal
   * Uses intelligent batching with circuit breaker and retries
   */
  async bulkRemoveAccess(users, pine_ids, options = {}) {
    // UNIFIED MODE for remove operations
    const userCount = users.length;
    
    // Adaptive config for remove (more permissive than grant)
    let config;
    if (userCount <= 5) {
      config = { maxConcurrent: userCount, minDelay: 0, batchSize: userCount };
    } else if (userCount <= 20) {
      config = { maxConcurrent: 10, minDelay: 50, batchSize: 10 };
    } else {
      config = { maxConcurrent: 10, minDelay: 100, batchSize: 15 };
    }
    
    this.requestBatcher = new RequestBatcher({
      maxConcurrent: config.maxConcurrent,
      batchSize: config.batchSize,
      minDelay: config.minDelay,
      maxDelay: config.minDelay * 10,
      backoffMultiplier: 1.5,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 30000
    });
    
    bulkLogger.info(`🎯 UNIFIED REMOVE MODE for ${userCount} users`, config);
    const startTime = Date.now();
    let processed = 0;
    let successCount = 0;
    let errorCount = 0;

    bulkLogger.info({
      operation: 'bulk-remove-access',
      usersCount: users.length,
      pineIdsCount: pine_ids.length,
      totalOperations: users.length * pine_ids.length,
      options
    }, 'Starting bulk access removal');

    // Pre-validate users if requested
    let validationResults = null;
    if (options.preValidateUsers !== false) {
      validationResults = await this.validateUsersBatch(users, options);
      const validUsers = validationResults.validUsers;
      const invalidUsers = validationResults.invalidUsers;

      bulkLogger.info({
        validUsers: validUsers.length,
        invalidUsers: invalidUsers.length,
        skippedUsers: invalidUsers
      }, 'User validation completed for bulk removal');

      if (validUsers.length === 0) {
        bulkLogger.warn('No valid users found for bulk removal');
        return {
          total: 0,
          success: 0,
          errors: 0,
          duration: '0ms',
          successRate: 0,
          skippedUsers: invalidUsers,
          totalUsersAttempted: users.length,
          validUsersProcessed: 0,
          batcherStats: this.requestBatcher.getStats()
        };
      }
      users = validUsers; // Only process valid users
    }

    const usersToProcess = users;
    const totalOperations = usersToProcess.length * pine_ids.length;

    try {
      // Build list of operations
      const requests = [];
      for (const user of usersToProcess) {
        for (const pineId of pine_ids) {
          requests.push({
            user,
            pineId,
            operation: 'remove'
          });
        }
      }

      // Process with intelligent batching
      const batchPromises = requests.map(async (requestData, index) => {
        let finalResult = null;
        let retryCount = 0;
        const maxOperationRetries = 3;

        while (retryCount < maxOperationRetries && !finalResult) {
          try {
            const result = await this.requestBatcher.add(
              async () => {
                // Get current access details first
                const accessDetails = await this.getAccessDetails(requestData.user, requestData.pineId);
                // Then remove access
                return await this.removeAccess(accessDetails);
              },
              {
                priority: retryCount > 0 ? 1 : 0,
                maxRetries: retryCount > 0 ? 1 : 2
              }
            );

            if (result && result.status === 'Success') {
              finalResult = result;
              successCount++;
            } else {
              throw new Error(result?.error || 'Unknown error');
            }
          } catch (error) {
            retryCount++;
            bulkLogger.warn({
              error: error.message,
              user: requestData.user,
              pineId: requestData.pineId,
              retryCount,
              maxRetries: maxOperationRetries
            }, `Bulk remove retry ${retryCount}/${maxOperationRetries}`);

            if (retryCount >= maxOperationRetries) {
              errorCount++;
              finalResult = {
                pine_id: requestData.pineId,
                username: requestData.user,
                status: 'Failure',
                error: error.message
              };
            } else {
              // Exponential backoff for retries
              const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
              await this.delay(backoffDelay);
            }
          }
        }

        processed++;
        const progress = Math.round((processed / totalOperations) * 100);

        // Progress callback if provided
        if (options.onProgress) {
          try {
            options.onProgress(processed, totalOperations, successCount, errorCount);
          } catch (callbackError) {
            bulkLogger.warn({ error: callbackError.message }, 'Progress callback failed');
          }
        }

        return finalResult;
      });

      const results = await Promise.allSettled(batchPromises);
      const successfulResults = results
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value);

      const totalDuration = `${Date.now() - startTime}ms`;
      const successRate = Math.round((successCount / processed) * 100);

      bulkLogger.info({
        totalOperations: processed,
        successCount,
        errorCount,
        duration: totalDuration,
        successRate,
        batcherStats: this.requestBatcher.getStats()
      }, 'Bulk access removal completed');

      return {
        total: processed,
        success: successCount,
        errors: errorCount,
        duration: totalDuration,
        successRate,
        results: successfulResults,
        skippedUsers: validationResults?.invalidUsers || [],
        totalUsersAttempted: users.length,
        validUsersProcessed: usersToProcess.length,
        batcherStats: this.requestBatcher.getStats()
      };

    } catch (error) {
      bulkLogger.logBulkError('remove-access-intelligent', error);
      throw error;
    }
  }

  /**
   * Utility: Split array into chunks
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Utility: Delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export class for instantiation
// Export singleton instance
const service = new TradingViewService();
module.exports = service;
