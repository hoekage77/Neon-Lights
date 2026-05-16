/**
 * NPC - Non-Player Character entity.
 * Supports both procedural placeholder geometry and loaded GLB models.
 */

import * as THREE from 'three';
import { MathUtils } from '../utils/MathUtils.js';
import { Logger } from '../utils/Logger.js';

const NPC_COLORS = [
  0xff6b9d, 0x4ecdc4, 0xffe66d, 0x9b59b6, 0x3498db, 0xe74c3c
];

const NPC_STATES = {
  IDLE: 'IDLE',
  WALKING: 'WALKING',
  TALKING: 'TALKING',
  INTERACTING: 'INTERACTING',
  ENTERING_BUILDING: 'ENTERING_BUILDING',
  EXITING_BUILDING: 'EXITING_BUILDING'
};

const MODEL_SCALE = 0.85;
const MODEL_OFFSET_Y = -0.85 * MODEL_SCALE;

class NPC {
  constructor(sceneManager, physicsWorld, id, config = {}, assetLoader = null) {
    this.sceneManager = sceneManager;
    this.physicsWorld = physicsWorld;
    this.id = id;
    this.assetLoader = assetLoader;

    // Config
    this.name = config.name || `NPC_${id}`;
    this.color = config.color || MathUtils.randomChoice(NPC_COLORS);
    this.height = config.height || MathUtils.randomRange(1.5, 1.9);
    this.walkSpeed = config.walkSpeed || MathUtils.randomRange(1.5, 2.5);
    this.modelPath = config.modelPath || null;

    // State
    this.mesh = null;
    this.body = null;
    this.state = NPC_STATES.IDLE;
    this.targetPosition = null;
    this.stateTimer = 0;
    this.dialogue = config.dialogue || null;
    this.venue = config.venue || null;

    this.animationTime = 0;
    this.isVisible = true;

    // Animation
    this.mixer = null;
    this.animations = new Map();
    this.currentAnimation = null;

    this.isDisposed = false;
  }

  /**
   * Spawn the NPC at a position.
   * @param {{x,y,z}} position
   */
  spawn(position) {
    if (this.isDisposed) return;

    this._createMesh();
    this._createPhysics(position);

    // Load model if configured
    if (this.modelPath && this.assetLoader) {
      this._loadModel();
    }

    Logger.info('NPC', `${this.name} spawned at (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
  }

  /**
   * Load external GLB model to replace procedural geometry.
   * @private
   */
  async _loadModel() {
    try {
      Logger.info('NPC', `${this.name} loading model: ${this.modelPath}`);
      const { scene: modelScene, animations } = await this.assetLoader.loadModelWithAnimations(this.modelPath);

      // Remove old procedural mesh
      if (this.mesh) {
        this.sceneManager.remove(this.mesh, true);
      }

      const wrapper = new THREE.Group();
      wrapper.name = `npc_${this.id}`;

      const scale = (this.height / 1.7) * MODEL_SCALE;
      modelScene.scale.setScalar(scale);
      modelScene.position.y = MODEL_OFFSET_Y * (this.height / 1.7);
      modelScene.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      wrapper.add(modelScene);
      if (this.body) {
        wrapper.position.copy(this.body.position);
      }
      this.sceneManager.add(wrapper, `npc_${this.id}`);

      // Relink physics
      this.mesh = wrapper;
      this.physicsWorld.linkMesh(this.body, this.mesh);

      // Set up animation mixer
      if (animations && animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(modelScene);
        for (const clip of animations) {
          this.animations.set(clip.name, this.mixer.clipAction(clip));
        }
        Logger.info('NPC', `${this.name} loaded ${animations.length} animations`);
        this.playAnimation('idle');
      }
    } catch (error) {
      Logger.error('NPC', `${this.name} failed to load model ${this.modelPath}`, error);
    }
  }

  /**
   * Play an animation by name.
   * @param {string} name
   */
  playAnimation(name) {
    if (!this.mixer || this.currentAnimation === name) return;

    const action = this.animations.get(name);
    if (!action) return;

    if (this.currentAnimation) {
      const prev = this.animations.get(this.currentAnimation);
      if (prev) prev.fadeOut(0.15);
    }

    action.reset().fadeIn(0.15).play();
    this.currentAnimation = name;
  }

  /**
   * Create NPC mesh.
   * @private
   */
  _createMesh() {
    const group = new THREE.Group();
    group.name = `npc_${this.id}`;

    const scale = this.height / 1.7;

    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.45 * scale, 0.8 * scale, 0.25 * scale);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.7
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.9 * scale;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeometry = new THREE.BoxGeometry(0.3 * scale, 0.3 * scale, 0.3 * scale);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdbac,
      roughness: 0.8
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5 * scale;
    head.castShadow = true;
    group.add(head);

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.15 * scale, 0.6 * scale, 0.18 * scale);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x34495e,
      roughness: 0.8
    });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.1 * scale, 0.3 * scale, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.1 * scale, 0.3 * scale, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    // Arms
    const armGeometry = new THREE.BoxGeometry(0.12 * scale, 0.5 * scale, 0.12 * scale);
    const armMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.7
    });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.25 * scale, 0.85 * scale, 0);
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.25 * scale, 0.85 * scale, 0);
    rightArm.castShadow = true;
    group.add(rightArm);

    // Store references for animation
    group.userData.limbs = {
      legs: [leftLeg, rightLeg],
      arms: [leftArm, rightArm],
      body: body,
      head: head
    };

    this.mesh = group;
    this.sceneManager.add(this.mesh, `npc_${this.id}`);
  }

  /**
   * Create physics body.
   * @private
   * @param {{x,y,z}} position
   */
  _createPhysics(position) {
    this.body = this.physicsWorld.createCapsule(
      position,
      0.22,
      this.height,
      10  // lighter mass for responsive walking
    );

    this.body.linearDamping = 0.1; // low drag so NPCs can walk at configured speed
    this.body.fixedRotation = true;
    this.body.updateMassProperties();

    this.physicsWorld.linkMesh(this.body, this.mesh);
  }

  /**
   * Update NPC each frame.
   * @param {number} deltaTime
   * @param {THREE.Vector3} playerPosition
   */
  update(deltaTime, playerPosition) {
    if (this.isDisposed) return;

    this.animationTime += deltaTime;
    this.stateTimer -= deltaTime;

    // Update animation mixer
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }

    // Update state machine
    switch (this.state) {
      case NPC_STATES.IDLE:
        this._updateIdle(deltaTime);
        break;

      case NPC_STATES.WALKING:
        this._updateWalking(deltaTime);
        break;

      case NPC_STATES.TALKING:
        this._updateTalking(deltaTime, playerPosition);
        break;

      case NPC_STATES.INTERACTING:
        this._updateInteracting(deltaTime);
        break;

      case NPC_STATES.ENTERING_BUILDING:
      case NPC_STATES.EXITING_BUILDING:
        this._updateBuildingTransition(deltaTime);
        break;
    }

    // Update mesh position from physics
    if (this.mesh && this.body) {
      this.mesh.position.copy(this.body.position);
    }

    // Update animation
    if (!this.mixer) {
      this._updateAnimation(deltaTime);
    } else {
      // Drive GLB animations from state
      if (this.state === NPC_STATES.WALKING || this.state === NPC_STATES.ENTERING_BUILDING || this.state === NPC_STATES.EXITING_BUILDING) {
        this.playAnimation('walk');
      } else if (this.state === NPC_STATES.TALKING) {
        this.playAnimation('idle');
      } else {
        this.playAnimation('idle');
      }
    }
  }

  /**
   * Update idle state.
   * @private
   * @param {number} deltaTime
   */
  _updateIdle(deltaTime) {
    // Slow drift
    if (this.body) {
      this.body.velocity.x *= 0.95;
      this.body.velocity.z *= 0.95;
    }

    // Face random direction occasionally
    if (Math.random() < 0.01) {
      this.mesh.rotation.y += (Math.random() - 0.5) * 0.5;
    }
  }

  /**
   * Update walking state.
   * @private
   * @param {number} deltaTime
   */
  _updateWalking(deltaTime) {
    if (!this.targetPosition) {
      this.state = NPC_STATES.IDLE;
      return;
    }

    const dx = this.targetPosition.x - this.body.position.x;
    const dz = this.targetPosition.z - this.body.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 0.5) {
      // Reached destination
      this.state = NPC_STATES.IDLE;
      this.targetPosition = null;
      this.body.velocity.set(0, this.body.velocity.y, 0);
      return;
    }

    // Move toward target
    const speed = this.walkSpeed;
    const direction = { x: dx / distance, z: dz / distance };

    this.body.velocity.x = direction.x * speed;
    this.body.velocity.z = direction.z * speed;

    // Face movement direction
    this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
  }

  /**
   * Update talking state.
   * @private
   * @param {number} deltaTime
   * @param {THREE.Vector3} playerPosition
   */
  _updateTalking(deltaTime, playerPosition) {
    // Face player
    if (playerPosition) {
      const dx = playerPosition.x - this.body.position.x;
      const dz = playerPosition.z - this.body.position.z;
      this.mesh.rotation.y = Math.atan2(dx, dz);
    }

    // Stop moving
    this.body.velocity.x *= 0.9;
    this.body.velocity.z *= 0.9;
  }

  /**
   * Update interacting state.
   * @private
   * @param {number} deltaTime
   */
  _updateInteracting(deltaTime) {
    this.body.velocity.x *= 0.9;
    this.body.velocity.z *= 0.9;
  }

  /**
   * Update building transition.
   * @private
   * @param {number} deltaTime
   */
  _updateBuildingTransition(deltaTime) {
    // Simple walk toward building entrance
    if (this.targetPosition) {
      const dx = this.targetPosition.x - this.body.position.x;
      const dz = this.targetPosition.z - this.body.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < 1) {
        // Entered/exited building
        if (this.state === NPC_STATES.ENTERING_BUILDING) {
          this.isVisible = false;
          this.mesh.visible = false;
        } else {
          this.isVisible = true;
          this.mesh.visible = true;
        }

        this.state = NPC_STATES.IDLE;
        this.targetPosition = null;
      } else {
        const speed = this.walkSpeed * 1.5;
        this.body.velocity.x = (dx / distance) * speed;
        this.body.velocity.z = (dz / distance) * speed;
        this.mesh.rotation.y = Math.atan2(dx, dz);
      }
    }
  }

  /**
   * Update animation.
   * @private
   * @param {number} deltaTime
   */
  _updateAnimation(deltaTime) {
    if (!this.mesh || !this.mesh.userData.limbs) return;

    const { legs, arms, body } = this.mesh.userData.limbs;

    if (this.state === NPC_STATES.WALKING || this.state === NPC_STATES.ENTERING_BUILDING || this.state === NPC_STATES.EXITING_BUILDING) {
      const walkCycle = Math.sin(this.animationTime * 8);

      legs[0].rotation.x = walkCycle * 0.5;
      legs[1].rotation.x = -walkCycle * 0.5;
      arms[0].rotation.x = -walkCycle * 0.3;
      arms[1].rotation.x = walkCycle * 0.3;
      body.position.y = 0.9 * (this.height / 1.7) + Math.abs(Math.sin(this.animationTime * 16)) * 0.02;
    } else {
      // Idle breathing
      const breathe = Math.sin(this.animationTime * 2) * 0.05;
      arms[0].rotation.z = breathe;
      arms[1].rotation.z = -breathe;

      // Reset legs
      legs[0].rotation.x = MathUtils.lerp(legs[0].rotation.x, 0, 5 * deltaTime);
      legs[1].rotation.x = MathUtils.lerp(legs[1].rotation.x, 0, 5 * deltaTime);
    }
  }

  /**
   * Set a new target position to walk to.
   * @param {{x,y,z}} position
   */
  walkTo(position) {
    this.targetPosition = position;
    this.state = NPC_STATES.WALKING;
  }

  /**
   * Start talking to someone.
   */
  startTalking() {
    this.state = NPC_STATES.TALKING;
  }

  /**
   * Stop talking.
   */
  stopTalking() {
    this.state = NPC_STATES.IDLE;
  }

  /**
   * Start interacting with an object.
   * @param {number} duration
   */
  startInteracting(duration = 15) {
    this.state = NPC_STATES.INTERACTING;
    this.stateTimer = duration;
  }

  /**
   * Enter a building.
   * @param {{x,y,z}} entrancePosition
   */
  enterBuilding(entrancePosition) {
    this.targetPosition = entrancePosition;
    this.state = NPC_STATES.ENTERING_BUILDING;
  }

  /**
   * Exit a building.
   * @param {{x,y,z}} exitPosition
   */
  exitBuilding(exitPosition) {
    this.isVisible = true;
    this.mesh.visible = true;
    this.targetPosition = exitPosition;
    this.state = NPC_STATES.EXITING_BUILDING;
  }

  /**
   * Get position.
   * @returns {THREE.Vector3}
   */
  getPosition() {
    return this.body ? this.body.position.clone() : new THREE.Vector3();
  }

  /**
   * Get dialogue data.
   * @returns {Object|null}
   */
  getDialogue() {
    return this.dialogue;
  }

  /**
   * Clean up NPC resources.
   */
  dispose() {
    if (this.isDisposed) return;

    if (this.mesh) {
      this.sceneManager.remove(this.mesh, true);
    }

    if (this.body) {
      this.physicsWorld.removeBody(this.body);
    }

    this.isDisposed = true;
    Logger.info('NPC', `${this.name} disposed`);
  }
}

export { NPC, NPC_STATES };
