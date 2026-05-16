/**
 * Venue - Base class for game venues/buildings.
 * Represents the exterior and interior of a playable location.
 */

import { Interactable } from '../entities/Interactable.js';
import { Logger } from '../utils/Logger.js';

class Venue extends Interactable {
  constructor(sceneManager, physicsWorld, id, position, config = {}) {
    super(sceneManager, id, position, config);

    this.physicsWorld = physicsWorld;
    this.venueType = config.venueType || 'generic';
    this.displayName = config.displayName || 'Unknown Venue';
    this.description = config.description || '';
    this.isOpen = config.isOpen !== false;
    this.gameType = config.gameType || null;

    this.exteriorMesh = null;
    this.interiorScene = null;
    this.isPlayerInside = false;

    this.entrancePoint = {
      x: position.x,
      y: 0.5,
      z: position.z + 5
    };

    this.exitPoint = {
      x: position.x,
      y: 0.5,
      z: position.z + 8
    };
  }

  /**
   * Create the venue exterior (visible from the street).
   */
  createExterior() {
    // Override in subclasses
    Logger.info('Venue', `Creating exterior for ${this.id}`);
  }

  /**
   * Create the venue interior (loaded when player enters).
   */
  createInterior() {
    // Override in subclasses
    Logger.info('Venue', `Creating interior for ${this.id}`);
  }

  /**
   * Get the entrance position for this venue.
   * @returns {{x,y,z}}
   */
  getEntrancePosition() {
    return { ...this.entrancePoint };
  }

  /**
   * Get the exit position for this venue.
   * @returns {{x,y,z}}
   */
  getExitPosition() {
    return { ...this.exitPoint };
  }

  /**
   * Called when player enters the venue.
   */
  onEnter() {
    this.isPlayerInside = true;
    Logger.info('Venue', `Player entered ${this.id}`);
  }

  /**
   * Called when player exits the venue.
   */
  onExit() {
    this.isPlayerInside = false;
    Logger.info('Venue', `Player exited ${this.id}`);
  }

  /**
   * Start the game inside this venue.
   * @returns {Promise<void>}
   */
  async startGame() {
    if (!this.gameType) {
      Logger.warn('Venue', `No game configured for ${this.id}`);
      return;
    }

    Logger.info('Venue', `Starting game: ${this.gameType}`);
  }

  /**
   * Dispose the interior scene.
   */
  disposeInterior() {
    if (this.interiorScene) {
      // Clean up interior objects
      this.interiorScene = null;
    }
  }

  /**
   * Clean up all resources.
   */
  dispose() {
    this.disposeInterior();
    super.dispose();
  }
}

export { Venue };