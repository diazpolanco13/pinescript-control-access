/**
 * Webhook Service
 * Notifica a tu e-commerce sobre éxitos/errores de operaciones TradingView
 */

const axios = require('axios');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

class WebhookService {
  constructor() {
    this.webhookUrl = process.env.ECOMMERCE_WEBHOOK_URL;
    this.webhookSecret = process.env.WEBHOOK_SECRET;
    this.enabled = !!this.webhookUrl;
    
    if (this.enabled) {
      logger.info({ 
        webhookUrl: this.webhookUrl,
        hasSecret: !!this.webhookSecret 
      }, 'Webhook service initialized');
    } else {
      logger.warn('Webhook service disabled - no ECOMMERCE_WEBHOOK_URL configured');
    }
  }
  
  // Notificar éxito de operación masiva
  async notifyBulkSuccess(operation, data, result) {
    if (!this.enabled) return;
    
    try {
      const payload = {
        event: 'bulk_operation_success',
        operation,
        data: {
          users_count: data.users?.length || 0,
          pine_ids_count: data.pine_ids?.length || 0,
          duration: data.duration,
          options: data.options
        },
        result: {
          total: result.total,
          success: result.success,
          errors: result.errors,
          success_rate: result.successRate,
          duration_ms: result.duration,
          operation_speed: Math.round((result.total / result.duration) * 1000 * 100) / 100
        },
        timestamp: new Date().toISOString()
      };
      
      await this.sendWebhook(payload);
      
      logger.info({ 
        operation, 
        success_rate: result.successRate,
        duration: result.duration 
      }, 'Success webhook sent');
      
    } catch (error) {
      logger.error({ 
        operation, 
        error: error.message 
      }, 'Failed to send success webhook');
    }
  }
  
  // Notificar error crítico
  async notifyError(operation, error, data = {}) {
    if (!this.enabled) return;
    
    try {
      const payload = {
        event: 'operation_error',
        operation,
        error: {
          message: error.message,
          type: error.name || 'Unknown',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        data,
        timestamp: new Date().toISOString(),
        severity: this.determineSeverity(error, operation)
      };
      
      await this.sendWebhook(payload);
      
      logger.info({ 
        operation, 
        error_type: error.name,
        severity: payload.severity
      }, 'Error webhook sent');
      
    } catch (webhookError) {
      logger.error({ 
        originalError: error.message,
        webhookError: webhookError.message 
      }, 'CRITICAL: Both operation and webhook failed');
    }
  }
  
  // Notificar estado del circuit breaker
  async notifyCircuitBreakerStatus(isOpen, stats) {
    if (!this.enabled) return;
    
    try {
      const payload = {
        event: 'circuit_breaker_status',
        circuit_open: isOpen,
        stats: {
          consecutive_failures: stats.consecutiveFailures,
          success_rate: stats.successRate,
          current_delay: stats.currentDelay,
          circuit_open_until: stats.circuitOpenUntil
        },
        timestamp: new Date().toISOString(),
        recommended_action: isOpen 
          ? 'Reduce operation frequency temporarily'
          : 'Normal operations can resume'
      };
      
      await this.sendWebhook(payload);
      
    } catch (error) {
      logger.error({ error: error.message }, 'Circuit breaker webhook failed');
    }
  }
  
  // Enviar webhook con retry logic
  async sendWebhook(payload) {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        const signature = this.generateSignature(payload);
        
        const response = await axios.post(this.webhookUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': payload.event,
            'User-Agent': 'TradingView-Access-Management/2.1.0'
          },
          timeout: 5000
        });
        
        if (response.status >= 200 && response.status < 300) {
          logger.debug({ 
            event: payload.event,
            status: response.status,
            attempt: attempt + 1
          }, 'Webhook delivered successfully');
          return;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
      } catch (error) {
        attempt++;
        logger.warn({ 
          event: payload.event,
          attempt,
          maxRetries,
          error: error.message 
        }, `Webhook attempt ${attempt} failed`);
        
        if (attempt >= maxRetries) {
          throw new Error(`Webhook failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  generateSignature(payload) {
    if (!this.webhookSecret) return '';
    
    return crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
  
  determineSeverity(error, operation) {
    // Errores críticos que requieren atención inmediata
    const criticalErrors = [
      'Session expired',
      'Authentication failed', 
      'Circuit breaker timeout',
      'Maximum retries exceeded'
    ];
    
    const isCritical = criticalErrors.some(critical => 
      error.message?.toLowerCase().includes(critical.toLowerCase())
    );
    
    if (isCritical) return 'critical';
    if (operation.includes('bulk')) return 'high';
    return 'medium';
  }
}

module.exports = new WebhookService();
