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

// ──────────────────────────────────────────────────────────────────────────────
// Scene Initialization Facade
// ──────────────────────────────────────────────────────────────────────────────

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
  context.renderer.toneMapping = THREE.LinearToneMapping;
  context.renderer.toneMappingExposure = 1.0;
  context.renderer.outputColorSpace = THREE.SRGBColorSpace;
  context.maxAnisotropy = context.renderer.capabilities.getMaxAnisotropy() || 4;

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

// ──────────────────────────────────────────────────────────────────────────────
// Re-exports: Highlights, Beacons & Flight Rings
// ──────────────────────────────────────────────────────────────────────────────
export {
  setTileHighlightRing,
  buildActivePlayerHighlightSystem,
  setFlightModeHighlights,
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
export { animate3DDiceTumble } from './assets/dice.js';

// ──────────────────────────────────────────────────────────────────────────────
// Re-exports: Player Pawns & Movement
// ──────────────────────────────────────────────────────────────────────────────
export {
  spawnAllPlayerTokens3D,
  updatePlayerTokenPositions3D
} from './pawns/tokens.js';
export {
  hopPlayerStepAnimation,
  resetTokenAfterHop,
  flyPlayerStepAnimation
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
