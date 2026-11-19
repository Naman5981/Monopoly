/**
 * three/board/flyingThreatCard.js
 * 3D Monopoly Threat Tile Flight Animation.
 * 
 * Clean Architecture & Game Feel:
 * - Uses the authentic 1:1 board tile texture created 100% upright (isUpright = true).
 * - Strictly ROTATION LOCKED TO SCREEN at all times: faces camera/screen directly (never orients to board side).
 * - Hides the board tile in-place so the authentic tile physically lifts off the board into the sky.
 * - Zero duplication: Only ONE tile exists during flight.
 * - Springs out of the 3D board tile slot up into clear sky (+3.8 units above board).
 * - Warm golden amber frame border and dynamic point light glow.
 * - Hovers peacefully with gentle floating breathing for comfortable reading (~3.8s - 4.2s).
 * - Swoops cleanly back down into the board tile slot and restores board tile.
 */

import * as THREE from 'three';
import { context } from '../core/context.js';
import { BOARD_TILES } from '../../game/data.js';
import { getTileWorldPosition } from './coords.js';
import { createTileTexture } from './tiles.js';
import { gameState } from '../../game/state.js';
import { disposeHierarchy } from '../core/dispose.js';

let activeThreatCardGroup = null;
let activeThreatCardAnimId = null;
let hiddenBoardTileMesh = null;
let hiddenBuildingGroup = null;
let activeTileTexture = null;

/**
 * Standard elastic / backOut easing for snappy spring emergence.
 */
function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/**
 * Cubic ease-in for clean swoop down.
 */
function easeInCubic(x) {
  return x * x * x;
}

/**
 * Spawns the authentic 3D board tile into the sky for the Monopoly Threat cinematic.
 * The tile is strictly rotation-locked to the screen at all times.
 * @param {number} tileId
 * @param {number} [durationMs=4000]
 */
export function spawnFlyingThreatCard(tileId, durationMs = 4000) {
  cancelFlyingThreatCard();

  const tile = BOARD_TILES[tileId];
  const pos = getTileWorldPosition(tileId);
  if (!tile || !pos || !context.scene) return;

  // Retrieve existing board tile mesh and hide it so only the flying tile is on screen
  const boardTileMesh = context.tilesMeshMap?.[tileId];
  const bGroup = context.tileBuildingGroups?.[tileId];

  if (boardTileMesh) {
    boardTileMesh.visible = false;
    hiddenBoardTileMesh = boardTileMesh;
  }
  if (bGroup) {
    bGroup.visible = false;
    hiddenBuildingGroup = bGroup;
  }

  // Create authentic 1:1 board tile texture that is ALWAYS 100% upright to the screen
  let tileTexture = null;
  if (typeof document !== 'undefined') {
    const propState = gameState?.properties?.[tile.id] || null;
    tileTexture = createTileTexture(tile, propState, true); // isUpright = true (locked to screen, never board side)
    activeTileTexture = tileTexture;
  }

  const cardGroup = new THREE.Group();
  cardGroup.name = 'flyingThreatTileGroup';

  // 1. Tile Front Face (1:1 authentic board tile, scaled comfortably to 3.2x3.2 for high visibility)
  const tileGeo = new THREE.PlaneGeometry(3.2, 3.2);
  const tileMat = new THREE.MeshBasicMaterial({
    map: tileTexture || undefined,
    color: 0xffffff,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide
  });
  const tileMesh = new THREE.Mesh(tileGeo, tileMat);
  cardGroup.add(tileMesh);

  // 2. Glowing Amber Outer Frame Rim
  const frameGeo = new THREE.PlaneGeometry(3.38, 3.38);
  const frameMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide
  });
  const frameMesh = new THREE.Mesh(frameGeo, frameMat);
  frameMesh.position.z = -0.01;
  cardGroup.add(frameMesh);

  // 3. Dynamic Amber Point Light (Casts warm light onto board beneath hovering tile)
  const amberLight = new THREE.PointLight(0xf59e0b, 0, 8.5);
  amberLight.position.set(0, 0, 0.8);
  cardGroup.add(amberLight);

  // Initial Placement: Rest directly on 3D tile socket
  const startY = (pos.y || 0) + 0.46;
  const targetSkyY = (pos.y || 0) + 3.80; // Elevated into clear sky directly above tile
  cardGroup.position.set(pos.x, startY, pos.z);

  // Strictly rotation-locked to camera/screen coordinates
  if (context.camera) {
    cardGroup.quaternion.copy(context.camera.quaternion);
  }

  context.scene.add(cardGroup);
  activeThreatCardGroup = cardGroup;

  // Extended, relaxed animation timeline (~3.8s - 4.2s)
  const totalAnimTime = Math.max(3800, durationMs);
  const springDuration = 650; // Launch out of tile into sky
  const swoopDuration = 650;  // Swoop cleanly back down into tile slot & lock in
  const hoverDuration = totalAnimTime - springDuration - swoopDuration; // ~2.5s of stable hover

  const startTime = performance.now();

  const animateCard = () => {
    if (!activeThreatCardGroup || activeThreatCardGroup !== cardGroup) return;

    const now = performance.now();
    const elapsed = now - startTime;

    // Strict rotation lock to screen: billboarded directly to camera view on every frame
    if (context.camera) {
      cardGroup.quaternion.copy(context.camera.quaternion);
    }

    if (elapsed < springDuration) {
      // ─── PHASE 1: Tile springs out of 3D board slot into clear sky ──────────
      const p = Math.min(1, elapsed / springDuration);
      const ease = easeOutBack(p);

      cardGroup.position.y = startY + (targetSkyY - startY) * ease;
      const curScale = 1.0 + 0.15 * Math.min(1.0, ease);
      cardGroup.scale.set(curScale, curScale, curScale);

      // Amber glow illuminates as tile reaches altitude
      const glowP = Math.min(1, elapsed / 300);
      frameMat.opacity = glowP * 0.95;
      amberLight.intensity = glowP * 2.8;

    } else if (elapsed < springDuration + hoverDuration) {
      // ─── PHASE 2: Extended hover in clear sky with warm amber glow ──────────
      const hoverElapsed = (elapsed - springDuration) * 0.001; // seconds
      const bob = Math.sin(hoverElapsed * 3.5) * 0.08;
      cardGroup.position.y = targetSkyY + bob;
      cardGroup.scale.set(1.15, 1.15, 1.15);

      frameMat.opacity = 0.80 + Math.sin(hoverElapsed * 4.5) * 0.20;
      amberLight.intensity = 2.4 + Math.sin(hoverElapsed * 4.0) * 0.50;

    } else if (elapsed < totalAnimTime) {
      // ─── PHASE 3: Swoops cleanly back down into board tile slot & locks in ──
      const swoopElapsed = elapsed - (springDuration + hoverDuration);
      const p = Math.min(1, swoopElapsed / swoopDuration);
      const swoopEase = easeInCubic(p);

      cardGroup.position.y = targetSkyY - (targetSkyY - startY) * swoopEase;
      const curScale = 1.15 - 0.15 * p;
      cardGroup.scale.set(curScale, curScale, curScale);

      // Fade out amber glow as tile nears slot
      const fadeGlow = Math.max(0, 1.0 - p * 1.5);
      frameMat.opacity = fadeGlow * 0.9;
      amberLight.intensity = fadeGlow * 2.4;

    } else {
      // ─── COMPLETE: Restore board tile into slot cleanly ─────────────────────
      cancelFlyingThreatCard();
      return;
    }

    if (typeof requestAnimationFrame !== 'undefined') {
      activeThreatCardAnimId = requestAnimationFrame(animateCard);
    }
  };

  if (typeof requestAnimationFrame !== 'undefined') {
    activeThreatCardAnimId = requestAnimationFrame(animateCard);
  }
}

/**
 * Cleanly cancels, disposes, and restores board tile visibility.
 */
export function cancelFlyingThreatCard() {
  if (activeThreatCardAnimId && typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(activeThreatCardAnimId);
    activeThreatCardAnimId = null;
  }

  // Restore board tile visibility
  if (hiddenBoardTileMesh) {
    hiddenBoardTileMesh.visible = true;
    hiddenBoardTileMesh = null;
  }
  if (hiddenBuildingGroup) {
    hiddenBuildingGroup.visible = true;
    hiddenBuildingGroup = null;
  }

  if (activeTileTexture) {
    try { activeTileTexture.dispose(); } catch (_) {}
    activeTileTexture = null;
  }

  if (activeThreatCardGroup) {
    if (context.scene) {
      context.scene.remove(activeThreatCardGroup);
    }
    disposeHierarchy(activeThreatCardGroup);
    activeThreatCardGroup = null;
  }
}
