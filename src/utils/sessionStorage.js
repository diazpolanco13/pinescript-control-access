/**
 * Session Storage System
 * Replaces Python's SimpleDB with async file operations
 */

const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');
const config = require('../../config');

class SessionStorage {
  constructor(filePath = config.sessionFile) {
    this.filePath = path.resolve(filePath);
    this.data = {};
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      await fs.access(this.filePath);
      const content = await fs.readFile(this.filePath, 'utf8');
      this.data = JSON.parse(content);
      logger.info({ filePath: this.filePath }, 'Session storage loaded');
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, start with empty data
        this.data = {};
        await this.save();
        logger.info({ filePath: this.filePath }, 'Session storage initialized');
      } else {
        logger.error({ error: error.message, filePath: this.filePath }, 'Error loading session storage');
        throw error;
      }
    }

    this.initialized = true;
  }

  async get(key) {
    await this.init();
    return this.data[key];
  }

  async set(key, value) {
    await this.init();
    this.data[key] = value;
    await this.save();
    logger.debug({ key, hasValue: !!value }, 'Session data updated');
  }

  async delete(key) {
    await this.init();
    delete this.data[key];
    await this.save();
    logger.debug({ key }, 'Session data deleted');
  }

  async clear() {
    this.data = {};
    await this.save();
    logger.info('Session storage cleared');
  }

  async keys() {
    await this.init();
    return Object.keys(this.data);
  }

  async save() {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      logger.error({ error: error.message, filePath: this.filePath }, 'Error saving session storage');
      throw error;
    }
  }

  // Convenience methods
  async getSessionId() {
    return await this.get('sessionid');
  }

  async setSessionId(sessionId) {
    await this.set('sessionid', sessionId);
  }
}

// Singleton instance
const sessionStorage = new SessionStorage();

module.exports = sessionStorage;
