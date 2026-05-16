/**
 * GameController - Central orchestrator for Neon City Arcade.
 * Manages the game state machine, coordinates all subsystems,
 * and handles transitions between exploration and game modes.
 */

import * as THREE from 'three';
import { eventBus } from './EventBus.js';
import { SceneManager } from './SceneManager.js';
import { Renderer } from './Renderer.js';
import { PhysicsWorld } from './PhysicsWorld.js';
import { AssetLoader } from './AssetLoader.js';
import { InputManager } from './InputManager.js';
import { CityStreet } from '../world/CityStreet.js';
import { Environment } from '../world/Environment.js';
import { Player } from '../entities/Player.js';
import { NPCManager } from '../entities/NPCManager.js';
import { VenueManager } from '../venues/VenueManager.js';
import { UIManager } from '../ui/UIManager.js';
import { Storage } from '../utils/Storage.js';
import { Logger } from '../utils/Logger.js';
import { CONFIG } from '../constants/Config.js';

// Game states
const STATES = {
  LOADING: 'LOADING',
  MAIN_MENU: 'MAIN_MENU',
  EXPLORING: 'EXPLORING',
  ENTERING_VENUE: 'ENTERING_VENUE',
  IN_VENUE: 'IN_VENUE',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
  EXITING_VENUE: 'EXITING_VENUE',
  SETTINGS: 'SETTINGS'
};

class GameController {
  constructor(canvas, uiContainer, quality = CONFIG.QUALITY.DEFAULT) {
    this.canvas = canvas;
    this.uiContainer = uiContainer;
    this.quality = quality;
    this.qualityPreset = CONFIG.QUALITY[quality] || CONFIG.QUALITY.MEDIUM;

    // Core systems
    this.sceneManager = new SceneManager();
    this.renderer = new Renderer(canvas, quality);
    this.physicsWorld = new PhysicsWorld();
    this.assetLoader = new AssetLoader();
    this.inputManager = new InputManager();
    this.storage = new Storage();

    // World systems
    this.cityStreet = null;
    this.player = null;
    this.npcManager = null;
    this.venueManager = null;

    // UI
    this.uiManager = null;

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 10);

    // State machine
    this.state = STATES.LOADING;
    this.previousState = null;
    this.currentGame = null;
    this.currentVenue = null;

    // Timing
    this.clock = new THREE.Clock();
    this.deltaTime = 0;
    this.totalTime = 0;

    // Is the game running?
    this.isRunning = false;
    this.isDisposed = false;

    // Animation frame ID
    this.rafId = null;

    // Interaction state
    this.activeNPCDialogue = null;
    this.nearbyVenueId = null;

    Logger.info('GameController', `Initialized (${quality} quality)`);
  }

  /**
   * Initialize the game. Call once at startup.
   */
  async init() {
    console.log('[GameController] Initializing game...');
    Logger.info('GameController', 'Initializing game...');

    // Set up loading progress
    this.assetLoader.setProgressCallback(ratio => {
      eventBus.emit('loading:progress', ratio);
    });

    this.assetLoader.setCompleteCallback(() => {
      eventBus.emit('loading:complete');
    });

    // Initialize UI
    console.log('[GameController] Initializing UI...');
    this.uiManager = new UIManager(this.uiContainer);
    this.uiManager.init();

    // Listen for UI events
    this._setupEventListeners();

    // Preload critical assets
    console.log('[GameController] Preloading assets...');
    await this._preloadAssets();

    // Set up post-processing
    console.log('[GameController] Setting up renderer...');
    this.renderer.setupPostProcessing(this.sceneManager.getScene(), this.camera);

    // Create the world
    console.log('[GameController] Creating world...');
    await this._createWorld();

    // Show main menu
    console.log('[GameController] Showing main menu...');
    this.setState(STATES.MAIN_MENU);
    this.uiManager.showMainMenu();

    console.log('[GameController] Initialization complete');
    Logger.info('GameController', 'Initialization complete');
  }

  /**
   * Preload critical assets needed before game starts.
   * @private
   */
  async _preloadAssets() {
    // Phase 1: We generate all geometry procedurally, so no external assets needed.
    // When we add models/textures later, uncomment the loading below.
    console.log('[GameController] Skipping asset preload - using procedural generation');

    /*
    const criticalAssets = [
      { type: 'texture', path: '/textures/environment/sky-gradient.png' },
      { type: 'texture', path: '/textures/environment/street-asphalt.png' },
      { type: 'model', path: '/models/characters/player-avatar.glb' }
    ];

    try {
      await this.assetLoader.preload(criticalAssets);
    } catch (e) {
      Logger.warn('GameController', 'Some assets failed to preload, will use fallbacks', e);
    }
    */
  }

  /**
   * Create the game world.
   * @private
   */
  async _createWorld() {
    console.log('[GameController] Creating world...');

    // Create environment (sky + main lights) with quality preset
    console.log('[GameController] Creating environment...');
    this.environment = new Environment(this.sceneManager, this.quality);
    this.environment.init();
    console.log('[GameController] Environment created');

    // Create city street with quality preset
    console.log('[GameController] Creating city street...');
    this.cityStreet = new CityStreet(this.sceneManager, this.physicsWorld, this.assetLoader, this.quality);
    await this.cityStreet.init();
    console.log('[GameController] City street created');

    // Create player at spawn position
    console.log('[GameController] Creating player...');
    // User's custom Bone model: true height 7.34 units, bottom at y=2.79
    // Target ~1.6m height => scale = 1.6 / 7.34 = 0.22
    const playerModelConfig = {
      scale: 0.22,
      offsetY: -1.46,
      rotationY: 0
    };
    this.player = new Player(
      this.sceneManager,
      this.physicsWorld,
      this.inputManager,
      this.camera,
      this.assetLoader,
      '/models/player/Bone.gltf',
      playerModelConfig
    );
    this.player.init();

    // Load player model (async, non-blocking — procedural mesh is fallback)
    this.player.loadModel('/models/player/Bone.gltf').then(() => {
      console.log('[GameController] Player model loaded');
    }).catch(err => {
      console.warn('[GameController] Player model failed to load, using procedural fallback', err);
    });

    console.log('[GameController] Player created');

    // Create NPC manager
    console.log('[GameController] Creating NPCs...');
    this.npcManager = new NPCManager(
      this.sceneManager,
      this.physicsWorld,
      this.assetLoader,
      this.quality
    );
    this.npcManager.init();
    console.log('[GameController] NPCs created');

    // Create venue manager
    console.log('[GameController] Creating venues...');
    this.venueManager = new VenueManager(
      this.sceneManager,
      this.physicsWorld,
      this.assetLoader,
      this.player
    );
    this.venueManager.init();
    console.log('[GameController] Venues created');

    // Set initial camera position
    this.camera.position.copy(this.player.getPosition());
    this.camera.position.y += 2;
    this.camera.position.z += 6;

    console.log('[GameController] World creation complete');
  }

  /**
   * Set up event listeners for cross-system communication.
   * @private
   */
  _setupEventListeners() {
    // UI events
    eventBus.on('ui:start-game', () => this.startExploration());
    eventBus.on('ui:resume-game', () => this.resumeGame());
    eventBus.on('ui:open-settings', () => this.setState(STATES.SETTINGS));
    eventBus.on('ui:close-settings', () => this.setState(STATES.PREVIOUS));
    eventBus.on('ui:quit-game', () => this.quitToMenu());

    // Exploration events
    eventBus.on('player:near-venue', (venueId) => {
      this.nearbyVenueId = venueId;
    });
    eventBus.on('player:far-from-venue', () => {
      this.nearbyVenueId = null;
    });
    eventBus.on('player:interact-venue', (venueId) => {
      this.enterVenue(venueId);
    });

    // Venue events
    eventBus.on('venue:enter-complete', () => {
      this.setState(STATES.IN_VENUE);
    });
    eventBus.on('venue:start-game', (gameType) => {
      this.startGame(gameType);
    });
    eventBus.on('venue:exit-request', () => {
      this.exitVenue();
    });

    // Game events
    eventBus.on('game:pause', () => this.pauseGame());
    eventBus.on('game:resume', () => this.resumeGame());
    eventBus.on('game:gameover', (result) => {
      this.handleGameOver(result);
    });
    eventBus.on('game:quit', () => {
      this.quitGame();
    });

    // Settings
    eventBus.on('settings:changed', (settings) => {
      this.applySettings(settings);
    });
  }

  /**
   * Start the game loop.
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.clock.start();
    this._gameLoop();

    Logger.info('GameController', 'Game loop started');
  }

  /**
   * Stop the game loop.
   */
  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    Logger.info('GameController', 'Game loop stopped');
  }

  /**
   * The main game loop. Called via requestAnimationFrame.
   * @private
   */
  _gameLoop() {
    if (!this.isRunning || this.isDisposed) return;

    this.rafId = requestAnimationFrame(() => this._gameLoop());

    // Calculate delta time
    this.deltaTime = this.clock.getDelta();
    this.deltaTime = Math.min(this.deltaTime, 0.1); // Cap at 100ms (10fps) to prevent spiral
    this.totalTime += this.deltaTime;

    // Update input (edge detection)
    this.inputManager.update();

    // Update based on state
    this._updateState(this.deltaTime);

    // Physics step (fixed timestep)
    this.physicsWorld.step(this.deltaTime);

    // Render
    this.renderer.render(this.sceneManager.getScene(), this.camera, this.deltaTime);
  }

  /**
   * Update logic based on current state.
   * @private
   * @param {number} deltaTime
   */
  _updateState(deltaTime) {
    switch (this.state) {
      case STATES.EXPLORING:
        this._updateExploration(deltaTime);
        break;

      case STATES.PLAYING:
        if (this.currentGame) {
          this.currentGame.update(deltaTime);
        }
        break;

      case STATES.IN_VENUE:
        // Venue interior updates (e.g., animated elements)
        break;

      case STATES.ENTERING_VENUE:
      case STATES.EXITING_VENUE:
        // Transition animations handled by VenueManager
        break;

      case STATES.MAIN_MENU:
      case STATES.SETTINGS:
      case STATES.PAUSED:
      case STATES.GAME_OVER:
        // UI-driven states, minimal game updates
        break;
    }
  }

  /**
   * Update exploration mode (player, NPCs, environment).
   * @private
   * @param {number} deltaTime
   */
  _updateExploration(deltaTime) {
    // Update environment (particles, day/night cycle)
    if (this.environment) {
      this.environment.update(deltaTime, this.totalTime);
    }

    // Update player
    this.player.update(deltaTime);

    // Update NPCs
    this.npcManager.update(deltaTime, this.player.getPosition());

    // Update venues (check proximity, animations)
    this.venueManager.update(deltaTime, this.player.getPosition());

    // Update interact prompts (venues + NPCs)
    this._updateInteractPrompts();

    // Check for interactions
    this._checkInteractions();
  }

  /**
   * Update interaction prompts based on player proximity to venues and NPCs.
   * @private
   */
  _updateInteractPrompts() {
    if (this.state !== STATES.EXPLORING) return;
    if (this.activeNPCDialogue) {
      this.uiManager.hideInteractPrompt();
      return;
    }

    // Venue prompts take priority over NPCs
    if (this.nearbyVenueId) {
      this.uiManager.showInteractPrompt(`Press E to enter ${this.nearbyVenueId}`);
      return;
    }

    // Check for nearby NPC with dialogue
    const nearbyNPC = this.npcManager.getNearestNPC(this.player.getPosition(), 3);
    if (nearbyNPC && nearbyNPC.getDialogue()) {
      this.uiManager.showInteractPrompt(`Talk to ${nearbyNPC.name}`);
      return;
    }

    this.uiManager.hideInteractPrompt();
  }

  /**
   * Check for player interactions with nearby objects.
   * Uses edge detection to avoid rapid-fire triggers.
   * @private
   */
  _checkInteractions() {
    if (!this.inputManager.wasActionPressed('INTERACT')) return;

    // If dialogue is active, close it
    if (this.activeNPCDialogue) {
      this._closeNPCDialogue();
      return;
    }

    // Check venue proximity first
    const nearbyVenue = this.venueManager.getNearbyVenue(
      this.player.getPosition(),
      3 // 3 meter radius
    );

    if (nearbyVenue) {
      eventBus.emit('player:interact-venue', nearbyVenue.id);
      return;
    }

    // Check NPC proximity
    const nearbyNPC = this.npcManager.getNearestNPC(this.player.getPosition(), 3);
    if (nearbyNPC && nearbyNPC.getDialogue()) {
      this._startNPCDialogue(nearbyNPC);
    }
  }

  /**
   * Start a dialogue with an NPC.
   * @private
   * @param {NPC} npc
   */
  _startNPCDialogue(npc) {
    const dialogue = npc.getDialogue();
    if (!dialogue) return;

    this.activeNPCDialogue = npc;
    npc.startTalking();
    this.uiManager.hideInteractPrompt();

    // Convert dialogue options to UI format
    const options = dialogue.options.map((opt, index) => ({
      text: opt.text,
      response: opt.response,
      index
    }));

    this.uiManager.showDialog(
      npc.name,
      dialogue.greeting,
      options,
      () => this._closeNPCDialogue()
    );
  }

  /**
   * Close the current NPC dialogue.
   * @private
   */
  _closeNPCDialogue() {
    if (this.activeNPCDialogue) {
      this.activeNPCDialogue.stopTalking();
      this.activeNPCDialogue = null;
    }
    this.uiManager.hideDialog();
  }

  /**
   * Transition to exploration mode.
   */
  startExploration() {
    this.setState(STATES.EXPLORING);
    this.uiManager.hideMainMenu();
    this.inputManager.enable();
    this.physicsWorld.start();

    Logger.info('GameController', 'Started exploration');
  }

  /**
   * Enter a venue.
   * @param {string} venueId
   */
  async enterVenue(venueId) {
    this.setState(STATES.ENTERING_VENUE);
    this.inputManager.disable();

    // Transition: fade out, load venue, fade in
    await this.uiManager.fadeToBlack(500);

    // Enter venue
    const venue = this.venueManager.enterVenue(venueId);
    this.currentVenue = venue;

    // Reposition camera
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 1, 0);

    await this.uiManager.fadeFromBlack(500);

    eventBus.emit('venue:enter-complete');

    Logger.info('GameController', `Entered venue: ${venueId}`);
  }

  /**
   * Start playing a game within a venue.
   * @param {string} gameType
   */
  async startGame(gameType) {
    this.setState(STATES.PLAYING);

    // Create game instance
    const GameClass = await this._loadGameModule(gameType);
    this.currentGame = new GameClass(this, this.currentVenue);

    await this.currentGame.init();
    this.inputManager.enable();

    Logger.info('GameController', `Started game: ${gameType}`);
  }

  /**
   * Dynamically load a game module.
   * @private
   * @param {string} gameType
   * @returns {Class}
   */
  async _loadGameModule(gameType) {
    switch (gameType) {
      case 'sky-ace':
        const { SkyAceGame } = await import('../games/sky-ace/SkyAceGame.js');
        return SkyAceGame;
      default:
        throw new Error(`Unknown game type: ${gameType}`);
    }
  }

  /**
   * Pause the current game.
   */
  pauseGame() {
    if (this.state === STATES.PLAYING || this.state === STATES.EXPLORING) {
      this.previousState = this.state;
      this.setState(STATES.PAUSED);
      this.inputManager.disable();
      this.uiManager.showPauseMenu();

      Logger.info('GameController', 'Game paused');
    }
  }

  /**
   * Resume from pause.
   */
  resumeGame() {
    if (this.state === STATES.PAUSED) {
      this.setState(this.previousState || STATES.EXPLORING);
      this.inputManager.enable();
      this.uiManager.hidePauseMenu();

      Logger.info('GameController', 'Game resumed');
    }
  }

  /**
   * Handle game over.
   * @param {Object} result
   */
  handleGameOver(result) {
    this.setState(STATES.GAME_OVER);
    this.inputManager.disable();

    // Save score
    this.storage.quickSave({
      lastGameResult: result,
      timestamp: Date.now()
    });

    // Show game over screen
    this.uiManager.showGameOver(result);

    Logger.info('GameController', 'Game over', result);
  }

  /**
   * Quit current game and return to venue interior.
   */
  quitGame() {
    if (this.currentGame) {
      this.currentGame.dispose();
      this.currentGame = null;
    }

    this.setState(STATES.IN_VENUE);
    this.inputManager.enable();
    this.uiManager.hideGameOver();

    Logger.info('GameController', 'Quit to venue');
  }

  /**
   * Exit venue and return to street.
   */
  async exitVenue() {
    this.setState(STATES.EXITING_VENUE);
    this.inputManager.disable();

    await this.uiManager.fadeToBlack(500);

    // Exit venue
    this.venueManager.exitVenue();
    this.currentVenue = null;

    // Restore player position
    this.player.resetPosition();
    this.camera.position.copy(this.player.getPosition());
    this.camera.position.y += 2;
    this.camera.position.z += 6;

    await this.uiManager.fadeFromBlack(500);

    this.setState(STATES.EXPLORING);
    this.inputManager.enable();

    Logger.info('GameController', 'Exited venue to street');
  }

  /**
   * Return to main menu.
   */
  quitToMenu() {
    this.stop();

    // Clean up current game if active
    if (this.currentGame) {
      this.currentGame.dispose();
      this.currentGame = null;
    }

    this.currentVenue = null;
    this.setState(STATES.MAIN_MENU);
    this.uiManager.showMainMenu();

    Logger.info('GameController', 'Returned to main menu');
  }

  /**
   * Apply settings changes.
   * @param {Object} settings
   */
  applySettings(settings) {
    if (settings.bloomEnabled !== undefined) {
      this.renderer.setBloom(settings.bloomEnabled);
    }
    if (settings.exposure !== undefined) {
      this.renderer.setExposure(settings.exposure);
    }
    if (settings.shadowsEnabled !== undefined) {
      this.renderer.setShadows(settings.shadowsEnabled);
    }

    Logger.info('GameController', 'Settings applied', settings);
  }

  /**
   * Change the game state.
   * @param {string} newState
   */
  setState(newState) {
    if (newState === STATES.PREVIOUS) {
      newState = this.previousState || STATES.MAIN_MENU;
    }

    if (this.state !== newState) {
      Logger.info('GameController', `State: ${this.state} → ${newState}`);
      this.previousState = this.state;
      this.state = newState;
      eventBus.emit('state:changed', this.state, this.previousState);
    }
  }

  /**
   * Get current state.
   * @returns {string}
   */
  getState() {
    return this.state;
  }

  /**
   * Clean up all game resources.
   */
  dispose() {
    if (this.isDisposed) return;

    this.stop();

    // Dispose subsystems
    if (this.currentGame) {
      this.currentGame.dispose();
      this.currentGame = null;
    }

    if (this.environment) {
      this.environment.dispose();
    }

    if (this.cityStreet) {
      this.cityStreet.dispose();
    }

    if (this.player) {
      this.player.dispose();
    }

    if (this.npcManager) {
      this.npcManager.dispose();
    }

    if (this.venueManager) {
      this.venueManager.dispose();
    }

    if (this.uiManager) {
      this.uiManager.dispose();
    }

    this.sceneManager.dispose();
    this.renderer.dispose();
    this.physicsWorld.dispose();
    this.assetLoader.clearCache();
    this.inputManager.dispose();

    this.isDisposed = true;
    Logger.info('GameController', 'All resources disposed');
  }
}

export { GameController, STATES };