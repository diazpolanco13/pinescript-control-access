/**
 * Date Helper Functions
 * Migrated from Python helper.py using date-fns
 */

const { addYears, addMonths, addWeeks, addDays, parseISO, formatISO } = require('date-fns');

/**
 * Calculate access extension date
 * @param {string} currentExpirationDate - ISO date string
 * @param {string} extensionType - 'Y' (years), 'M' (months), 'W' (weeks), 'D' (days)
 * @param {number} extensionLength - number to add
 * @returns {string} ISO date string
 */
function getAccessExtension(currentExpirationDate, extensionType, extensionLength) {
  const expiration = parseISO(currentExpirationDate);

  let newExpiration;
  switch (extensionType.toUpperCase()) {
    case 'Y':
      newExpiration = addYears(expiration, extensionLength);
      break;
    case 'M':
      newExpiration = addMonths(expiration, extensionLength);
      break;
    case 'W':
      newExpiration = addWeeks(expiration, extensionLength);
      break;
    case 'D':
      newExpiration = addDays(expiration, extensionLength);
      break;
    case 'L':
      // Life-long access - return far future date
      newExpiration = addYears(new Date(), 100);
      break;
    default:
      throw new Error(`Invalid extension type: ${extensionType}`);
  }

  return formatISO(newExpiration);
}

/**
 * Parse duration string and return extension parameters
 * @param {string} duration - e.g., "7D", "2M", "1L"
 * @returns {object} { extensionType, extensionLength }
 */
function parseDuration(duration) {
  const match = duration.match(/^(\d+)([YMWDL])$/i);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  return {
    extensionType: match[2].toUpperCase(),
    extensionLength: parseInt(match[1], 10)
  };
}

/**
 * Check if date is expired
 * @param {string} dateString - ISO date string
 * @returns {boolean}
 */
function isExpired(dateString) {
  const date = parseISO(dateString);
  return date < new Date();
}

/**
 * Get current UTC date as ISO string
 * @returns {string}
 */
function getCurrentUTCDate() {
  return formatISO(new Date());
}

module.exports = {
  getAccessExtension,
  parseDuration,
  isExpired,
  getCurrentUTCDate
};
