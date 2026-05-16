/**
 * PhysicsWorld - Manages the Cannon-es physics simulation.
 * Handles physics bodies, collisions, and raycasting.
 */

import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { CONFIG } from '../constants/Config.js';
import { Logger } from '../utils/Logger.js';

class PhysicsWorld {
  constructor() {
    // Create physics world
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, CONFIG.PHYSICS.GRAVITY, 0)
    });

    // Default material
    this.defaultMaterial = new CANNON.Material('default');
    this.defaultContactMaterial = new CANNON.ContactMaterial(
      this.defaultMaterial,
      this.defaultMaterial,
      {
        friction: CONFIG.PHYSICS.CONTACT_MATERIAL.FRICTION,
        restitution: CONFIG.PHYSICS.CONTACT_MATERIAL.RESTITUTION,
        contactEquationStiffness: CONFIG.PHYSICS.CONTACT_MATERIAL.CONTACT_STIFFNESS,
        contactEquationRelaxation: CONFIG.PHYSICS.CONTACT_MATERIAL.CONTACT_RELAXATION
      }
    );
    this.world.addContactMaterial(this.defaultContactMaterial);
    this.world.defaultContactMaterial = this.defaultContactMaterial;

    // Tracking
    this.bodies = new Map();
    this.bodyToMesh = new Map();
    this.isRunning = false;
    this.isDisposed = false;

    // Performance
    this.timeStep = CONFIG.PHYSICS.TIME_STEP;
    this.maxSubSteps = CONFIG.PHYSICS.MAX_SUB_STEPS;

    Logger.info('PhysicsWorld', 'Initialized');
  }

  /**
   * Create a static ground plane.
   * @param {number} y - Height of ground
   * @returns {CANNON.Body}
   */
  createGround(y = 0) {
    const shape = new CANNON.Plane();
    const body = new CANNON.Body({
      mass: 0,
      shape: shape,
      material: this.defaultMaterial
    });
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    body.position.set(0, y, 0);

    this.world.addBody(body);
    return body;
  }

  /**
   * Create a box collider.
   * @param {{x,y,z}} position
   * @param {{x,y,z}} halfExtents
   * @param {number} mass
   * @param {boolean} isKinematic
   * @returns {CANNON.Body}
   */
  createBox(position, halfExtents, mass = 0, isKinematic = false) {
    const shape = new CANNON.Box(new CANNON.Vec3(halfExtents.x, halfExtents.y, halfExtents.z));
    const body = new CANNON.Body({
      mass: isKinematic ? 0 : mass,
      type: isKinematic ? CANNON.Body.KINEMATIC : (mass === 0 ? CANNON.Body.STATIC : CANNON.Body.DYNAMIC),
      shape,
      material: this.defaultMaterial
    });
    body.position.set(position.x, position.y, position.z);

    this.world.addBody(body);
    this.bodies.set(body.id, body);

    return body;
  }

  /**
   * Create a sphere collider.
   * @param {{x,y,z}} position
   * @param {number} radius
   * @param {number} mass
   * @returns {CANNON.Body}
   */
  createSphere(position, radius, mass = 1) {
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({
      mass,
      shape,
      material: this.defaultMaterial
    });
    body.position.set(position.x, position.y, position.z);
    body.linearDamping = 0.4;
    body.angularDamping = 0.4;

    this.world.addBody(body);
    this.bodies.set(body.id, body);

    return body;
  }

  /**
   * Create a cylinder collider.
   * @param {{x,y,z}} position
   * @param {number} radiusTop
   * @param {number} radiusBottom
   * @param {number} height
   * @param {number} mass
   * @returns {CANNON.Body}
   */
  createCylinder(position, radiusTop, radiusBottom, height, mass = 0) {
    const shape = new CANNON.Cylinder(radiusTop, radiusBottom, height, 8);
    const body = new CANNON.Body({
      mass,
      shape,
      material: this.defaultMaterial
    });
    body.position.set(position.x, position.y, position.z);

    // Rotate cylinder to stand upright (Cannon cylinders are sideways by default)
    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    body.quaternion = q;

    this.world.addBody(body);
    this.bodies.set(body.id, body);

    return body;
  }

  /**
   * Create a capsule collider (cylinder + two spheres).
   * @param {{x,y,z}} position
   * @param {number} radius
   * @param {number} height
   * @param {number} mass
   * @returns {CANNON.Body}
   */
  createCapsule(position, radius, height, mass = 1) {
    const body = new CANNON.Body({
      mass,
      material: this.defaultMaterial
    });

    // Cylinder
    const cylinderShape = new CANNON.Cylinder(radius, radius, height - radius * 2, 8);
    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    body.addShape(cylinderShape, new CANNON.Vec3(0, 0, 0), q);

    // Top sphere
    const sphereShape = new CANNON.Sphere(radius);
    body.addShape(sphereShape, new CANNON.Vec3(0, (height - radius * 2) / 2, 0));

    // Bottom sphere
    body.addShape(sphereShape, new CANNON.Vec3(0, -(height - radius * 2) / 2, 0));

    body.position.set(position.x, position.y, position.z);
    body.linearDamping = 0.4;
    body.angularDamping = 0.4;

    this.world.addBody(body);
    this.bodies.set(body.id, body);

    return body;
  }

  /**
   * Link a Three.js mesh to a physics body for automatic sync.
   * @param {CANNON.Body} body
   * @param {THREE.Object3D} mesh
   */
  linkMesh(body, mesh) {
    this.bodyToMesh.set(body.id, mesh);
  }

  /**
   * Remove a body from the world.
   * @param {CANNON.Body} body
   */
  removeBody(body) {
    this.world.removeBody(body);
    this.bodies.delete(body.id);
    this.bodyToMesh.delete(body.id);
  }

  /**
   * Raycast in the physics world.
   * @param {{x,y,z}} from
   * @param {{x,y,z}} to
   * @returns {CANNON.RaycastResult|null}
   */
  raycast(from, to) {
    const rayFrom = new CANNON.Vec3(from.x, from.y, from.z);
    const rayTo = new CANNON.Vec3(to.x, to.y, to.z);
    const result = new CANNON.RaycastResult();

    this.world.raycastClosest(rayFrom, rayTo, {}, result);

    return result.hasHit ? result : null;
  }

  /**
   * Step the physics simulation.
   * @param {number} deltaTime - Time since last frame in seconds
   */
  step(deltaTime) {
    if (!this.isRunning || this.isDisposed) return;

    this.world.step(this.timeStep, deltaTime, this.maxSubSteps);

    // Sync visual meshes with physics bodies
    for (const [bodyId, mesh] of this.bodyToMesh) {
      const body = this.bodies.get(bodyId);
      if (body && mesh) {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
      }
    }
  }

  /**
   * Start physics simulation.
   */
  start() {
    this.isRunning = true;
    Logger.info('PhysicsWorld', 'Started');
  }

  /**
   * Stop physics simulation.
   */
  stop() {
    this.isRunning = false;
    Logger.info('PhysicsWorld', 'Stopped');
  }

  /**
   * Pause physics (sets time scale to 0).
   */
  pause() {
    this.world.timeScale = 0;
  }

  /**
   * Resume physics.
   */
  resume() {
    this.world.timeScale = 1;
  }

  /**
   * Get number of active bodies.
   * @returns {number}
   */
  getBodyCount() {
    return this.bodies.size;
  }

  /**
   * Clean up all physics resources.
   */
  dispose() {
    if (this.isDisposed) return;

    this.stop();

    for (const [, body] of this.bodies) {
      this.world.removeBody(body);
    }
    this.bodies.clear();
    this.bodyToMesh.clear();

    this.isDisposed = true;
    Logger.info('PhysicsWorld', 'Disposed');
  }
}

export { PhysicsWorld };