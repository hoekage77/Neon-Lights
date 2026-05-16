/**
 * Debug logging utility for Neon City Arcade.
 * Respects production builds (no logs in production).
 */

const IS_DEV = import.meta.env?.DEV ?? true;

const Logger = {
  /**
   * Log an informational message.
   * @param {string} scope - Module or subsystem name
   * @param {...any} args
   */
  info(scope, ...args) {
    if (!IS_DEV) return;
    console.log(`[${scope}]`, ...args);
  },

  /**
   * Log a warning.
   * @param {string} scope
   * @param {...any} args
   */
  warn(scope, ...args) {
    if (!IS_DEV) return;
    console.warn(`[${scope}] ⚠️`, ...args);
  },

  /**
   * Log an error.
   * @param {string} scope
   * @param {...any} args
   */
  error(scope, ...args) {
    console.error(`[${scope}] ❌`, ...args);
  },

  /**
   * Log performance timing.
   * @param {string} label
   * @param {Function} fn
   * @returns {any}
   */
  time(label, fn) {
    if (!IS_DEV) return fn();
    console.time(label);
    const result = fn();
    console.timeEnd(label);
    return result;
  },

  /**
   * Group related logs.
   * @param {string} label
   * @param {Function} fn
   */
  group(label, fn) {
    if (!IS_DEV) return fn();
    console.group(label);
    fn();
    console.groupEnd();
  },

  /**
   * Log object as table.
   * @param {string} scope
   * @param {Array|Object} data
   */
  table(scope, data) {
    if (!IS_DEV) return;
    console.log(`[${scope}]`);
    console.table(data);
  }
};

export { Logger };