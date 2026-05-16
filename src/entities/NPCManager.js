/**
 * NPCManager - Spawns, schedules, and manages all NPCs in the world.
 */

import { NPC, NPC_STATES } from './NPC.js';
import { CONFIG } from '../constants/Config.js';
import { MathUtils } from '../utils/MathUtils.js';
import { Logger } from '../utils/Logger.js';

class NPCManager {
  constructor(sceneManager, physicsWorld, assetLoader, quality = 'MEDIUM') {
    this.sceneManager = sceneManager;
    this.physicsWorld = physicsWorld;
    this.assetLoader = assetLoader;
    this.qualityPreset = CONFIG.QUALITY[quality] || CONFIG.QUALITY.MEDIUM;

    this.npcs = new Map();
    this.spawnTimer = 0;
    this.updateTimer = 0;
    this.scheduleCycle = 0;

    this.isInitialized = false;
  }

  /**
   * Initialize NPC system.
   */
  init() {
    if (this.isInitialized) return;

    this._spawnInitialNPCs();
    this.isInitialized = true;

    Logger.info('NPCManager', `Initialized with ${this.npcs.size} NPCs`);
  }

  /**
   * Spawn initial set of NPCs.
   * @private
   */
  _spawnInitialNPCs() {
    const npcConfigs = [
      {
        id: 'npc_1',
        name: 'Ace',
        color: 0xff6b9d,
        height: 1.8,
        walkSpeed: 2.0,
        venue: 'sky-ace',
        dialogue: {
          greeting: 'Hey there, rookie! Looking to take to the skies?',
          options: [
            {
              text: 'How do I play Sky Ace?',
              response: 'Simple! Fly with WASD, shoot with SPACE. Take down enemies and don\'t crash!'
            },
            {
              text: 'Any tips for a beginner?',
              response: 'Stay mobile! The best pilots never stay still. And watch your six!'
            },
            {
              text: 'See you around!',
              response: 'Good luck up there, kid!'
            }
          ]
        }
      },
      {
        id: 'npc_2',
        name: 'Maya',
        color: 0x4ecdc4,
        height: 1.65,
        walkSpeed: 1.8,
        venue: 'neon-cafe',
        dialogue: {
          greeting: 'Welcome to Neon Cafe! The coffee here is almost as good as the view.',
          options: [
            {
              text: 'What\'s good here?',
              response: 'Try the Synthwave Latte. It glows in the dark!'
            },
            {
              text: 'Have you seen anything interesting around?',
              response: 'I heard there\'s a new flight school opening up. You should check it out!'
            },
            {
              text: 'Thanks, bye!',
              response: 'Come back anytime!'
            }
          ]
        }
      },
      {
        id: 'npc_3',
        name: 'Rico',
        color: 0xffe66d,
        height: 1.75,
        walkSpeed: 2.2,
        venue: null,
        dialogue: {
          greeting: 'Yo! This place is getting pretty lively lately.',
          options: [
            {
              text: 'What do you do around here?',
              response: 'Just chilling, watching people come and go. Thinking about learning to fly myself!'
            },
            {
              text: 'Any secrets I should know?',
              response: 'If you look closely at the buildings, some of them have hidden messages...'
            },
            {
              text: 'Later!',
              response: 'Peace out!'
            }
          ]
        }
      },
      {
        id: 'npc_4',
        name: 'Luna',
        color: 0x9b59b6,
        height: 1.6,
        walkSpeed: 1.6,
        venue: 'vapor-shop',
        dialogue: {
          greeting: 'Oh! A new face. Welcome to the neighborhood!',
          options: [
            {
              text: 'What is this place?',
              response: 'This is Neon City! We have arcades, cafes, and the best sunsets in the world.'
            },
            {
              text: 'How do I play games?',
              response: 'Walk up to any venue and press E. Sky Ace is the most popular right now!'
            },
            {
              text: 'Bye!',
              response: 'Have fun exploring!'
            }
          ]
        }
      }
    ];

    // Available character models
    const characterModels = [
      'character-a.glb', 'character-b.glb', 'character-c.glb', 'character-d.glb',
      'character-e.glb', 'character-f.glb', 'character-g.glb', 'character-h.glb',
      'character-i.glb', 'character-j.glb', 'character-k.glb', 'character-l.glb',
      'character-m.glb', 'character-n.glb', 'character-o.glb', 'character-p.glb',
      'character-q.glb', 'character-r.glb'
    ];

    // Limit NPCs based on quality preset
    const maxNPCs = this.qualityPreset.maxNPCs;
    const configsToSpawn = npcConfigs.slice(0, maxNPCs);

    for (let i = 0; i < configsToSpawn.length; i++) {
      const config = configsToSpawn[i];
      const modelPath = `/models/characters/${characterModels[i % characterModels.length]}`;

      const npc = new NPC(
        this.sceneManager,
        this.physicsWorld,
        config.id,
        { ...config, modelPath },
        this.assetLoader
      );

      const position = this._getRandomStreetPosition();
      npc.spawn(position);

      this.npcs.set(config.id, npc);
    }

    Logger.info('NPCManager', `Spawned ${this.npcs.size}/${maxNPCs} NPCs (${this.qualityPreset === CONFIG.QUALITY.LOW ? 'LOW' : (this.qualityPreset === CONFIG.QUALITY.HIGH ? 'HIGH' : 'MEDIUM')} quality)`);
  }

  /**
   * Spawn a random NPC.
   * @private
   * @param {string} id
   */
  _spawnRandomNPC(id) {
    const names = ['Alex', 'Sam', 'Jordan', 'Casey', 'Taylor', 'Quinn', 'Avery', 'Riley'];
    const name = MathUtils.randomChoice(names);

    const characterModels = [
      'character-a.glb', 'character-b.glb', 'character-c.glb', 'character-d.glb',
      'character-e.glb', 'character-f.glb', 'character-g.glb', 'character-h.glb',
      'character-i.glb', 'character-j.glb', 'character-k.glb', 'character-l.glb',
      'character-m.glb', 'character-n.glb', 'character-o.glb', 'character-p.glb',
      'character-q.glb', 'character-r.glb'
    ];
    const modelPath = `/models/characters/${MathUtils.randomChoice(characterModels)}`;

    const npc = new NPC(
      this.sceneManager,
      this.physicsWorld,
      id,
      {
        name,
        color: MathUtils.randomChoice([0xff6b9d, 0x4ecdc4, 0xffe66d, 0x9b59b6, 0x3498db, 0xe74c3c]),
        height: MathUtils.randomRange(1.5, 1.9),
        walkSpeed: MathUtils.randomRange(1.5, 2.5),
        modelPath
      },
      this.assetLoader
    );

    const position = this._getRandomStreetPosition();
    npc.spawn(position);

    this.npcs.set(id, npc);
  }

  /**
   * Get a random position on the street.
   * @private
   * @returns {{x,y,z}}
   */
  _getRandomStreetPosition() {
    const streetWidth = CONFIG.WORLD.STREET_WIDTH - 4;
    const streetLength = CONFIG.WORLD.STREET_LENGTH - 10;

    return {
      x: MathUtils.randomRange(-streetWidth / 2, streetWidth / 2),
      y: 0.5,
      z: MathUtils.randomRange(-streetLength / 2, streetLength / 2)
    };
  }

  /**
   * Update all NPCs.
   * @param {number} deltaTime
   * @param {THREE.Vector3} playerPosition
   */
  update(deltaTime, playerPosition) {
    this.scheduleCycle += deltaTime;

    for (const [, npc] of this.npcs) {
      npc.update(deltaTime, playerPosition);

      // Simple AI: change behavior occasionally
      if (npc.state === NPC_STATES.IDLE && Math.random() < 0.002) {
        const newPosition = this._getRandomStreetPosition();
        npc.walkTo(newPosition);
      }

      // NPCs entering/exiting buildings
      if (npc.state === NPC_STATES.IDLE && npc.venue && Math.random() < 0.0005) {
        if (npc.isVisible) {
          // Enter building
          npc.enterBuilding({
            x: npc.venue === 'sky-ace' ? -8 : 8,
            y: 0,
            z: -60
          });
        }
      }
    }
  }

  /**
   * Get nearest NPC to a position.
   * @param {THREE.Vector3} position
   * @param {number} maxDistance
   * @returns {NPC|null}
   */
  getNearestNPC(position, maxDistance = 5) {
    let nearest = null;
    let nearestDist = Infinity;

    for (const [, npc] of this.npcs) {
      const dist = npc.getPosition().distanceTo(position);
      if (dist < maxDistance && dist < nearestDist) {
        nearest = npc;
        nearestDist = dist;
      }
    }

    return nearest;
  }

  /**
   * Get NPC by ID.
   * @param {string} id
   * @returns {NPC|null}
   */
  getNPC(id) {
    return this.npcs.get(id) || null;
  }

  /**
   * Get all NPCs.
   * @returns {Array<NPC>}
   */
  getAllNPCs() {
    return Array.from(this.npcs.values());
  }

  /**
   * Clean up all NPCs.
   */
  dispose() {
    for (const [, npc] of this.npcs) {
      npc.dispose();
    }
    this.npcs.clear();

    Logger.info('NPCManager', 'Disposed');
  }
}

export { NPCManager };