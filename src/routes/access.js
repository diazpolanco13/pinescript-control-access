/**
 * Access Management Routes
 * /access/* endpoints - GET, POST, DELETE operations
 */

// Clean implementation - no debug logs

const express = require('express');
const router = express.Router();
const tradingViewService = require('../services/tradingViewService');
const { parseDuration } = require('../utils/dateHelper');
const { apiLogger, bulkLogger } = require('../utils/logger');
const { tradingViewLimiter, bulkLimiter } = require('../middleware/rateLimit');

// Endpoint duplicado eliminado - usando solo /bulk optimizado

/**
 * POST /access/bulk-remove
 * Bulk remove access from multiple users for multiple pine_ids
 * High-performance endpoint for mass access revocation (e.g., expired subscriptions)
 */
router.post('/bulk-remove', bulkLimiter, async (req, res) => {
  try {
    const { users, pine_ids, options = {} } = req.body;

    if (!users || !Array.isArray(users)) {
      return res.status(400).json({
        error: 'users array is required'
      });
    }

    if (!pine_ids || !Array.isArray(pine_ids)) {
      return res.status(400).json({
        error: 'pine_ids array is required'
      });
    }

    const totalOperations = users.length * pine_ids.length;

    bulkLogger.info({
      usersCount: users.length,
      pineIdsCount: pine_ids.length,
      totalOperations,
      options
    }, 'Starting bulk access removal');

    // Progress tracking
    let lastProgressUpdate = Date.now();
    const progressCallback = (processed, total, successCount, errorCount) => {
      const now = Date.now();
      // Update progress every 5 seconds or when complete
      if (now - lastProgressUpdate > 5000 || processed === total) {
        bulkLogger.logBulkProgress('bulk-remove', processed, total, options.batchSize || 10);
        lastProgressUpdate = now;
      }
    };

    const result = await tradingViewService.bulkRemoveAccess(
      users,
      pine_ids,
      {
        ...options,
        onProgress: progressCallback
      }
    );

    bulkLogger.info({
      totalOperations,
      successCount: result.success,
      errorCount: result.errors,
      duration: result.duration,
      successRate: result.successRate,
      batcherStats: result.batcherStats
    }, 'Intelligent bulk access removal completed');

    res.json(result);
  } catch (error) {
    bulkLogger.error({
      error: error.message,
      usersCount: req.body.users?.length,
      pineIdsCount: req.body.pine_ids?.length
    }, 'Bulk access removal failed');

    res.status(500).json({
      success: false,
      error: 'Bulk access removal failed',
      details: error.message
    });
  }
});

/**
 * POST /access/bulk
 * Bulk grant access to multiple users for multiple pine_ids
 * High-performance endpoint for mass operations
 */
router.post('/bulk', bulkLimiter, async (req, res) => {
  try {
    const { users, pine_ids, duration, options = {} } = req.body;

    if (!users || !Array.isArray(users)) {
      return res.status(400).json({
        error: 'users array is required'
      });
    }

    if (!pine_ids || !Array.isArray(pine_ids)) {
      return res.status(400).json({
        error: 'pine_ids array is required'
      });
    }

    if (!duration) {
      return res.status(400).json({
        error: 'duration is required (e.g., "7D", "1M", "1L")'
      });
    }

    // Validate duration format
    try {
      parseDuration(duration);
    } catch (error) {
      return res.status(400).json({
        error: `Invalid duration format: ${duration}. Use format like "7D", "1M", "1L"`
      });
    }

    const totalOperations = users.length * pine_ids.length;

    bulkLogger.info({
      usersCount: users.length,
      pineIdsCount: pine_ids.length,
      totalOperations,
      duration,
      options
    }, 'Starting bulk access grant');

    // Progress tracking
    let lastProgressUpdate = Date.now();
    const progressCallback = (processed, total, successCount, errorCount) => {
      const now = Date.now();
      // Update progress every 5 seconds or when complete
      if (now - lastProgressUpdate > 5000 || processed === total) {
        bulkLogger.logBulkProgress('bulk-grant', processed, total, options.batchSize || 10);
        lastProgressUpdate = now;
      }
    };

    const result = await tradingViewService.bulkGrantAccess(
      users,
      pine_ids,
      duration,
      {
        ...options,
        onProgress: progressCallback
      }
    );

    bulkLogger.info({
      totalOperations,
      successCount: result.success,
      errorCount: result.errors,
      duration: result.duration,
      successRate: result.successRate,
      batcherStats: result.batcherStats
    }, 'Intelligent bulk access grant completed');

    res.json(result);
  } catch (error) {
    bulkLogger.error({
      error: error.message,
      usersCount: req.body.users?.length,
      pineIdsCount: req.body.pine_ids?.length
    }, 'Bulk access grant failed');

    res.status(500).json({
      success: false,
      error: 'Bulk access grant failed',
      details: error.message
    });
  }
});

/**
 * GET /access/:username
 * Get current access status for user and specified pine_ids
 */
router.get('/:username', tradingViewLimiter, async (req, res) => {
  try {
    const { username } = req.params;
    const { pine_ids } = req.body;

    if (!pine_ids || !Array.isArray(pine_ids)) {
      return res.status(400).json({
        error: 'pine_ids array is required in request body'
      });
    }

    apiLogger.info({
      username,
      pineIdsCount: pine_ids.length
    }, 'Getting access details');

    const accessList = [];

    for (const pineId of pine_ids) {
      try {
        const access = await tradingViewService.getAccessDetails(username, pineId);
        accessList.push(access);
      } catch (error) {
        apiLogger.error({
          error: error.message,
          username,
          pineId
        }, 'Failed to get access details for pine ID');

        // Add error entry to maintain response structure
        accessList.push({
          pine_id: pineId,
          username,
          hasAccess: false,
          noExpiration: false,
          currentExpiration: null,
          error: error.message
        });
      }
    }

    apiLogger.info({
      username,
      totalPineIds: pine_ids.length,
      successful: accessList.filter(a => !a.error).length
    }, 'Access details retrieved');

    res.json(accessList);
  } catch (error) {
    apiLogger.error({
      error: error.message,
      username: req.params.username
    }, 'Access details retrieval failed');

    res.status(500).json({
      errorMessage: 'Access details retrieval failed',
      details: error.message
    });
  }
});

/**
 * POST /access/:username
 * Grant or extend access for user to specified pine_ids
 */
router.post('/:username', tradingViewLimiter, async (req, res) => {
  try {
    const { username } = req.params;
    const { pine_ids, duration } = req.body;

    if (!pine_ids || !Array.isArray(pine_ids)) {
      return res.status(400).json({
        error: 'pine_ids array is required in request body'
      });
    }

    if (!duration) {
      return res.status(400).json({
        error: 'duration is required (e.g., "7D", "1M", "1L")'
      });
    }

    // Validate duration format
    try {
      parseDuration(duration);
    } catch (error) {
      return res.status(400).json({
        error: `Invalid duration format: ${duration}. Use format like "7D", "1M", "1L"`
      });
    }

    apiLogger.info({
      username,
      pineIdsCount: pine_ids.length,
      duration
    }, 'Granting access');

    const accessList = [];

    for (const pineId of pine_ids) {
      try {
        const result = await tradingViewService.grantAccess(username, pineId, duration);
        accessList.push(result);
      } catch (error) {
        apiLogger.error({
          error: error.message,
          username,
          pineId,
          duration
        }, 'Failed to grant access for pine ID');

        // Add error entry
        accessList.push({
          pine_id: pineId,
          username,
          hasAccess: false,
          noExpiration: false,
          currentExpiration: null,
          status: 'Failure',
          error: error.message
        });
      }
    }

    const successCount = accessList.filter(a => a.status === 'Success').length;
    apiLogger.info({
      username,
      totalPineIds: pine_ids.length,
      successful: successCount,
      duration
    }, 'Access granting completed');

    res.json(accessList);
  } catch (error) {
    apiLogger.error({
      error: error.message,
      username: req.params.username
    }, 'Access granting failed');

    res.status(500).json({
      errorMessage: 'Access granting failed',
      details: error.message
    });
  }
});

/**
 * DELETE /access/:username
 * Remove access for user from specified pine_ids
 */
router.delete('/:username', tradingViewLimiter, async (req, res) => {
  try {
    const { username } = req.params;
    const { pine_ids } = req.body;

    if (!pine_ids || !Array.isArray(pine_ids)) {
      return res.status(400).json({
        error: 'pine_ids array is required in request body'
      });
    }

    apiLogger.info({
      username,
      pineIdsCount: pine_ids.length
    }, 'Removing access');

    const accessList = [];

    for (const pineId of pine_ids) {
      try {
        // First get current access details
        const accessDetails = await tradingViewService.getAccessDetails(username, pineId);

        // Then remove access
        const result = await tradingViewService.removeAccess(accessDetails);
        accessList.push(result);
      } catch (error) {
        apiLogger.error({
          error: error.message,
          username,
          pineId
        }, 'Failed to remove access for pine ID');

        // Add error entry
        accessList.push({
          pine_id: pineId,
          username,
          status: 'Failure',
          error: error.message
        });
      }
    }

    const successCount = accessList.filter(a => a.status === 'Success').length;
    apiLogger.info({
      username,
      totalPineIds: pine_ids.length,
      successful: successCount
    }, 'Access removal completed');

    res.json(accessList);
  } catch (error) {
    apiLogger.error({
      error: error.message,
      username: req.params.username
    }, 'Access removal failed');

    res.status(500).json({
      errorMessage: 'Access removal failed',
      details: error.message
    });
  }
});

module.exports = router;
