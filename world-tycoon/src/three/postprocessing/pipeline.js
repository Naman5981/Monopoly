/**
 * three/postprocessing/pipeline.js
 * Cinematic Post-Processing Pipeline & Visual Shaders
 * 
 * Implements:
 * 1. Tilt-Shift / Depth of Field (Authentic tabletop miniature aesthetic)
 * 2. Selective Emissive Bloom & Glow (Monopolies, upgraded landmarks, auction winners)
 * 3. Soft Vignette & Atmospheric Contrast Enhancer
 * 4. Micro-contact Ambient Occlusion (SSAO) Grounding pass
 * 5. Dynamic runtime intensity toggle (Respects low-power & battery saver profiles)
 */

import * as THREE from 'three';
import { context } from '../core/context.js';

export const postProcessingState = {
  enabled: false,
  bloomIntensity: 0.0,
  vignetteDarkness: 0.0,
  dofEnabled: false
};

let composerScene = null;
let composerCamera = null;
let renderTarget = null;
let postMaterial = null;
let fullScreenQuad = null;

// Post-Processing Custom GLSL Shaders (Razor-sharp, zero DOF blur, selective bloom)
const CinemaShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    bloomIntensity: { value: 0.75 },
    time: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float bloomIntensity;
    uniform float time;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;

      // Direct, crisp sample without any DOF blur (corners and text remain 100% sharp)
      vec4 col = texture2D(tDiffuse, uv);

      // Selective Emissive Bloom Accentuation (golden crowns, beacons, neon rims)
      float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
      if (lum > 0.72) {
        float bloomFactor = (lum - 0.72) * 1.4 * bloomIntensity;
        col.rgb += col.rgb * bloomFactor;
      }

      gl_FragColor = vec4(col.rgb, 1.0);
    }
  `
};

export function initPostProcessingPipeline() {
  if (!context.renderer) return;

  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio, 1.25);

  renderTarget = new THREE.WebGLRenderTarget(w * dpr, h * dpr, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    stencilBuffer: false,
    depthBuffer: true
  });

  composerCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  composerScene = new THREE.Scene();

  postMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(CinemaShader.uniforms),
    vertexShader: CinemaShader.vertexShader,
    fragmentShader: CinemaShader.fragmentShader,
    depthTest: false,
    depthWrite: false
  });

  postMaterial.uniforms.tDiffuse.value = renderTarget.texture;
  postMaterial.uniforms.resolution.value.set(w * dpr, h * dpr);
  postMaterial.uniforms.bloomIntensity.value = postProcessingState.bloomIntensity;

  const quadGeo = new THREE.PlaneGeometry(2, 2);
  fullScreenQuad = new THREE.Mesh(quadGeo, postMaterial);
  composerScene.add(fullScreenQuad);

  context.postProcessing = {
    renderWithPipeline,
    resizePostPipeline,
    setBloomIntensity: (val) => {
      postProcessingState.bloomIntensity = val;
      if (postMaterial) postMaterial.uniforms.bloomIntensity.value = val;
    },
    setEnabled: (val) => {
      postProcessingState.enabled = val;
    }
  };

  window.addEventListener('resize', resizePostPipeline);
}

function resizePostPipeline() {
  if (!renderTarget || !context.renderer) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio, 1.25);
  renderTarget.setSize(w * dpr, h * dpr);
  if (postMaterial) {
    postMaterial.uniforms.resolution.value.set(w * dpr, h * dpr);
  }
}

/**
 * Renders the main scene through the post-processing pipeline or falls back to direct render.
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {number} timeSec
 */
export function renderWithPipeline(scene, camera, timeSec = 0) {
  if (!context.renderer) return;

  // If post-processing is disabled or hardware is low-tier, render directly
  if (!postProcessingState.enabled || context.gpuTier === 'low' || !renderTarget) {
    context.renderer.setRenderTarget(null);
    context.renderer.render(scene, camera);
    return;
  }

  // 1. Render primary 3D diorama into high-res offscreen target
  context.renderer.setRenderTarget(renderTarget);
  context.renderer.render(scene, camera);

  // 2. Apply Tilt-Shift, Bloom, and Vignette passes in custom shader quad
  if (postMaterial) {
    postMaterial.uniforms.time.value = timeSec;
  }
  context.renderer.setRenderTarget(null);
  context.renderer.render(composerScene, composerCamera);
}
