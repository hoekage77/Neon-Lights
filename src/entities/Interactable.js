/**
 * Interactable - Base class for objects that can be interacted with.
 */

import * as THREE from 'three';
import { Logger } from '../utils/Logger.js';

class Interactable {
  constructor(sceneManager, id, position, config = {}) {
    this.sceneManager = sceneManager;
    this.id = id;
    this.position = new THREE.Vector3(position.x, position.y, position.z);

    this.label = config.label || 'Interact';
    this.action = config.action || null;
    this.radius = config.radius || 2;
    this.isActive = true;
    this.isHighlighted = false;

    this.mesh = null;
    this.highlightMesh = null;
  }

  /**
   * Create the interactable mesh.
   * Override in subclasses.
   */
  createMesh() {
    // Base implementation: invisible trigger zone
    const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.0,
      visible: false,
      wireframe: true
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    this.mesh.name = `interactable_${this.id}`;
    this.mesh.userData.interactable = this;

    this.sceneManager.add(this.mesh, `interactable_${this.id}`);
  }

  /**
   * Highlight the interactable when player is nearby.
   * @param {boolean} highlighted
   */
  setHighlighted(highlighted) {
    if (this.isHighlighted === highlighted) return;
    this.isHighlighted = highlighted;

    if (highlighted) {
      this._showHighlight();
    } else {
      this._hideHighlight();
    }
  }

  /**
   * Show highlight effect.
   * @private
   */
  _showHighlight() {
    if (!this.highlightMesh) {
      const geometry = new THREE.RingGeometry(this.radius - 0.2, this.radius, 32);
      geometry.rotateX(-Math.PI / 2);

      const material = new THREE.MeshBasicMaterial({
        color: 0x4ecdc4,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      });

      this.highlightMesh = new THREE.Mesh(geometry, material);
      this.highlightMesh.position.copy(this.position);
      this.highlightMesh.position.y = 0.05;
      this.sceneManager.add(this.highlightMesh, `highlight_${this.id}`);
    }

    this.highlightMesh.visible = true;
  }

  /**
   * Hide highlight effect.
   * @private
   */
  _hideHighlight() {
    if (this.highlightMesh) {
      this.highlightMesh.visible = false;
    }
  }

  /**
   * Trigger interaction.
   * @returns {any}
   */
  interact() {
    if (!this.isActive) return null;

    Logger.info('Interactable', `Interacted with: ${this.id}`);

    if (this.action) {
      return this.action();
    }

    return null;
  }

  /**
   * Get position.
   * @returns {THREE.Vector3}
   */
  getPosition() {
    return this.position.clone();
  }

  /**
   * Check if a position is within interaction radius.
   * @param {THREE.Vector3} position
   * @returns {boolean}
   */
  isInRange(position) {
    return position.distanceTo(this.position) <= this.radius;
  }

  /**
   * Clean up resources.
   */
  dispose() {
    if (this.mesh) {
      this.sceneManager.remove(this.mesh, true);
    }

    if (this.highlightMesh) {
      this.sceneManager.remove(this.highlightMesh, true);
    }
  }
}

export { Interactable };