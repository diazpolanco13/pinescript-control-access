/**
 * 🚀 Clustering Multi-Core Implementation
 *
 * Aprovecha todos los cores del CPU para mejorar rendimiento 4-8x
 * Maneja reinicio automático de workers caídos
 * Distribuye carga entre workers de forma automática
 */

const cluster = require('cluster');
const os = require('os');
const { logger } = require('./utils/logger');

// Configuración del cluster
const config = {
  maxWorkers: process.env.MAX_WORKERS || os.cpus().length,
  restartDelay: 1000, // 1 segundo entre reinicios
  shutdownTimeout: 10000 // 10 segundos para graceful shutdown
};

if (cluster.isMaster || cluster.isPrimary) {
  logger.info({
    totalCPUs: os.cpus().length,
    maxWorkers: config.maxWorkers,
    platform: os.platform(),
    arch: os.arch()
  }, '🚀 Iniciando TradingView API con Clustering Multi-Core');

  // Crear workers (uno por core)
  for (let i = 0; i < config.maxWorkers; i++) {
    const worker = cluster.fork();

    logger.info({
      workerId: worker.id,
      workerPid: worker.process.pid,
      workerIndex: i + 1
    }, `Worker ${i + 1}/${config.maxWorkers} creado`);
  }

  // Manejar eventos de workers
  cluster.on('online', (worker) => {
    logger.info({
      workerId: worker.id,
      workerPid: worker.process.pid
    }, `Worker ${worker.id} está online`);
  });

  cluster.on('listening', (worker, address) => {
    logger.info({
      workerId: worker.id,
      workerPid: worker.process.pid,
      address: `${address.address}:${address.port}`
    }, `Worker ${worker.id} escuchando en ${address.address}:${address.port}`);
  });

  cluster.on('disconnect', (worker) => {
    logger.warn({
      workerId: worker.id,
      workerPid: worker.process.pid
    }, `Worker ${worker.id} se desconectó`);
  });

  cluster.on('exit', (worker, code, signal) => {
    const reason = signal ? `señal ${signal}` : `código ${code}`;

    logger.error({
      workerId: worker.id,
      workerPid: worker.process.pid,
      code,
      signal,
      reason
    }, `Worker ${worker.id} murió (${reason})`);

    // Reiniciar worker automáticamente
    if (!worker.exitedAfterDisconnect) {
      logger.info(`Reiniciando worker ${worker.id} en ${config.restartDelay}ms...`);

      setTimeout(() => {
        const newWorker = cluster.fork();
        logger.info({
          oldWorkerId: worker.id,
          newWorkerId: newWorker.id,
          newWorkerPid: newWorker.process.pid
        }, `Worker reiniciado: ${worker.id} → ${newWorker.id}`);
      }, config.restartDelay);
    }
  });

  // Manejar señales de shutdown graceful
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  function gracefulShutdown(signal) {
    logger.info({
      signal,
      activeWorkers: Object.keys(cluster.workers).length
    }, `Recibida señal ${signal}, iniciando shutdown graceful`);

    let shutdownTimeout = setTimeout(() => {
      logger.error('Timeout de shutdown, forzando terminación');
      process.exit(1);
    }, config.shutdownTimeout);

    // Enviar señal a todos los workers
    for (const id in cluster.workers) {
      const worker = cluster.workers[id];
      logger.info({ workerId: id, workerPid: worker.process.pid }, `Deteniendo worker ${id}`);

      worker.send({ type: 'shutdown' });
      worker.disconnect();

      worker.on('disconnect', () => {
        logger.info({ workerId: id }, `Worker ${id} desconectado`);
      });
    }

    // Esperar a que todos los workers terminen
    cluster.on('exit', () => {
      if (Object.keys(cluster.workers).length === 0) {
        clearTimeout(shutdownTimeout);
        logger.info('Todos los workers detenidos, shutdown completo');
        process.exit(0);
      }
    });
  }

  // Log de estado del cluster cada 30 segundos
  setInterval(() => {
    const workers = Object.keys(cluster.workers).length;
    logger.info({
      activeWorkers: workers,
      totalCPUs: config.maxWorkers,
      utilizationPercent: Math.round((workers / config.maxWorkers) * 100)
    }, `Estado del cluster: ${workers}/${config.maxWorkers} workers activos`);
  }, 30000);

} else {
  // Código del worker - iniciar el servidor normal
  logger.info({
    workerId: cluster.worker.id,
    workerPid: process.pid,
    isWorker: true
  }, `Worker ${cluster.worker.id} iniciando servidor`);

  // Importar y ejecutar el servidor
  require('./server');

  // Manejar mensajes del master
  process.on('message', (message) => {
    if (message.type === 'shutdown') {
      logger.info({ workerId: cluster.worker.id }, `Worker ${cluster.worker.id} recibió señal de shutdown`);

      // Aquí podrías hacer cleanup si fuera necesario
      // Por ejemplo: cerrar conexiones a BD, finalizar tareas pendientes, etc.

      // El worker se cerrará automáticamente cuando el master lo desconecte
    }
  });

  // Manejar errores no capturados en el worker
  process.on('uncaughtException', (error) => {
    logger.fatal({
      workerId: cluster.worker.id,
      error: error.message,
      stack: error.stack
    }, `Uncaught exception en worker ${cluster.worker.id}`);

    // El master reiniciará automáticamente este worker
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error({
      workerId: cluster.worker.id,
      reason: reason.toString(),
      promise: promise.toString()
    }, `Unhandled rejection en worker ${cluster.worker.id}`);

    // No terminamos el proceso aquí, solo logueamos
  });
}
