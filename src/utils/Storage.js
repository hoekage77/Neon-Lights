/**
 * Persistent storage wrapper using localStorage and IndexedDB.
 * All save data operations go through this module.
 */

import { CONFIG } from '../constants/Config.js';

class Storage {
  constructor() {
    this.storageKey = CONFIG.SAVE.STORAGE_KEY;
    this.dbName = 'NeonCityArcade';
    this.dbVersion = 1;
    this.db = null;
    this.initPromise = this._initIndexedDB();
  }

  /**
   * Initialize IndexedDB for large data storage.
   * @private
   */
  async _initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store for save slots
        if (!db.objectStoreNames.contains('saves')) {
          db.createObjectStore('saves', { keyPath: 'slot' });
        }

        // Store for screenshots/cache
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Save data to localStorage (for small data).
   * @param {string} key
   * @param {any} value
   */
  setLocal(key, value) {
    try {
      localStorage.setItem(`${this.storageKey}_${key}`, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('Storage.setLocal failed:', e);
      return false;
    }
  }

  /**
   * Get data from localStorage.
   * @param {string} key
   * @param {any} defaultValue
   * @returns {any}
   */
  getLocal(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(`${this.storageKey}_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn('Storage.getLocal failed:', e);
      return defaultValue;
    }
  }

  /**
   * Remove data from localStorage.
   * @param {string} key
   */
  removeLocal(key) {
    localStorage.removeItem(`${this.storageKey}_${key}`);
  }

  /**
   * Save game state to IndexedDB slot.
   * @param {number} slot - Save slot number (1 to MAX_SLOTS)
   * @param {Object} data - Game state data
   */
  async saveGame(slot, data) {
    await this.initPromise;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['saves'], 'readwrite');
      const store = transaction.objectStore('saves');

      const saveData = {
        slot,
        data,
        timestamp: Date.now(),
        version: '1.0.0'
      };

      const request = store.put(saveData);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load game state from IndexedDB slot.
   * @param {number} slot
   * @returns {Object|null}
   */
  async loadGame(slot) {
    await this.initPromise;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['saves'], 'readonly');
      const store = transaction.objectStore('saves');
      const request = store.get(slot);

      request.onsuccess = () => {
        resolve(request.result ? request.result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all save slots metadata.
   * @returns {Array}
   */
  async getAllSaves() {
    await this.initPromise;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['saves'], 'readonly');
      const store = transaction.objectStore('saves');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result.map(r => ({
          slot: r.slot,
          timestamp: r.timestamp,
          version: r.version
        })));
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a save slot.
   * @param {number} slot
   */
  async deleteSave(slot) {
    await this.initPromise;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['saves'], 'readwrite');
      const store = transaction.objectStore('saves');
      const request = store.delete(slot);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Quick save to localStorage (for auto-save).
   * @param {Object} data
   */
  quickSave(data) {
    this.setLocal('quicksave', {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Quick load from localStorage.
   * @returns {Object|null}
   */
  quickLoad() {
    const saved = this.getLocal('quicksave', null);
    return saved ? saved.data : null;
  }

  /**
   * Export all save data as JSON string.
   * @returns {string}
   */
  async exportSaves() {
    const saves = await this.getAllSaves();
    const data = {};

    for (const save of saves) {
      data[save.slot] = await this.loadGame(save.slot);
    }

    return JSON.stringify({
      version: '1.0.0',
      exported: Date.now(),
      saves: data
    });
  }

  /**
   * Import save data from JSON string.
   * @param {string} jsonString
   */
  async importSaves(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      if (!data.saves) {
        throw new Error('Invalid save data format');
      }

      for (const [slot, saveData] of Object.entries(data.saves)) {
        await this.saveGame(parseInt(slot), saveData);
      }

      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  /**
   * Clear all data.
   */
  async clearAll() {
    await this.initPromise;

    // Clear localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storageKey)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear IndexedDB
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['saves'], 'readwrite');
      const store = transaction.objectStore('saves');
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
}

export { Storage };