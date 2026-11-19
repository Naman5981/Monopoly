/**
 * three/board/flyingThreatCard.js
 * 3D Monopoly Threat Tile Flight Animation.
 * 
 * Clean Architecture & Game Feel:
 * - Uses the authentic board tile texture directly (no synthetic card mimicry or text clutter).
 * - Extended, comfortable cinematic timeout (~3.8s - 4.2s) so players have ample time to read.
 * - Springs out of the 3D board tile up into the clear sky (+3.8 units above board).
 * - Tilts upright toward camera with warm golden amber border and dynamic point light.
 * - Hovers peacefully with gentle floating breathing.
 * - Swoops cleanly back down into the board tile slot and dissolves into place.
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
 * @param {number} tileId
 * @param {number} [durationMs=4000]
 */
export function spawnFlyingThreatCard(tileId, durationMs = 4000) {
  cancelFlyingThreatCard();

  const tile = BOARD_TILES[tileId];
  const pos = getTileWorldPosition(tileId);
  if (!tile || !pos || !context.scene) return;

  // Retrieve the authentic tile canvas texture directly from the existing board mesh
  const boardTileMesh = context.tilesMeshMap?.[tileId];
  let tileTexture = null;
  if (boardTileMesh && Array.isArray(boardTileMesh.material) && boardTileMesh.material[2]?.map) {
    tileTexture = boardTileMesh.material[2].map;
  } else if (typeof document !== 'undefined') {
    const propState = gameState?.properties?.[tile.id] || null;
    tileTexture = createTileTexture(tile, propState);
  }

  const cardGroup = new THREE.Group();
  cardGroup.name = 'flyingThreatTileGroup';

  // 1. Tile Front Face (1:1 authentic board tile, scaled comfortably to 3.3x3.3 for high visibility)
  const tileGeo = new THREE.PlaneGeometry(3.3, 3.3);
  const tileMat = new THREE.MeshBasicMaterial({
    map: tileTexture || undefined,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide
  });
  const tileMesh = new THREE.Mesh(tileGeo, tileMat);
  cardGroup.add(tileMesh);

  // 2. Glowing Amber Outer Frame Rim
  const frameGeo = new THREE.PlaneGeometry(3.48, 3.48);
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
  const startY = (pos.y || 0) + 0.20;
  const targetSkyY = (pos.y || 0) + 3.80; // Elevated into clear sky directly above tile
  cardGroup.position.set(pos.x, startY, pos.z);
  cardGroup.scale.set(0.35, 0.35, 0.35);

  if (context.camera) {
    cardGroup.quaternion.copy(context.camera.quaternion);
  }

  context.scene.add(cardGroup);
  activeThreatCardGroup = cardGroup;

  // Extended, relaxed animation timeline (~3.8s - 4.2s)
  const totalAnimTime = Math.max(3800, durationMs);
  const springDuration = 600; // Launch out of tile into sky
  const swoopDuration = 650;  // Swoop cleanly back down into tile slot & dissolve
  const hoverDuration = totalAnimTime - springDuration - swoopDuration; // ~2.55s - 2.95s of stable hover

  const startTime = performance.now();

  const animateCard = () => {
    if (!activeThreatCardGroup || activeThreatCardGroup !== cardGroup) return;

    const now = performance.now();
    const elapsed = now - startTime;

    // Keep tile face billboarded perpendicular to camera view ray
    if (context.camera) {
      cardGroup.quaternion.copy(context.camera.quaternion);
    }

    if (elapsed < springDuration) {
      // ─── PHASE 1: Tile springs out of 3D board slot into clear sky ──────────
      const p = Math.min(1, elapsed / springDuration);
      const ease = easeOutBack(p);

      cardGroup.position.y = startY + (targetSkyY - startY) * ease;
      const curScale = 0.35 + 0.65 * Math.min(1.0, ease);
      cardGroup.scale.set(curScale, curScale, curScale);

      // Fade in quickly during launch
      const fadeP = Math.min(1, elapsed / 220);
      tileMat.opacity = fadeP;
      frameMat.opacity = fadeP * 0.95;
      amberLight.intensity = fadeP * 2.8;

    } else if (elapsed < springDuration + hoverDuration) {
      // ─── PHASE 2: Extended hover in clear sky with warm amber glow ──────────
      const hoverElapsed = (elapsed - springDuration) * 0.001; // seconds
      const bob = Math.sin(hoverElapsed * 3.5) * 0.10;
      cardGroup.position.y = targetSkyY + bob;
      cardGroup.scale.set(1.0, 1.0, 1.0);

      tileMat.opacity = 1.0;
      frameMat.opacity = 0.80 + Math.sin(hoverElapsed * 4.5) * 0.20;
      amberLight.intensity = 2.4 + Math.sin(hoverElapsed * 4.0) * 0.50;

    } else if (elapsed < totalAnimTime) {
      // ─── PHASE 3: Swoops cleanly back down into board tile slot & dissolves ─
      const swoopElapsed = elapsed - (springDuration + hoverDuration);
      const p = Math.min(1, swoopElapsed / swoopDuration);
      const swoopEase = easeInCubic(p);

      cardGroup.position.y = targetSkyY - (targetSkyY - startY) * swoopEase;

      // Dissolve in the final half of swoop as it touches the slot
      if (p > 0.40) {
        const dissolveP = Math.max(0, 1 - (p - 0.40) / 0.60);
        tileMat.opacity = dissolveP;
        frameMat.opacity = dissolveP * 0.9;
        amberLight.intensity = dissolveP * 2.4;
        const curScale = 0.60 + 0.40 * dissolveP;
        cardGroup.scale.set(curScale, curScale, curScale);
      } else {
        tileMat.opacity = 1.0;
        frameMat.opacity = 0.95;
        amberLight.intensity = 2.4;
        cardGroup.scale.set(1.0, 1.0, 1.0);
      }

    } else {
      // ─── COMPLETE: Dissolved cleanly into board slot ───────────────────────
      cancelFlyingThreatCard();
      return;
    }

    activeThreatCardAnimId = requestAnimationFrame(animateCard);
  };

  activeThreatCardAnimId = requestAnimationFrame(animateCard);
}

/**
 * Cleanly cancels, disposes, and removes the active flying threat tile from the scene.
 */
export function cancelFlyingThreatCard() {
  if (activeThreatCardAnimId) {
    cancelAnimationFrame(activeThreatCardAnimId);
    activeThreatCardAnimId = null;
  }
  if (activeThreatCardGroup) {
    if (context.scene) {
      context.scene.remove(activeThreatCardGroup);
    }
    disposeHierarchy(activeThreatCardGroup);
    activeThreatCardGroup = null;
  }
}
