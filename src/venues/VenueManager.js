/**
 * VenueManager - Manages all venues in the world.
 * Handles venue discovery, entry/exit transitions, and game launching.
 */

import { Venue } from './Venue.js';
import { eventBus } from '../core/EventBus.js';
import { Logger } from '../utils/Logger.js';

class VenueManager {
  constructor(sceneManager, physicsWorld, assetLoader, player) {
    this.sceneManager = sceneManager;
    this.physicsWorld = physicsWorld;
    this.assetLoader = assetLoader;
    this.player = player;

    this.venues = new Map();
    this.currentVenue = null;
    this.nearbyVenue = null;

    this.isInitialized = false;
  }

  /**
   * Initialize venues.
   */
  init() {
    if (this.isInitialized) return;

    this._createVenues();
    this.isInitialized = true;

    Logger.info('VenueManager', `Initialized with ${this.venues.size} venues`);
  }

  /**
   * Create default venues for Phase 1.
   * @private
   */
  _createVenues() {
    // Sky Ace HQ (North side)
    const skyAce = new Venue(
      this.sceneManager,
      this.physicsWorld,
      'sky-ace',
      { x: -8, y: 0, z: -60 },
      {
        venueType: 'arcade',
        displayName: 'Sky Ace HQ',
        description: 'Flight combat training center',
        gameType: 'sky-ace',
        isOpen: true,
        label: 'Enter Sky Ace HQ'
      }
    );
    skyAce.createMesh();
    this.venues.set('sky-ace', skyAce);

    // Neon Cafe (South side)
    const neonCafe = new Venue(
      this.sceneManager,
      this.physicsWorld,
      'neon-cafe',
      { x: 8, y: 0, z: -60 },
      {
        venueType: 'social',
        displayName: 'Neon Cafe',
        description: 'Social hub for pilots and citizens',
        gameType: null,
        isOpen: true,
        label: 'Enter Neon Cafe'
      }
    );
    neonCafe.createMesh();
    this.venues.set('neon-cafe', neonCafe);

    // Vapor Shop (South side)
    const vaporShop = new Venue(
      this.sceneManager,
      this.physicsWorld,
      'vapor-shop',
      { x: 8, y: 0, z: -20 },
      {
        venueType: 'shop',
        displayName: 'Vapor Shop',
        description: 'Customization and collectibles',
        gameType: null,
        isOpen: false,
        label: 'Enter Vapor Shop'
      }
    );
    vaporShop.createMesh();
    this.venues.set('vapor-shop', vaporShop);

    // Park Plaza (North end)
    const parkPlaza = new Venue(
      this.sceneManager,
      this.physicsWorld,
      'park-plaza',
      { x: -8, y: 0, z: 60 },
      {
        venueType: 'park',
        displayName: 'Park Plaza',
        description: 'Relaxation area with ocean view',
        gameType: null,
        isOpen: true,
        label: 'Enter Park Plaza'
      }
    );
    parkPlaza.createMesh();
    this.venues.set('park-plaza', parkPlaza);
  }

  /**
   * Update venue detection.
   * @param {number} deltaTime
   * @param {THREE.Vector3} playerPosition
   */
  update(deltaTime, playerPosition) {
    // Find nearby venue
    let closestVenue = null;
    let closestDistance = Infinity;

    for (const [, venue] of this.venues) {
      if (!venue.isOpen) continue;

      const distance = venue.getPosition().distanceTo(playerPosition);

      if (distance <= venue.radius && distance < closestDistance) {
        closestVenue = venue;
        closestDistance = distance;
      }

      // Update highlight
      venue.setHighlighted(distance <= venue.radius);
    }

    // Emit events for UI
    if (closestVenue && closestVenue !== this.nearbyVenue) {
      this.nearbyVenue = closestVenue;
      eventBus.emit('player:near-venue', closestVenue.id);
    } else if (!closestVenue && this.nearbyVenue) {
      this.nearbyVenue = null;
      eventBus.emit('player:far-from-venue');
    }
  }

  /**
   * Get a venue by ID.
   * @param {string} venueId
   * @returns {Venue|null}
   */
  getVenue(venueId) {
    return this.venues.get(venueId) || null;
  }

  /**
   * Get the nearby venue within interaction range.
   * @param {THREE.Vector3} playerPosition
   * @param {number} maxDistance
   * @returns {Venue|null}
   */
  getNearbyVenue(playerPosition, maxDistance = 3) {
    for (const [, venue] of this.venues) {
      if (!venue.isOpen) continue;

      const distance = venue.getPosition().distanceTo(playerPosition);
      if (distance <= maxDistance) {
        return venue;
      }
    }
    return null;
  }

  /**
   * Enter a venue.
   * @param {string} venueId
   * @returns {Venue|null}
   */
  enterVenue(venueId) {
    const venue = this.venues.get(venueId);
    if (!venue) {
      Logger.warn('VenueManager', `Venue not found: ${venueId}`);
      return null;
    }

    this.currentVenue = venue;
    venue.onEnter();

    // Clear nearby venue
    this.nearbyVenue = null;
    eventBus.emit('player:far-from-venue');

    Logger.info('VenueManager', `Entered venue: ${venue.displayName}`);
    return venue;
  }

  /**
   * Exit the current venue.
   */
  exitVenue() {
    if (this.currentVenue) {
      this.currentVenue.onExit();
      this.currentVenue.disposeInterior();
      this.currentVenue = null;
    }

    Logger.info('VenueManager', 'Exited venue');
  }

  /**
   * Get the current venue.
   * @returns {Venue|null}
   */
  getCurrentVenue() {
    return this.currentVenue;
  }

  /**
   * Get all venues.
   * @returns {Array<Venue>}
   */
  getAllVenues() {
    return Array.from(this.venues.values());
  }

  /**
   * Clean up all venues.
   */
  dispose() {
    for (const [, venue] of this.venues) {
      venue.dispose();
    }
    this.venues.clear();

    Logger.info('VenueManager', 'Disposed');
  }
}

export { VenueManager };