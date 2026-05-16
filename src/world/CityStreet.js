/**
 * CityStreet - Main world composition for Neon City Arcade.
 * Creates the street, buildings, props, lighting, and environment.
 * Single street scene as specified in Phase 1.
 */

import * as THREE from 'three';
import { CONFIG } from '../constants/Config.js';
import { COLORS } from '../constants/Colors.js';
import { MathUtils } from '../utils/MathUtils.js';
import { Logger } from '../utils/Logger.js';

class CityStreet {
  constructor(sceneManager, physicsWorld, assetLoader, quality = 'MEDIUM') {
    this.sceneManager = sceneManager;
    this.physicsWorld = physicsWorld;
    this.assetLoader = assetLoader;
    this.qualityPreset = CONFIG.QUALITY[quality] || CONFIG.QUALITY.MEDIUM;

    this.streetLength = CONFIG.WORLD.STREET_LENGTH;
    this.streetWidth = CONFIG.WORLD.STREET_WIDTH;
    this.sidewalkWidth = CONFIG.WORLD.SIDEWALK_WIDTH;
    this.buildingDepth = CONFIG.WORLD.BUILDING_DEPTH;

    this.streetGroup = null;
    this.buildingsGroup = null;
    this.propsGroup = null;
    this.boundaries = [];

    this.isInitialized = false;
  }

  /**
   * Initialize the city street scene.
   */
  async init() {
    if (this.isInitialized) return;

    Logger.info('CityStreet', 'Building city street...');

    // Create groups
    this.streetGroup = new THREE.Group();
    this.streetGroup.name = 'street';
    this.buildingsGroup = new THREE.Group();
    this.buildingsGroup.name = 'buildings';
    this.propsGroup = new THREE.Group();
    this.propsGroup.name = 'props';

    // Build street
    this._createStreetSurface();
    this._createSidewalks();
    this._createBuildings();
    this._createStreetProps();
    this._createBoundaries();

    // Add groups to scene
    this.sceneManager.add(this.streetGroup);
    this.sceneManager.add(this.buildingsGroup);
    this.sceneManager.add(this.propsGroup);

    // Note: Fog is set up by Environment class (quality-aware)

    this.isInitialized = true;
    Logger.info('CityStreet', 'City street built');
  }

  /**
   * Create the asphalt street surface.
   * @private
   */
  _createStreetSurface() {
    // Asphalt material
    const asphaltMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.STREET,
      roughness: 0.9,
      metalness: 0.1
    });

    // Main street
    const streetGeometry = new THREE.PlaneGeometry(this.streetWidth, this.streetLength);
    const streetMesh = new THREE.Mesh(streetGeometry, asphaltMaterial);
    streetMesh.rotation.x = -Math.PI / 2;
    streetMesh.receiveShadow = true;
    this.streetGroup.add(streetMesh);

    // Street markings (center line)
    const lineGeometry = new THREE.PlaneGeometry(0.3, this.streetLength);
    const lineMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.7
    });
    const centerLine = new THREE.Mesh(lineGeometry, lineMaterial);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.01;
    this.streetGroup.add(centerLine);

    // Crosswalks at ends
    this._createCrosswalk(-this.streetLength / 2 + 2);
    this._createCrosswalk(this.streetLength / 2 - 2);

    // Physics ground
    this.physicsWorld.createGround(0);
  }

  /**
   * Create a crosswalk.
   * @private
   * @param {number} zPosition
   */
  _createCrosswalk(zPosition) {
    const stripes = 8;
    const stripeWidth = this.streetWidth / (stripes * 2);

    for (let i = 0; i < stripes; i++) {
      const stripeGeometry = new THREE.PlaneGeometry(stripeWidth, 2);
      const stripeMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
      });
      const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(
        -this.streetWidth / 2 + stripeWidth * 0.5 + stripeWidth * 2 * i,
        0.02,
        zPosition
      );
      this.streetGroup.add(stripe);
    }
  }

  /**
   * Create sidewalks on both sides.
   * @private
   */
  _createSidewalks() {
    const sidewalkMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.SIDEWALK,
      roughness: 0.8,
      metalness: 0.05
    });

    const sidewalkGeometry = new THREE.BoxGeometry(
      this.sidewalkWidth,
      0.2,
      this.streetLength
    );

    // North sidewalk
    const northSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
    northSidewalk.position.set(
      -this.streetWidth / 2 - this.sidewalkWidth / 2,
      0.1,
      0
    );
    northSidewalk.receiveShadow = true;
    northSidewalk.castShadow = true;
    this.streetGroup.add(northSidewalk);

    // North sidewalk physics
    this.physicsWorld.createBox(
      { x: northSidewalk.position.x, y: 0.1, z: 0 },
      { x: this.sidewalkWidth / 2, y: 0.1, z: this.streetLength / 2 },
      0
    );

    // South sidewalk
    const southSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
    southSidewalk.position.set(
      this.streetWidth / 2 + this.sidewalkWidth / 2,
      0.1,
      0
    );
    southSidewalk.receiveShadow = true;
    southSidewalk.castShadow = true;
    this.streetGroup.add(southSidewalk);

    // South sidewalk physics
    this.physicsWorld.createBox(
      { x: southSidewalk.position.x, y: 0.1, z: 0 },
      { x: this.sidewalkWidth / 2, y: 0.1, z: this.streetLength / 2 },
      0
    );

    // Curbs
    this._createCurb(-this.streetWidth / 2 - this.sidewalkWidth);
    this._createCurb(this.streetWidth / 2 + this.sidewalkWidth);
  }

  /**
   * Create a curb.
   * @private
   * @param {number} xPosition
   */
  _createCurb(xPosition) {
    const curbGeometry = new THREE.BoxGeometry(0.3, 0.25, this.streetLength);
    const curbMaterial = new THREE.MeshStandardMaterial({
      color: 0x95a5a6,
      roughness: 0.9
    });
    const curb = new THREE.Mesh(curbGeometry, curbMaterial);
    curb.position.set(xPosition, 0.125, 0);
    curb.castShadow = true;
    this.streetGroup.add(curb);
  }

  /**
   * Create buildings along both sides.
   * @private
   */
  _createBuildings() {
    // Building configurations: [xOffset, zPosition, width, depth, height, color, type]
    // Quality determines how many buildings we show
    const allBuildings = [
      // North side (negative x)
      [-8, -60, 12, this.buildingDepth, 8, 0xf7fff7, 'venue-sky-ace'],
      [-8, -20, 12, this.buildingDepth, 10, 0xe8e8e8, 'locked'],
      [-8, 20, 12, this.buildingDepth, 6, 0xdcdcdc, 'locked'],
      [-8, 60, 10, this.buildingDepth, 7, 0xc0c0c0, 'park'],
      // South side (positive x)
      [8, -60, 10, this.buildingDepth, 5, 0x2ec4b6, 'cafe'],
      [8, -20, 12, this.buildingDepth, 9, 0xff6b9d, 'shop'],
      [8, 20, 12, this.buildingDepth, 8, 0x4ecdc4, 'locked'],
      [8, 60, 10, this.buildingDepth, 4, 0x45b7d1, 'beach-view']
    ];

    // Always include essential venues (sky-ace HQ, cafe, shop) + locked/park fillers
    const count = this.qualityPreset.buildings || 8;
    const buildings = allBuildings.slice(0, count);

    for (const [x, z, width, depth, height, color, type] of buildings) {
      this._createBuilding(x, z, width, depth, height, color, type);
    }
  }

  /**
   * Create a single building.
   * @private
   */
  _createBuilding(x, z, width, depth, height, color, type) {
    const buildingGroup = new THREE.Group();

    // Main building block
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.1
    });
    const building = new THREE.Mesh(geometry, material);
    building.position.y = height / 2;
    building.castShadow = true;
    building.receiveShadow = true;
    buildingGroup.add(building);

    // Roof detail
    const roofGeometry = new THREE.BoxGeometry(width + 0.5, 0.3, depth + 0.5);
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x34495e,
      roughness: 0.9
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = height + 0.15;
    roof.castShadow = true;
    buildingGroup.add(roof);

    // Windows (only on medium/high)
    if (this.qualityPreset.windowLights) {
      this._addWindows(buildingGroup, width, height, depth, x > 0 ? 'south' : 'north');
    }

    // Neon sign for venues (only on medium/high)
    if (this.qualityPreset.windowLights && (type === 'venue-sky-ace' || type === 'cafe' || type === 'shop')) {
      this._addNeonSign(buildingGroup, x, z, width, depth, height, type);
    }

    buildingGroup.position.set(x, 0, z);
    this.buildingsGroup.add(buildingGroup);

    // Building physics
    this.physicsWorld.createBox(
      { x, y: height / 2, z },
      { x: width / 2, y: height / 2, z: depth / 2 },
      0
    );
  }

  /**
   * Add windows to a building.
   * @private
   */
  _addWindows(group, width, height, depth, side) {
    const windowWidth = 0.8;
    const windowHeight = 1.2;
    const windowSpacing = 2;
    const floors = Math.floor(height / 3);

    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0xffee88,
      emissive: 0xffaa00,
      emissiveIntensity: 0.3,
      roughness: 0.2,
      metalness: 0.8
    });

    const darkWindowMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      roughness: 0.1,
      metalness: 0.9
    });

    for (let floor = 1; floor < floors; floor++) {
      const windowsPerFloor = Math.floor((width - 1) / windowSpacing);

      for (let w = 0; w < windowsPerFloor; w++) {
        const isLit = Math.random() > 0.4; // 60% chance of lit window
        const windowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);
        const windowMesh = new THREE.Mesh(
          windowGeometry,
          isLit ? windowMaterial : darkWindowMaterial
        );

        const xOffset = -width / 2 + 1 + w * windowSpacing;
        const zOffset = side === 'north' ? -depth / 2 - 0.01 : depth / 2 + 0.01;
        const rotationY = side === 'north' ? 0 : Math.PI;

        windowMesh.position.set(xOffset, floor * 3, zOffset);
        windowMesh.rotation.y = rotationY;
        group.add(windowMesh);
      }
    }
  }

  /**
   * Add a neon sign to a building.
   * @private
   */
  _addNeonSign(group, x, z, width, depth, height, type) {
    let signColor, signText;

    switch (type) {
      case 'venue-sky-ace':
        signColor = 0xff6b9d;
        signText = 'SKY ACE';
        break;
      case 'cafe':
        signColor = 0x4ecdc4;
        signText = 'NEON CAFE';
        break;
      case 'shop':
        signColor = 0xffe66d;
        signText = 'VAPOR SHOP';
        break;
      default:
        signColor = 0xffffff;
        signText = 'OPEN';
    }

    // Sign backing
    const signWidth = width * 0.8;
    const signHeight = 1.2;
    const signGeometry = new THREE.BoxGeometry(signWidth, signHeight, 0.2);
    const signMaterial = new THREE.MeshStandardMaterial({
      color: 0x0e0f13,
      roughness: 0.9
    });
    const signMesh = new THREE.Mesh(signGeometry, signMaterial);
    signMesh.position.set(0, height + 1, x > 0 ? depth / 2 + 0.1 : -depth / 2 - 0.1);
    signMesh.rotation.y = x > 0 ? 0 : Math.PI;
    group.add(signMesh);

    // Neon glow (emissive strip)
    const glowGeometry = new THREE.BoxGeometry(signWidth + 0.2, signHeight + 0.2, 0.1);
    const glowMaterial = new THREE.MeshStandardMaterial({
      color: signColor,
      emissive: signColor,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.9
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.copy(signMesh.position);
    glowMesh.rotation.y = signMesh.rotation.y;
    glowMesh.position.z += x > 0 ? 0.05 : -0.05;
    group.add(glowMesh);

    // Point light for sign glow
    const signLight = new THREE.PointLight(signColor, 2, 15);
    signLight.position.copy(glowMesh.position);
    signLight.position.y -= 0.5;
    group.add(signLight);
  }

  /**
   * Create street props (lamps, trees, benches, etc.).
   * Quality determines how many props we create.
   * @private
   */
  _createStreetProps() {
    if (!this.qualityPreset.props) return;

    // Street lamps
    const lampPositions = [];
    const lampSpacing = 40; // Sparse spacing to reduce lights
    const numLamps = Math.floor(this.streetLength / lampSpacing);

    for (let i = 0; i <= numLamps; i++) {
      const z = -this.streetLength / 2 + i * lampSpacing;
      lampPositions.push(
        { x: -this.streetWidth / 2 - this.sidewalkWidth / 2, z },
        { x: this.streetWidth / 2 + this.sidewalkWidth / 2, z }
      );
    }

    // Only add every other lamp to reduce light count
    for (let i = 0; i < lampPositions.length; i += 2) {
      this._createStreetLamp(lampPositions[i].x, lampPositions[i].z);
    }

    // Palm trees (only on medium/high)
    if (this.qualityPreset.particles) {
      const treePositions = [];
      const treeSpacing = 50;
      const numTrees = Math.floor(this.streetLength / treeSpacing);

      for (let i = 0; i <= Math.min(numTrees, 3); i++) {
        const z = -this.streetLength / 2 + i * treeSpacing + 5;
        treePositions.push(
          { x: -this.streetWidth / 2 - this.sidewalkWidth + 0.5, z },
          { x: this.streetWidth / 2 + this.sidewalkWidth - 0.5, z }
        );
      }

      for (const pos of treePositions) {
        this._createPalmTree(pos.x, pos.z);
      }
    }

    // Benches (only a couple)
    this._createBench(-this.streetWidth / 2 - this.sidewalkWidth + 0.5, 0);
    this._createBench(this.streetWidth / 2 + this.sidewalkWidth - 0.5, 40);
  }

  /**
   * Create a street lamp.
   * @private
   */
  _createStreetLamp(x, z) {
    const lampGroup = new THREE.Group();

    // Pole
    const poleGeometry = new THREE.CylinderGeometry(0.08, 0.1, 4, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      roughness: 0.7,
      metalness: 0.6
    });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 2;
    pole.castShadow = true;
    lampGroup.add(pole);

    // Lamp head
    const headGeometry = new THREE.BoxGeometry(0.6, 0.2, 0.3);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0x34495e,
      roughness: 0.5,
      metalness: 0.7
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 4;
    lampGroup.add(head);

    // Light bulb (emissive)
    const bulbGeometry = new THREE.PlaneGeometry(0.4, 0.1);
    const bulbMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcc88,
      emissive: 0xffaa00,
      emissiveIntensity: 1,
      side: THREE.DoubleSide
    });
    const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
    bulb.position.y = 3.95;
    bulb.rotation.x = Math.PI / 2;
    lampGroup.add(bulb);

    // Point light (only on medium/high)
    if (this.qualityPreset.maxLights > 4) {
      const light = new THREE.PointLight(0xffcc88, 2, 10, 2);
      light.position.y = 3.8;
      light.castShadow = false; // Never cast shadows from street lamps
      lampGroup.add(light);
    }

    lampGroup.position.set(x, 0.2, z);
    this.propsGroup.add(lampGroup);
  }

  /**
   * Create a low-poly palm tree.
   * @private
   */
  _createPalmTree(x, z) {
    const treeGroup = new THREE.Group();

    // Trunk (cylinder with slight curve)
    const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.25, 4, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b6f47,
      roughness: 0.9
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Palm fronds
    const frondMaterial = new THREE.MeshStandardMaterial({
      color: 0x27ae60,
      roughness: 0.8,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const frondGeometry = new THREE.ConeGeometry(0.3, 2, 4);
      const frond = new THREE.Mesh(frondGeometry, frondMaterial);
      frond.position.set(
        Math.cos(angle) * 0.5,
        4,
        Math.sin(angle) * 0.5
      );
      frond.rotation.x = Math.PI / 3;
      frond.rotation.y = angle;
      frond.castShadow = true;
      treeGroup.add(frond);
    }

    // Top leaf cluster
    const topGeometry = new THREE.ConeGeometry(0.5, 1, 6);
    const top = new THREE.Mesh(topGeometry, frondMaterial);
    top.position.y = 4.5;
    treeGroup.add(top);

    treeGroup.position.set(x, 0, z);
    this.propsGroup.add(treeGroup);
  }

  /**
   * Create a bench.
   * @private
   */
  _createBench(x, z) {
    const benchGroup = new THREE.Group();

    // Seat
    const seatGeometry = new THREE.BoxGeometry(1.8, 0.1, 0.6);
    const seatMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b6f47,
      roughness: 0.9
    });
    const seat = new THREE.Mesh(seatGeometry, seatMaterial);
    seat.position.y = 0.5;
    seat.castShadow = true;
    benchGroup.add(seat);

    // Backrest
    const backGeometry = new THREE.BoxGeometry(1.8, 0.6, 0.08);
    const back = new THREE.Mesh(backGeometry, seatMaterial);
    back.position.set(0, 0.85, -0.26);
    back.castShadow = true;
    benchGroup.add(back);

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.08, 0.5, 0.5);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      roughness: 0.6,
      metalness: 0.7
    });

    for (const lx of [-0.8, 0.8]) {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(lx, 0.25, 0);
      leg.castShadow = true;
      benchGroup.add(leg);
    }

    benchGroup.position.set(x, 0.2, z);

    // Rotate if on north side
    if (x < 0) {
      benchGroup.rotation.y = Math.PI;
    }

    this.propsGroup.add(benchGroup);
  }

  /**
   * Create invisible boundary walls.
   * @private
   */
  _createBoundaries() {
    const boundaryOffset = CONFIG.WORLD.BOUNDARY_OFFSET;
    const wallHeight = 10;

    // North wall
    this._createBoundaryWall(
      0, wallHeight / 2, -this.streetLength / 2 - boundaryOffset,
      this.streetWidth + this.sidewalkWidth * 2 + this.buildingDepth * 2, wallHeight, 1
    );

    // South wall
    this._createBoundaryWall(
      0, wallHeight / 2, this.streetLength / 2 + boundaryOffset,
      this.streetWidth + this.sidewalkWidth * 2 + this.buildingDepth * 2, wallHeight, 1
    );
  }

  /**
   * Create a single boundary wall.
   * @private
   */
  _createBoundaryWall(x, y, z, width, height, depth) {
    // Visual (very faint, almost invisible)
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.0,
      visible: false
    });
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(x, y, z);
    this.sceneManager.add(wall, `boundary_${x}_${z}`);

    // Physics
    this.physicsWorld.createBox(
      { x, y, z },
      { x: width / 2, y: height / 2, z: depth / 2 },
      0
    );
  }

  /**
   * Get a random position on the street for spawning.
   * @returns {{x: number, y: number, z: number}}
   */
  getRandomStreetPosition() {
    const x = MathUtils.randomRange(
      -this.streetWidth / 2 + 2,
      this.streetWidth / 2 - 2
    );
    const z = MathUtils.randomRange(
      -this.streetLength / 2 + 5,
      this.streetLength / 2 - 5
    );
    return { x, y: 0.5, z };
  }

  /**
   * Get a random position on the sidewalk.
   * @param {string} side - 'north' or 'south'
   * @returns {{x: number, y: number, z: number}}
   */
  getRandomSidewalkPosition(side) {
    const xOffset = side === 'north'
      ? -this.streetWidth / 2 - this.sidewalkWidth / 2
      : this.streetWidth / 2 + this.sidewalkWidth / 2;

    const z = MathUtils.randomRange(
      -this.streetLength / 2 + 5,
      this.streetLength / 2 - 5
    );

    return { x: xOffset, y: 0.3, z };
  }

  /**
   * Clean up all resources.
   */
  dispose() {
    if (this.streetGroup) {
      this.sceneManager.remove(this.streetGroup, true);
    }
    if (this.buildingsGroup) {
      this.sceneManager.remove(this.buildingsGroup, true);
    }
    if (this.propsGroup) {
      this.sceneManager.remove(this.propsGroup, true);
    }

    Logger.info('CityStreet', 'Disposed');
  }
}

export { CityStreet };