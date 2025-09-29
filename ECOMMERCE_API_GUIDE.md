# 🚀 Guía de Integración E-commerce - TradingView Access Management API
> **Versión 2.3** - Guía optimizada para IAs y desarrolladores

---

## 🤖 **INFORMACIÓN CRÍTICA PARA IA**

**SISTEMA SOPORTADO**: React + Node.js (Frontend + Backend)
**AUTENTICACIÓN**: X-API-Key requerida para operaciones bulk
**WEBHOOKS**: ✅ IMPLEMENTADOS - Notificaciones automáticas
**RATE LIMITS**: 100 requests/15min (general), 5/min (bulk)
**PERFORMANCE**: 4.6 ops/seg, 100% success rate típico

---

## 📋 **ENDPOINTS DISPONIBLES**

### 🎯 **ENDPOINTS PÚBLICOS (Sin autenticación)**

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /` | - | Health check + documentación |
| `GET /profile/:username` | - | **Imagen de perfil TradingView** |
| `GET /api/validate/:username` | - | **Validar usuario existe** |

### 🔐 **ENDPOINTS PROTEGIDOS (Requieren X-API-Key)**

| Endpoint | Método | Descripción | Uso Principal |
|----------|--------|-------------|---------------|
| `POST /api/access/bulk` | 🔑 | **Conceder acceso masivo** | NUEVAS SUSCRIPCIONES |
| `POST /api/access/bulk-remove` | 🔑 | **Remover acceso masivo** | CANCELACIONES |
| `POST /api/access/replace` | 🔑 | **Reemplazar acceso** | CAMBIOS DE PLAN |
| `GET /api/metrics/stats` | 🔑 | **Métricas del sistema** | DASHBOARD |
| `GET /api/metrics/health` | 🔑 | **Health check avanzado** | MONITORING |
| `GET /api/metrics/business` | 🔑 | **Métricas de negocio** | ANALYTICS |

### ⚙️ **ENDPOINTS DE CONFIGURACIÓN**

| Endpoint | Método | Descripción | Autenticación |
|----------|--------|-------------|---------------|
| `POST /api/config/tradingview` | - | **Configurar credenciales TradingView** | Ninguna |
| `GET /api/config/tradingview/status` | - | **Ver estado de configuración** | Ninguna |

### 👤 **ENDPOINTS INDIVIDUALES (Sin X-API-Key)**

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /api/access/:username` | - | Consultar acceso actual |
| `POST /api/access/:username` | - | Conceder acceso individual |
| `DELETE /api/access/:username` | - | Remover acceso individual |

### 🎛️ **ENDPOINTS DE ADMINISTRACIÓN (Requieren X-Admin-Token)**

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /admin` | 🔐 | Panel de administración web |
| `POST /admin/login` | 🔐 | Login administrativo |
| `GET /admin/cookies/status` | 🔐 | Estado de cookies TradingView |
| `POST /admin/cookies/update` | 🔐 | Actualizar cookies manualmente |
| `POST /admin/cookies/clear` | 🔐 | Limpiar cookies |

---

## 🔑 **AUTENTICACIÓN**

### **Para Endpoints Bulk (CRÍTICO)**
```javascript
const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': 'your_ultra_secure_api_key_2025'
};
```

### **Para Endpoints Admin**
```javascript
const headers = {
  'Content-Type': 'application/json',
  'X-Admin-Token': 'admin_token_from_server_startup'
};
```

---

## 📡 **WEBHOOKS IMPLEMENTADOS**

> ✅ **CONFIRMADO**: Tu sistema TIENE webhooks implementados

### **Eventos que se Disparan Automáticamente**

| Evento | Trigger | Payload |
|--------|---------|---------|
| `bulk_operation_success` | Operación bulk exitosa (>95% rate) | Resultados detallados |
| `operation_error` | Error crítico en operación | Detalles del error |
| `circuit_breaker_status` | Circuit breaker activado/inactivado | Estado del sistema |

### **Configuración de Webhooks**

```env
# En tu .env
ECOMMERCE_WEBHOOK_URL=https://tu-ecommerce.com/webhooks/tradingview
WEBHOOK_SECRET=tu_webhook_secret_ultra_secure_2025
```

### **Ejemplo de Webhook Recibido**

```javascript
// POST https://tu-ecommerce.com/webhooks/tradingview
{
  "event": "bulk_operation_success",
  "operation": "bulk_grant",
  "data": {
    "users_count": 50,
    "pine_ids_count": 3,
    "duration": "7D"
  },
  "result": {
    "total": 150,
    "success": 148,
    "errors": 2,
    "success_rate": 98.7,
    "duration_ms": 3200,
    "operation_speed": 46.9
  },
  "timestamp": "2025-09-29T10:30:00.000Z"
}
```

### **Verificación de Webhooks**

```javascript
// Verificar firma del webhook
const verifyWebhook = (payload, signature, secret) => {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === expectedSignature;
};
```

---

## 💻 **EJEMPLOS DE CÓDIGO**

### **1. REACT HOOK - Gestión de Suscripciones**

```javascript
// hooks/useTradingViewAccess.js
import { useState, useCallback } from 'react';

const TRADINGVIEW_API = process.env.REACT_APP_TRADINGVIEW_API_URL;
const API_KEY = process.env.REACT_APP_TRADINGVIEW_API_KEY;

export const useTradingViewAccess = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ NUEVA SUSCRIPCIÓN
  const grantBulkAccess = useCallback(async (users, pineIds, duration) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${TRADINGVIEW_API}/api/access/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          users,           // ['user1', 'user2', ...]
          pine_ids: pineIds, // ['PUB;xxx', 'PUB;yyy']
          duration,        // '7D', '30D', '1L', etc
          options: {
            preValidateUsers: false,  // Para mejor performance
            onProgress: false         // Para operaciones rápidas
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error en la operación');
      }

      // ✅ ÉXITO - Webhook se dispara automáticamente
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ❌ CANCELACIÓN MASIVA
  const removeBulkAccess = useCallback(async (users, pineIds) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${TRADINGVIEW_API}/api/access/bulk-remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          users,
          pine_ids: pineIds,
          options: { preValidateUsers: false }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error removiendo acceso');
      }

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔄 CAMBIO DE PLAN (REPLACE)
  const replaceAccess = useCallback(async (users, oldPineIds, newPineIds, newDuration) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${TRADINGVIEW_API}/api/access/replace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          users,
          pine_ids: oldPineIds,  // Se eliminan automáticamente
          duration: newDuration,  // Se añaden con nueva duración
          options: { preValidateUsers: false }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error cambiando plan');
      }

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 📊 MÉTRICAS DEL SISTEMA
  const getSystemMetrics = useCallback(async () => {
    try {
      const response = await fetch(`${TRADINGVIEW_API}/api/metrics/stats`, {
        headers: { 'X-API-Key': API_KEY }
      });

      if (!response.ok) {
        throw new Error('Error obteniendo métricas');
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // 📊 MÉTRICAS DE NEGOCIO
  const getBusinessMetrics = useCallback(async () => {
    try {
      const response = await fetch(`${TRADINGVIEW_API}/api/metrics/business`, {
        headers: { 'X-API-Key': API_KEY }
      });

      if (!response.ok) {
        throw new Error('Error obteniendo métricas de negocio');
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // 🔍 VALIDAR USUARIO (sin API key)
  const validateUser = useCallback(async (username) => {
    try {
      const response = await fetch(`${TRADINGVIEW_API}/api/validate/${username}`);

      if (!response.ok) {
        throw new Error('Error validando usuario');
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      return { validuser: false, error: err.message };
    }
  }, []);

  // 📸 OBTENER IMAGEN DE PERFIL (sin API key)
  const getUserProfileImage = useCallback(async (username) => {
    try {
      const response = await fetch(`${TRADINGVIEW_API}/profile/${username}`);

      if (!response.ok) {
        throw new Error('Error obteniendo imagen de perfil');
      }

      const data = await response.json();
      return data.profile_image;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  // ⚙️ CONFIGURAR CREDENCIALES (sin API key)
  const configureTradingView = useCallback(async (username, password, testOnly = true) => {
    try {
      const response = await fetch(`${TRADINGVIEW_API}/api/config/tradingview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, testOnly })
      });

      if (!response.ok) {
        throw new Error('Error configurando TradingView');
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // 📊 ESTADO DE CONFIGURACIÓN (sin API key)
  const getConfigurationStatus = useCallback(async () => {
    try {
      const response = await fetch(`${TRADINGVIEW_API}/api/config/tradingview/status`);

      if (!response.ok) {
        throw new Error('Error obteniendo estado de configuración');
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    loading,
    error,
    grantBulkAccess,
    removeBulkAccess,
    replaceAccess,
    getSystemMetrics,
    getBusinessMetrics,
    validateUser,
    getUserProfileImage,
    configureTradingView,
    getConfigurationStatus
  };
};
```

### **2. NODE.JS SERVICE - Backend Integration**

```javascript
// services/tradingViewService.js
const axios = require('axios');

class TradingViewService {
  constructor() {
    this.baseURL = process.env.TRADINGVIEW_API_URL;
    this.apiKey = process.env.TRADINGVIEW_API_KEY;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      }
    });
  }

  // ✅ PROCESAR NUEVA SUSCRIPCIÓN
  async processNewSubscription(user, plan) {
    try {
      const payload = {
        users: [user.tradingview_username],
        pine_ids: plan.indicators,
        duration: plan.duration,
        options: {
          preValidateUsers: false,
          onProgress: false
        }
      };

      const response = await this.client.post('/api/access/bulk', payload);

      // ✅ ÉXITO - Webhook llegará automáticamente
      if (response.data.successRate >= 95) {
        await this.updateUserStatus(user.id, 'active');
        await this.sendWelcomeEmail(user, plan);
        return { success: true, data: response.data };
      }

      // ⚠️ ÉXITO PARCIAL - Marcar para reintento
      await this.markPendingActivation(user.id);
      return { success: false, data: response.data, needsRetry: true };

    } catch (error) {
      // ❌ ERROR - Log y alert
      await this.logError('subscription_activation', error, { user, plan });
      throw error;
    }
  }

  // 🔄 CAMBIAR PLAN DE USUARIO
  async changeUserPlan(user, oldPlan, newPlan) {
    try {
      const payload = {
        users: [user.tradingview_username],
        pine_ids: oldPlan.indicators,  // Se eliminan
        duration: newPlan.duration,     // Se añaden
        options: { preValidateUsers: false }
      };

      const response = await this.client.post('/api/access/replace', payload);

      if (response.data.successRate === 100) {
        await this.updateUserPlan(user.id, newPlan.id);
        await this.sendPlanChangeEmail(user, oldPlan, newPlan);
        return { success: true, data: response.data };
      }

      throw new Error(`Cambio de plan falló: ${response.data.successRate}% éxito`);

    } catch (error) {
      await this.handlePlanChangeError(user, error);
      throw error;
    }
  }

  // ❌ CANCELAR SUSCRIPCIÓN
  async cancelSubscription(user, plan) {
    try {
      const payload = {
        users: [user.tradingview_username],
        pine_ids: plan.indicators,
        options: { preValidateUsers: false }
      };

      const response = await this.client.post('/api/access/bulk-remove', payload);

      if (response.data.success > 0) {
        await this.updateUserStatus(user.id, 'cancelled');
        await this.sendCancellationEmail(user);
        return { success: true, data: response.data };
      }

      throw new Error('Cancelación falló parcialmente');

    } catch (error) {
      await this.logError('subscription_cancellation', error, { user, plan });
      throw error;
    }
  }

  // 📊 MONITOREAR SALUD DEL SISTEMA
  async getSystemHealth() {
    try {
      const response = await this.client.get('/api/metrics/health');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo health check:', error.message);
      throw error;
    }
  }

  // 📊 OBTENER MÉTRICAS DE NEGOCIO
  async getBusinessMetrics() {
    try {
      const response = await this.client.get('/api/metrics/business');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo métricas de negocio:', error.message);
      throw error;
    }
  }

  // 🔍 VALIDAR USUARIO (sin API key)
  async validateUser(username) {
    try {
      const response = await axios.get(`${this.baseURL}/api/validate/${username}`);
      return response.data;
    } catch (error) {
      return { validuser: false, error: error.message };
    }
  }

  // 📸 OBTENER IMAGEN DE PERFIL (sin API key)
  async getUserProfileImage(username) {
    try {
      const response = await axios.get(`${this.baseURL}/profile/${username}`);
      return response.data.profile_image;
    } catch (error) {
      return null;
    }
  }

  // ⚙️ CONFIGURAR CREDENCIALES TRADINGVIEW
  async configureTradingViewCredentials(username, password, testOnly = true) {
    try {
      const response = await axios.post(`${this.baseURL}/api/config/tradingview`, {
        username,
        password,
        testOnly
      });
      return response.data;
    } catch (error) {
      console.error('Error configurando credenciales:', error.message);
      throw error;
    }
  }

  // 📊 VER ESTADO DE CONFIGURACIÓN
  async getConfigurationStatus() {
    try {
      const response = await axios.get(`${this.baseURL}/api/config/tradingview/status`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo estado de configuración:', error.message);
      throw error;
    }
  }
}

module.exports = new TradingViewService();
```

### **3. REACT COMPONENT - Dashboard de Métricas**

```jsx
// components/TradingViewDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useTradingViewAccess } from '../hooks/useTradingViewAccess';

const TradingViewDashboard = () => {
  const { getSystemMetrics, loading, error } = useTradingViewAccess();
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await getSystemMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Error fetching metrics:', err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update cada 30s
    return () => clearInterval(interval);
  }, [getSystemMetrics]);

  if (loading) return <div>Loading metrics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!metrics) return <div>No metrics available</div>;

  return (
    <div className="tradingview-dashboard">
      <h2>📊 TradingView API Status</h2>

      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Operations/Second</h3>
          <div className="value">{metrics.batcher?.successRate || 0}</div>
          <div className="status">Target: 4.6+</div>
        </div>

        <div className="metric-card">
          <h3>Success Rate 24h</h3>
          <div className="value">{metrics.operations_24h?.success_rate || 0}%</div>
          <div className="status">Target: 95%+</div>
        </div>

        <div className="metric-card">
          <h3>Active Connections</h3>
          <div className="value">{metrics.connection_pool?.active_connections || 0}</div>
          <div className="status">Healthy</div>
        </div>

        <div className="metric-card">
          <h3>Circuit Breaker</h3>
          <div className="value">
            {metrics.batcher?.circuitOpen ? '⚠️ ACTIVE' : '✅ INACTIVE'}
          </div>
          <div className="status">
            {metrics.batcher?.circuitOpen ? 'Rate limiting detected' : 'Normal operation'}
          </div>
        </div>
      </div>

      {metrics.batcher?.circuitOpen && (
        <div className="alert alert-warning">
          🚨 Circuit breaker activado - TradingView puede estar rate limiting.
          Operaciones se reanudarán automáticamente.
        </div>
      )}
    </div>
  );
};

export default TradingViewDashboard;
```

---

## ⚠️ **MANEJO DE ERRORES**

### **Códigos de Error Comunes**

| Código | Significado | Acción |
|--------|-------------|--------|
| `400` | Datos inválidos | Verificar payload |
| `401` | API Key inválida | Verificar X-API-Key |
| `403` | IP no permitida | Verificar ALLOWED_IPS |
| `422` | Usuario inválido | Usuario no existe en TradingView |
| `429` | Rate limit excedido | Esperar automáticamente (circuit breaker) |
| `500` | Error interno | Webhook se dispara automáticamente |

### **Estrategia de Reintento**

```javascript
const executeWithRetry = async (operation, maxRetries = 3) => {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      attempt++;

      if (error.response?.status === 429) {
        // Rate limit - esperar más tiempo
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (error.response?.status >= 500) {
        // Error del servidor - reintentar
        const delay = attempt * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Error no recuperable
      throw error;
    }
  }

  throw new Error(`Operation failed after ${maxRetries} attempts`);
};
```

### **Casos Edge a Manejar**

```javascript
// 1. Usuario ya tiene acceso (no error, solo log)
if (result.duplicateUsers?.length > 0) {
  console.log('Usuarios ya tenían acceso:', result.duplicateUsers);
}

// 2. Algunos usuarios inválidos (éxito parcial)
if (result.skippedUsers?.length > 0) {
  console.warn('Usuarios inválidos omitidos:', result.skippedUsers);
  // Marcar para limpieza en BD
}

// 3. Circuit breaker activado
if (result.batcherStats?.circuitBreakerActivated) {
  console.warn('Circuit breaker activado - rate limiting detectado');
  // Enviar notificación al admin
}

// 4. Tasa de éxito baja (< 80%)
if (result.successRate < 80) {
  console.error(`Tasa de éxito baja: ${result.successRate}%`);
  // Trigger alert + webhook de error
}
```

---

## 🔄 **FLUJOS DE USUARIO TÍPICOS**

### **1. Nueva Suscripción (Post-Pago)**

```javascript
// 1. Usuario completa pago
const handlePaymentSuccess = async (user, plan) => {
  try {
    // 2. Activar acceso en TradingView
    const result = await tradingViewService.processNewSubscription(user, plan);

    if (result.success) {
      // 3. ✅ ÉXITO - Actualizar BD
      await updateUserStatus(user.id, 'active');
      await sendWelcomeEmail(user);

      // 4. Webhook llegará automáticamente confirmando éxito
    } else {
      // 5. ⚠️ PARCIAL - Marcar para retry
      await markForRetry(user.id);
    }
  } catch (error) {
    // 6. ❌ ERROR - Escalación
    await alertAdmin(error, user);
  }
};
```

### **2. Renovación Automática (Cron Job)**

```javascript
// Ejecutar diariamente a las 9 AM
const processRenewals = async () => {
  const expiringUsers = await getUsersExpiringToday();

  for (const user of expiringUsers) {
    if (user.auto_renew) {
      try {
        await tradingViewService.processNewSubscription(user, user.plan);
        await logRenewal(user.id, 'success');
      } catch (error) {
        await logRenewal(user.id, 'failed', error);
        await alertAdmin(error, user);
      }
    }
  }
};
```

### **3. Cancelación de Suscripción**

```javascript
const cancelSubscription = async (user, plan) => {
  try {
    // 1. Remover acceso TradingView
    await tradingViewService.cancelSubscription(user, plan);

    // 2. Actualizar BD
    await updateUserStatus(user.id, 'cancelled');

    // 3. Enviar email de confirmación
    await sendCancellationEmail(user);

  } catch (error) {
    // 4. Log error pero no bloquear (usuario ya pagó)
    await logCancellationError(user.id, error);
  }
};
```

---

## 📊 **MONITORING Y MÉTRICAS**

### **Métricas Críticas a Monitorear**

```javascript
const criticalMetrics = {
  // Performance
  operationsPerSecond: 4.6,    // Target: 4.0+
  successRate24h: 98.5,       // Target: 95%+
  avgResponseTime: 385,       // Target: <500ms

  // System Health
  circuitBreakerActive: false, // Target: false
  webhookSuccessRate: 99.2,   // Target: 99%+

  // Business Impact
  subscriptionsActivated: 45,  // Hoy
  revenueProcessed: 4580,      // Hoy ($)
  failedOperations: 2         // Hoy
};
```

### **Alertas a Configurar**

```javascript
const alerts = [
  {
    condition: 'successRate24h < 95',
    message: '⚠️ Tasa de éxito baja detectada',
    action: 'send_email_admin'
  },
  {
    condition: 'circuitBreakerActive === true',
    message: '🚨 Circuit breaker activado - Rate limiting',
    action: 'send_email_admin + slack_alert'
  },
  {
    condition: 'webhookSuccessRate < 99',
    message: '📡 Problemas con webhooks',
    action: 'investigate_immediately'
  }
];
```

---

## 🚀 **IMPLEMENTACIÓN RÁPIDA**

### **Paso 1: Variables de Entorno**

```env
# TradingView API
REACT_APP_TRADINGVIEW_API_URL=http://localhost:5000
REACT_APP_TRADINGVIEW_API_KEY=your_ultra_secure_api_key_2025

# Webhooks (para backend)
ECOMMERCE_WEBHOOK_URL=https://tu-app.com/webhooks/tradingview
WEBHOOK_SECRET=tu_webhook_secret_2025
```

### **Paso 2: Instalar Dependencias**

```bash
# React
npm install axios

# Node.js
npm install axios crypto
```

### **Paso 3: Implementar Servicio Base**

```javascript
// services/tradingView.js
const API_BASE = process.env.REACT_APP_TRADINGVIEW_API_URL;
const API_KEY = process.env.REACT_APP_TRADINGVIEW_API_KEY;

export const tradingViewAPI = {
  // Bulk operations
  grantBulkAccess: (users, pineIds, duration) =>
    fetch(`${API_BASE}/api/access/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({ users, pine_ids: pineIds, duration })
    }).then(r => r.json()),

  // Metrics
  getMetrics: () =>
    fetch(`${API_BASE}/api/metrics/stats`, {
      headers: { 'X-API-Key': API_KEY }
    }).then(r => r.json()),

  // Business metrics
  getBusinessMetrics: () =>
    fetch(`${API_BASE}/api/metrics/business`, {
      headers: { 'X-API-Key': API_KEY }
    }).then(r => r.json()),

  // Public endpoints (no API key needed)
  validateUser: (username) =>
    fetch(`${API_BASE}/api/validate/${username}`).then(r => r.json()),

  getProfileImage: (username) =>
    fetch(`${API_BASE}/profile/${username}`).then(r => r.json()),

  // Configuration endpoints
  configureTradingView: (username, password, testOnly = true) =>
    fetch(`${API_BASE}/api/config/tradingview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, testOnly })
    }).then(r => r.json()),

  getConfigurationStatus: () =>
    fetch(`${API_BASE}/api/config/tradingview/status`).then(r => r.json())
};
```

### **Paso 4: Probar Integración**

```javascript
// Test completo de integración
const testIntegration = async () => {
  try {
    // Test health check
    const health = await fetch(`${API_BASE}/`);
    console.log('✅ API reachable:', health.ok);

    // Test user validation (sin API key)
    const userValidation = await tradingViewAPI.validateUser('apidevs');
    console.log('✅ User validation working:', userValidation.validuser);

    // Test profile image (sin API key)
    const profileImage = await tradingViewAPI.getProfileImage('apidevs');
    console.log('✅ Profile image working:', !!profileImage.success);

    // Test configuration status (sin API key)
    const configStatus = await tradingViewAPI.getConfigurationStatus();
    console.log('✅ Configuration status working:', !!configStatus);

    // Test metrics (si tienes API key)
    const metrics = await tradingViewAPI.getMetrics();
    console.log('✅ Metrics working:', !!metrics);

    // Test business metrics (si tienes API key)
    const businessMetrics = await tradingViewAPI.getBusinessMetrics();
    console.log('✅ Business metrics working:', !!businessMetrics);

  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
};
```

---

## 💻 **EJEMPLOS CURL PARA ENDPOINTS PÚBLICOS**

### **🔍 Validar Usuario (Sin autenticación)**
```bash
# Verificar si usuario existe en TradingView
curl -s "http://localhost:5000/api/validate/apidevs" | jq
# Respuesta: {"validuser": true, "verifiedUserName": "apidevs"}
```

### **📸 Obtener Imagen de Perfil (Sin autenticación)**
```bash
# Obtener URL de imagen de perfil
curl -s "http://localhost:5000/profile/apidevs" | jq
# Respuesta: {"success": true, "username": "apidevs", "profile_image": "https://...", "source": "public_profile"}
```

### **⚙️ Configurar Credenciales TradingView (Sin autenticación)**
```bash
# Probar credenciales (testOnly: true)
curl -X POST "http://localhost:5000/api/config/tradingview" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tu_usuario_tradingview",
    "password": "tu_password",
    "testOnly": true
  }'

# Guardar credenciales (testOnly: false)
curl -X POST "http://localhost:5000/api/config/tradingview" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tu_usuario_tradingview",
    "password": "tu_password",
    "testOnly": false
  }'
```

### **📊 Ver Estado de Configuración (Sin autenticación)**
```bash
# Ver estado actual de configuración
curl -s "http://localhost:5000/api/config/tradingview/status" | jq
```

---

## 🎯 **RESUMEN EJECUTIVO**

**Para que una IA integre fácilmente:**

1. **Usa X-API-Key** en headers para operaciones bulk
2. **Los webhooks llegan automáticamente** - solo configura URL
3. **Maneja errores 429** con backoff automático
4. **Monitorea successRate** - debe ser >95%
5. **Espera webhooks** para confirmaciones de éxito/error

**Endpoints principales a usar:**
- `POST /api/access/bulk` → Nuevas suscripciones (MÁS USADO)
- `POST /api/access/replace` → Cambios de plan
- `POST /api/access/bulk-remove` → Cancelaciones
- `GET /api/metrics/stats` → Dashboard de métricas
- `GET /api/metrics/business` → Métricas de negocio
- `GET /profile/:username` → Imagen de perfil (PÚBLICO)
- `GET /api/validate/:username` → Validar usuario (PÚBLICO)
- `POST /api/config/tradingview` → Configurar credenciales
- `GET /api/config/tradingview/status` → Estado de configuración

**Sistema probado y optimizado para:**
- ✅ 4.6 operaciones/segundo
- ✅ 100% success rate típico
- ✅ Circuit breaker automático
- ✅ Webhooks con retry
- ✅ Rate limiting inteligente

¡La integración es **extremadamente sencilla** gracias al diseño optimizado para e-commerce! 🚀
