/**
 * main.js - Entry point for Neon City Arcade.
 * Initializes the game controller and starts the application.
 */

import { GameController } from './core/GameController.js';
import { eventBus } from './core/EventBus.js';
import { Logger } from './utils/Logger.js';

/**
 * Detect GPU capability and recommend quality preset.
 * @returns {string} 'LOW', 'MEDIUM', or 'HIGH'
 */
function detectQuality() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
      console.warn('[Main] WebGL not supported, using LOW quality');
      return 'LOW';
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      console.log('[Main] GPU:', renderer, '| Vendor:', vendor);

      // Detect integrated/low-end GPUs
      const lowEndGPUs = [
        'intel', 'Intel(R) UHD', 'Intel(R) HD', 'Mesa Intel',
        'Apple M1', 'Apple M2',
        'Qualcomm', 'Adreno', 'Mali'
      ];

      const isLowEnd = lowEndGPUs.some(gpu =>
        renderer.toLowerCase().includes(gpu.toLowerCase())
      );

      if (isLowEnd) {
        console.log('[Main] Detected low-end GPU, using LOW quality');
        return 'LOW';
      }
    }

    // Check max texture size as a rough performance indicator
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (maxTextureSize < 4096) {
      console.log('[Main] Small max texture size (' + maxTextureSize + '), using LOW quality');
      return 'LOW';
    }

    console.log('[Main] Using MEDIUM quality (default)');
    return 'MEDIUM';

  } catch (e) {
    console.warn('[Main] GPU detection failed, defaulting to LOW');
    return 'LOW';
  }
}

/**
 * Show error in loading screen.
 * @param {string} message
 * @param {Error} error
 */
function showLoadingError(message, error) {
  console.error('[Main]', message, error);

  const loadingText = document.getElementById('loading-text');
  const loadingError = document.getElementById('loading-error');
  const loadingErrorMessage = document.getElementById('loading-error-message');
  const loadingBar = document.getElementById('loading-bar');

  if (loadingText) {
    loadingText.textContent = 'Failed to initialize';
    loadingText.style.color = '#ff7675';
  }

  if (loadingBar) {
    loadingBar.style.background = '#ff7675';
    loadingBar.style.width = '100%';
  }

  if (loadingError && loadingErrorMessage) {
    loadingErrorMessage.innerHTML = `
      <strong>${message}</strong><br>
      <code style="font-size: 0.8em; opacity: 0.7; margin-top: 8px; display: block;">
        ${error?.message || 'Unknown error'}
      </code>
    `;
    loadingError.classList.add('visible');
  }
}

/**
 * Initialize and start the game.
 */
async function init() {
  console.log('[Main] Starting Neon City Arcade...');

  const canvas = document.getElementById('game-canvas');
  const uiLayer = document.getElementById('ui-layer');
  const loadingText = document.getElementById('loading-text');

  if (!canvas || !uiLayer) {
    showLoadingError('Required DOM elements not found', new Error('Missing canvas or ui-layer'));
    return;
  }

  try {
    if (loadingText) loadingText.textContent = 'Detecting hardware...';

    // Auto-detect quality based on GPU
    const quality = detectQuality();
    if (loadingText) loadingText.textContent = `Initializing (${quality} quality)...`;

    // Create game controller
    const game = new GameController(canvas, uiLayer, quality);
    window.neonCity = game;

    // Listen for loading events
    eventBus.on('loading:progress', (ratio) => {
      game.uiManager?.updateLoadingProgress(ratio);
    });

    eventBus.on('loading:complete', () => {
      game.uiManager?.hideLoadingScreen();
    });

    if (loadingText) loadingText.textContent = 'Initializing game systems...';

    // Initialize game systems
    await game.init();

    if (loadingText) loadingText.textContent = 'Starting game...';

    // Update loading progress manually (since we're pre-creating the world)
    game.uiManager?.updateLoadingProgress(0.5);

    // Show loading complete after a brief delay
    setTimeout(() => {
      game.uiManager?.updateLoadingProgress(1);
      game.uiManager?.hideLoadingScreen();
    }, 500);

    // Start the game loop
    game.start();

    console.log('[Main] Game started successfully');

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        game.pauseGame?.();
      }
    });

    // Handle window close / reload
    window.addEventListener('beforeunload', () => {
      game.dispose?.();
    });

  } catch (error) {
    showLoadingError('Failed to initialize game', error);

    // Emergency fallback: show a simple rotating cube to prove WebGL works
    try {
      console.log('[Main] Attempting emergency fallback...');
      const scene = new (await import('three')).Scene();
      const camera = new (await import('three')).PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new (await import('three')).WebGLRenderer({ canvas });
      renderer.setSize(window.innerWidth, window.innerHeight);

      const geometry = new (await import('three')).BoxGeometry(1, 1, 1);
      const material = new (await import('three')).MeshBasicMaterial({ color: 0xff6b9d });
      const cube = new (await import('three')).Mesh(geometry, material);
      scene.add(cube);
      camera.position.z = 5;

      function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
      }
      animate();

      console.log('[Main] Emergency fallback active - basic cube rendering');
    } catch (fallbackError) {
      console.error('[Main] Emergency fallback also failed:', fallbackError);
    }
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init };
