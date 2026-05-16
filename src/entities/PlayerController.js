/**
 * PlayerController - Handles input-to-movement mapping and camera follow.
 * Third-person perspective with orbit camera.
 */

import * as THREE from 'three';
import { CONFIG } from '../constants/Config.js';
import { MathUtils } from '../utils/MathUtils.js';
import { Logger } from '../utils/Logger.js';

class PlayerController {
  constructor(mesh, body, camera, inputManager) {
    this.mesh = mesh;
    this.body = body;
    this.camera = camera;
    this.inputManager = inputManager;

    // Movement state
    this.velocity = new THREE.Vector3();
    this.moveSpeed = CONFIG.PLAYER.WALK_SPEED;
    this.runSpeed = CONFIG.PLAYER.RUN_SPEED;
    this.jumpForce = 5;
    this.isGrounded = true;
    this.isMoving = false;

    // Camera state
    this.cameraDistance = CONFIG.PLAYER.CAMERA_DISTANCE;
    this.cameraHeight = CONFIG.PLAYER.CAMERA_HEIGHT;
    this.cameraAngle = 0;
    this.targetCameraAngle = 0;
    this.cameraSmoothing = CONFIG.PLAYER.CAMERA_SMOOTHING;
    this.minCameraDistance = CONFIG.PLAYER.CAMERA_MIN_DISTANCE;
    this.maxCameraDistance = CONFIG.PLAYER.CAMERA_MAX_DISTANCE;

    // Animation state
    this.animationTime = 0;
    this.isRunning = false;

    // World up vector
    this.worldUp = new THREE.Vector3(0, 1, 0);

    this.isInitialized = false;
  }

  /**
   * Initialize the controller.
   */
  init() {
    if (this.isInitialized) return;

    this.isInitialized = true;
    Logger.info('PlayerController', 'Initialized');
  }

  /**
   * Update player movement and camera.
   * @param {number} deltaTime
   */
  update(deltaTime) {
    if (!this.isInitialized) return;

    this.animationTime += deltaTime;

    // Handle input
    this._handleMovement(deltaTime);
    this._handleCamera(deltaTime);
    this._updateAnimation(deltaTime);
  }

  /**
   * Handle movement input and physics.
   * @private
   * @param {number} deltaTime
   */
  _handleMovement(deltaTime) {
    // Get input directions
    const forward = this.inputManager.isActionPressed('FORWARD') ? 1 : 0;
    const backward = this.inputManager.isActionPressed('BACKWARD') ? 1 : 0;
    const left = this.inputManager.isActionPressed('LEFT') ? 1 : 0;
    const right = this.inputManager.isActionPressed('RIGHT') ? 1 : 0;

    // Check if running
    this.isRunning = this.inputManager.isActionPressed('RUN');
    const speed = this.isRunning ? this.runSpeed : this.moveSpeed;

    // Calculate movement direction relative to camera
    const moveZ = forward - backward;
    const moveX = right - left;

    this.isMoving = moveX !== 0 || moveZ !== 0;

    if (this.isMoving) {
      // Get camera forward direction (ignore Y)
      const cameraForward = new THREE.Vector3();
      this.camera.getWorldDirection(cameraForward);
      cameraForward.y = 0;
      cameraForward.normalize();

      // Get camera right direction
      const cameraRight = new THREE.Vector3();
      cameraRight.crossVectors(cameraForward, this.worldUp);

      // Calculate movement vector
      const moveDirection = new THREE.Vector3()
        .addScaledVector(cameraForward, moveZ)
        .addScaledVector(cameraRight, moveX)
        .normalize();

      // Apply velocity to physics body
      const targetVelocityX = moveDirection.x * speed;
      const targetVelocityZ = moveDirection.z * speed;

      // Snappy velocity changes (high lerp factor = arcade feel)
      this.body.velocity.x = MathUtils.lerp(this.body.velocity.x, targetVelocityX, 0.6);
      this.body.velocity.z = MathUtils.lerp(this.body.velocity.z, targetVelocityZ, 0.6);

      // Rotate mesh to face movement direction
      if (moveZ !== 0 || moveX !== 0) {
        const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);

        // Smooth rotation
        let rotationDiff = targetRotation - this.mesh.rotation.y;
        while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
        while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;

        this.mesh.rotation.y += rotationDiff * 0.15;
      }
    } else {
      // Snappy deceleration (stops quickly but with slight slide)
      this.body.velocity.x = MathUtils.lerp(this.body.velocity.x, 0, 0.35);
      this.body.velocity.z = MathUtils.lerp(this.body.velocity.z, 0, 0.35);
    }

    // Jump (only when grounded)
    if (this.inputManager.isActionPressed('JUMP') && this.isGrounded) {
      this.body.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }

    // Ground check — snap to standing height when near ground to prevent jitter
    const standingHeight = 0.85;
    const groundThreshold = 0.15;
    if (this.body.position.y <= standingHeight + groundThreshold && this.body.velocity.y <= 0.05) {
      this.body.position.y = standingHeight;
      if (this.body.velocity.y < 0) {
        this.body.velocity.y = 0;
      }
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }
  }

  /**
   * Handle camera orbit and follow.
   * @private
   * @param {number} deltaTime
   */
  _handleCamera(deltaTime) {
    // Get mouse delta for camera orbit
    const mouseDelta = this.inputManager.getMouseDelta();

    // Only orbit if right mouse button is held
    if (this.inputManager.isMouseDown(2)) {
      this.targetCameraAngle -= mouseDelta.x * 0.005;
    }

    // Zoom with mouse wheel
    const wheelDelta = this.inputManager.getMouseWheel();
    if (wheelDelta !== 0) {
      this.cameraDistance = MathUtils.clamp(
        this.cameraDistance + wheelDelta * 0.01,
        this.minCameraDistance,
        this.maxCameraDistance
      );
    }

    // Smooth camera angle
    this.cameraAngle = MathUtils.lerp(this.cameraAngle, this.targetCameraAngle, 0.1);

    // Calculate desired camera position
    const playerPos = this.mesh.position;

    const cameraOffset = new THREE.Vector3(
      Math.sin(this.cameraAngle) * this.cameraDistance,
      this.cameraHeight,
      Math.cos(this.cameraAngle) * this.cameraDistance
    );

    const targetPosition = new THREE.Vector3().addVectors(playerPos, cameraOffset);

    // Smooth camera position
    this.camera.position.lerp(targetPosition, 0.1);

    // Look at player
    const lookTarget = new THREE.Vector3(playerPos.x, playerPos.y + 1.5, playerPos.z);
    this.camera.lookAt(lookTarget);

    // Camera collision avoidance (simple raycast)
    const direction = new THREE.Vector3().subVectors(this.camera.position, playerPos).normalize();
    const rayLength = this.camera.position.distanceTo(playerPos);

    // In a real implementation, we'd raycast and move camera closer if hitting walls
    // For now, we clamp to minimum distance
    if (rayLength < this.minCameraDistance) {
      this.camera.position.copy(playerPos).add(direction.multiplyScalar(this.minCameraDistance));
    }
  }

  /**
   * Update player animation (procedural limb movement).
   * Skipped when a loaded GLB model with its own animations is active.
   * @private
   * @param {number} deltaTime
   */
  _updateAnimation(deltaTime) {
    // Skip if mesh is a loaded model (name set by Player.loadModel)
    if (this.mesh.name === 'player-model') {
      return;
    }

    if (!this.isMoving) {
      // Return to idle pose
      this._resetLimbRotations(deltaTime);
      return;
    }

    const speed = this.isRunning ? 12 : 8;
    const walkCycle = Math.sin(this.animationTime * speed);

    // Legs
    const legs = this.mesh.children.filter(child =>
      child.position.y < 0.7 && child.position.y > 0.2
    );

    if (legs.length >= 2) {
      legs[0].rotation.x = walkCycle * 0.5;
      legs[1].rotation.x = -walkCycle * 0.5;
    }

    // Arms (opposite to legs)
    const arms = this.mesh.children.filter(child =>
      Math.abs(child.position.x) > 0.25 && child.position.y > 0.8
    );

    if (arms.length >= 2) {
      arms[0].rotation.x = -walkCycle * 0.3;
      arms[1].rotation.x = walkCycle * 0.3;
    }

    // Body bob
    this.mesh.children[0].position.y = 0.95 + Math.abs(walkCycle) * 0.03;
  }

  /**
   * Reset limb rotations to idle.
   * @private
   * @param {number} deltaTime
   */
  _resetLimbRotations(deltaTime) {
    const lerpSpeed = 5 * deltaTime;

    for (const child of this.mesh.children) {
      if (child !== this.mesh.children[0]) { // Don't reset body
        child.rotation.x = MathUtils.lerp(child.rotation.x, 0, lerpSpeed);
      }
    }

    // Reset body height
    this.mesh.children[0].position.y = 0.95;
  }

  /**
   * Update the mesh reference (called when model is loaded/replaced).
   * @param {THREE.Object3D} mesh
   */
  setMesh(mesh) {
    this.mesh = mesh;
  }

  /**
   * Get current movement state for animation driving.
   * @returns {{isMoving: boolean, isRunning: boolean, isGrounded: boolean}}
   */
  getMovementState() {
    return {
      isMoving: this.isMoving,
      isRunning: this.isRunning,
      isGrounded: this.isGrounded
    };
  }

  /**
   * Clean up controller resources.
   */
  dispose() {
    Logger.info('PlayerController', 'Disposed');
  }
}

export { PlayerController };