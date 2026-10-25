/**
 * three/scene.js
 * Unified Facade for the Three.js 3D diorama.
 *
 * Coordinates initialization and delegates subsystem functionality to specialized modules:
 * - core: context, camera, lighting, input, render loop
 * - board: coords, diorama, tiles, tilePress, highlights
 * - assets: avatars, buildings, landmarks, dice
 * - pawns: tokens, movement, speech
 * - stages: lobbyStage, cityPreview
 * - environment: cars, clouds
 */

import * as THREE from 'three';
import { context } from './core/context.js';
import { matchSettings } from '../game/state.js';
import { updateIsometricCamera } from './core/camera.js';
import { buildMainDirectionalAndAmbientLights } from './core/lighting.js';
import { buildDioramaBaseAndPark, buildLowPolyParkDecor3D } from './board/diorama.js';
import { buildLowPolyFloatingClouds3D } from './environment/clouds.js';
import { buildAllBoardTiles3D } from './board/tiles.js';
import { buildFourCornerLandmarks3D } from './assets/landmarks.js';
import { buildStreetLampsAndBulbs3D } from './core/lighting.js';
import { buildAnimatedRoadCars3D } from './environment/cars.js';
import { build3DDicePair } from './assets/dice.js';
import { buildTileHighlightRing3D, buildActivePlayerHighlightSystem } from './board/highlights.js';
import { ensure3DPortraitSystemInitialized } from './pawns/tokens.js';
import { applyBoardStyle, BOARD_STYLES } from './board/skins.js';
import { initInputHandlers } from './core/input.js';
import { startRenderLoop } from './core/loop.js';
import { initPhysicsEngine, spawnShatterDebris, spawnGoldCoinShower, triggerBoardShockwave } from './physics/physicsEngine.js';
import { initPostProcessingPipeline, postProcessingState } from './postprocessing/pipeline.js';

// ──────────────────────────────────────────────────────────────────────────────
// Scene Initialization Facade & GPU Detection
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Detects GPU acceleration tier and WebGPU capability.
 */
export async function detectGPUCapabilities() {
  const caps = {
    webgpu: false,
    tier: 'standard',
    unmaskedRenderer: 'unknown'
  };

  if (typeof navigator !== 'undefined' && 'gpu' in navigator && navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        caps.webgpu = true;
      }
    } catch {
      // WebGPU disabled or restricted by policy
    }
  }

  if (context.renderer) {
    const gl = context.renderer.getContext();
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        caps.unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
      }
    }
  }

  const rLower = caps.unmaskedRenderer.toLowerCase();
  if (
    caps.webgpu ||
    rLower.includes('rtx') ||
    rLower.includes('gtx') ||
    rLower.includes('geforce') ||
    rLower.includes('radeon') ||
    rLower.includes('apple') ||
    rLower.includes('m1') ||
    rLower.includes('m2') ||
    rLower.includes('m3') ||
    rLower.includes('m4')
  ) {
    caps.tier = 'high';
  } else if (rLower.includes('intel') || rLower.includes('swiftshader') || rLower.includes('llvmpipe')) {
    caps.tier = 'low';
  }

  context.gpuTier = caps.tier;
  context.hasWebGPU = caps.webgpu;
  console.info(`[Engine] GPU Tier: ${caps.tier} (WebGPU: ${caps.webgpu}, Renderer: ${caps.unmaskedRenderer})`);
  return caps;
}

/**
 * Initializes the main Three.js isometric diorama scene.
 * @param {Function} onTileClickCb - Callback invoked when a board tile is clicked.
 */
export function initThreeScene(onTileClickCb) {
  const container = document.getElementById('three-canvas-container');
  if (!container) return;

  // 1. Scene and DOM container
  context.scene = new THREE.Scene();
  context.container = container;

  // 2. Isometric orthographic camera
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = context.frustumSize || 31.5;
  context.camera = new THREE.OrthographicCamera(
    (-frustumSize * aspect) / 2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    -frustumSize / 2,
    1,
    200
  );

  // 3. WebGL high-performance renderer
  context.renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  context.renderer.setSize(window.innerWidth, window.innerHeight);
  context.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
  context.renderer.shadowMap.enabled = true;
  context.renderer.shadowMap.type = THREE.PCFShadowMap;
  context.renderer.shadowMap.autoUpdate = false;
  context.renderer.shadowMap.needsUpdate = true;
  context.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  context.renderer.toneMappingExposure = 1.08;
  context.renderer.outputColorSpace = THREE.SRGBColorSpace;
  context.maxAnisotropy = context.renderer.capabilities.getMaxAnisotropy() || 4;

  // 3B. WebGL Context Loss & Recovery Handling
  const canvas = context.renderer.domElement;
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    context.isContextLost = true;
    console.warn('[Three Scene] WebGL Context Lost! Pausing rendering loop.');
  }, false);

  canvas.addEventListener('webglcontextrestored', () => {
    console.info('[Three Scene] WebGL Context Restored! Resuming rendering pipeline.');
    context.isContextLost = false;
    if (context.renderer) {
      context.renderer.setSize(window.innerWidth, window.innerHeight);
      context.renderer.shadowMap.needsUpdate = true;
    }
  }, false);

  detectGPUCapabilities();

  container.innerHTML = '';
  container.appendChild(context.renderer.domElement);

  // 4. Update initial camera matrix
  updateIsometricCamera();

  // 5. Raycasting helpers
  context.raycaster = new THREE.Raycaster();
  context.mouseVec = new THREE.Vector2();

  // 6. Environmental lighting
  buildMainDirectionalAndAmbientLights(context.scene);

  // 7. Board root group
  context.boardGroup = new THREE.Group();
  context.scene.add(context.boardGroup);

  // 8. Build procedural diorama geometry and decorations
  buildDioramaBaseAndPark(context.boardGroup);
  buildLowPolyParkDecor3D(context.boardGroup);
  buildLowPolyFloatingClouds3D(context.boardGroup);
  buildAllBoardTiles3D(context.boardGroup);
  buildFourCornerLandmarks3D(context.boardGroup);
  buildStreetLampsAndBulbs3D(context.boardGroup);
  buildAnimatedRoadCars3D(context.boardGroup);
  build3DDicePair(context.boardGroup);
  buildTileHighlightRing3D(context.boardGroup);
  buildActivePlayerHighlightSystem(context.boardGroup);
  ensure3DPortraitSystemInitialized();

  // 8B. Apply initial board style skin (wood, cyberpunk, elegant)
  applyBoardStyle(matchSettings.boardStyle || 'wood');

  // 8C. Initialize 3D Rigid-Body Physics Simulation & Post-Processing Pipeline
  initPhysicsEngine(context.scene);
  initPostProcessingPipeline();

  // 9. Input & interaction listeners (raycast, hover, drag-orbit, wheel zoom)
  initInputHandlers(context.renderer.domElement, onTileClickCb);

  // 10. Start 60FPS animation loop
  startRenderLoop();
}

// ──────────────────────────────────────────────────────────────────────────────
// Re-exports: Camera & Viewport Controls
// ──────────────────────────────────────────────────────────────────────────────
export {
  startIntroCameraFlyIn,
  resetCameraView,
  rotateBoardLeft,
  rotateBoardRight
} from './core/camera.js';

// ──────────────────────────────────────────────────────────────────────────────
// Re-exports: Board Geometry & Tile System
// ──────────────────────────────────────────────────────────────────────────────
export { getTileWorldPosition } from './board/coords.js';

/**
 * Projects a board tile coordinate to 2D screen coordinates { x, y } for UI FLIP springs.
 * @param {number} tileId
 * @returns {{ x: number, y: number }|null}
 */
export function getTileScreenPosition(tileId) {
  try {
    if (!context || !context.camera) return null;
    const worldPos = getTileWorldPosition(tileId);
    const vec = new THREE.Vector3(worldPos.x, 0.4, worldPos.z);
    vec.project(context.camera);
    return {
      x: (vec.x * 0.5 + 0.5) * window.innerWidth,
      y: (-(vec.y * 0.5) + 0.5) * window.innerHeight
    };
  } catch (_) {
    return null;
  }
}
export { triggerTileButtonPress } from './board/tilePress.js';
export {
  refreshTileTextureAndBuildings,
  updateTileMesh,
  refreshAllTileTexturesAndMaterials
} from './board/tiles.js';
export {
  applyBoardStyle,
  BOARD_STYLES
} from './board/skins.js';
export { updateDioramaCenterForEdition } from './board/diorama.js';

// ──────────────────────────────────────────────────────────────────────────────
// Re-exports: Highlights, Beacons & Flight Rings
// ──────────────────────────────────────────────────────────────────────────────
export {
  setTileHighlightRing,
  buildActivePlayerHighlightSystem,
  setFlightModeHighlights,
  setFestivalSelectionHighlights,
  setMonopolyTileHighlights
} from './board/highlights.js';

// ──────────────────────────────────────────────────────────────────────────────
// Re-exports: Environmental Lighting
// ──────────────────────────────────────────────────────────────────────────────
export {
  getSceneLighting,
  setBulbLightingTheme,
  updateTileBordersForCurrentMode,
  updateAvatarLightingForCurrentMode
} from './core/lighting.js';

// ──────────────────────────────────────────────────────────────────────────────
// Re-exports: Procedural Assets & 3D Models
// ──────────────────────────────────────────────────────────────────────────────
export {
  createDetailedFlagMesh,
  createDetailedHouseMesh,
  createDetailedSkyscraperMesh
} from './assets/buildings.js';
export { animate3DDiceTumble, applyEquippedDiceSkin } from './assets/dice.js';

// ──────────────────────────────────────────────────────────────────────────────
// Re-exports: Player Pawns & Movement
// ──────────────────────────────────────────────────────────────────────────────
export {
  spawnAllPlayerTokens3D,
  updatePlayerTokenPositions3D,
  triggerTokenHurtAnimation
} from './pawns/tokens.js';
export {
  hopPlayerStepAnimation,
  resetTokenAfterHop,
  flyPlayerStepAnimation,
  flyPlayerDirectFlightAnimation
} from './pawns/movement.js';
export { showSpeechBubble } from './pawns/speech.js';

// ──────────────────────────────────────────────────────────────────────────────
// Re-exports: Stages & Dedicated Viewports
// ──────────────────────────────────────────────────────────────────────────────
export {
  populateCityPreview3DScene,
  clearCityPreview
} from './stages/cityPreview.js';
export {
  initLobbyHeroStage,
  updateLobbyHeroAvatar
} from './stages/lobbyStage.js';
export { resetLocalCarAnimationClock } from './environment/cars.js';

// ──────────────────────────────────────────────────────────────────────────────
// Re-exports: 3D Physics Engine & Post-Processing Shaders
// ──────────────────────────────────────────────────────────────────────────────
export {
  spawnShatterDebris,
  spawnGoldCoinShower,
  triggerBoardShockwave
} from './physics/physicsEngine.js';
export { postProcessingState } from './postprocessing/pipeline.js';

// ──────────────────────────────────────────────────────────────────────────────
// Re-exports: Theatre.js Cinematics & Motion Design
// ──────────────────────────────────────────────────────────────────────────────
export {
  initTheatreSuite,
  playCinematicCutscene,
  playIntroCinematicFlyIn,
  playLandmarkCinematicReveal,
  playVictoryCinematicOrbit
} from './theatre.js';




