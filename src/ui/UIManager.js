/**
 * UIManager - Manages all UI screens, menus, and overlays.
 * Creates and destroys HTML-based UI elements dynamically.
 */

import { eventBus } from '../core/EventBus.js';
import { Logger } from '../utils/Logger.js';

class UIManager {
  constructor(container) {
    this.container = container;
    this.activeScreens = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the UI system.
   */
  init() {
    if (this.isInitialized) return;

    // Inject CSS
    this._injectStyles();

    this.isInitialized = true;
    Logger.info('UIManager', 'Initialized');
  }

  /**
   * Inject required CSS styles.
   * @private
   */
  _injectStyles() {
    if (!document.getElementById('ui-styles')) {
      const link = document.createElement('link');
      link.id = 'ui-styles';
      link.rel = 'stylesheet';
      link.href = '/styles/main.css';
      document.head.appendChild(link);
    }
  }

  /**
   * Create a UI overlay container.
   * @private
   * @param {string} id
   * @returns {HTMLElement}
   */
  _createOverlay(id) {
    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'ui-overlay';
    this.container.appendChild(overlay);
    return overlay;
  }

  /**
   * Show the main menu.
   */
  showMainMenu() {
    if (this.activeScreens.has('main-menu')) return;

    const overlay = this._createOverlay('ui-main-menu');

    overlay.innerHTML = `
      <div class="ui-panel">
        <div class="ui-title">Neon City</div>
        <div class="ui-subtitle">Arcade Platform</div>
        <div class="ui-menu-list">
          <button class="ui-button primary full-width" id="btn-start">Start Game</button>
          <button class="ui-button accent full-width" id="btn-quick-start">Quick Start — Sky Ace</button>
          <button class="ui-button full-width" id="btn-settings">Settings</button>
          <button class="ui-button full-width" id="btn-credits">Credits</button>
        </div>
      </div>
    `;

    // Event listeners
    overlay.querySelector('#btn-start').addEventListener('click', () => {
      eventBus.emit('ui:start-game');
    });

    overlay.querySelector('#btn-quick-start').addEventListener('click', () => {
      eventBus.emit('ui:quick-start');
    });

    overlay.querySelector('#btn-settings').addEventListener('click', () => {
      this.showSettings();
    });

    overlay.querySelector('#btn-credits').addEventListener('click', () => {
      this.showCredits();
    });

    this.activeScreens.set('main-menu', overlay);
    Logger.info('UIManager', 'Main menu shown');
  }

  /**
   * Hide the main menu.
   */
  hideMainMenu() {
    const screen = this.activeScreens.get('main-menu');
    if (screen) {
      screen.classList.add('hidden');
      setTimeout(() => {
        screen.remove();
        this.activeScreens.delete('main-menu');
      }, 300);
    }
  }

  /**
   * Show the pause menu.
   */
  showPauseMenu() {
    if (this.activeScreens.has('pause-menu')) return;

    const overlay = this._createOverlay('ui-pause-menu');

    overlay.innerHTML = `
      <div class="ui-panel">
        <div class="ui-title">Paused</div>
        <div class="ui-menu-list">
          <button class="ui-button primary full-width" id="btn-resume">Resume</button>
          <button class="ui-button full-width" id="btn-restart">Restart</button>
          <button class="ui-button full-width" id="btn-settings">Settings</button>
          <button class="ui-button full-width" id="btn-quit">Quit to Menu</button>
        </div>
      </div>
    `;

    overlay.querySelector('#btn-resume').addEventListener('click', () => {
      eventBus.emit('ui:resume-game');
    });

    overlay.querySelector('#btn-restart').addEventListener('click', () => {
      eventBus.emit('ui:restart-game');
    });

    overlay.querySelector('#btn-settings').addEventListener('click', () => {
      this.showSettings();
    });

    overlay.querySelector('#btn-quit').addEventListener('click', () => {
      eventBus.emit('ui:quit-game');
    });

    this.activeScreens.set('pause-menu', overlay);
    Logger.info('UIManager', 'Pause menu shown');
  }

  /**
   * Hide the pause menu.
   */
  hidePauseMenu() {
    const screen = this.activeScreens.get('pause-menu');
    if (screen) {
      screen.classList.add('hidden');
      setTimeout(() => {
        screen.remove();
        this.activeScreens.delete('pause-menu');
      }, 300);
    }
  }

  /**
   * Show settings menu.
   */
  showSettings() {
    if (this.activeScreens.has('settings')) return;

    const overlay = this._createOverlay('ui-settings');

    overlay.innerHTML = `
      <div class="ui-panel">
        <div class="ui-title">Settings</div>
        <div class="ui-menu-list">
          <div class="ui-menu-item">
            <span class="item-label">Master Volume</span>
            <input type="range" min="0" max="100" value="80" id="volume-master">
          </div>
          <div class="ui-menu-item">
            <span class="item-label">Music Volume</span>
            <input type="range" min="0" max="100" value="60" id="volume-music">
          </div>
          <div class="ui-menu-item">
            <span class="item-label">SFX Volume</span>
            <input type="range" min="0" max="100" value="70" id="volume-sfx">
          </div>
          <div class="ui-menu-item">
            <span class="item-label">Bloom Effect</span>
            <input type="checkbox" checked id="setting-bloom">
          </div>
          <div class="ui-menu-item">
            <span class="item-label">Shadows</span>
            <input type="checkbox" checked id="setting-shadows">
          </div>
          <div class="ui-menu-item">
            <span class="item-label">Field of View</span>
            <input type="range" min="60" max="100" value="60" id="setting-fov">
          </div>
        </div>
        <button class="ui-button full-width" id="btn-settings-back">Back</button>
      </div>
    `;

    // Settings change handlers
    const handleSettingChange = () => {
      eventBus.emit('settings:changed', {
        masterVolume: parseInt(document.getElementById('volume-master').value),
        musicVolume: parseInt(document.getElementById('volume-music').value),
        sfxVolume: parseInt(document.getElementById('volume-sfx').value),
        bloomEnabled: document.getElementById('setting-bloom').checked,
        shadowsEnabled: document.getElementById('setting-shadows').checked,
        fov: parseInt(document.getElementById('setting-fov').value)
      });
    };

    overlay.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', handleSettingChange);
    });

    overlay.querySelector('#btn-settings-back').addEventListener('click', () => {
      this.hideSettings();
    });

    this.activeScreens.set('settings', overlay);
  }

  /**
   * Hide settings menu.
   */
  hideSettings() {
    const screen = this.activeScreens.get('settings');
    if (screen) {
      screen.classList.add('hidden');
      setTimeout(() => {
        screen.remove();
        this.activeScreens.delete('settings');
      }, 300);
    }
  }

  /**
   * Show game over screen.
   * @param {Object} result
   */
  showGameOver(result) {
    if (this.activeScreens.has('game-over')) return;

    const overlay = this._createOverlay('ui-game-over');

    const isVictory = result.completed;
    const title = isVictory ? 'Mission Complete!' : 'Game Over';
    const titleColor = isVictory ? '#00b894' : '#ff7675';

    overlay.innerHTML = `
      <div class="ui-panel">
        <div class="ui-title" style="color: ${titleColor}">${title}</div>
        <div class="ui-subtitle">Score: ${result.score || 0}</div>
        ${result.stats ? `
          <div style="margin: 16px 0; color: #888; font-size: 0.9em;">
            ${result.stats.enemiesDestroyed !== undefined ? `<div>Enemies Destroyed: ${result.stats.enemiesDestroyed}</div>` : ''}
            ${result.stats.timeElapsed !== undefined ? `<div>Time: ${result.stats.timeElapsed.toFixed(1)}s</div>` : ''}
            ${result.stats.maxCombo !== undefined ? `<div>Max Combo: x${result.stats.maxCombo}</div>` : ''}
          </div>
        ` : ''}
        <div class="ui-menu-list">
          <button class="ui-button primary full-width" id="btn-retry">Try Again</button>
          <button class="ui-button full-width" id="btn-continue">Continue</button>
        </div>
      </div>
    `;

    overlay.querySelector('#btn-retry').addEventListener('click', () => {
      eventBus.emit('ui:restart-game');
      this.hideGameOver();
    });

    overlay.querySelector('#btn-continue').addEventListener('click', () => {
      eventBus.emit('game:quit');
      this.hideGameOver();
    });

    this.activeScreens.set('game-over', overlay);
  }

  /**
   * Hide game over screen.
   */
  hideGameOver() {
    const screen = this.activeScreens.get('game-over');
    if (screen) {
      screen.classList.add('hidden');
      setTimeout(() => {
        screen.remove();
        this.activeScreens.delete('game-over');
      }, 300);
    }
  }

  /**
   * Show credits screen.
   */
  showCredits() {
    if (this.activeScreens.has('credits')) return;

    const overlay = this._createOverlay('ui-credits');

    overlay.innerHTML = `
      <div class="ui-panel">
        <div class="ui-title">Credits</div>
        <div style="margin: 16px 0; color: #888; line-height: 1.6;">
          <p><strong>Neon City Arcade</strong></p>
          <p>Built with Three.js, Cannon-es, and love.</p>
          <p style="margin-top: 16px;">Core Team</p>
          <p>Design, Development, Art</p>
        </div>
        <button class="ui-button full-width" id="btn-credits-back">Back</button>
      </div>
    `;

    overlay.querySelector('#btn-credits-back').addEventListener('click', () => {
      this.hideCredits();
    });

    this.activeScreens.set('credits', overlay);
  }

  /**
   * Hide credits screen.
   */
  hideCredits() {
    const screen = this.activeScreens.get('credits');
    if (screen) {
      screen.classList.add('hidden');
      setTimeout(() => {
        screen.remove();
        this.activeScreens.delete('credits');
      }, 300);
    }
  }

  /**
   * Show the interaction prompt.
   * @param {string} text
   */
  showInteractPrompt(text) {
    if (this.activeScreens.has('interact-prompt')) {
      const existing = document.getElementById('ui-interact-prompt');
      if (existing) {
        existing.querySelector('.prompt-text').textContent = text;
        return;
      }
    }

    const prompt = document.createElement('div');
    prompt.id = 'ui-interact-prompt';
    prompt.className = 'interact-prompt';
    prompt.innerHTML = `
      <kbd>E</kbd>
      <span class="prompt-text">${text}</span>
    `;

    this.container.appendChild(prompt);
    this.activeScreens.set('interact-prompt', prompt);
  }

  /**
   * Hide the interaction prompt.
   */
  hideInteractPrompt() {
    const prompt = this.activeScreens.get('interact-prompt');
    if (prompt) {
      prompt.remove();
      this.activeScreens.delete('interact-prompt');
    }
  }

  /**
   * Show a notification toast.
   * @param {string} message
   * @param {string} type - 'success', 'warning', 'error'
   * @param {number} duration
   */
  showToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `ui-toast ${type}`;
    toast.textContent = message;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, duration);
  }

  /**
   * Show dialog box for NPC conversation.
   * Supports multi-step dialogue: clicking an option shows its response,
   * then presents a Close button.
   * @param {string} speaker
   * @param {string} text
   * @param {Array<{text, response, action}>} options
   * @param {Function} onClose - Called when dialog is closed
   */
  showDialog(speaker, text, options = [], onClose = null) {
    if (this.activeScreens.has('dialog')) return;

    const overlay = document.createElement('div');
    overlay.id = 'ui-dialog';
    overlay.className = 'ui-dialog';

    const buildOptionsHtml = (opts) => {
      if (opts.length === 0) return '';
      let html = '<div class="dialog-options">';
      for (const opt of opts) {
        html += `<div class="dialog-option" data-index="${opt.index !== undefined ? opt.index : 'close'}">${opt.text}</div>`;
      }
      html += '</div>';
      return html;
    };

    overlay.innerHTML = `
      <div class="dialog-speaker">${speaker}</div>
      <div class="dialog-text" id="dialog-text">${text}</div>
      <div id="dialog-options-container">${buildOptionsHtml(options)}</div>
    `;

    this.container.appendChild(overlay);
    this.activeScreens.set('dialog', overlay);

    const optionsContainer = overlay.querySelector('#dialog-options-container');

    const handleOptionClick = (e) => {
      const optionEl = e.target.closest('.dialog-option');
      if (!optionEl) return;

      const indexStr = optionEl.dataset.index;

      // Close button clicked
      if (indexStr === 'close') {
        this.hideDialog();
        if (onClose) onClose();
        return;
      }

      const index = parseInt(indexStr, 10);
      const option = options[index];
      if (!option) return;

      // Show response and switch to close-only
      if (option.response) {
        const textEl = overlay.querySelector('#dialog-text');
        textEl.textContent = option.response;
        optionsContainer.innerHTML = buildOptionsHtml([{ text: 'Close', index: 'close' }]);
      } else if (option.action) {
        option.action();
        this.hideDialog();
        if (onClose) onClose();
      }
    };

    optionsContainer.addEventListener('click', handleOptionClick);
  }

  /**
   * Hide dialog box.
   */
  hideDialog() {
    const dialog = this.activeScreens.get('dialog');
    if (dialog) {
      dialog.remove();
      this.activeScreens.delete('dialog');
    }
  }

  /**
   * Fade screen to black.
   * @param {number} duration
   * @returns {Promise<void>}
   */
  fadeToBlack(duration = 500) {
    return new Promise(resolve => {
      const fade = document.createElement('div');
      fade.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #000;
        opacity: 0;
        z-index: 1000;
        pointer-events: none;
        transition: opacity ${duration}ms ease;
      `;

      document.body.appendChild(fade);

      requestAnimationFrame(() => {
        fade.style.opacity = '1';
      });

      setTimeout(() => {
        resolve();
      }, duration);
    });
  }

  /**
   * Fade from black.
   * @param {number} duration
   * @returns {Promise<void>}
   */
  fadeFromBlack(duration = 500) {
    return new Promise(resolve => {
      const fade = document.querySelector('div[style*="opacity: 1"]');
      if (!fade) {
        resolve();
        return;
      }

      fade.style.opacity = '0';

      setTimeout(() => {
        fade.remove();
        resolve();
      }, duration);
    });
  }

  /**
   * Update loading screen progress.
   * @param {number} ratio - 0 to 1
   */
  updateLoadingProgress(ratio) {
    const loadingBar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');

    if (loadingBar) {
      loadingBar.style.width = `${Math.round(ratio * 100)}%`;
    }

    if (loadingText) {
      if (ratio < 0.3) {
        loadingText.textContent = 'Loading assets...';
      } else if (ratio < 0.6) {
        loadingText.textContent = 'Building world...';
      } else if (ratio < 0.9) {
        loadingText.textContent = 'Spawning NPCs...';
      } else {
        loadingText.textContent = 'Ready!';
      }
    }
  }

  /**
   * Hide loading screen.
   */
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }
  }

  /**
   * Show the in-game HUD.
   */
  showHUD() {
    if (this.activeScreens.has('hud')) return;

    const hud = document.createElement('div');
    hud.id = 'ui-hud';
    hud.className = 'hud-container';
    hud.innerHTML = `
      <div class="hud-top">
        <div class="hud-panel">
          <div class="hud-label">Score</div>
          <div class="hud-score" id="hud-score">0</div>
        </div>
        <div class="hud-panel">
          <div class="hud-label">FPS</div>
          <div id="hud-fps">60</div>
        </div>
      </div>
      <div class="hud-bottom">
        <div class="hud-panel">
          <div class="hud-label">Health</div>
          <div class="hud-bar-container">
            <div class="hud-bar health" id="hud-health" style="width: 100%"></div>
          </div>
        </div>
        <div class="hud-panel">
          <div class="hud-label">Controls</div>
          <div style="font-size: 0.8em; color: #888;">WASD Move | E Interact | ESC Pause</div>
        </div>
      </div>
    `;

    this.container.appendChild(hud);
    this.activeScreens.set('hud', hud);
  }

  /**
   * Hide the HUD.
   */
  hideHUD() {
    const hud = this.activeScreens.get('hud');
    if (hud) {
      hud.remove();
      this.activeScreens.delete('hud');
    }
  }

  /**
   * Update HUD elements.
   * @param {Object} data
   */
  updateHUD(data) {
    const score = document.getElementById('hud-score');
    const health = document.getElementById('hud-health');
    const fps = document.getElementById('hud-fps');

    if (score && data.score !== undefined) {
      score.textContent = data.score;
    }

    if (health && data.health !== undefined) {
      health.style.width = `${Math.max(0, data.health)}%`;
    }

    if (fps && data.fps !== undefined) {
      fps.textContent = data.fps;
    }
  }

  /**
   * Hide all active screens.
   */
  hideAll() {
    for (const [, screen] of this.activeScreens) {
      screen.remove();
    }
    this.activeScreens.clear();
  }

  /**
   * Clean up all UI elements.
   */
  dispose() {
    this.hideAll();
    Logger.info('UIManager', 'Disposed');
  }
}

export { UIManager };