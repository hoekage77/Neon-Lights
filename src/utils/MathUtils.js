/**
 * Math utilities for Neon City Arcade.
 * Pure functions with no side effects.
 */

const MathUtils = {
  /**
   * Clamp a value between min and max.
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  /**
   * Linear interpolation between a and b.
   * @param {number} a
   * @param {number} b
   * @param {number} t - 0 to 1
   * @returns {number}
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  /**
   * Smooth interpolation (ease-in-out).
   * @param {number} t - 0 to 1
   * @returns {number}
   */
  smoothstep(t) {
    return t * t * (3 - 2 * t);
  },

  /**
   * Map a value from one range to another.
   * @param {number} value
   * @param {number} inMin
   * @param {number} inMax
   * @param {number} outMin
   * @param {number} outMax
   * @returns {number}
   */
  mapRange(value, inMin, inMax, outMin, outMax) {
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
  },

  /**
   * Get distance between two points.
   * @param {THREE.Vector3|{x,y,z}} a
   * @param {THREE.Vector3|{x,y,z}} b
   * @returns {number}
   */
  distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  },

  /**
   * Get squared distance (faster, no sqrt).
   * @param {THREE.Vector3|{x,y,z}} a
   * @param {THREE.Vector3|{x,y,z}} b
   * @returns {number}
   */
  distanceSq(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
  },

  /**
   * Get random float between min and max.
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  randomRange(min, max) {
    return Math.random() * (max - min) + min;
  },

  /**
   * Get random integer between min and max (inclusive).
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Pick random item from array.
   * @param {Array} array
   * @returns {any}
   */
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  },

  /**
   * Degrees to radians.
   * @param {number} deg
   * @returns {number}
   */
  degToRad(deg) {
    return deg * (Math.PI / 180);
  },

  /**
   * Radians to degrees.
   * @param {number} rad
   * @returns {number}
   */
  radToDeg(rad) {
    return rad * (180 / Math.PI);
  },

  /**
   * Check if value is power of 2.
   * @param {number} value
   * @returns {boolean}
   */
  isPowerOf2(value) {
    return (value & (value - 1)) === 0;
  },

  /**
   * Round up to next power of 2.
   * @param {number} value
   * @returns {number}
   */
  nextPowerOf2(value) {
    if (this.isPowerOf2(value)) return value;
    return Math.pow(2, Math.ceil(Math.log2(value)));
  },

  /**
   * Spherical to cartesian coordinates.
   * @param {number} radius
   * @param {number} phi - polar angle (0 to PI)
   * @param {number} theta - azimuthal angle (0 to 2PI)
   * @returns {{x, y, z}}
   */
  sphericalToCartesian(radius, phi, theta) {
    return {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.cos(phi),
      z: radius * Math.sin(phi) * Math.sin(theta)
    };
  }
};

export { MathUtils };