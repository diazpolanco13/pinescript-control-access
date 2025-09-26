/**
 * Backup Service
 * Estrategia de backup para datos críticos del sistema TradingView
 */

const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');
const sessionStorage = require('../utils/sessionStorage');

class BackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    this.enabled = process.env.BACKUP_ENABLED !== 'false';
    
    if (this.enabled) {
      logger.info({ 
        backupDir: this.backupDir,
        retentionDays: this.retentionDays 
      }, 'Backup service initialized');
      
      // Crear directorio de backup si no existe
      this.ensureBackupDirectory();
      
      // Programar backup automático cada 6 horas
      setInterval(() => {
        this.performAutomaticBackup();
      }, 6 * 60 * 60 * 1000);
    } else {
      logger.warn('Backup service disabled');
    }
  }
  
  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      await fs.mkdir(path.join(this.backupDir, 'sessions'), { recursive: true });
      await fs.mkdir(path.join(this.backupDir, 'operations'), { recursive: true });
      await fs.mkdir(path.join(this.backupDir, 'configs'), { recursive: true });
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to create backup directories');
    }
  }
  
  // Backup de session storage (CRÍTICO - no perder autenticación)
  async backupSessionData() {
    if (!this.enabled) return null;
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, 'sessions', `session_${timestamp}.json`);
      
      // Backup de datos críticos de autenticación
      const criticalData = {
        session_data: {
          session_id: await sessionStorage.getSessionId(),
          session_valid: !!await sessionStorage.getSessionId(),
          last_login: await sessionStorage.getLastLogin(),
          created_at: new Date().toISOString()
        },
        
        system_config: {
          batcher_config: {
            maxConcurrent: tradingViewService.requestBatcher.maxConcurrent,
            batchSize: tradingViewService.requestBatcher.batchSize,
            minDelay: tradingViewService.requestBatcher.minDelay,
            circuitBreakerThreshold: tradingViewService.requestBatcher.circuitBreakerThreshold
          },
          performance_stats: tradingViewService.requestBatcher.getStats()
        },
        
        environment: {
          node_version: process.version,
          platform: process.platform,
          arch: process.arch(),
          uptime_seconds: Math.floor(process.uptime()),
          memory_usage: process.memoryUsage(),
          cpu_count: require('os').cpus().length
        },
        
        backup_metadata: {
          timestamp: new Date().toISOString(),
          backup_version: '1.0.0',
          retention_until: new Date(Date.now() + (this.retentionDays * 24 * 60 * 60 * 1000)).toISOString()
        }
      };
      
      await fs.writeFile(backupPath, JSON.stringify(criticalData, null, 2));
      
      logger.info({ 
        backupPath, 
        session_valid: criticalData.session_data.session_valid,
        uptime: Math.floor(process.uptime())
      }, 'Session backup created successfully');
      
      return backupPath;
    } catch (error) {
      logger.error({ error: error.message }, 'Session backup failed');
      throw error;
    }
  }
  
  // Backup de operación crítica (para debugging y recovery)
  async backupCriticalOperation(operation, data, result) {
    if (!this.enabled) return null;
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const operationId = `${operation}_${timestamp}`;
      const backupPath = path.join(
        this.backupDir, 
        'operations',
        `${operationId}.json`
      );
      
      const operationBackup = {
        operation_metadata: {
          operation_type: operation,
          operation_id: operationId,
          timestamp: new Date().toISOString(),
          server_uptime: process.uptime()
        },
        
        input_data: {
          users: data.users || [],
          pine_ids: data.pine_ids || [],
          duration: data.duration,
          options: data.options || {},
          total_operations: (data.users?.length || 0) * (data.pine_ids?.length || 0)
        },
        
        execution_result: {
          total: result.total,
          success: result.success,
          errors: result.errors,
          success_rate: result.successRate,
          duration_ms: result.duration,
          operations_per_second: Math.round((result.total / result.duration) * 1000 * 100) / 100,
          batcher_stats: result.batcherStats || null
        },
        
        system_state: {
          memory_at_completion: process.memoryUsage(),
          batcher_stats: tradingViewService.requestBatcher.getStats(),
          circuit_breaker_open: tradingViewService.requestBatcher.isCircuitOpen()
        }
      };
      
      await fs.writeFile(backupPath, JSON.stringify(operationBackup, null, 2));
      
      logger.debug({ 
        operation, 
        backupPath,
        success_rate: result.successRate,
        total_ops: result.total
      }, 'Critical operation backed up');
      
      return backupPath;
    } catch (error) {
      logger.warn({ 
        operation,
        error: error.message 
      }, 'Operation backup failed');
      return null;
    }
  }
  
  // Backup automático programado
  async performAutomaticBackup() {
    if (!this.enabled) return;
    
    try {
      logger.info('Starting automatic backup...');
      
      // Backup de sesión
      const sessionBackup = await this.backupSessionData();
      
      // Backup de configuración actual
      await this.backupCurrentConfig();
      
      // Cleanup de backups antiguos
      await this.cleanupOldBackups();
      
      logger.info({ 
        session_backup: sessionBackup,
        cleanup_completed: true
      }, 'Automatic backup completed successfully');
      
    } catch (error) {
      logger.error({ error: error.message }, 'Automatic backup failed');
    }
  }
  
  // Backup de configuración completa del sistema
  async backupCurrentConfig() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const configPath = path.join(this.backupDir, 'configs', `config_${timestamp}.json`);
      
      const configBackup = {
        environment_variables: {
          NODE_ENV: process.env.NODE_ENV,
          PORT: process.env.PORT,
          // No incluir credenciales sensibles
          has_tv_credentials: !!(process.env.TV_USERNAME && process.env.TV_PASSWORD),
          has_api_key: !!process.env.ECOMMERCE_API_KEY,
          has_webhook_config: !!process.env.ECOMMERCE_WEBHOOK_URL,
          has_alert_config: !!process.env.ALERT_EMAIL
        },
        
        package_info: {
          name: require('../../../package.json').name,
          version: require('../../../package.json').version,
          dependencies: Object.keys(require('../../../package.json').dependencies)
        },
        
        system_limits: {
          max_workers: process.env.MAX_WORKERS || require('os').cpus().length,
          bulk_batch_size: process.env.BULK_BATCH_SIZE || 10,
          bulk_delay_ms: process.env.BULK_DELAY_MS || 100
        },
        
        backup_metadata: {
          timestamp: new Date().toISOString(),
          config_version: '1.0.0'
        }
      };
      
      await fs.writeFile(configPath, JSON.stringify(configBackup, null, 2));
      
      logger.debug({ configPath }, 'Configuration backup created');
      return configPath;
    } catch (error) {
      logger.warn({ error: error.message }, 'Configuration backup failed');
      return null;
    }
  }
  
  // Limpiar backups antiguos según retention policy
  async cleanupOldBackups() {
    if (!this.enabled) return;
    
    try {
      const cutoffTime = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
      const directories = ['sessions', 'operations', 'configs'];
      let totalCleaned = 0;
      
      for (const dir of directories) {
        const fullPath = path.join(this.backupDir, dir);
        
        try {
          const files = await fs.readdir(fullPath);
          
          for (const file of files) {
            const filePath = path.join(fullPath, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime.getTime() < cutoffTime) {
              await fs.unlink(filePath);
              totalCleaned++;
              logger.debug({ file, directory: dir }, 'Old backup cleaned up');
            }
          }
        } catch (error) {
          logger.debug({ directory: dir, error: error.message }, 'Directory cleanup skipped');
        }
      }
      
      if (totalCleaned > 0) {
        logger.info({ 
          files_cleaned: totalCleaned,
          retention_days: this.retentionDays 
        }, 'Old backups cleaned up successfully');
      }
      
    } catch (error) {
      logger.warn({ error: error.message }, 'Backup cleanup failed');
    }
  }
  
  // Restaurar sesión desde backup
  async restoreSessionFromBackup(backupPath) {
    try {
      const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));
      
      if (backupData.session_data && backupData.session_data.session_id) {
        await sessionStorage.setSessionId(backupData.session_data.session_id);
        
        logger.info({ 
          backupPath,
          restored_session: true
        }, 'Session restored from backup');
        
        return true;
      } else {
        throw new Error('No valid session data in backup');
      }
    } catch (error) {
      logger.error({ 
        backupPath,
        error: error.message 
      }, 'Session restore failed');
      throw error;
    }
  }
  
  // Obtener lista de backups disponibles
  async getAvailableBackups() {
    try {
      const backups = {
        sessions: [],
        operations: [],
        configs: []
      };
      
      for (const [type, files] of Object.entries(backups)) {
        const dirPath = path.join(this.backupDir, type);
        
        try {
          const dirFiles = await fs.readdir(dirPath);
          
          for (const file of dirFiles) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);
            
            backups[type].push({
              filename: file,
              path: filePath,
              size_bytes: stats.size,
              created: stats.mtime.toISOString(),
              age_hours: Math.floor((Date.now() - stats.mtime.getTime()) / (60 * 60 * 1000))
            });
          }
          
          // Ordenar por fecha (más reciente primero)
          backups[type].sort((a, b) => new Date(b.created) - new Date(a.created));
        } catch (error) {
          logger.debug({ type, error: error.message }, 'Backup directory not found');
        }
      }
      
      return backups;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to get available backups');
      throw error;
    }
  }
}

module.exports = new BackupService();
