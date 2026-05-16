/**
 * SkyAceVenue - Specific venue for the Sky Ace flight combat game.
 * Extends the base Venue with Sky Ace branding and interior.
 */

import { Venue } from './Venue.js';
import * as THREE from 'three';
import { Logger } from '../utils/Logger.js';

class SkyAceVenue extends Venue {
  constructor(sceneManager, physicsWorld, id, position, config = {}) {
    super(sceneManager, physicsWorld, id, position, {
      ...config,
      venueType: 'arcade',
      displayName: 'Sky Ace HQ',
      description: 'Elite aerial combat training facility',
      gameType: 'sky-ace',
      isOpen: true,
      label: 'Enter Sky Ace HQ',
      radius: 3.5
    });

    this.isInteriorLoaded = false;
    this.interiorObjects = [];
  }

  /**
   * Create the exterior of Sky Ace HQ.
   */
  createExterior() {
    // Main building is already created by CityStreet
    // Add specific Sky Ace branding elements

    // Landing pad (holographic circle on ground)
    const padGeometry = new THREE.CircleGeometry(3, 32);
    const padMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6b9d,
      emissive: 0xff6b9d,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const landingPad = new THREE.Mesh(padGeometry, padMaterial);
    landingPad.rotation.x = -Math.PI / 2;
    landingPad.position.set(this.position.x, 0.02, this.position.z + 5);
    this.sceneManager.add(landingPad, 'sky_ace_landing_pad');
    this.exteriorMesh = landingPad;

    // Animated beacon light
    const beaconGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const beaconMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6b9d,
      emissive: 0xff6b9d,
      emissiveIntensity: 2
    });
    const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
    beacon.position.set(this.position.x, 6, this.position.z - 5);
    this.sceneManager.add(beacon, 'sky_ace_beacon');
  }

  /**
   * Create the interior of Sky Ace HQ.
   */
  createInterior() {
    if (this.isInteriorLoaded) return;

    // Create a hangar-style interior
    const hangarGroup = new THREE.Group();
    hangarGroup.name = 'sky_ace_interior';

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      roughness: 0.8,
      metalness: 0.3
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    hangarGroup.add(floor);

    // Walls (back and sides)
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x34495e,
      roughness: 0.9
    });

    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(20, 8, 0.5),
      wallMaterial
    );
    backWall.position.set(0, 4, -10);
    backWall.receiveShadow = true;
    backWall.castShadow = true;
    hangarGroup.add(backWall);

    // Side walls
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 8, 20),
      wallMaterial
    );
    leftWall.position.set(-10, 4, 0);
    leftWall.receiveShadow = true;
    hangarGroup.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 8, 20),
      wallMaterial
    );
    rightWall.position.set(10, 4, 0);
    rightWall.receiveShadow = true;
    hangarGroup.add(rightWall);

    // Ceiling lights
    for (let x = -7; x <= 7; x += 7) {
      for (let z = -7; z <= 7; z += 7) {
        const light = new THREE.PointLight(0xffffff, 1, 10, 2);
        light.position.set(x, 7, z);
        hangarGroup.add(light);

        // Light fixture mesh
        const fixture = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.1, 0.5),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 })
        );
        fixture.position.set(x, 7.5, z);
        hangarGroup.add(fixture);
      }
    }

    // Sky Ace logo on back wall (glowing rectangle)
    const logoGeometry = new THREE.PlaneGeometry(4, 2);
    const logoMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6b9d,
      emissive: 0xff6b9d,
      emissiveIntensity: 1
    });
    const logo = new THREE.Mesh(logoGeometry, logoMaterial);
    logo.position.set(0, 4, -9.7);
    hangarGroup.add(logo);

    // Mission briefing board
    const boardGeometry = new THREE.BoxGeometry(3, 2, 0.1);
    const boardMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.5
    });
    const board = new THREE.Mesh(boardGeometry, boardMaterial);
    board.position.set(-7, 3, -9.7);
    hangarGroup.add(board);

    // Mission markers on board
    const markerGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const activeMarkerMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 1
    });

    for (let i = 0; i < 3; i++) {
      const marker = new THREE.Mesh(markerGeometry, activeMarkerMaterial);
      marker.position.set(-7 + (i - 1) * 0.8, 3.5, -9.6);
      hangarGroup.add(marker);
    }

    this.sceneManager.add(hangarGroup, 'sky_ace_interior');
    this.interiorObjects.push(hangarGroup);

    this.isInteriorLoaded = true;
    Logger.info('SkyAceVenue', 'Interior created');
  }

  /**
   * Called when player enters.
   */
  onEnter() {
    super.onEnter();
    this.createInterior();
  }

  /**
   * Called when player exits.
   */
  onExit() {
    super.onExit();
  }

  /**
   * Dispose interior.
   */
  disposeInterior() {
    for (const object of this.interiorObjects) {
      this.sceneManager.remove(object, true);
    }
    this.interiorObjects = [];
    this.isInteriorLoaded = false;
  }

  /**
   * Clean up.
   */
  dispose() {
    this.disposeInterior();
    super.dispose();
  }
}

export { SkyAceVenue };