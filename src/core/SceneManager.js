/**
 * SceneManager - Manages the Three.js scene lifecycle.
 * Handles scene creation, cleanup, object addition/removal, and scene switching.
 */

import * as THREE from 'three';
import { Logger } from '../utils/Logger.js';

class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e0f13);

    this.activeObjects = new Map();
    this.lights = new Map();
    this.isDisposed = false;

    // Default fog
    this.fog = null;
  }

  /**
   * Get the active scene.
   * @returns {THREE.Scene}
   */
  getScene() {
    return this.scene;
  }

  /**
   * Add an object to the scene.
   * @param {THREE.Object3D} object
   * @param {string} id - Optional identifier for later retrieval
   */
  add(object, id = null) {
    if (this.isDisposed) {
      Logger.warn('SceneManager', 'Cannot add object to disposed scene');
      return;
    }

    this.scene.add(object);

    if (id) {
      this.activeObjects.set(id, object);
    }
  }

  /**
   * Get an object by its ID.
   * @param {string} id
   * @returns {THREE.Object3D|null}
   */
  get(id) {
    return this.activeObjects.get(id) || null;
  }

  /**
   * Remove an object from the scene.
   * @param {THREE.Object3D} object
   * @param {boolean} dispose - Whether to dispose geometry/materials
   */
  remove(object, dispose = false) {
    this.scene.remove(object);

    // Remove from tracking
    for (const [key, value] of this.activeObjects) {
      if (value === object) {
        this.activeObjects.delete(key);
        break;
      }
    }

    if (dispose) {
      this._disposeObject(object);
    }
  }

  /**
   * Remove object by ID.
   * @param {string} id
   * @param {boolean} dispose
   */
  removeById(id, dispose = false) {
    const object = this.activeObjects.get(id);
    if (object) {
      this.remove(object, dispose);
      this.activeObjects.delete(id);
    }
  }

  /**
   * Set scene background color.
   * @param {number|THREE.Color} color
   */
  setBackground(color) {
    this.scene.background = color instanceof THREE.Color ? color : new THREE.Color(color);
  }

  /**
   * Set scene fog.
   * @param {number|THREE.Color} color
   * @param {number} near
   * @param {number} far
   */
  setFog(color, near, far) {
    if (this.fog) {
      this.scene.fog = null;
    }
    this.fog = new THREE.Fog(
      color instanceof THREE.Color ? color : new THREE.Color(color),
      near,
      far
    );
    this.scene.fog = this.fog;
  }

  /**
   * Set exponential fog.
   * @param {number|THREE.Color} color
   * @param {number} density
   */
  setExpFog(color, density) {
    if (this.fog) {
      this.scene.fog = null;
    }
    this.fog = new THREE.FogExp2(
      color instanceof THREE.Color ? color : new THREE.Color(color),
      density
    );
    this.scene.fog = this.fog;
  }

  /**
   * Add a light to the scene.
   * @param {THREE.Light} light
   * @param {string} id
   */
  addLight(light, id) {
    this.scene.add(light);
    this.lights.set(id, light);
  }

  /**
   * Get a light by ID.
   * @param {string} id
   * @returns {THREE.Light|null}
   */
  getLight(id) {
    return this.lights.get(id) || null;
  }

  /**
   * Remove a light by ID.
   * @param {string} id
   */
  removeLight(id) {
    const light = this.lights.get(id);
    if (light) {
      this.scene.remove(light);
      light.dispose();
      this.lights.delete(id);
    }
  }

  /**
   * Add a group of objects.
   * @param {Array<THREE.Object3D>} objects
   * @param {string} groupId
   */
  addGroup(objects, groupId) {
    const group = new THREE.Group();
    group.name = groupId;

    for (const object of objects) {
      group.add(object);
    }

    this.scene.add(group);
    this.activeObjects.set(groupId, group);
  }

  /**
   * Remove a group of objects.
   * @param {string} groupId
   * @param {boolean} dispose
   */
  removeGroup(groupId, dispose = false) {
    const group = this.activeObjects.get(groupId);
    if (group) {
      if (dispose) {
        group.traverse(child => this._disposeObject(child));
      }
      this.scene.remove(group);
      this.activeObjects.delete(groupId);
    }
  }

  /**
   * Raycast from camera through mouse position.
   * @param {THREE.Camera} camera
   * @param {{x: number, y: number}} mouseNDC - Normalized device coordinates (-1 to 1)
   * @param {Array<THREE.Object3D>} targets - Objects to intersect
   * @returns {Array<THREE.Intersection>}
   */
  raycast(camera, mouseNDC, targets) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouseNDC, camera);
    return raycaster.intersectObjects(targets, true);
  }

  /**
   * Get all objects of a specific type.
   * @param {string} type - Constructor name (e.g., 'Mesh', 'Light')
   * @returns {Array<THREE.Object3D>}
   */
  getObjectsByType(type) {
    const objects = [];
    this.scene.traverse(child => {
      if (child.type === type || child.constructor.name === type) {
        objects.push(child);
      }
    });
    return objects;
  }

  /**
   * Create and add a helper grid.
   * @param {number} size
   * @param {number} divisions
   * @param {number|THREE.Color} colorCenter
   * @param {number|THREE.Color} colorGrid
   * @returns {THREE.GridHelper}
   */
  addGrid(size = 100, divisions = 50, colorCenter = 0x888888, colorGrid = 0x444444) {
    const grid = new THREE.GridHelper(size, divisions, colorCenter, colorGrid);
    grid.material.opacity = 0.3;
    grid.material.transparent = true;
    this.add(grid, 'world_grid');
    return grid;
  }

  /**
   * Internal: dispose a single object.
   * @private
   * @param {THREE.Object3D} object
   */
  _disposeObject(object) {
    if (object.geometry) {
      object.geometry.dispose();
    }

    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(m => this._disposeMaterial(m));
      } else {
        this._disposeMaterial(object.material);
      }
    }

    if (object instanceof THREE.Light) {
      object.dispose();
    }
  }

  /**
   * Internal: dispose a material and its textures.
   * @private
   * @param {THREE.Material} material
   */
  _disposeMaterial(material) {
    for (const key of Object.keys(material)) {
      const value = material[key];
      if (value instanceof THREE.Texture) {
        value.dispose();
      }
    }
    material.dispose();
  }

  /**
   * Clear all objects from scene (except lights).
   * @param {boolean} dispose - Whether to dispose resources
   */
  clear(dispose = true) {
    const toRemove = [];
    this.scene.traverse(child => {
      if (child.parent === this.scene && child !== this.scene) {
        toRemove.push(child);
      }
    });

    for (const object of toRemove) {
      this.remove(object, dispose);
    }

    this.activeObjects.clear();
  }

  /**
   * Completely dispose the scene and all resources.
   * Call when switching scenes or shutting down.
   */
  dispose() {
    if (this.isDisposed) return;

    this.scene.traverse(child => {
      this._disposeObject(child);
    });

    // Dispose lights
    for (const [, light] of this.lights) {
      light.dispose();
    }
    this.lights.clear();

    this.activeObjects.clear();
    this.isDisposed = true;

    Logger.info('SceneManager', 'Scene disposed');
  }
}

export { SceneManager };