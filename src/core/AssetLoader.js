/**
 * AssetLoader - Centralized asset loading and caching system.
 * Uses Three.js loaders with caching to prevent duplicate loads.
 * Supports GLTF/GLB models, textures, audio, and JSON data.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Logger } from '../utils/Logger.js';

class AssetLoader {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.loadingManager = new THREE.LoadingManager();

    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.gltfLoader = new GLTFLoader(this.loadingManager);

    this.totalAssets = 0;
    this.loadedAssets = 0;
    this.onProgress = null;
    this.onComplete = null;

    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      this.loadedAssets = itemsLoaded;
      this.totalAssets = itemsTotal;
      if (this.onProgress) {
        this.onProgress(itemsLoaded / itemsTotal);
      }
    };

    this.loadingManager.onLoad = () => {
      if (this.onComplete) {
        this.onComplete();
      }
    };

    this.loadingManager.onError = (url) => {
      Logger.error('AssetLoader', `Failed to load: ${url}`);
    };
  }

  /**
   * Set progress callback.
   * @param {Function} callback - Receives progress ratio (0-1)
   */
  setProgressCallback(callback) {
    this.onProgress = callback;
  }

  /**
   * Set completion callback.
   * @param {Function} callback
   */
  setCompleteCallback(callback) {
    this.onComplete = callback;
  }

  /**
   * Load a texture. Returns cached if already loaded.
   * @param {string} path
   * @returns {Promise<THREE.Texture>}
   */
  async loadTexture(path) {
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }

    if (this.loadingPromises.has(path)) {
      return this.loadingPromises.get(path);
    }

    const promise = new Promise((resolve, reject) => {
      this.textureLoader.load(
        path,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          this.cache.set(path, texture);
          this.loadingPromises.delete(path);
          resolve(texture);
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(path);
          Logger.error('AssetLoader', `Texture load failed: ${path}`, error);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(path, promise);
    return promise;
  }

  /**
   * Load a GLTF/GLB model.
   * @param {string} path
   * @returns {Promise<THREE.Group>}
   */
  async loadModel(path) {
    if (this.cache.has(path)) {
      return this.cache.get(path).scene.clone();
    }

    if (this.loadingPromises.has(path)) {
      const gltf = await this.loadingPromises.get(path);
      return gltf.scene.clone();
    }

    const promise = new Promise((resolve, reject) => {
      this.gltfLoader.load(
        path,
        (gltf) => {
          this.cache.set(path, gltf);
          this.loadingPromises.delete(path);
          resolve(gltf);
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(path);
          Logger.error('AssetLoader', `Model load failed: ${path}`, error);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(path, promise);
    const gltf = await promise;
    return gltf.scene.clone();
  }

  /**
   * Load a GLTF/GLB model with its animations.
   * @param {string} path
   * @returns {Promise<{scene: THREE.Group, animations: Array}>}
   */
  async loadModelWithAnimations(path) {
    if (this.cache.has(path)) {
      const gltf = this.cache.get(path);
      return { scene: gltf.scene.clone(), animations: gltf.animations };
    }

    if (this.loadingPromises.has(path)) {
      const gltf = await this.loadingPromises.get(path);
      return { scene: gltf.scene.clone(), animations: gltf.animations };
    }

    const promise = new Promise((resolve, reject) => {
      this.gltfLoader.load(
        path,
        (gltf) => {
          this.cache.set(path, gltf);
          this.loadingPromises.delete(path);
          resolve(gltf);
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(path);
          Logger.error('AssetLoader', `Model load failed: ${path}`, error);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(path, promise);
    const gltf = await promise;
    return { scene: gltf.scene.clone(), animations: gltf.animations };
  }

  /**
   * Get animations from a cached GLTF/GLB model.
   * @param {string} path
   * @returns {Array}
   */
  getModelAnimations(path) {
    const gltf = this.cache.get(path);
    return gltf ? gltf.animations : [];
  }

  /**
   * Load multiple assets in parallel.
   * @param {Array<{type: string, path: string}>} assets
   * @returns {Promise<Array>}
   */
  async loadMultiple(assets) {
    const promises = assets.map(asset => {
      switch (asset.type) {
        case 'texture':
          return this.loadTexture(asset.path);
        case 'model':
          return this.loadModel(asset.path);
        default:
          return Promise.reject(new Error(`Unknown asset type: ${asset.type}`));
      }
    });

    return Promise.all(promises);
  }

  /**
   * Preload a batch of critical assets.
   * @param {Array<{type: string, path: string}>} assets
   * @returns {Promise<void>}
   */
  async preload(assets) {
    Logger.info('AssetLoader', `Preloading ${assets.length} assets...`);
    const startTime = performance.now();

    await this.loadMultiple(assets);

    const elapsed = performance.now() - startTime;
    Logger.info('AssetLoader', `Preload complete in ${elapsed.toFixed(0)}ms`);
  }

  /**
   * Get cached asset.
   * @param {string} path
   * @returns {any|null}
   */
  get(path) {
    return this.cache.get(path) || null;
  }

  /**
   * Check if asset is cached.
   * @param {string} path
   * @returns {boolean}
   */
  has(path) {
    return this.cache.has(path);
  }

  /**
   * Create a texture from a color value.
   * @param {number|THREE.Color} color
   * @returns {THREE.Texture}
   */
  createColorTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color instanceof THREE.Color ? `#${color.getHexString()}` : color;
    ctx.fillRect(0, 0, 4, 4);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Create a gradient texture.
   * @param {number|THREE.Color} color1
   * @param {number|THREE.Color} color2
   * @param {string} direction - 'horizontal' or 'vertical'
   * @returns {THREE.Texture}
   */
  createGradientTexture(color1, color2, direction = 'vertical') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const gradient = direction === 'vertical'
      ? ctx.createLinearGradient(0, 0, 0, 256)
      : ctx.createLinearGradient(0, 0, 256, 0);

    const c1 = color1 instanceof THREE.Color ? `#${color1.getHexString()}` : color1;
    const c2 = color2 instanceof THREE.Color ? `#${color2.getHexString()}` : color2;

    gradient.addColorStop(0, c1);
    gradient.addColorStop(1, c2);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Create a noise texture for roughness/bump maps.
   * @param {number} size
   * @returns {THREE.Texture}
   */
  createNoiseTexture(size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const value = Math.random() * 255;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Dispose all cached assets.
   * Call when unloading a scene/level.
   */
  clearCache() {
    for (const [, asset] of this.cache) {
      if (asset instanceof THREE.Texture) {
        asset.dispose();
      } else if (asset.scene) {
        // GLTF asset
        asset.scene.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
    }

    this.cache.clear();
    this.loadingPromises.clear();
    Logger.info('AssetLoader', 'Cache cleared');
  }

  /**
   * Get current loading progress.
   * @returns {{loaded: number, total: number, ratio: number}}
   */
  getProgress() {
    return {
      loaded: this.loadedAssets,
      total: this.totalAssets,
      ratio: this.totalAssets > 0 ? this.loadedAssets / this.totalAssets : 0
    };
  }
}

export { AssetLoader };