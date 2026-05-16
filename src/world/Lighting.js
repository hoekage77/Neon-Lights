/**
 * Lighting - Manages dynamic lighting effects including day/night cycle,
 * neon lights, street lamps, and building illumination.
 */

import * as THREE from 'three';
import { COLORS } from '../constants/Colors.js';
import { Logger } from '../utils/Logger.js';

class Lighting {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.neonLights = [];
    this.streetLamps = [];
    this.buildingLights = [];
    this.isNight = false;
  }

  /**
   * Initialize the lighting system.
   */
  init() {
    Logger.info('Lighting', 'Initialized');
  }

  /**
   * Add a neon light effect.
   * @param {{x,y,z}} position
   * @param {number|THREE.Color} color
   * @param {number} intensity
   * @param {number} distance
   * @param {string} id
   */
  addNeonLight(position, color, intensity = 2, distance = 10, id = null) {
    const light = new THREE.PointLight(
      color instanceof THREE.Color ? color : new THREE.Color(color),
      intensity,
      distance,
      2
    );
    light.position.set(position.x, position.y, position.z);
    light.castShadow = false; // Neon lights don't cast shadows for performance

    const lightId = id || `neon_${this.neonLights.length}`;
    this.sceneManager.addLight(light, lightId);
    this.neonLights.push({ id: lightId, light, originalIntensity: intensity });

    return lightId;
  }

  /**
   * Add a street lamp.
   * @param {{x,y,z}} position
   * @param {number} intensity
   * @param {string} id
   */
  addStreetLamp(position, intensity = 3, id = null) {
    const light = new THREE.PointLight(COLORS.STREET_LAMP, intensity, 15, 2);
    light.position.set(position.x, position.y, position.z);
    light.castShadow = true;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;

    const lightId = id || `streetlamp_${this.streetLamps.length}`;
    this.sceneManager.addLight(light, lightId);
    this.streetLamps.push({ id: lightId, light, originalIntensity: intensity });

    return lightId;
  }

  /**
   * Add building window lights.
   * @param {Array<{x,y,z}>} positions
   * @param {number} color
   */
  addBuildingLights(positions, color = 0xffee88) {
    for (const pos of positions) {
      const light = new THREE.PointLight(color, 0.5, 5, 2);
      light.position.set(pos.x, pos.y, pos.z);
      this.sceneManager.addLight(light, `building_light_${this.buildingLights.length}`);
      this.buildingLights.push(light);
    }
  }

  /**
   * Set global time of day (0 = day, 1 = night).
   * @param {number} timeOfDay
   */
  setTimeOfDay(timeOfDay) {
    this.isNight = timeOfDay > 0.5;

    // Adjust neon lights
    for (const neon of this.neonLights) {
      if (this.isNight) {
        neon.light.intensity = neon.originalIntensity * (1 + timeOfDay);
      } else {
        neon.light.intensity = neon.originalIntensity * 0.3;
      }
    }

    // Adjust street lamps
    for (const lamp of this.streetLamps) {
      if (this.isNight) {
        lamp.light.intensity = lamp.originalIntensity;
      } else {
        lamp.light.intensity = lamp.originalIntensity * 0.1;
      }
    }

    // Adjust building lights
    for (const light of this.buildingLights) {
      light.intensity = this.isNight ? 0.8 : 0.2;
    }
  }

  /**
   * Animate neon lights with flickering effect.
   * @param {number} deltaTime
   * @param {number} totalTime
   */
  update(deltaTime, totalTime) {
    // Subtle neon flicker
    for (let i = 0; i < this.neonLights.length; i++) {
      const neon = this.neonLights[i];
      const flicker = Math.sin(totalTime * 10 + i * 100) * 0.1;
      neon.light.intensity = neon.originalIntensity + flicker;
    }
  }

  /**
   * Pulse a specific neon light.
   * @param {string} id
   * @param {number} duration
   */
  pulseNeon(id, duration = 0.5) {
    const neon = this.neonLights.find(n => n.id === id);
    if (!neon) return;

    const originalIntensity = neon.originalIntensity;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 0.5) {
        // Brighten
        neon.light.intensity = originalIntensity * (1 + progress * 2);
      } else {
        // Return to normal
        neon.light.intensity = originalIntensity * (3 - progress * 2);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        neon.light.intensity = originalIntensity;
      }
    };

    animate();
  }

  /**
   * Clean up all lighting resources.
   */
  dispose() {
    for (const neon of this.neonLights) {
      this.sceneManager.removeLight(neon.id);
    }
    this.neonLights = [];

    for (const lamp of this.streetLamps) {
      this.sceneManager.removeLight(lamp.id);
    }
    this.streetLamps = [];

    for (let i = 0; i < this.buildingLights.length; i++) {
      this.sceneManager.removeLight(`building_light_${i}`);
    }
    this.buildingLights = [];

    Logger.info('Lighting', 'Disposed');
  }
}

export { Lighting };