/**
 * Ejemplo de Webhook Handler para E-commerce
 * Este archivo muestra cómo integrar los webhooks de TradingView API
 * en tu sistema de e-commerce
 */

const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Tu webhook secret configurado en el .env
const WEBHOOK_SECRET = 'b7d4361f5677a6c5ed2c483fe1ff373c30d819201d7b887d'; // Cambia por tu secret real

/**
 * Middleware para verificar firma de webhook
 */
function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.error('❌ Firma de webhook inválida');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  console.log('✅ Firma de webhook verificada');
  next();
}

/**
 * Endpoint para recibir webhooks de TradingView API
 */
app.post('/webhooks/tradingview', verifyWebhookSignature, async (req, res) => {
  const { event, operation, data, result, timestamp } = req.body;

  console.log(`📡 Webhook recibido: ${event} - ${operation}`);

  try {
    switch (event) {
      case 'bulk_operation_success':
        await handleBulkOperationSuccess(req.body);
        break;

      case 'operation_error':
        await handleOperationError(req.body);
        break;

      case 'circuit_breaker_status':
        await handleCircuitBreakerStatus(req.body);
        break;

      default:
        console.log(`⚠️ Evento desconocido: ${event}`);
    }

    res.json({ status: 'processed' });

  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

/**
 * Manejar operación bulk exitosa
 */
async function handleBulkOperationSuccess(webhookData) {
  const { operation, data, result } = webhookData;

  console.log(`✅ ${operation.toUpperCase()} completado exitosamente`);
  console.log(`📊 ${result.total} operaciones, ${result.success} exitosas, ${result.errors} errores`);
  console.log(`⏱️ Duración: ${result.duration_ms}ms`);

  // Actualizar base de datos según el tipo de operación
  switch (operation) {
    case 'bulk_grant':
      await updateSubscriptionsStatus(data.users, 'active', data.pine_ids, data.duration);
      break;

    case 'bulk_remove':
      await updateSubscriptionsStatus(data.users, 'cancelled', data.pine_ids);
      break;

    case 'replace':
      await handlePlanChange(data.users, data.pine_ids, data.duration);
      break;
  }

  // Enviar notificaciones si es necesario
  if (result.successRate >= 95) {
    await sendSuccessNotification(webhookData);
  } else {
    await sendPartialSuccessNotification(webhookData);
  }
}

/**
 * Manejar errores de operación
 */
async function handleOperationError(webhookData) {
  const { operation, data, error } = webhookData;

  console.error(`❌ Error en ${operation}:`, error);

  // Log detallado del error
  await logOperationError(operation, data, error);

  // Notificar al equipo técnico
  await alertTechnicalTeam(error, data);

  // Marcar operaciones para reintento si aplica
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    await scheduleRetry(data, 'rate_limit');
  }
}

/**
 * Manejar cambios en circuit breaker
 */
async function handleCircuitBreakerStatus(webhookData) {
  const { status, details } = webhookData;

  if (status === 'activated') {
    console.warn('🚨 Circuit breaker activado - TradingView rate limiting detectado');
    await alertRateLimitDetected(details);
  } else {
    console.log('✅ Circuit breaker desactivado - Operaciones normales');
    await resumeNormalOperations();
  }
}

// Funciones auxiliares (implementa según tu base de datos)

async function updateSubscriptionsStatus(users, status, pineIds, duration) {
  // Actualizar estado de suscripciones en BD
  console.log(`📝 Actualizando ${users.length} usuarios a estado: ${status}`);
}

async function handlePlanChange(users, pineIds, newDuration) {
  // Lógica específica para cambios de plan
  console.log(`🔄 Procesando cambio de plan para ${users.length} usuarios`);
}

async function sendSuccessNotification(data) {
  // Enviar email/SMS de éxito
  console.log('📧 Enviando notificación de éxito');
}

async function sendPartialSuccessNotification(data) {
  // Enviar notificación de éxito parcial
  console.log('📧 Enviando notificación de éxito parcial');
}

async function logOperationError(operation, data, error) {
  // Guardar error en logs de BD
  console.error(`📝 Error logged: ${operation}`, { data, error });
}

async function alertTechnicalTeam(error, data) {
  // Enviar alerta al equipo técnico
  console.error('🚨 Alerta enviada al equipo técnico');
}

async function scheduleRetry(data, reason) {
  // Programar reintento
  console.log(`⏰ Reintento programado por: ${reason}`);
}

async function alertRateLimitDetected(details) {
  // Alerta de rate limit
  console.warn('⚠️ Alerta de rate limit activada');
}

async function resumeNormalOperations() {
  // Reanudar operaciones normales
  console.log('▶️ Operaciones normales reanudadas');
}

// Iniciar servidor de webhooks (puerto diferente)
const WEBHOOK_PORT = 5002;
app.listen(WEBHOOK_PORT, () => {
  console.log(`🚀 Webhook handler listening on port ${WEBHOOK_PORT}`);
  console.log(`📡 Endpoint: http://185.218.124.241:${WEBHOOK_PORT}/webhooks/tradingview`);
});

module.exports = app;
