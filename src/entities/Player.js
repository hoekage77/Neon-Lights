/**
 * Player - Player avatar entity with visual representation and physics.
 * Supports both procedural placeholder geometry and loaded GLB models.
 */

import * as THREE from 'three';
import { PlayerController } from './PlayerController.js';
import { Logger } from '../utils/Logger.js';

// Default model config for Kenney blocky characters (~2.0m tall)
const DEFAULT_MODEL_CONFIG = {
  scale: 0.85,
  offsetY: -0.7225, // -0.85 * 0.85
  rotationY: 0
};

class Player {
  constructor(sceneManager, physicsWorld, inputManager, camera, assetLoader = null, modelPath = null, modelConfig = null) {
    this.sceneManager = sceneManager;
    this.physicsWorld = physicsWorld;
    this.inputManager = inputManager;
    this.camera = camera;
    this.assetLoader = assetLoader;
    this.modelPath = modelPath;
    this.modelConfig = modelConfig || DEFAULT_MODEL_CONFIG;

    this.mesh = null;
    this.body = null;
    this.controller = null;

    // Animation
    this.mixer = null;
    this.animations = new Map();
    this.currentAnimation = null;

    this.position = new THREE.Vector3(0, 0.5, 0);
    this.rotation = 0;

    this.proceduralAnimTime = 0;

    this.isInitialized = false;
  }

  /**
   * Initialize the player character.
   */
  init() {
    if (this.isInitialized) return;

    this._createMesh();
    this._createPhysics();
    this._createController();

    this.isInitialized = true;
    Logger.info('Player', 'Initialized');
  }

  /**
   * Load an external GLB model to replace the procedural placeholder.
   * @param {string} modelPath
   */
  async loadModel(modelPath) {
    if (!this.assetLoader) {
      Logger.warn('Player', 'No assetLoader available, keeping procedural mesh');
      return;
    }

    try {
      Logger.info('Player', `Loading model: ${modelPath}`);
      const { scene: modelScene, animations } = await this.assetLoader.loadModelWithAnimations(modelPath);

      // Remove old procedural mesh
      if (this.mesh) {
        this.sceneManager.remove(this.mesh, true);
      }

      // Wrap model so its origin aligns with physics body center
      const wrapper = new THREE.Group();
      wrapper.name = 'player-model';

      const cfg = this.modelConfig;
      modelScene.scale.setScalar(cfg.scale);
      modelScene.position.y = cfg.offsetY;
      modelScene.rotation.y = cfg.rotationY || 0;
      modelScene.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      wrapper.add(modelScene);
      wrapper.position.copy(this.position);
      this.sceneManager.add(wrapper, 'player');

      // Relink physics and controller to new mesh
      this.mesh = wrapper;
      this.physicsWorld.linkMesh(this.body, this.mesh);
      if (this.controller) {
        this.controller.setMesh(this.mesh);
      }

      // Set up animation mixer
      if (animations && animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(modelScene);
        for (const clip of animations) {
          this.animations.set(clip.name, this.mixer.clipAction(clip));
        }
        Logger.info('Player', `Loaded ${animations.length} animations`);
        this.playAnimation('idle');
      }

      Logger.info('Player', `Model loaded: ${modelPath}`);
    } catch (error) {
      Logger.error('Player', `Failed to load model ${modelPath}, keeping procedural fallback`, error);
    }
  }

  /**
   * Play an animation by name.
   * @param {string} name
   */
  playAnimation(name) {
    if (!this.mixer || this.currentAnimation === name) return;

    const action = this.animations.get(name);
    if (!action) {
      Logger.warn('Player', `Animation not found: ${name}`);
      return;
    }

    // Fade out current animation
    if (this.currentAnimation) {
      const prev = this.animations.get(this.currentAnimation);
      if (prev) prev.fadeOut(0.15);
    }

    action.reset().fadeIn(0.15).play();
    this.currentAnimation = name;
  }

  /**
   * Create player mesh (low-poly placeholder).
   * @private
   */
  _createMesh() {
    const playerGroup = new THREE.Group();
    playerGroup.name = 'player';

    // Body (box)
    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.9, 0.3);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x4ecdc4,
      roughness: 0.7
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.95;
    body.castShadow = true;
    playerGroup.add(body);

    // Head (box)
    const headGeometry = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdbac,
      roughness: 0.8
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.6;
    head.castShadow = true;
    playerGroup.add(head);

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.18, 0.7, 0.22);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x34495e,
      roughness: 0.8
    });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.12, 0.35, 0);
    leftLeg.castShadow = true;
    playerGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.12, 0.35, 0);
    rightLeg.castShadow = true;
    playerGroup.add(rightLeg);

    // Arms
    const armGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0x4ecdc4,
      roughness: 0.7
    });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.32, 1.0, 0);
    leftArm.castShadow = true;
    playerGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.32, 1.0, 0);
    rightArm.castShadow = true;
    playerGroup.add(rightArm);

    this.mesh = playerGroup;
    this.mesh.position.copy(this.position);
    this.sceneManager.add(this.mesh, 'player');
  }

  /**
   * Create physics body for player.
   * @private
   */
  _createPhysics() {
    this.body = this.physicsWorld.createCapsule(
      { x: 0, y: 0.85, z: 0 },
      0.25, // radius
      1.7,  // height
      15    // mass — lighter for snappy arcade response
    );

    this.body.linearDamping = 0.05; // minimal drag for snappy movement
    this.body.fixedRotation = true;
    this.body.updateMassProperties();

    // Link mesh to physics body
    this.physicsWorld.linkMesh(this.body, this.mesh);
  }

  /**
   * Create player controller.
   * @private
   */
  _createController() {
    this.controller = new PlayerController(
      this.mesh,
      this.body,
      this.camera,
      this.inputManager
    );
    this.controller.init();
  }

  /**
   * Update player each frame.
   * @param {number} deltaTime
   */
  update(deltaTime) {
    if (this.controller) {
      this.controller.update(deltaTime);
    }

    // Update animation mixer (for models with skeletal animations like Kenney chars)
    if (this.mixer) {
      this.mixer.update(deltaTime);

      // Drive animation from movement state
      const state = this.controller.getMovementState();
      if (!state.isGrounded) {
        // In air — keep current or could add jump animation
      } else if (state.isMoving && state.isRunning) {
        this.playAnimation('sprint');
      } else if (state.isMoving) {
        this.playAnimation('walk');
      } else {
        this.playAnimation('idle');
      }
    } else if (this.mesh && this.mesh.name === 'player-model') {
      // Static custom model — apply procedural bob/tilt so it doesn't look dead
      this.proceduralAnimTime += deltaTime;
      const modelScene = this.mesh.children[0];
      if (modelScene) {
        const state = this.controller.getMovementState();
        const cfg = this.modelConfig || DEFAULT_MODEL_CONFIG;
        if (state.isMoving && state.isGrounded) {
          const speed = state.isRunning ? 14 : 10;
          const cycle = Math.sin(this.proceduralAnimTime * speed);
          // Bob up/down slightly
          modelScene.position.y = cfg.offsetY + cycle * 0.025;
          // Slight forward lean
          modelScene.rotation.x = 0.04;
        } else {
          // Return to rest
          modelScene.position.y = cfg.offsetY;
          modelScene.rotation.x = 0;
        }
      }
    }

    // Update position reference
    if (this.mesh) {
      this.position.copy(this.mesh.position);
      this.rotation = this.mesh.rotation.y;
    }
  }

  /**
   * Get current position.
   * @returns {THREE.Vector3}
   */
  getPosition() {
    return this.position.clone();
  }

  /**
   * Set position directly.
   * @param {{x,y,z}} pos
   */
  setPosition(pos) {
    this.position.set(pos.x, pos.y, pos.z);
    if (this.mesh) {
      this.mesh.position.copy(this.position);
    }
    if (this.body) {
      this.body.position.set(pos.x, pos.y, pos.z);
      this.body.velocity.set(0, 0, 0);
    }
  }

  /**
   * Reset to spawn position.
   */
  resetPosition() {
    this.setPosition({ x: 0, y: 0.5, z: -80 }); // Near the first venue
  }

  /**
   * Get current rotation.
   * @returns {number}
   */
  getRotation() {
    return this.rotation;
  }

  /**
   * Clean up player resources.
   */
  dispose() {
    if (this.controller) {
      this.controller.dispose();
    }

    if (this.mesh) {
      this.sceneManager.remove(this.mesh, true);
    }

    if (this.body) {
      this.physicsWorld.removeBody(this.body);
    }

    Logger.info('Player', 'Disposed');
  }
}

export { Player };
