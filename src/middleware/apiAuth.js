/**
 * API Authentication Middleware
 * Protege endpoints sensibles con API key y whitelist de IPs
 */

const { logger } = require('../utils/logger');

const apiAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Verificar API key
  if (!apiKey || apiKey !== process.env.ECOMMERCE_API_KEY) {
    logger.warn({
      ip: clientIP,
      apiKey: apiKey ? '***REDACTED***' : 'MISSING',
      url: req.url,
      method: req.method
    }, 'Unauthorized API access attempt');
    
    return res.status(401).json({ 
      error: 'Invalid API key',
      message: 'Unauthorized access to TradingView API',
      hint: 'Include X-API-Key header with valid key'
    });
  }
  
  // Verificar IP whitelist (opcional)
  const allowedIPsRaw = process.env.ALLOWED_IPS?.trim();
  const allowedIPs = allowedIPsRaw ? allowedIPsRaw.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0) : [];
  if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
    logger.warn({
      ip: clientIP,
      allowedIPs: allowedIPs,
      url: req.url
    }, 'IP not in whitelist');
    
    return res.status(403).json({
      error: 'IP not whitelisted', 
      ip: clientIP,
      message: 'Your IP address is not authorized to access this API'
    });
  }
  
  // Log acceso autorizado
  logger.info({
    ip: clientIP,
    url: req.url,
    method: req.method
  }, 'Authorized API access');
  
  next();
};

module.exports = { apiAuth };
