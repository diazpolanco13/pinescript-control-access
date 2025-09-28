/**
 * Admin Authentication System
 * Sistema de tokens similar al del código Python funcional
 */

const crypto = require('crypto');

// Token admin generado al iniciar la aplicación (similar al Python)
let currentAdminToken = null;

/**
 * Generate a secure admin token
 * Similar al sistema Python que genera tokens criptográficos
 */
function generateAdminToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Initialize admin authentication
 * Se llama al iniciar la aplicación
 */
function initAdminAuth() {
  currentAdminToken = generateAdminToken();
  console.log('🔐 Admin token generado para esta sesión:');
  console.log(`   ${currentAdminToken}`);
  console.log('   Usa este token para acceder al panel de administración');
  return currentAdminToken;
}

/**
 * Validate admin token
 * @param {string} token - Token a validar
 * @returns {boolean} true si es válido
 */
function validateAdminToken(token) {
  return token === currentAdminToken;
}

/**
 * Get current admin token (for internal use)
 */
function getCurrentAdminToken() {
  return currentAdminToken;
}

/**
 * Middleware para validar tokens de admin
 * Similar al sistema Python pero usando headers
 */
function requireAdminToken(req, res, next) {
  const token = req.headers['x-admin-token'];

  if (!token) {
    return res.status(401).json({
      error: 'Token de administrador requerido',
      message: 'Incluye X-Admin-Token en los headers'
    });
  }

  if (!validateAdminToken(token)) {
    return res.status(401).json({
      error: 'Token inválido',
      message: 'Token de administrador incorrecto'
    });
  }

  next();
}

module.exports = {
  initAdminAuth,
  validateAdminToken,
  getCurrentAdminToken,
  requireAdminToken
};
