/**
 * Input key mappings for Neon City Arcade.
 * All input handling should reference these constants.
 */

const KEYS = {
  // Movement
  FORWARD: ['KeyW', 'ArrowUp'],
  BACKWARD: ['KeyS', 'ArrowDown'],
  LEFT: ['KeyA', 'ArrowLeft'],
  RIGHT: ['KeyD', 'ArrowRight'],

  // Actions
  JUMP: ['Space'],
  INTERACT: ['KeyE'],
  RUN: ['ShiftLeft', 'ShiftRight'],

  // UI
  PAUSE: ['Escape'],
  MENU: ['KeyM'],

  // Debug
  DEBUG: ['Backquote'],
  FREE_CAMERA: ['KeyC']
};

const GAMEPAD_BUTTONS = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  SELECT: 8,
  START: 9,
  L3: 10,
  R3: 11,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15
};

export { KEYS, GAMEPAD_BUTTONS };