/**
 * Admin Routes - Gestión de Cookies TradingView
 * Endpoints similares al sistema Python funcional
 */

const express = require('express');
const router = express.Router();
const { requireAdminToken, validateAdminToken } = require('../utils/adminAuth');
const { apiLogger } = require('../utils/logger');

// Importar TradingView service para gestión de cookies
let tradingViewService = null;

// Función para setear el servicio (se llama desde server.js)
function setTradingViewService(service) {
  tradingViewService = service;
}

/**
 * POST /admin/login
 * Login de admin con token (similar al sistema Python)
 */
router.post('/login', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token requerido',
        message: 'Proporciona un token de administrador'
      });
    }

    if (validateAdminToken(token)) {
      // En un sistema real usaríamos sesiones, pero por simplicidad devolvemos éxito
      apiLogger.info('Admin login successful');
      res.json({
        success: true,
        message: 'Login exitoso',
        redirect: '/admin'
      });
    } else {
      apiLogger.warn({ token: token.substring(0, 10) + '...' }, 'Invalid admin token attempt');
      res.status(401).json({
        error: 'Token inválido',
        message: 'Token de administrador incorrecto'
      });
    }
  } catch (error) {
    apiLogger.error({ error: error.message }, 'Admin login error');
    res.status(500).json({
      error: 'Error interno',
      message: error.message
    });
  }
});

/**
 * GET /admin/cookies/status
 * Verificar estado actual de las cookies
 */
router.get('/cookies/status', requireAdminToken, async (req, res) => {
  try {
    if (!tradingViewService) {
      return res.status(500).json({
        error: 'Servicio no disponible',
        message: 'TradingView service not initialized'
      });
    }

    const isAuthenticated = tradingViewService.isAuthenticated();
    let profileData = null;
    let username = null;

    if (isAuthenticated) {
      // Intentar obtener datos del perfil (similar al sistema Python)
      profileData = await tradingViewService.getProfileData();
      if (profileData) {
        username = profileData.username;
      }
    }

    // Obtener timestamp de última actualización de cookies
    const cookieData = await tradingViewService.cookieManager.loadCookies();

    res.json({
      valid: isAuthenticated,
      username: username,
      profile_data: profileData,
      last_updated: cookieData ? cookieData.timestamp : null
    });

  } catch (error) {
    apiLogger.error({ error: error.message }, 'Cookie status check error');
    res.status(500).json({
      error: 'Error verificando cookies',
      message: error.message
    });
  }
});

/**
 * POST /admin/cookies/update
 * Actualizar cookies manualmente (similar al sistema Python)
 */
router.post('/cookies/update', requireAdminToken, async (req, res) => {
  try {
    const { sessionid, sessionid_sign } = req.body;

    if (!sessionid || !sessionid_sign) {
      return res.status(400).json({
        error: 'Cookies requeridas',
        message: 'Proporciona sessionid y sessionid_sign'
      });
    }

    if (!tradingViewService) {
      return res.status(500).json({
        error: 'Servicio no disponible',
        message: 'TradingView service not initialized'
      });
    }

    // Actualizar cookies usando el servicio
    const result = await tradingViewService.updateCookies(sessionid, sessionid_sign);

    apiLogger.info('Cookies updated successfully via admin panel');

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    apiLogger.error({ error: error.message }, 'Cookie update error');

    // Mensaje específico para cookies inválidas
    if (error.message.includes('Cookies inválidas')) {
      return res.status(400).json({
        error: 'Cookies inválidas',
        message: 'Verifica que hayas copiado correctamente las cookies del navegador. Asegúrate de estar logueado en TradingView.'
      });
    }

    res.status(500).json({
      error: 'Error actualizando cookies',
      message: error.message
    });
  }
});

/**
 * POST /admin/cookies/clear
 * Limpiar cookies (para testing o renovación forzada)
 */
router.post('/cookies/clear', requireAdminToken, async (req, res) => {
  try {
    if (!tradingViewService) {
      return res.status(500).json({
        error: 'Servicio no disponible',
        message: 'TradingView service not initialized'
      });
    }

    const cleared = await tradingViewService.cookieManager.clearCookies();

    if (cleared) {
      // Resetear propiedades del servicio
      tradingViewService.sessionId = null;
      tradingViewService.sessionIdSign = null;

      apiLogger.info('Cookies cleared via admin panel');
      res.json({
        success: true,
        message: 'Cookies eliminadas exitosamente'
      });
    } else {
      res.status(500).json({
        error: 'Error eliminando cookies',
        message: 'No se pudieron eliminar las cookies'
      });
    }

  } catch (error) {
    apiLogger.error({ error: error.message }, 'Cookie clear error');
    res.status(500).json({
      error: 'Error eliminando cookies',
      message: error.message
    });
  }
});

module.exports = {
  router,
  setTradingViewService
};
