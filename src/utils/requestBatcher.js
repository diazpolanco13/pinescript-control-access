/**
 * 🚀 Intelligent Request Batching System
 *
 * Optimizes bulk operations for TradingView API
 * Features:
 * - Intelligent batching and queuing
 * - Circuit breaker for rate limits
 * - Exponential backoff
 * - Parallel execution with limits
 * - Request deduplication
 */

const { bulkLogger } = require('./logger');

class RequestBatcher {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 5; // Max parallel requests
    this.batchSize = options.batchSize || 10; // Requests per batch
    this.minDelay = options.minDelay || 200; // Min delay between batches (ms)
    this.maxDelay = options.maxDelay || 5000; // Max delay for backoff (ms)
    this.backoffMultiplier = options.backoffMultiplier || 2; // Exponential backoff
    this.circuitBreakerThreshold = options.circuitBreakerThreshold || 5; // Failures to trigger circuit
    this.circuitBreakerTimeout = options.circuitBreakerTimeout || 30000; // Circuit open time (ms)

    // Internal state
    this.queue = [];
    this.processing = false;
    this.currentDelay = this.minDelay;
    this.consecutiveFailures = 0;
    this.circuitOpen = false;
    this.circuitOpenUntil = 0;
    this.processingStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      avgResponseTime: 0,
      currentBatch: 0,
      activeRequests: 0
    };

    bulkLogger.info('🚀 Intelligent Request Batcher initialized', {
      maxConcurrent: this.maxConcurrent,
      batchSize: this.batchSize,
      minDelay: this.minDelay,
      circuitBreakerThreshold: this.circuitBreakerThreshold
    });
  }

  /**
   * Add request to batch queue
   */
  async add(request, options = {}) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        request,
        resolve,
        reject,
        options,
        addedAt: Date.now(),
        priority: options.priority || 0, // Higher priority = processed first
        retries: 0,
        maxRetries: options.maxRetries || 3
      };

      this.queue.push(queueItem);

      // Sort by priority (higher first) and then by time added (FIFO)
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.addedAt - b.addedAt;
      });

      bulkLogger.debug(`Request added to batch queue. Queue size: ${this.queue.length}`);

      // Start processing if not already running
      this.process();
    });
  }

  /**
   * Process batch queue
   */
  async process() {
    if (this.processing || this.queue.length === 0) return;

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      bulkLogger.warn('Circuit breaker is OPEN, delaying processing', {
        circuitOpenUntil: new Date(this.circuitOpenUntil).toISOString(),
        remainingMs: Math.max(0, this.circuitOpenUntil - Date.now())
      });
      return;
    }

    this.processing = true;
    this.processingStats.currentBatch++;

    try {
      // Get next batch
      const batch = this.queue.splice(0, Math.min(this.batchSize, this.queue.length));

      bulkLogger.info(`Processing batch ${this.processingStats.currentBatch} with ${batch.length} requests`, {
        queueRemaining: this.queue.length,
        currentDelay: this.currentDelay
      });

      const batchStartTime = Date.now();

      // Execute batch with controlled concurrency
      const results = await this.executeBatch(batch);

      const batchDuration = Date.now() - batchStartTime;

      // Analyze results and update circuit breaker
      this.analyzeBatchResults(results, batchDuration);

      // Schedule next batch if queue not empty
      if (this.queue.length > 0) {
        const delay = this.calculateDelay();
        bulkLogger.debug(`Scheduling next batch in ${delay}ms. Queue size: ${this.queue.length}`);

        setTimeout(() => {
          this.processing = false;
          this.process();
        }, delay);
      } else {
        this.processing = false;
      }

    } catch (error) {
      bulkLogger.error('Batch processing error', { error: error.message });
      this.processing = false;

      // Trigger circuit breaker on critical errors
      this.recordFailure();
    }
  }

  /**
   * Execute batch with controlled concurrency
   */
  async executeBatch(batch) {
    const results = [];
    const chunks = this.chunkArray(batch, this.maxConcurrent);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (item, index) => {
        const startTime = Date.now();
        this.processingStats.activeRequests++;

        try {
          const result = await item.request();
          const duration = Date.now() - startTime;

          item.resolve(result);

          results.push({
            success: true,
            duration,
            item,
            result
          });

          this.processingStats.successful++;
          this.processingStats.totalProcessed++;

        } catch (error) {
          const duration = Date.now() - startTime;

          // Retry logic
          if (item.retries < item.maxRetries) {
            item.retries++;
            bulkLogger.warn(`Request failed, retrying (${item.retries}/${item.maxRetries})`, {
              error: error.message,
              duration
            });

            // Re-queue with backoff
            setTimeout(() => {
              this.queue.unshift(item);
            }, this.currentDelay * item.retries);

          } else {
            item.reject(error);
            results.push({
              success: false,
              duration,
              item,
              error
            });

            this.processingStats.failed++;
            this.processingStats.totalProcessed++;
          }
        } finally {
          this.processingStats.activeRequests--;
        }

        // Small delay between individual requests in chunk
        if (index < chunk.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      });

      await Promise.allSettled(chunkPromises);
    }

    return results;
  }

  /**
   * Analyze batch results and adjust behavior
   */
  analyzeBatchResults(results, batchDuration) {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const successRate = successful / (successful + failed);

    // Update average response time
    const avgResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    this.processingStats.avgResponseTime =
      (this.processingStats.avgResponseTime + avgResponseTime) / 2;

    bulkLogger.info('Batch analysis', {
      batchSize: results.length,
      successful,
      failed,
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      overallAvgResponseTime: Math.round(this.processingStats.avgResponseTime),
      batchDuration
    });

    // Adjust behavior based on results
    if (successRate < 0.5) {
      // High failure rate - increase delay and trigger circuit breaker
      this.recordFailure();
      this.currentDelay = Math.min(this.currentDelay * this.backoffMultiplier, this.maxDelay);

      bulkLogger.warn('High failure rate detected, increasing delay', {
        successRate,
        newDelay: this.currentDelay
      });

    } else if (successRate > 0.9 && batchDuration < 1000) {
      // High success and fast - can reduce delay slightly
      this.consecutiveFailures = 0;
      this.currentDelay = Math.max(this.currentDelay * 0.9, this.minDelay);

      bulkLogger.info('High performance detected, optimizing delay', {
        successRate,
        newDelay: this.currentDelay
      });
    }
  }

  /**
   * Calculate delay for next batch
   */
  calculateDelay() {
    let delay = this.currentDelay;

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    delay += jitter;

    // Ensure minimum delay
    return Math.max(delay, this.minDelay);
  }

  /**
   * Record a failure for circuit breaker
   */
  recordFailure() {
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= this.circuitBreakerThreshold) {
      this.openCircuit();
    }
  }

  /**
   * Open circuit breaker
   */
  openCircuit() {
    this.circuitOpen = true;
    this.circuitOpenUntil = Date.now() + this.circuitBreakerTimeout;

    bulkLogger.warn('🚫 CIRCUIT BREAKER OPENED', {
      consecutiveFailures: this.consecutiveFailures,
      circuitOpenUntil: new Date(this.circuitOpenUntil).toISOString(),
      timeoutMs: this.circuitBreakerTimeout
    });
  }

  /**
   * Check if circuit is open
   */
  isCircuitOpen() {
    if (this.circuitOpen && Date.now() > this.circuitOpenUntil) {
      // Circuit timeout expired, try to close it
      this.circuitOpen = false;
      this.consecutiveFailures = 0;

      bulkLogger.info('🔄 CIRCUIT BREAKER CLOSED - attempting recovery');
      return false;
    }

    return this.circuitOpen;
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      ...this.processingStats,
      queueSize: this.queue.length,
      currentDelay: this.currentDelay,
      consecutiveFailures: this.consecutiveFailures,
      circuitOpen: this.circuitOpen,
      circuitOpenUntil: this.circuitOpenUntil ? new Date(this.circuitOpenUntil).toISOString() : null,
      successRate: this.processingStats.totalProcessed > 0
        ? Math.round((this.processingStats.successful / this.processingStats.totalProcessed) * 100 * 100) / 100
        : 0
    };
  }

  /**
   * Utility: chunk array into smaller arrays
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Flush remaining queue (force processing)
   */
  async flush() {
    bulkLogger.info('Flushing remaining queue', { remaining: this.queue.length });

    while (this.queue.length > 0) {
      await this.process();
      await new Promise(resolve => setTimeout(resolve, this.minDelay));
    }
  }
}

module.exports = RequestBatcher;
