/**
 * three/board/empireSpotlight.js
 * 3D Empire Spotlight service: illuminates a target player's properties via glowing
 * border frames and ground light pools while dimming non-owned tiles.
 */

import * as THREE from 'three';
import { context } from '../core/context.js';
import { BOARD_TILES, PLAYER_THEMES } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import { disposeHierarchy } from '../core/dispose.js';

let empireHighlightsGroup = null;
const originalTileMaterials = new Map();
const originalFrameColors = new Map();

function ensureEmpireHighlightsGroup() {
  if (!empireHighlightsGroup) {
    empireHighlightsGroup = new THREE.Group();
    empireHighlightsGroup.name = 'empireHighlightsGroup';
    context.boardGroup.add(empireHighlightsGroup);
  } else if (empireHighlightsGroup.parent !== context.boardGroup) {
    context.boardGroup.add(empireHighlightsGroup);
  }
  while (empireHighlightsGroup.children.length > 0) {
    const child = empireHighlightsGroup.children[0];
    disposeHierarchy(child);
    empireHighlightsGroup.remove(child);
  }
}

function resetBoardSpotlight() {
  empireHighlightsGroup.visible = false;
  const isNight = (gameState.bulbMode === 'night');
  const isSunset = (gameState.bulbMode === 'sunset');

  if (originalTileMaterials.size > 0) {
    BOARD_TILES.forEach(tile => {
      const mesh = context.tilesMeshMap[tile.id];
      const orig = originalTileMaterials.get(tile.id);
      if (orig && mesh && Array.isArray(mesh.material) && mesh.material[2]) {
        mesh.material[2].color.setHex(orig.colorHex);
      }
    });
    originalTileMaterials.clear();
  }

  BOARD_TILES.forEach(tile => {
    const prop = gameState.properties?.[tile.id];
    const isOwned = prop && prop.owner !== null && prop.owner !== undefined;
    const frame = context.tileBorderFrames?.[tile.id];
    if (frame && frame.userData?.borderMat) {
      frame.scale.set(1.0, 1.0, 1.0);
      const isLocalPlayer = (prop?.owner === gameState.localPlayerIdx);
      const savedFrame = originalFrameColors.get(tile.id);
      if (savedFrame) {
        frame.userData.borderMat.color.setHex(savedFrame.colorHex);
        frame.userData.borderMat.emissive.setHex(savedFrame.emissiveHex);
        frame.userData.borderMat.opacity = savedFrame.opacity;
      }

      if (isOwned) {
        frame.visible = true;
        const baseIntensity = isNight ? 0.85 : (isSunset ? 0.50 : 0.28);
        frame.userData.borderMat.emissiveIntensity = isLocalPlayer ? baseIntensity * 1.5 : baseIntensity;
      } else {
        frame.visible = false;
        frame.userData.borderMat.emissiveIntensity = 0;
      }
    }

    const pool = context.tileGroundLightPools?.[tile.id];
    if (pool && pool.material) {
      pool.visible = false;
      pool.material.opacity = 0;
    }
  });
  originalFrameColors.clear();
}

/**
 * Activates or deactivates the 3D Empire Spotlight for a given player.
 * Passing null resets the board to standard lighting.
 * @param {number|null} targetPlayerIdx
 */
export function setEmpireSpotlight(targetPlayerIdx) {
  if (!context.boardGroup) return;
  ensureEmpireHighlightsGroup();

  if (targetPlayerIdx === null || targetPlayerIdx === undefined) {
    resetBoardSpotlight();
    return;
  }

  empireHighlightsGroup.visible = true;
  const theme = PLAYER_THEMES[targetPlayerIdx];
  const threeColor = new THREE.Color(theme?.colorHex || '#3b82f6');

  const ownedTileIds = new Set();
  BOARD_TILES.forEach(tile => {
    if (gameState.properties?.[tile.id]?.owner === targetPlayerIdx) {
      ownedTileIds.add(tile.id);
    }
  });

  BOARD_TILES.forEach(tile => {
    const isOwnedByTarget = ownedTileIds.has(tile.id);
    const prop = gameState.properties?.[tile.id];
    const isOwnedByOther = prop && prop.owner !== null && prop.owner !== undefined && prop.owner !== targetPlayerIdx;

    const mesh = context.tilesMeshMap[tile.id];
    if (mesh && Array.isArray(mesh.material) && mesh.material[2]) {
      const topMat = mesh.material[2];
      if (!originalTileMaterials.has(tile.id)) {
        originalTileMaterials.set(tile.id, { colorHex: topMat.color.getHex() });
      }
      topMat.color.setHex(isOwnedByTarget ? 0xffffff : 0x7c8ba1);
    }

    const frame = context.tileBorderFrames?.[tile.id];
    if (frame && frame.userData?.borderMat) {
      if (!originalFrameColors.has(tile.id)) {
        originalFrameColors.set(tile.id, {
          colorHex: frame.userData.borderMat.color.getHex(),
          emissiveHex: frame.userData.borderMat.emissive.getHex(),
          opacity: frame.userData.borderMat.opacity
        });
      }

      if (isOwnedByTarget) {
        frame.visible = true;
        frame.scale.set(1.04, 1.0, 1.04);
        frame.userData.borderMat.color.copy(threeColor);
        frame.userData.borderMat.emissive.copy(threeColor);
        frame.userData.borderMat.emissiveIntensity = 1.35;
        frame.userData.borderMat.opacity = 1.0;
      } else if (isOwnedByOther) {
        frame.visible = true;
        frame.scale.set(1.0, 1.0, 1.0);
        frame.userData.borderMat.color.setHex(0x64748b);
        frame.userData.borderMat.emissive.setHex(0x1e293b);
        frame.userData.borderMat.emissiveIntensity = 0.05;
        frame.userData.borderMat.opacity = 0.25;
      } else {
        frame.visible = false;
        frame.scale.set(1.0, 1.0, 1.0);
        frame.userData.borderMat.emissiveIntensity = 0;
      }
    }

    const pool = context.tileGroundLightPools?.[tile.id];
    if (pool && pool.material) {
      if (isOwnedByTarget) {
        pool.visible = true;
        pool.material.color.copy(threeColor);
        pool.material.opacity = 0.55;
      } else {
        pool.visible = false;
        pool.material.opacity = 0;
      }
    }
  });
}
