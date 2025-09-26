/**
 * Alert Service
 * Sistema de alertas por email para errores críticos y problemas del sistema
 */

const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

class AlertService {
  constructor() {
    this.enabled = !!(process.env.ALERT_EMAIL && process.env.ALERT_EMAIL_PASSWORD);
    
    if (this.enabled) {
      this.transporter = nodemailer.createTransporter({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.ALERT_EMAIL,
          pass: process.env.ALERT_EMAIL_PASSWORD
        }
      });
      
      logger.info({ 
        email: process.env.ALERT_EMAIL,
        service: process.env.EMAIL_SERVICE || 'gmail'
      }, 'Alert service initialized');
    } else {
      logger.warn('Alert service disabled - no email configuration found');
    }
  }
  
  // Alerta crítica - Circuit breaker activado
  async alertCircuitBreakerOpen(stats) {
    if (!this.enabled) return;
    
    const subject = '🚨 CRÍTICO: TradingView API Circuit Breaker Activado';
    const message = `
ALERTA CRÍTICA: Circuit Breaker Activado

📊 ESTADÍSTICAS ACTUALES:
- Fallos consecutivos: ${stats.consecutiveFailures}
- Tasa de éxito actual: ${stats.successRate}%
- Delay actual: ${stats.currentDelay}ms
- Circuit abierto hasta: ${stats.circuitOpenUntil || 'indefinido'}

🔧 ACCIÓN REQUERIDA:
1. Verificar estado de TradingView (posible maintenance)
2. Revisar rate limits de tu cuenta
3. Considerar reducir batch size temporalmente
4. Monitorear logs para errores específicos

⚡ RECUPERACIÓN AUTOMÁTICA:
El sistema se recuperará automáticamente cuando:
- Rate limits de TradingView se normalicen
- Tasa de éxito vuelva a ser > 80%

🕐 TIEMPO ESTIMADO DE RECUPERACIÓN: 30-60 minutos

Este es un mecanismo de protección normal. No requiere intervención manual.
    `;
    
    await this.sendAlert(subject, message, 'critical');
  }
  
  // Alerta - Baja tasa de éxito en operaciones
  async alertLowSuccessRate(operation, successRate, details) {
    if (!this.enabled || successRate >= 80) return;
    
    const subject = `⚠️ Baja Tasa de Éxito: ${operation} (${successRate}%)`;
    const message = `
ALERTA: Operación con Baja Tasa de Éxito

📊 DETALLES DE LA OPERACIÓN:
- Operación: ${operation}
- Tasa de éxito: ${successRate}%
- Total operaciones: ${details.total}
- Operaciones exitosas: ${details.success}
- Operaciones fallidas: ${details.errors}
- Duración: ${details.duration}ms

🔍 POSIBLES CAUSAS:
${successRate < 50 ? `
🔴 CRÍTICAS (${successRate}% muy bajo):
- Usuarios inválidos en el batch
- Problemas de autenticación con TradingView
- Indicadores inexistentes o privados
` : `
🟡 MODERADAS (${successRate}% bajo):
- Rate limiting temporal de TradingView
- Problemas de conectividad
- Usuarios con acceso ya existente
`}

💡 RECOMENDACIONES:
1. Revisar logs detallados en el servidor
2. Validar usuarios antes de operaciones masivas
3. Verificar que los pine_ids sean correctos
4. Considerar dividir operación en lotes más pequeños

📧 PRÓXIMOS PASOS:
- El sistema continuará operando normalmente
- Monitorear próximas operaciones
- Contactar soporte si el problema persiste
    `;
    
    await this.sendAlert(subject, message, 'warning');
  }
  
  // Alerta - Error crítico del sistema
  async alertSystemError(error, context = {}) {
    if (!this.enabled) return;
    
    const subject = `🔥 ERROR CRÍTICO: Sistema TradingView API`;
    const message = `
ERROR CRÍTICO EN SISTEMA

❌ ERROR:
${error.message}

📍 CONTEXTO:
- Operación: ${context.operation || 'Desconocida'}
- Usuario(s): ${context.users || 'N/A'}
- Pine ID(s): ${context.pine_ids || 'N/A'}
- Timestamp: ${new Date().toISOString()}

🔧 INFORMACIÓN DEL SISTEMA:
- Uptime: ${Math.floor(process.uptime())} segundos
- Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
- CPU Load: ${os.loadavg().map(l => Math.round(l * 100) / 100).join(', ')}

⚡ ACCIÓN INMEDIATA REQUERIDA:
1. Revisar logs del servidor inmediatamente
2. Verificar conectividad con TradingView  
3. Comprobar estado de la sesión de autenticación
4. Reiniciar API si es necesario

🆘 STACK TRACE:
${error.stack || 'No disponible'}

Este error puede afectar operaciones críticas del e-commerce.
    `;
    
    await this.sendAlert(subject, message, 'critical');
  }
  
  // Alerta - Recuperación del sistema
  async alertSystemRecovery(previousIssue, recoveryStats) {
    if (!this.enabled) return;
    
    const subject = '✅ RECUPERACIÓN: Sistema TradingView API Operativo';
    const message = `
SISTEMA RECUPERADO EXITOSAMENTE

✅ ESTADO ACTUAL:
- Circuit breaker: ${recoveryStats.circuitOpen ? 'ABIERTO' : 'CERRADO'}
- Tasa de éxito: ${recoveryStats.successRate}%
- Operaciones procesadas: ${recoveryStats.totalProcessed}
- Tiempo de recuperación: ${recoveryStats.recoveryTime}

📊 ESTADÍSTICAS DE RECUPERACIÓN:
- Última operación exitosa: ${new Date().toISOString()}
- Performance actual: ${recoveryStats.currentOpsPerSecond} ops/seg
- Delay actual: ${recoveryStats.currentDelay}ms

🎯 SISTEMA LISTO PARA OPERACIONES NORMALES
El API está completamente operativo y puede procesar operaciones masivas.

Issue resuelto: ${previousIssue}
    `;
    
    await this.sendAlert(subject, message, 'info');
  }
  
  async sendAlert(subject, message, priority) {
    if (!this.enabled) {
      logger.warn({ subject, priority }, 'Alert would be sent but email not configured');
      return;
    }
    
    try {
      const alertEmail = {
        from: process.env.ALERT_EMAIL,
        to: process.env.ADMIN_EMAIL || process.env.ALERT_EMAIL,
        subject: `[TradingView API ${priority.toUpperCase()}] ${subject}`,
        text: message,
        html: `
          <div style="font-family: monospace; white-space: pre-line; padding: 20px; background: #f5f5f5;">
            ${message.replace(/\n/g, '<br>')}
          </div>
        `,
        priority: priority === 'critical' ? 'high' : 'normal'
      };
      
      // Añadir CC para errores críticos
      if (priority === 'critical' && process.env.EMERGENCY_EMAIL) {
        alertEmail.cc = process.env.EMERGENCY_EMAIL;
      }
      
      await this.transporter.sendMail(alertEmail);
      
      logger.info({ 
        subject, 
        priority, 
        to: alertEmail.to 
      }, 'Alert email sent successfully');
      
    } catch (error) {
      logger.error({ 
        error: error.message,
        subject,
        priority 
      }, 'Failed to send alert email');
    }
  }
  
  // Test del sistema de alertas
  async testAlerts() {
    if (!this.enabled) {
      throw new Error('Alert system not configured');
    }
    
    const subject = '🧪 Test de Sistema de Alertas';
    const message = `
TEST DE ALERTAS - Sistema Funcionando Correctamente

✅ CONFIGURACIÓN:
- Email service: ${process.env.EMAIL_SERVICE || 'gmail'}
- Alert email: ${process.env.ALERT_EMAIL}
- Admin email: ${process.env.ADMIN_EMAIL}

📊 TIMESTAMP: ${new Date().toISOString()}

Si recibes este email, el sistema de alertas está operativo.
    `;
    
    await this.sendAlert(subject, message, 'info');
    return true;
  }
}

module.exports = new AlertService();
