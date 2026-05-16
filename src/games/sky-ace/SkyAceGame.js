/**
 * SkyAceGame - Ace Combat-inspired aerial combat game.
 * Mission-based flight combat with arcade-style controls.
 */

import * as THREE from 'three';
import { GameBase } from '../GameBase.js';
import { eventBus } from '../../core/EventBus.js';
import { CONFIG } from '../../constants/Config.js';
import { COLORS } from '../../constants/Colors.js';
import { MathUtils } from '../../utils/MathUtils.js';
import { Logger } from '../../utils/Logger.js';

// Game states
const GAME_STATES = {
  MISSION_BRIEFING: 'MISSION_BRIEFING',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  MISSION_COMPLETE: 'MISSION_COMPLETE',
  GAME_OVER: 'GAME_OVER'
};

class SkyAceGame extends GameBase {
  constructor(gameController, venueData) {
    super(gameController, venueData);

    this.gameState = GAME_STATES.MISSION_BRIEFING;
    this.missionId = 1;
    this.missions = this._getMissions();

    // Aircraft
    this.aircraft = null;
    this.aircraftBody = null;
    this.aircraftSpeed = 0;
    this.maxSpeed = 30;
    this.minSpeed = 15;
    this.boostSpeed = 45;
    this.acceleration = 20;
    this.deceleration = 10;

    // Controls
    this.pitch = 0;
    this.yaw = 0;
    this.roll = 0;
    this.boostActive = false;
    this.boostTimer = 0;
    this.boostCooldown = 0;
    this.boostDuration = 3;
    this.boostCooldownDuration = 5;

    // Weapons
    this.machineGunAmmo = Infinity;
    this.missileCount = 4;
    this.missileLockOn = false;
    this.lockOnTarget = null;
    this.lockOnTimer = 0;
    this.lockOnDuration = 2;

    // Projectiles
    this.projectiles = [];
    this.projectileSpeed = 80;
    this.projectileLifetime = 3;

    // Enemies
    this.enemies = [];
    this.enemiesDestroyed = 0;
    this.totalEnemies = 0;

    // Environment
    this.skybox = null;
    this.clouds = null;
    this.terrain = null;

    // Camera modes
    this.cameraMode = 'chase'; // 'chase', 'cockpit', 'cinematic'
    this.cinematicTimer = 0;

    // HUD
    this.hudData = {
      speed: 0,
      altitude: 0,
      health: 100,
      missiles: 4,
      score: 0,
      combo: 0,
      comboTimer: 0,
      lockOnProgress: 0
    };

    // Input
    this.mouseSensitivity = 0.002;

    this.isInitialized = false;
  }

  /**
   * Initialize Sky Ace.
   */
  async init() {
    await super.init();

    // Set up game scene
    this._createEnvironment();
    this._createAircraft();
    this._spawnMissionEnemies();
    this._setupCamera();

    // Transition to countdown
    this.gameState = GAME_STATES.COUNTDOWN;
    this.countdownValue = 3;
    this.countdownTimer = 0;

    this.isInitialized = true;
    Logger.info('SkyAceGame', 'Initialized');
  }

  /**
   * Get mission configurations.
   * @private
   * @returns {Array}
   */
  _getMissions() {
    return [
      {
        id: 1,
        name: 'First Flight',
        description: 'Destroy 5 training drones',
        timeLimit: 180,
        objectives: { destroy: 5 },
        enemies: [
          { type: 'drone', count: 5, positions: this._generateEnemyPositions(5) }
        ]
      },
      {
        id: 2,
        name: 'Neon Skies',
        description: 'Destroy 10 enemy fighters',
        timeLimit: 300,
        objectives: { destroy: 10 },
        enemies: [
          { type: 'fighter', count: 10, positions: this._generateEnemyPositions(10) }
        ]
      },
      {
        id: 3,
        name: 'Ace in the Hole',
        description: 'Defeat the Ace squadron',
        timeLimit: 300,
        objectives: { destroy: 3 },
        enemies: [
          { type: 'ace', count: 3, positions: this._generateEnemyPositions(3, true) }
        ]
      }
    ];
  }

  /**
   * Generate enemy positions.
   * @private
   * @param {number} count
   * @param {boolean} far
   * @returns {Array<{x,y,z}>}
   */
  _generateEnemyPositions(count, far = false) {
    const positions = [];
    const range = far ? 200 : 100;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const distance = 50 + Math.random() * range;
      positions.push({
        x: Math.cos(angle) * distance,
        y: 20 + Math.random() * 50,
        z: Math.sin(angle) * distance
      });
    }

    return positions;
  }

  /**
   * Create the sky environment.
   * @private
   */
  _createEnvironment() {
    // Sky gradient (sphere with inverted normals)
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(COLORS.SKY_TOP) },
        uBottomColor: { value: new THREE.Color(COLORS.SKY_HORIZON) }
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
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          gl_FragColor = vec4(mix(uBottomColor, uTopColor, max(h, 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(this.skybox);

    // Cloud layer
    const cloudGeometry = new THREE.PlaneGeometry(1000, 1000, 20, 20);
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    this.clouds.rotation.x = -Math.PI / 2;
    this.clouds.position.y = -50;
    this.scene.add(this.clouds);

    // Ground reference (far below)
    const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      roughness: 1
    });
    this.terrain = new THREE.Mesh(groundGeometry, groundMaterial);
    this.terrain.rotation.x = -Math.PI / 2;
    this.terrain.position.y = -100;
    this.scene.add(this.terrain);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffaa00, 1.5);
    sunLight.position.set(-100, 50, -100);
    this.scene.add(sunLight);

    // Fog
    this.scene.fog = new THREE.FogExp2(0x6b5b95, 0.001);
  }

  /**
   * Create the player aircraft.
   * @private
   */
  _createAircraft() {
    const aircraftGroup = new THREE.Group();
    aircraftGroup.name = 'player_aircraft';

    // Fuselage
    const fuselageGeometry = new THREE.ConeGeometry(0.5, 4, 8);
    const fuselageMaterial = new THREE.MeshStandardMaterial({
      color: 0x4ecdc4,
      roughness: 0.3,
      metalness: 0.7
    });
    const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
    fuselage.rotation.x = Math.PI / 2;
    aircraftGroup.add(fuselage);

    // Wings
    const wingGeometry = new THREE.BoxGeometry(5, 0.1, 1.5);
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0x4ecdc4,
      roughness: 0.3,
      metalness: 0.7
    });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.z = 0.5;
    aircraftGroup.add(wings);

    // Tail
    const tailGeometry = new THREE.BoxGeometry(1.5, 0.1, 1);
    const tail = new THREE.Mesh(tailGeometry, wingMaterial);
    tail.position.set(0, 0.5, -1.5);
    tail.rotation.x = -0.3;
    aircraftGroup.add(tail);

    // Vertical stabilizer
    const stabilizerGeometry = new THREE.BoxGeometry(0.1, 0.8, 1);
    const stabilizer = new THREE.Mesh(stabilizerGeometry, wingMaterial);
    stabilizer.position.set(0, 0.5, -1.5);
    aircraftGroup.add(stabilizer);

    // Engine glow
    const engineGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const engineMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6b9d,
      emissive: 0xff6b9d,
      emissiveIntensity: 2
    });
    const engine = new THREE.Mesh(engineGeometry, engineMaterial);
    engine.position.z = -2;
    aircraftGroup.add(engine);

    // Engine light
    const engineLight = new THREE.PointLight(0xff6b9d, 2, 10);
    engineLight.position.z = -2;
    aircraftGroup.add(engineLight);

    aircraftGroup.position.set(0, 50, 0);
    this.scene.add(aircraftGroup);

    this.aircraft = aircraftGroup;

    // Camera setup
    this.cameraMode = 'chase';
    this._updateCamera();
  }

  /**
   * Spawn mission enemies.
   * @private
   */
  _spawnMissionEnemies() {
    const mission = this.missions[this.missionId - 1];
    if (!mission) return;

    for (const enemyGroup of mission.enemies) {
      for (const position of enemyGroup.positions) {
        const enemy = this._createEnemy(enemyGroup.type, position);
        this.enemies.push(enemy);
        this.totalEnemies++;
      }
    }

    Logger.info('SkyAceGame', `Spawned ${this.totalEnemies} enemies`);
  }

  /**
   * Create an enemy aircraft.
   * @private
   * @param {string} type
   * @param {{x,y,z}} position
   * @returns {Object}
   */
  _createEnemy(type, position) {
    const enemyGroup = new THREE.Group();

    let color, health, speed, size;

    switch (type) {
      case 'drone':
        color = 0x95a5a6;
        health = 50;
        speed = 10;
        size = 0.3;
        break;
      case 'fighter':
        color = 0xe74c3c;
        health = 100;
        speed = 20;
        size = 0.5;
        break;
      case 'ace':
        color = 0xff00ff;
        health = 200;
        speed = 25;
        size = 0.6;
        break;
      default:
        color = 0x95a5a6;
        health = 50;
        speed = 10;
        size = 0.3;
    }

    // Simple enemy shape (diamond)
    const geometry = new THREE.OctahedronGeometry(size * 2, 0);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.4,
      metalness: 0.6,
      emissive: color,
      emissiveIntensity: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    enemyGroup.add(mesh);

    // Glow effect
    const glowGeometry = new THREE.SphereGeometry(size, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    enemyGroup.add(glow);

    enemyGroup.position.set(position.x, position.y, position.z);
    this.scene.add(enemyGroup);

    return {
      mesh: enemyGroup,
      type,
      health,
      maxHealth: health,
      speed,
      alive: true,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        (Math.random() - 0.5) * speed * 0.3,
        (Math.random() - 0.5) * speed
      ),
      id: `enemy_${this.enemies.length}`
    };
  }

  /**
   * Set up camera.
   * @private
   */
  _setupCamera() {
    this.cameraMode = 'chase';
  }

  /**
   * Update game logic.
   * @param {number} deltaTime
   */
  update(deltaTime) {
    super.update(deltaTime);

    if (!this.isRunning) return;

    switch (this.gameState) {
      case GAME_STATES.COUNTDOWN:
        this._updateCountdown(deltaTime);
        break;

      case GAME_STATES.PLAYING:
        this._updatePlaying(deltaTime);
        break;

      case GAME_STATES.MISSION_COMPLETE:
      case GAME_STATES.GAME_OVER:
        // Wait for player input
        break;
    }

    // Update camera
    this._updateCamera();

    // Update HUD
    this._updateHUD();
  }

  /**
   * Update countdown.
   * @private
   * @param {number} deltaTime
   */
  _updateCountdown(deltaTime) {
    this.countdownTimer += deltaTime;

    if (this.countdownTimer >= 1) {
      this.countdownTimer -= 1;
      this.countdownValue--;

      if (this.countdownValue <= 0) {
        this.gameState = GAME_STATES.PLAYING;
        eventBus.emit('sky-ace:mission-start', this.missions[this.missionId - 1]);
      }
    }
  }

  /**
   * Update gameplay.
   * @private
   * @param {number} deltaTime
   */
  _updatePlaying(deltaTime) {
    this._handleInput(deltaTime);
    this._updateAircraft(deltaTime);
    this._updateEnemies(deltaTime);
    this._updateProjectiles(deltaTime);
    this._checkCollisions();
    this._checkMissionObjectives();

    // Combo timer
    if (this.hudData.comboTimer > 0) {
      this.hudData.comboTimer -= deltaTime;
      if (this.hudData.comboTimer <= 0) {
        this.hudData.combo = 0;
      }
    }
  }

  /**
   * Handle player input.
   * @private
   * @param {number} deltaTime
   */
  _handleInput(deltaTime) {
    const forward = this.inputManager.isActionPressed('FORWARD') ? 1 : 0;
    const backward = this.inputManager.isActionPressed('BACKWARD') ? 1 : 0;
    const left = this.inputManager.isActionPressed('LEFT') ? 1 : 0;
    const right = this.inputManager.isActionPressed('RIGHT') ? 1 : 0;

    // Pitch (W/S)
    this.pitch = MathUtils.lerp(this.pitch, (forward - backward), 5 * deltaTime);

    // Roll/Yaw (A/D)
    this.yaw = MathUtils.lerp(this.yaw, (right - left), 5 * deltaTime);
    this.roll = MathUtils.lerp(this.roll, (right - left) * 0.5, 5 * deltaTime);

    // Speed control
    const speedInput = this.inputManager.isActionPressed('RUN') ? 1 : 0;
    this.boostActive = speedInput > 0 && this.boostCooldown <= 0;

    if (this.boostActive) {
      this.boostTimer += deltaTime;
      if (this.boostTimer >= this.boostDuration) {
        this.boostActive = false;
        this.boostCooldown = this.boostCooldownDuration;
        this.boostTimer = 0;
      }
    } else if (this.boostCooldown > 0) {
      this.boostCooldown -= deltaTime;
    }

    // Shooting
    if (this.inputManager.isActionPressed('JUMP')) {
      this._fireMachineGun(deltaTime);
    }

    // Missiles
    if (this.inputManager.isActionPressed('INTERACT') && this.missileCount > 0) {
      this._fireMissile();
    }

    // Camera toggle
    if (this.inputManager.isKeyPressed('KeyC') && !this.cameraTogglePressed) {
      this._toggleCamera();
      this.cameraTogglePressed = true;
    }
    if (!this.inputManager.isKeyPressed('KeyC')) {
      this.cameraTogglePressed = false;
    }
  }

  /**
   * Update aircraft physics.
   * @private
   * @param {number} deltaTime
   */
  _updateAircraft(deltaTime) {
    if (!this.aircraft) return;

    const targetSpeed = this.boostActive ? this.boostSpeed : this.maxSpeed;
    this.aircraftSpeed = MathUtils.lerp(this.aircraftSpeed, targetSpeed, this.acceleration * deltaTime);

    // Apply rotations
    this.aircraft.rotation.x += this.pitch * deltaTime * 2;
    this.aircraft.rotation.y -= this.yaw * deltaTime * 2;
    this.aircraft.rotation.z = -this.roll * 0.5;

    // Move forward based on rotation
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(this.aircraft.quaternion);

    this.aircraft.position.add(direction.multiplyScalar(this.aircraftSpeed * deltaTime));

    // Altitude limits
    if (this.aircraft.position.y < 5) {
      this.aircraft.position.y = 5;
      this.aircraft.rotation.x = Math.max(0, this.aircraft.rotation.x);
    }
    if (this.aircraft.position.y > 200) {
      this.aircraft.position.y = 200;
    }

    // Bank smoothing
    this.aircraft.rotation.z = MathUtils.lerp(this.aircraft.rotation.z, -this.yaw * 0.5, 5 * deltaTime);

    // Update HUD data
    this.hudData.speed = Math.round(this.aircraftSpeed);
    this.hudData.altitude = Math.round(this.aircraft.position.y);
  }

  /**
   * Update enemies.
   * @private
   * @param {number} deltaTime
   */
  _updateEnemies(deltaTime) {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      // Simple AI: move in patterns
      enemy.mesh.position.add(
        enemy.velocity.clone().multiplyScalar(deltaTime)
      );

      // Bob up and down
      enemy.mesh.position.y += Math.sin(this.gameTime * 2 + enemy.mesh.id) * deltaTime * 2;

      // Rotate toward player (simple)
      if (this.aircraft) {
        const direction = new THREE.Vector3()
          .subVectors(this.aircraft.position, enemy.mesh.position)
          .normalize();

        enemy.mesh.lookAt(this.aircraft.position);
      }

      // Boundary check
      if (enemy.mesh.position.distanceTo(this.aircraft.position) > 300) {
        // Respawn closer
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 50;
        enemy.mesh.position.set(
          this.aircraft.position.x + Math.cos(angle) * distance,
          this.aircraft.position.y + (Math.random() - 0.5) * 30,
          this.aircraft.position.z + Math.sin(angle) * distance
        );
      }
    }
  }

  /**
   * Update projectiles.
   * @private
   * @param {number} deltaTime
   */
  _updateProjectiles(deltaTime) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.lifetime -= deltaTime;

      if (projectile.lifetime <= 0) {
        this.scene.remove(projectile.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      projectile.mesh.position.add(
        projectile.velocity.clone().multiplyScalar(deltaTime)
      );
    }
  }

  /**
   * Fire machine gun.
   * @private
   * @param {number} deltaTime
   */
  _fireMachineGun(deltaTime) {
    // Rate limit
    if (this.lastShotTime && this.gameTime - this.lastShotTime < 0.1) return;
    this.lastShotTime = this.gameTime;

    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(this.aircraft.quaternion);

    const projectileGeometry = new THREE.SphereGeometry(0.1, 4, 4);
    const projectileMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe66d,
      emissive: 0xffe66d,
      emissiveIntensity: 2
    });
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);

    projectile.position.copy(this.aircraft.position);
    projectile.position.add(direction.clone().multiplyScalar(2));

    this.scene.add(projectile);

    this.projectiles.push({
      mesh: projectile,
      velocity: direction.multiplyScalar(this.projectileSpeed),
      lifetime: this.projectileLifetime,
      damage: 10,
      type: 'bullet'
    });
  }

  /**
   * Fire a missile.
   * @private
   */
  _fireMissile() {
    if (this.missileCount <= 0) return;

    this.missileCount--;
    this.hudData.missiles = this.missileCount;

    // Find nearest enemy
    let nearest = null;
    let nearestDist = Infinity;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dist = enemy.mesh.position.distanceTo(this.aircraft.position);
      if (dist < nearestDist && dist < 200) {
        nearest = enemy;
        nearestDist = dist;
      }
    }

    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(this.aircraft.quaternion);

    const missileGeometry = new THREE.ConeGeometry(0.15, 0.8, 8);
    const missileMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6b9d,
      emissive: 0xff6b9d,
      emissiveIntensity: 1
    });
    const missile = new THREE.Mesh(missileGeometry, missileMaterial);
    missile.rotation.x = Math.PI / 2;

    missile.position.copy(this.aircraft.position);
    missile.position.add(direction.clone().multiplyScalar(2));

    this.scene.add(missile);

    this.projectiles.push({
      mesh: missile,
      velocity: direction.multiplyScalar(this.projectileSpeed * 0.8),
      lifetime: 5,
      damage: 50,
      type: 'missile',
      target: nearest
    });
  }

  /**
   * Check projectile-enemy collisions.
   * @private
   */
  _checkCollisions() {
    for (const projectile of this.projectiles) {
      if (projectile.lifetime <= 0) continue;

      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;

        const dist = projectile.mesh.position.distanceTo(enemy.mesh.position);
        if (dist < 2) {
          // Hit!
          enemy.health -= projectile.damage;
          projectile.lifetime = 0; // Destroy projectile

          // Create explosion effect
          this.createParticles(
            enemy.mesh.position,
            enemy.type === 'ace' ? 0xff00ff : 0xff6600,
            15,
            1
          );

          if (enemy.health <= 0) {
            this._destroyEnemy(enemy);
          }

          break; // Projectile can only hit one enemy
        }
      }
    }
  }

  /**
   * Destroy an enemy.
   * @private
   * @param {Object} enemy
   */
  _destroyEnemy(enemy) {
    enemy.alive = false;

    // Hide mesh
    enemy.mesh.visible = false;

    // Update score
    let points = 0;
    switch (enemy.type) {
      case 'drone':
        points = 100;
        break;
      case 'fighter':
        points = 500;
        break;
      case 'ace':
        points = 2000;
        break;
    }

    // Combo multiplier
    this.hudData.combo++;
    this.hudData.comboTimer = 5;
    const comboMultiplier = Math.min(this.hudData.combo, 5);
    points *= comboMultiplier;

    this.addScore(points);
    this.enemiesDestroyed++;

    // Remove from scene after delay
    setTimeout(() => {
      if (enemy.mesh.parent) {
        this.scene.remove(enemy.mesh);
      }
    }, 1000);

    Logger.info('SkyAceGame', `Destroyed ${enemy.type} (+${points} pts, x${comboMultiplier})`);
  }

  /**
   * Check mission completion.
   * @private
   */
  _checkMissionObjectives() {
    const mission = this.missions[this.missionId - 1];
    if (!mission) return;

    if (this.enemiesDestroyed >= mission.objectives.destroy) {
      this.gameState = GAME_STATES.MISSION_COMPLETE;
      this._missionComplete();
    }
  }

  /**
   * Mission complete.
   * @private
   */
  _missionComplete() {
    const mission = this.missions[this.missionId - 1];
    const timeBonus = Math.floor((mission.timeLimit - this.gameTime) * 10);
    const noDamageBonus = this.hudData.health >= 100 ? 5000 : 0;

    this.addScore(timeBonus + noDamageBonus);

    this.endGame({
      score: this.score,
      completed: true,
      reason: 'mission_complete',
      stats: {
        enemiesDestroyed: this.enemiesDestroyed,
        timeElapsed: this.gameTime,
        maxCombo: this.hudData.combo,
        healthRemaining: this.hudData.health,
        timeBonus,
        noDamageBonus
      }
    });
  }

  /**
   * Update camera position.
   * @private
   */
  _updateCamera() {
    if (!this.aircraft) return;

    const aircraftPos = this.aircraft.position;

    switch (this.cameraMode) {
      case 'chase': {
        const offset = new THREE.Vector3(0, 3, -8);
        offset.applyQuaternion(this.aircraft.quaternion);

        const targetPos = aircraftPos.clone().add(offset);
        this.camera.position.lerp(targetPos, 0.1);

        const lookTarget = aircraftPos.clone().add(
          new THREE.Vector3(0, 0, 10).applyQuaternion(this.aircraft.quaternion)
        );
        this.camera.lookAt(lookTarget);
        break;
      }

      case 'cockpit': {
        const cockpitOffset = new THREE.Vector3(0, 0.5, 1);
        cockpitOffset.applyQuaternion(this.aircraft.quaternion);
        this.camera.position.copy(aircraftPos).add(cockpitOffset);

        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(this.aircraft.quaternion);
        this.camera.quaternion.copy(this.aircraft.quaternion);
        break;
      }

      case 'cinematic': {
        // Orbit camera around action
        this.cinematicTimer += 0.01;
        const radius = 30;
        this.camera.position.set(
          aircraftPos.x + Math.cos(this.cinematicTimer) * radius,
          aircraftPos.y + 10,
          aircraftPos.z + Math.sin(this.cinematicTimer) * radius
        );
        this.camera.lookAt(aircraftPos);
        break;
      }
    }
  }

  /**
   * Toggle camera mode.
   * @private
   */
  _toggleCamera() {
    const modes = ['chase', 'cockpit', 'cinematic'];
    const currentIndex = modes.indexOf(this.cameraMode);
    this.cameraMode = modes[(currentIndex + 1) % modes.length];

    Logger.info('SkyAceGame', `Camera mode: ${this.cameraMode}`);
  }

  /**
   * Update HUD data.
   * @private
   */
  _updateHUD() {
    this.hudData.score = this.score;
    this.hudData.missiles = this.missileCount;

    // Lock-on logic
    if (this.missileCount > 0 && this.gameState === GAME_STATES.PLAYING) {
      let nearest = null;
      let nearestDist = Infinity;

      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const dist = enemy.mesh.position.distanceTo(this.aircraft.position);
        if (dist < nearestDist && dist < 150) {
          nearest = enemy;
          nearestDist = dist;
        }
      }

      if (nearest && nearestDist < 100) {
        this.lockOnTimer += 0.016; // Approximate delta
        this.hudData.lockOnProgress = Math.min(this.lockOnTimer / this.lockOnDuration, 1);
      } else {
        this.lockOnTimer = 0;
        this.hudData.lockOnProgress = 0;
      }
    }
  }

  /**
   * Get HUD data for rendering.
   * @returns {Object}
   */
  getHUDData() {
    return { ...this.hudData };
  }

  /**
   * Get game state.
   * @returns {string}
   */
  getGameState() {
    return this.gameState;
  }

  /**
   * Get countdown value.
   * @returns {number}
   */
  getCountdown() {
    return this.countdownValue;
  }

  /**
   * Clean up all game resources.
   */
  dispose() {
    // Remove aircraft
    if (this.aircraft) {
      this.scene.remove(this.aircraft);
    }

    // Remove enemies
    for (const enemy of this.enemies) {
      if (enemy.mesh) {
        this.scene.remove(enemy.mesh);
      }
    }
    this.enemies = [];

    // Remove projectiles
    for (const projectile of this.projectiles) {
      if (projectile.mesh) {
        this.scene.remove(projectile.mesh);
      }
    }
    this.projectiles = [];

    // Remove environment
    if (this.skybox) {
      this.scene.remove(this.skybox);
    }
    if (this.clouds) {
      this.scene.remove(this.clouds);
    }
    if (this.terrain) {
      this.scene.remove(this.terrain);
    }

    super.dispose();
    Logger.info('SkyAceGame', 'Disposed');
  }
}

export { SkyAceGame, GAME_STATES };