module.exports = {
  apps: [{
    name: 'tradingview-api',
    script: 'src/server.js',
    instances: 2, // Clustering con 2 instancias
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    // Configuración para reinicio automático
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Configuración de recursos
    max_memory_restart: '1G',
    // Health check
    health_check: {
      enabled: true,
      interval: 30000, // 30 segundos
      timeout: 5000,
      unhealthy_threshold: 3,
      healthy_threshold: 2
    },
    // Configuración de cluster
    node_args: '--max-old-space-size=1024',
    // Environment variables específicas
    env_production: {
      NODE_ENV: 'production',
      PORT: 5001,
      LOG_LEVEL: 'info'
    }
  }]
};
