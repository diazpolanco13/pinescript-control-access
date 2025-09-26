/**
 * 🧪 Date Helper Utility Tests
 *
 * Tests date manipulation functions used throughout the application
 */

const { getAccessExtension, parseDuration, isExpired, getCurrentUTCDate } = require('../../src/utils/dateHelper');

describe('📅 Date Helper Utilities', () => {
  describe('getAccessExtension', () => {
    test('should extend date by days correctly', () => {
      const baseDate = '2025-01-01T10:00:00+00:00';

      const result = getAccessExtension(baseDate, 'D', 7);

      // Check date part, ignore timezone differences
      expect(result).toMatch(/^2025-01-08T\d{2}:\d{2}:\d{2}/);
      expect(result).toContain('10:00:00'); // Time should remain the same
    });

    test('should extend date by months correctly', () => {
      const baseDate = '2025-01-15T10:00:00+00:00';

      const result = getAccessExtension(baseDate, 'M', 2);

      expect(result).toMatch(/^2025-03-15T\d{2}:\d{2}:\d{2}/);
      expect(result).toContain('10:00:00');
    });

    test('should extend date by years correctly', () => {
      const baseDate = '2025-06-15T10:00:00+00:00';

      const result = getAccessExtension(baseDate, 'Y', 1);

      expect(result).toMatch(/^2026-06-15T\d{2}:\d{2}:\d{2}/);
      expect(result).toContain('10:00:00');
    });

    test('should extend date by weeks correctly', () => {
      const baseDate = '2025-01-01T10:00:00+00:00';

      const result = getAccessExtension(baseDate, 'W', 2);

      expect(result).toMatch(/^2025-01-15T\d{2}:\d{2}:\d{2}/);
      expect(result).toContain('10:00:00');
    });

    test('should handle leap years correctly', () => {
      const baseDate = '2024-01-30T10:00:00+00:00';

      const result = getAccessExtension(baseDate, 'M', 1);

      expect(result).toMatch(/^2024-02-29T\d{2}:\d{2}:\d{2}/);
      expect(result).toContain('10:00:00');
    });

    test('should handle lifetime access (100 years)', () => {
      const baseDate = '2025-01-01T10:00:00+00:00';

      const result = getAccessExtension(baseDate, 'L', 1);

      // Should be approximately 100 years in the future
      expect(result).toMatch(/^2125/);
    });

    test('should throw error for invalid extension type', () => {
      const baseDate = '2025-01-01T10:00:00+00:00';

      expect(() => getAccessExtension(baseDate, 'X', 1))
        .toThrow('Invalid extension type: X');
    });
  });

  describe('parseDuration', () => {
    test.each([
      ['7D', { extensionType: 'D', extensionLength: 7 }],
      ['1M', { extensionType: 'M', extensionLength: 1 }],
      ['3Y', { extensionType: 'Y', extensionLength: 3 }],
      ['2W', { extensionType: 'W', extensionLength: 2 }],
      ['1L', { extensionType: 'L', extensionLength: 1 }]
    ])('should parse valid duration %s correctly', (input, expected) => {
      const result = parseDuration(input);
      expect(result).toEqual(expected);
    });

    test.each([
      '7',
      'DD',
      '7X',
      'invalid',
      '7DD',
      'M1',
      ''
    ])('should throw error for invalid duration format: %s', (invalidDuration) => {
      expect(() => parseDuration(invalidDuration))
        .toThrow(/Invalid duration format/);
    });
  });

  describe('isExpired', () => {
    test('should return true for past dates', () => {
      const pastDate = '2020-01-01T10:00:00+00:00';

      const result = isExpired(pastDate);

      expect(result).toBe(true);
    });

    test('should return false for future dates', () => {
      const futureDate = '2030-01-01T10:00:00+00:00';

      const result = isExpired(futureDate);

      expect(result).toBe(false);
    });

    test('should return false for current date/time', () => {
      const currentDate = new Date().toISOString();

      const result = isExpired(currentDate);

      expect(result).toBe(false);
    });
  });

  describe('getCurrentUTCDate', () => {
    test('should return valid ISO date string', () => {
      const result = getCurrentUTCDate();

      // Check if it's a valid ISO string
      expect(() => new Date(result)).not.toThrow();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should return UTC time', () => {
      const before = new Date();
      const result = getCurrentUTCDate();
      const after = new Date();

      const resultDate = new Date(result);

      // Should be within reasonable range
      expect(resultDate.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(resultDate.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete access extension workflow', () => {
      // Simulate granting 7 days access to a user
      const currentExpiration = '2025-01-01T10:00:00+00:00';
      const durationString = '7D';

      // Parse duration
      const { extensionType, extensionLength } = parseDuration(durationString);

      // Calculate new expiration
      const newExpiration = getAccessExtension(currentExpiration, extensionType, extensionLength);

      expect(newExpiration).toMatch(/^2025-01-08T\d{2}:\d{2}:\d{2}/);
      expect(newExpiration).toContain('10:00:00');

      // Verify it's not expired
      expect(isExpired(newExpiration)).toBe(false);
    });

    test('should handle month boundary transitions', () => {
      // Test extending from end of month
      const endOfJanuary = '2025-01-31T10:00:00+00:00';
      const result = getAccessExtension(endOfJanuary, 'M', 1);

      expect(result).toMatch(/^2025-02-28T\d{2}:\d{2}:\d{2}/);
      expect(result).toContain('10:00:00');
    });

    test('should handle timezone consistency', () => {
      const dateWithTimezone = '2025-01-01T10:00:00+05:00';
      const result = getAccessExtension(dateWithTimezone, 'D', 1);

      // Should extend by 1 day, maintaining time
      expect(result).toMatch(/^2025-01-02T\d{2}:\d{2}:\d{2}/);
      expect(result).toContain('10:00:00');
    });
  });
});
