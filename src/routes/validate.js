/**
 * Validation Routes
 * /validate/* endpoints
 */

const express = require('express');
const router = express.Router();
const tradingViewService = require('../services/tradingViewService');
const { apiLogger } = require('../utils/logger');
const { tradingViewLimiter } = require('../middleware/rateLimit');

/**
 * GET /validate/:username
 * Validate if a username exists on TradingView
 */
router.get('/:username', tradingViewLimiter, async (req, res) => {
  try {
    const { username } = req.params;

    apiLogger.info({ username }, 'Validating username');

    const result = await tradingViewService.validateUsername(username);

    apiLogger.info({
      username,
      valid: result.validuser,
      verifiedName: result.verifiedUserName
    }, 'Username validation completed');

    res.json(result);
  } catch (error) {
    apiLogger.error({
      error: error.message,
      username: req.params.username
    }, 'Username validation failed');

    res.status(500).json({
      errorMessage: 'Username validation failed',
      details: error.message
    });
  }
});

module.exports = router;
