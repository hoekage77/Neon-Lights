/**
 * Environment - Manages sky, atmospheric effects, and environmental visuals.
 * Includes sky gradient, sun/moon, particles, and weather effects.
 */

import * as THREE from 'three';
import { COLORS } from '../constants/Colors.js';
import { CONFIG } from '../constants/Config.js';
import { Logger } from '../utils/Logger.js';

class Environment {
  constructor(sceneManager, quality = 'MEDIUM') {
    this.sceneManager = sceneManager;
    this.scene = sceneManager.getScene();
    this.qualityPreset = CONFIG.QUALITY[quality] || CONFIG.QUALITY.MEDIUM;

    this.skyMesh = null;
    this.sunLight = null;
    this.ambientLight = null;
    this.stars = null;
    this.dustParticles = null;

    this.isInitialized = false;
  }

  /**
   * Initialize the environment.
   */
  init() {
    if (this.isInitialized) return;

    this._createSky();
    this._createLighting();

    // Only create particles on medium/high
    if (this.qualityPreset.particles) {
      this._createDustParticles();
    }

    // Only set fog on medium/high
    if (this.qualityPreset.fog) {
      this.sceneManager.setExpFog(COLORS.BG, CONFIG.POST_PROCESSING.FOG_DENSITY);
    }

    this.isInitialized = true;
    Logger.info('Environment', `Initialized (${this.qualityPreset === CONFIG.QUALITY.LOW ? 'LOW' : (this.qualityPreset === CONFIG.QUALITY.HIGH ? 'HIGH' : 'MEDIUM')} quality)`);
  }

  /**
   * Create the sky dome with gradient shader.
   * @private
   */
  _createSky() {
    const skyGeometry = new THREE.SphereGeometry(400, 32, 32);

    // Custom gradient shader for sunset sky
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(COLORS.SKY_TOP) },
        uBottomColor: { value: new THREE.Color(COLORS.SKY_HORIZON) },
        uOffset: { value: 0.3 },
        uExponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform float uOffset;
        uniform float uExponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + uOffset).y;
          gl_FragColor = vec4(mix(uBottomColor, uTopColor, max(pow(max(h, 0.0), uExponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });

    this.skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    this.sceneManager.add(this.skyMesh, 'sky');
  }

  /**
   * Create lighting setup (sun, ambient, fill).
   * @private
   */
  _createLighting() {
    // Ambient light (warm orange for sunset)
    this.ambientLight = new THREE.AmbientLight(COLORS.AMBIENT, 0.6);
    this.sceneManager.addLight(this.ambientLight, 'ambient');

    // Directional light (sun)
    this.sunLight = new THREE.DirectionalLight(COLORS.DIRECTIONAL, 1.2);
    this.sunLight.position.set(-50, 30, -100);
    this.sunLight.castShadow = this.qualityPreset.shadows;

    if (this.qualityPreset.shadows) {
      const shadowSize = this.qualityPreset.shadowMapSize;
      this.sunLight.shadow.mapSize.width = shadowSize;
      this.sunLight.shadow.mapSize.height = shadowSize;
      this.sunLight.shadow.camera.near = 0.5;
      this.sunLight.shadow.camera.far = 200;
      this.sunLight.shadow.camera.left = -80;
      this.sunLight.shadow.camera.right = 80;
      this.sunLight.shadow.camera.top = 80;
      this.sunLight.shadow.camera.bottom = -80;
      this.sunLight.shadow.bias = -0.0005;
    }

    this.sceneManager.addLight(this.sunLight, 'sun');

    // Hemisphere light for natural sky/ground bounce
    const hemiLight = new THREE.HemisphereLight(
      COLORS.SKY_TOP,
      COLORS.SKY_HORIZON,
      0.4
    );
    this.sceneManager.addLight(hemiLight, 'hemisphere');
  }

  /**
   * Create floating dust particles.
   * @private
   */
  _createDustParticles() {
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const range = 150;

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * range;
      positions[i * 3 + 1] = Math.random() * 10 + 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * range;
      sizes[i] = Math.random() * 0.03 + 0.01;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffddaa,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.dustParticles.name = 'dust';
    this.sceneManager.add(this.dustParticles);
  }

  /**
   * Update environment effects.
   * @param {number} deltaTime
   * @param {number} totalTime
   */
  update(deltaTime, totalTime) {
    // Animate dust particles
    if (this.dustParticles) {
      const positions = this.dustParticles.geometry.attributes.position.array;

      for (let i = 0; i < positions.length / 3; i++) {
        // Float upward slowly with slight drift
        positions[i * 3 + 1] += deltaTime * 0.05;
        positions[i * 3] += Math.sin(totalTime + i) * deltaTime * 0.02;

        // Reset if too high
        if (positions[i * 3 + 1] > 12) {
          positions[i * 3 + 1] = 1;
        }
      }

      this.dustParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  /**
   * Set time of day (affects sky colors and sun position).
   * @param {number} time - 0 to 1 (0 = sunrise, 0.5 = noon, 1 = sunset)
   */
  setTimeOfDay(time) {
    if (!this.skyMesh) return;

    const material = this.skyMesh.material;

    // Interpolate colors
    const topColor = new THREE.Color().lerpColors(
      new THREE.Color(0xff9966), // sunrise/sunset
      new THREE.Color(COLORS.SKY_TOP),
      time
    );

    const bottomColor = new THREE.Color().lerpColors(
      new THREE.Color(0xffaa00),
      new THREE.Color(COLORS.SKY_HORIZON),
      time
    );

    material.uniforms.uTopColor.value.copy(topColor);
    material.uniforms.uBottomColor.value.copy(bottomColor);

    // Move sun
    if (this.sunLight) {
      const angle = time * Math.PI;
      this.sunLight.position.set(
        -100 * Math.cos(angle),
        50 * Math.sin(angle),
        -100
      );
    }
  }

  /**
   * Clean up resources.
   */
  dispose() {
    if (this.dustParticles) {
      this.dustParticles.geometry.dispose();
      this.dustParticles.material.dispose();
      this.sceneManager.remove(this.dustParticles);
    }

    if (this.skyMesh) {
      this.skyMesh.geometry.dispose();
      this.skyMesh.material.dispose();
    }

    Logger.info('Environment', 'Disposed');
  }
}

export { Environment };