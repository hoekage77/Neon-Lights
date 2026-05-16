/**
 * Renderer - WebGL renderer with quality presets and context loss recovery.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { CONFIG } from '../constants/Config.js';
import { Logger } from '../utils/Logger.js';

class Renderer {
  constructor(canvas, quality = CONFIG.QUALITY.DEFAULT) {
    this.canvas = canvas;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.qualityPreset = CONFIG.QUALITY[quality] || CONFIG.QUALITY.MEDIUM;
    this.pixelRatio = Math.min(window.devicePixelRatio, this.qualityPreset.pixelRatio);

    this.renderer = null;
    this.composer = null;
    this.bloomPass = null;
    this.fxaaPass = null;

    this.isDisposed = false;
    this.contextLost = false;

    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 0;

    this._onResize = this._onResize.bind(this);
    this._onContextLost = this._onContextLost.bind(this);
    this._onContextRestored = this._onContextRestored.bind(this);

    window.addEventListener('resize', this._onResize);

    this._createRenderer();
    Logger.info('Renderer', `Initialized (${quality} quality)`);
  }

  _createRenderer() {
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: this.qualityPreset.antialias,
        alpha: false,
        powerPreference: 'default',
        stencil: false,
        depth: true
      });

      this.renderer.setSize(this.width, this.height, false);
      this.renderer.setPixelRatio(this.pixelRatio);
      this.renderer.setClearColor(0x0e0f13, 1);

      this.renderer.shadowMap.enabled = this.qualityPreset.shadows;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      if (this.qualityPreset.shadows) {
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
      }

      this.renderer.outputColorSpace = THREE.SRGBColorSpace;

      this.canvas.addEventListener('webglcontextlost', this._onContextLost, false);
      this.canvas.addEventListener('webglcontextrestored', this._onContextRestored, false);

    } catch (e) {
      Logger.error('Renderer', 'Failed to create WebGL renderer', e);
      throw e;
    }
  }

  _onContextLost(event) {
    event.preventDefault();
    this.contextLost = true;
    Logger.warn('Renderer', 'WebGL context lost - will try to restore');
  }

  _onContextRestored() {
    this.contextLost = false;
    Logger.info('Renderer', 'WebGL context restored');
    this._createRenderer();
  }

  setupPostProcessing(scene, camera) {
    if (!this.qualityPreset.bloom && !this.qualityPreset.fxaa) return;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    if (this.qualityPreset.bloom) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this.width, this.height),
        CONFIG.POST_PROCESSING.BLOOM_STRENGTH,
        CONFIG.POST_PROCESSING.BLOOM_RADIUS,
        CONFIG.POST_PROCESSING.BLOOM_THRESHOLD
      );
      this.composer.addPass(this.bloomPass);
    }

    if (this.qualityPreset.fxaa) {
      this.fxaaPass = new ShaderPass(FXAAShader);
      this.fxaaPass.material.uniforms['resolution'].value.set(
        1 / (this.width * this.pixelRatio),
        1 / (this.height * this.pixelRatio)
      );
      this.composer.addPass(this.fxaaPass);
    }

    Logger.info('Renderer', 'Post-processing enabled');
  }

  render(scene, camera) {
    if (this.isDisposed || this.contextLost || !this.renderer) return;

    try {
      if (this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(scene, camera);
      }
    } catch (e) {
      Logger.error('Renderer', 'Render error', e);
    }

    this.frameCount++;
    const now = performance.now();
    if (now - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
    }
  }

  _onResize() {
    if (this.isDisposed || this.contextLost) return;

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer.setSize(this.width, this.height, false);

    if (this.composer) {
      this.composer.setSize(this.width, this.height);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(this.width, this.height);
    }
    if (this.fxaaPass) {
      this.fxaaPass.material.uniforms['resolution'].value.set(
        1 / (this.width * this.pixelRatio),
        1 / (this.height * this.pixelRatio)
      );
    }
  }

  getDimensions() {
    return {
      width: this.width,
      height: this.height,
      aspect: this.width / this.height
    };
  }

  getFPS() { return this.fps; }

  dispose() {
    if (this.isDisposed) return;
    window.removeEventListener('resize', this._onResize);
    this.canvas.removeEventListener('webglcontextlost', this._onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this._onContextRestored);
    this.composer?.dispose();
    this.renderer?.dispose();
    this.isDisposed = true;
    Logger.info('Renderer', 'Disposed');
  }
}

export { Renderer };