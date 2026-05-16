/**
 * InputManager - Centralized input handling for keyboard, mouse, and touch.
 * Abstracts raw input into game actions. Supports multiple input sources.
 */

import { KEYS } from '../constants/Keys.js';
import { Logger } from '../utils/Logger.js';

class InputManager {
  constructor() {
    this.keys = new Map();
    this.mouse = { x: 0, y: 0, deltaX: 0, deltaY: 0, wheelDelta: 0 };
    this.mouseFrameDelta = { x: 0, y: 0, wheel: 0 };
    this.mouseDown = new Set();
    this.touches = new Map();
    this.gamepads = new Map();
    this.previousKeys = new Map();

    this.enabled = true;
    this.pointerLocked = false;

    // Bound handlers for proper removal
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);

    this._attachListeners();
  }

  _attachListeners() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('wheel', this._onWheel, { passive: false });
    window.addEventListener('touchstart', this._onTouchStart, { passive: false });
    window.addEventListener('touchmove', this._onTouchMove, { passive: false });
    window.addEventListener('touchend', this._onTouchEnd, { passive: false });
    window.addEventListener('contextmenu', this._onContextMenu);
  }

  /**
   * Check if any of the keys for an action are pressed.
   * @param {string} action - Action name from KEYS constant
   * @returns {boolean}
   */
  isActionPressed(action) {
    if (!this.enabled) return false;
    const keysForAction = KEYS[action];
    if (!keysForAction) return false;
    return keysForAction.some(keyCode => this.keys.get(keyCode) === true);
  }

  /**
   * Check if a specific key code is pressed.
   * @param {string} keyCode
   * @returns {boolean}
   */
  isKeyPressed(keyCode) {
    if (!this.enabled) return false;
    return this.keys.get(keyCode) === true;
  }

  /**
   * Get mouse position relative to canvas.
   * @returns {{x: number, y: number}}
   */
  getMousePosition() {
    return { x: this.mouse.x, y: this.mouse.y };
  }

  /**
   * Get mouse delta accumulated during this frame.
   * @returns {{x: number, y: number}}
   */
  getMouseDelta() {
    const delta = this.mouseFrameDelta || { x: 0, y: 0, wheel: 0 };
    return { x: delta.x, y: delta.y };
  }

  /**
   * Get mouse wheel delta accumulated during this frame.
   * @returns {number}
   */
  getMouseWheel() {
    return (this.mouseFrameDelta && this.mouseFrameDelta.wheel) || 0;
  }

  /**
   * Check if a mouse button is pressed.
   * @param {number} button - 0=left, 1=middle, 2=right
   * @returns {boolean}
   */
  isMouseDown(button) {
    if (!this.enabled) return false;
    return this.mouseDown.has(button);
  }

  /**
   * Get normalized touch position (0-1).
   * @returns {{x: number, y: number}|null}
   */
  getTouchPosition() {
    if (this.touches.size === 0) return null;
    const touch = this.touches.values().next().value;
    return { x: touch.x, y: touch.y };
  }

  /**
   * Request pointer lock for FPS-style controls.
   * @param {HTMLElement} element
   */
  requestPointerLock(element) {
    element.requestPointerLock?.();
  }

  /**
   * Exit pointer lock.
   */
  exitPointerLock() {
    document.exitPointerLock?.();
  }

  /**
   * Check if pointer is locked.
   * @returns {boolean}
   */
  isPointerLocked() {
    return document.pointerLockElement !== null;
  }

  /**
   * Enable input processing.
   */
  enable() {
    this.enabled = true;
    Logger.info('InputManager', 'Input enabled');
  }

  /**
   * Disable input processing.
   */
  disable() {
    this.enabled = false;
    // Clear all pressed states
    this.keys.clear();
    this.mouseDown.clear();
    this.touches.clear();
    Logger.info('InputManager', 'Input disabled');
  }

  /**
   * Reset all input states (call when gaining focus).
   */
  reset() {
    this.keys.clear();
    this.mouseDown.clear();
    this.touches.clear();
    this.mouse.deltaX = 0;
    this.mouse.deltaY = 0;
    this.mouse.wheelDelta = 0;
  }

  /**
   * Update called once per frame. Resets frame-dependent values
   * and stores previous key states for edge detection.
   */
  update() {
    // Store previous key states
    this.previousKeys.clear();
    for (const [key, value] of this.keys) {
      this.previousKeys.set(key, value);
    }

    // Snapshot accumulated mouse deltas for this frame before clearing
    // This ensures consumers (camera orbit, etc.) can read them after update()
    this.mouseFrameDelta = {
      x: this.mouse.deltaX,
      y: this.mouse.deltaY,
      wheel: this.mouse.wheelDelta
    };

    this.mouse.deltaX = 0;
    this.mouse.deltaY = 0;
    this.mouse.wheelDelta = 0;
  }

  /**
   * Check if an action was just pressed this frame (edge detection).
   * @param {string} action - Action name from KEYS constant
   * @returns {boolean}
   */
  wasActionPressed(action) {
    if (!this.enabled) return false;
    const keysForAction = KEYS[action];
    if (!keysForAction) return false;
    return keysForAction.some(keyCode => {
      return this.keys.get(keyCode) === true && this.previousKeys.get(keyCode) !== true;
    });
  }

  /**
   * Check if a specific key was just pressed this frame (edge detection).
   * @param {string} keyCode
   * @returns {boolean}
   */
  wasKeyPressed(keyCode) {
    if (!this.enabled) return false;
    return this.keys.get(keyCode) === true && this.previousKeys.get(keyCode) !== true;
  }

  // Event handlers
  _onKeyDown(event) {
    if (!this.enabled) return;
    this.keys.set(event.code, true);
  }

  _onKeyUp(event) {
    this.keys.set(event.code, false);
  }

  _onMouseMove(event) {
    if (!this.enabled) return;
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
    this.mouse.deltaX += event.movementX;
    this.mouse.deltaY += event.movementY;
  }

  _onMouseDown(event) {
    if (!this.enabled) return;
    this.mouseDown.add(event.button);
  }

  _onMouseUp(event) {
    this.mouseDown.delete(event.button);
  }

  _onWheel(event) {
    if (!this.enabled) return;
    event.preventDefault();
    this.mouse.wheelDelta += event.deltaY;
  }

  _onTouchStart(event) {
    if (!this.enabled) return;
    event.preventDefault();
    for (const touch of event.changedTouches) {
      this.touches.set(touch.identifier, {
        x: touch.clientX / window.innerWidth,
        y: touch.clientY / window.innerHeight,
        startX: touch.clientX / window.innerWidth,
        startY: touch.clientY / window.innerHeight
      });
    }
  }

  _onTouchMove(event) {
    if (!this.enabled) return;
    event.preventDefault();
    for (const touch of event.changedTouches) {
      const existing = this.touches.get(touch.identifier);
      if (existing) {
        existing.x = touch.clientX / window.innerWidth;
        existing.y = touch.clientY / window.innerHeight;
      }
    }
  }

  _onTouchEnd(event) {
    for (const touch of event.changedTouches) {
      this.touches.delete(touch.identifier);
    }
  }

  _onContextMenu(event) {
    event.preventDefault();
    return false;
  }

  /**
   * Clean up all event listeners.
   */
  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('wheel', this._onWheel);
    window.removeEventListener('touchstart', this._onTouchStart);
    window.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onTouchEnd);
    window.removeEventListener('contextmenu', this._onContextMenu);

    this.keys.clear();
    this.mouseDown.clear();
    this.touches.clear();
    this.gamepads.clear();

    Logger.info('InputManager', 'Disposed');
  }
}

export { InputManager };