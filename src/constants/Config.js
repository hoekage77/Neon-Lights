/**
 * Global configuration constants for Neon City Arcade.
 * All tunable game parameters live here.
 */

const CONFIG = {
  // World dimensions
  WORLD: {
    STREET_LENGTH: 200,
    STREET_WIDTH: 40,
    SIDEWALK_WIDTH: 4,
    BUILDING_DEPTH: 15,
    BOUNDARY_OFFSET: 5
  },

  // Player settings
  PLAYER: {
    HEIGHT: 1.7,
    WALK_SPEED: 4.0,
    RUN_SPEED: 7.0,
    JUMP_HEIGHT: 0.5,
    CAMERA_DISTANCE: 6,
    CAMERA_HEIGHT: 2,
    CAMERA_FOV: 60,
    CAMERA_MIN_DISTANCE: 3,
    CAMERA_MAX_DISTANCE: 12,
    CAMERA_SMOOTHING: 0.1
  },

  // NPC settings
  NPC: {
    MAX_COUNT: 12,
    SPAWN_RADIUS: 80,
    DESPAWN_RADIUS: 120,
    WALK_SPEED: 2.5,
    IDLE_DURATION_MIN: 10,
    IDLE_DURATION_MAX: 30,
    SCHEDULE_CYCLE_TIME: 600
  },

  // Performance budgets
  PERFORMANCE: {
    TARGET_FPS: 60,
    MAX_DRAW_CALLS: 150,
    MAX_TRIANGLES: 50000,
    MAX_TEXTURE_MEMORY_MB: 64,
    MAX_PHYSICS_BODIES: 100,
    MAX_ACTIVE_LIGHTS: 20
  },

  // LOD distances
  LOD: {
    HIGH: 20,
    MEDIUM: 50,
    LOW: 100,
    HIDDEN: 150
  },

  // Post-processing
  POST_PROCESSING: {
    BLOOM_ENABLED: true,
    BLOOM_STRENGTH: 0.5,
    BLOOM_RADIUS: 0.5,
    BLOOM_THRESHOLD: 0.8,
    FXAA_ENABLED: true,
    FOG_ENABLED: true,
    FOG_DENSITY: 0.015
  },

  // Quality presets
  QUALITY: {
    LOW: {
      pixelRatio: 1,
      shadows: false,
      shadowMapSize: 512,
      antialias: false,
      bloom: false,
      fxaa: false,
      fog: false,
      maxLights: 4,
      maxNPCs: 4,
      buildings: 4,
      props: false,
      particles: false,
      windowLights: false
    },
    MEDIUM: {
      pixelRatio: 1.5,
      shadows: true,
      shadowMapSize: 1024,
      antialias: false,
      bloom: true,
      fxaa: true,
      fog: true,
      maxLights: 12,
      maxNPCs: 8,
      buildings: 6,
      props: true,
      particles: true,
      windowLights: true
    },
    HIGH: {
      pixelRatio: 2,
      shadows: true,
      shadowMapSize: 2048,
      antialias: true,
      bloom: true,
      fxaa: true,
      fog: true,
      maxLights: 20,
      maxNPCs: 12,
      buildings: 8,
      props: true,
      particles: true,
      windowLights: true
    },
    DEFAULT: 'MEDIUM'
  },

  // Audio
  AUDIO: {
    MASTER_VOLUME: 0.8,
    MUSIC_VOLUME: 0.6,
    SFX_VOLUME: 0.7,
    SPATIAL_AUDIO_ENABLED: true,
    MAX_CONCURRENT_SOUNDS: 32
  },

  // Physics
  PHYSICS: {
    GRAVITY: -9.81,
    TIME_STEP: 1 / 60,
    MAX_SUB_STEPS: 3,
    CONTACT_MATERIAL: {
      FRICTION: 0.5,
      RESTITUTION: 0.1,
      CONTACT_STIFFNESS: 1e8,
      CONTACT_RELAXATION: 3
    }
  },

  // Input
  INPUT: {
    DEADZONE: 0.15,
    MOUSE_SENSITIVITY: 0.002,
    INTERACT_DISTANCE: 3,
    INTERACT_COOLDOWN: 0.5
  },

  // Save system
  SAVE: {
    AUTO_SAVE_INTERVAL: 60,
    MAX_SLOTS: 5,
    STORAGE_KEY: 'neon_city_arcade_save'
  }
};

export { CONFIG };