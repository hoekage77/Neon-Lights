/**
 * GameBase - Abstract base class for all game modules.
 * All games must extend this class and implement its interface.
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { Logger } from '../utils/Logger.js';

class GameBase {
  constructor(gameController, venueData) {
    this.gameController = gameController;
    this.venueData = venueData;

    // Scene references
    this.scene = gameController.sceneManager.getScene();
    this.camera = gameController.camera;
    this.renderer = gameController.renderer;
    this.inputManager = gameController.inputManager;
    this.physicsWorld = gameController.physicsWorld;

    // Game state
    this.isRunning = false;
    this.isPaused = false;
    this.score = 0;
    this.gameTime = 0;
    this.lives = 3;
    this.level = 1;

    // Game objects
    this.gameObjects = new Map();
    this.particles = [];
    this.uiElements = [];

    // Audio
    this.sounds = new Map();

    // Cleanup tracking
    this.isDisposed = false;

    Logger.info('GameBase', 'Created');
  }

  /**
   * Initialize the game. Called once when entering the game.
   * Must be implemented by subclasses.
   */
  async init() {
    this.isRunning = true;
    this.score = 0;
    this.gameTime = 0;

    // Set up game-specific input
    this.inputManager.enable();

    Logger.info('GameBase', 'Initialized');
  }

  /**
   * Update game logic. Called every frame.
   * Must be implemented by subclasses.
   * @param {number} deltaTime
   */
  update(deltaTime) {
    if (!this.isRunning || this.isPaused) return;

    this.gameTime += deltaTime;

    // Update all game objects
    for (const [, object] of this.gameObjects) {
      if (object.update) {
        object.update(deltaTime);
      }
    }

    // Update particles
    this._updateParticles(deltaTime);
  }

  /**
   * Render any custom game elements.
   * Override if the game needs custom rendering beyond the standard scene.
   */
  render() {
    // Default: scene is rendered by the main loop
  }

  /**
   * Pause the game.
   */
  pause() {
    if (!this.isRunning) return;
    this.isPaused = true;
    this.isRunning = false;
    Logger.info('GameBase', 'Paused');
  }

  /**
   * Resume the game.
   */
  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.isRunning = true;
    Logger.info('GameBase', 'Resumed');
  }

  /**
   * End the game and show results.
   * @param {Object} result - { score, completed, reason, stats }
   */
  endGame(result) {
    this.isRunning = false;
    this.isPaused = false;

    eventBus.emit('game:gameover', result);
    Logger.info('GameBase', 'Game over', result);
  }

  /**
   * Add a game object to tracking.
   * @param {string} id
   * @param {Object} object
   */
  addGameObject(id, object) {
    this.gameObjects.set(id, object);
  }

  /**
   * Get a game object by ID.
   * @param {string} id
   * @returns {Object|null}
   */
  getGameObject(id) {
    return this.gameObjects.get(id) || null;
  }

  /**
   * Remove a game object.
   * @param {string} id
   */
  removeGameObject(id) {
    const object = this.gameObjects.get(id);
    if (object && object.dispose) {
      object.dispose();
    }
    this.gameObjects.delete(id);
  }

  /**
   * Create a particle effect.
   * @param {{x,y,z}} position
   * @param {number} color
   * @param {number} count
   * @param {number} lifetime
   */
  createParticles(position, color, count = 10, lifetime = 1) {
    // Simple placeholder implementation
    // Subclasses can override with more sophisticated effects
    for (let i = 0; i < count; i++) {
      this.particles.push({
        position: { ...position },
        velocity: {
          x: (Math.random() - 0.5) * 5,
          y: Math.random() * 5,
          z: (Math.random() - 0.5) * 5
        },
        color,
        lifetime,
        maxLifetime: lifetime,
        size: Math.random() * 0.1 + 0.05
      });
    }
  }

  /**
   * Update particles.
   * @private
   * @param {number} deltaTime
   */
  _updateParticles(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.lifetime -= deltaTime;

      if (particle.lifetime <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Update position
      particle.position.x += particle.velocity.x * deltaTime;
      particle.position.y += particle.velocity.y * deltaTime;
      particle.position.z += particle.velocity.z * deltaTime;

      // Gravity
      particle.velocity.y -= 9.8 * deltaTime;
    }
  }

  /**
   * Spawn an object in the game world.
   * @param {string} id
   * @param {THREE.Object3D} object
   * @param {{x,y,z}} position
   */
  spawn(id, object, position) {
    if (position) {
      object.position.set(position.x, position.y, position.z);
    }

    this.scene.add(object);
    this.addGameObject(id, object);
  }

  /**
   * Despawn an object.
   * @param {string} id
   */
  despawn(id) {
    const object = this.gameObjects.get(id);
    if (object) {
      this.scene.remove(object);
      if (object.geometry) object.geometry.dispose();
      if (object.material) object.material.dispose();
      this.gameObjects.delete(id);
    }
  }

  /**
   * Add score.
   * @param {number} points
   */
  addScore(points) {
    this.score += points;
    eventBus.emit('game:score', this.score);
  }

  /**
   * Get current score.
   * @returns {number}
   */
  getScore() {
    return this.score;
  }

  /**
   * Play a sound effect.
   * @param {string} soundId
   */
  playSound(soundId) {
    // Placeholder - implement with Howler.js
    Logger.info('GameBase', `Playing sound: ${soundId}`);
  }

  /**
   * Load a sound.
   * @param {string} id
   * @param {string} path
   */
  loadSound(id, path) {
    // Placeholder - implement with Howler.js
    this.sounds.set(id, { path, loaded: false });
  }

  /**
   * Clean up all game resources.
   * CRITICAL: Must dispose all Three.js objects to prevent memory leaks.
   */
  dispose() {
    if (this.isDisposed) return;

    this.isRunning = false;
    this.isPaused = false;

    // Dispose all game objects
    for (const [, object] of this.gameObjects) {
      if (object.dispose) {
        object.dispose();
      } else if (object instanceof THREE.Object3D) {
        // Remove from scene
        this.scene.remove(object);

        // Dispose geometry and materials
        object.traverse(child => {
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
    this.gameObjects.clear();

    // Clear particles
    this.particles = [];

    // Clear UI
    this.uiElements = [];

    // Clear sounds
    this.sounds.clear();

    this.isDisposed = true;
    Logger.info('GameBase', 'Disposed all resources');
  }
}

export { GameBase };