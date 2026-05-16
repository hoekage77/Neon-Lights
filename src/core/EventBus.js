/**
 * EventBus - Central pub/sub system for decoupled communication.
 * All modules communicate through events rather than direct references.
 * Supports both local and (future) network-synchronized events.
 */

class EventBus {
  constructor() {
    this.events = new Map();
    this.onceEvents = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} event - Event name
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);

    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event, auto-remove after first trigger.
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    if (!this.onceEvents.has(event)) {
      this.onceEvents.set(event, new Set());
    }
    this.onceEvents.get(event).add(callback);

    return () => {
      const callbacks = this.onceEvents.get(event);
      if (callbacks) callbacks.delete(callback);
    };
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(event);
      }
    }

    const onceCallbacks = this.onceEvents.get(event);
    if (onceCallbacks) {
      onceCallbacks.delete(callback);
      if (onceCallbacks.size === 0) {
        this.onceEvents.delete(event);
      }
    }
  }

  /**
   * Emit an event with optional data.
   * @param {string} event
   * @param {...any} args
   */
  emit(event, ...args) {
    // Regular listeners
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (e) {
          console.error(`EventBus error in '${event}':`, e);
        }
      });
    }

    // Once listeners
    const onceCallbacks = this.onceEvents.get(event);
    if (onceCallbacks) {
      onceCallbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (e) {
          console.error(`EventBus once error in '${event}':`, e);
        }
      });
      this.onceEvents.delete(event);
    }
  }

  /**
   * Remove all listeners for an event.
   * @param {string} event
   */
  removeAll(event) {
    this.events.delete(event);
    this.onceEvents.delete(event);
  }

  /**
   * Remove all listeners globally.
   */
  clear() {
    this.events.clear();
    this.onceEvents.clear();
  }

  /**
   * Get count of listeners for an event.
   * @param {string} event
   * @returns {number}
   */
  listenerCount(event) {
    const regular = this.events.get(event)?.size || 0;
    const once = this.onceEvents.get(event)?.size || 0;
    return regular + once;
  }
}

// Singleton instance
const eventBus = new EventBus();

export { EventBus, eventBus };