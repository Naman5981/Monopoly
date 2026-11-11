/**
 * three/board/tilePress.js
 * Physics spring tile depression when clicked or landed on by a player.
 */

import { context } from '../core/context.js';
import { BOARD_TILES } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import { BASE_TILE_Y, BASE_BUILDING_Y } from './coords.js';

export let movingHopDestTileId = null;
const activePressTileIds = new Set();

export function setMovingHopDestTileId(id) {
  movingHopDestTileId = id;
}

/**
 * Triggers a spring push-down depression on a specific tile.
 * Clamps maximum downward travel to -0.11 so the top face card markings
 * NEVER sink beneath the diorama rim slab (which is at y = 0.30).
 * @param {number} tileId
 * @param {number} depth - Negative offset in world units (clamped to max -0.11)
 * @param {number} duration - Hold duration before spring release (default 220ms)
 */
export function triggerTileButtonPress(tileId, depth = -0.11, duration = 220) {
  const st = context.activeTileDepressions[tileId];
  if (!st) return;
  // Safety clamp: Tile resting top is at 0.46, diorama rim slab is at 0.30.
  // Maximum depression must not exceed -0.11 so the top face card markings
  // NEVER sink below the rim or get occluded by the baseboard slab.
  const safeDepth = Math.max(-0.11, depth);
  st.targetOffset = safeDepth;
  activePressTileIds.add(tileId);

  if (st._timer) clearTimeout(st._timer);
  st._timer = setTimeout(() => {
    st.targetOffset = 0;
  }, duration);
}

/**
 * Updates physical spring bounce for depressed tiles each render frame.
 * @param {Function} updatePlayerTokensPosCb
 */
export function updateTileDepressionsAnimation(updatePlayerTokensPosCb) {
  if (activePressTileIds.size === 0) return;

  activePressTileIds.forEach(tileId => {
    const state = context.activeTileDepressions[tileId];
    const mesh = context.tilesMeshMap[tileId];
    const bGroup = context.tileBuildingGroups[tileId];
    const landmark = context.cornerLandmarkGroups[tileId];
    if (!state || !mesh) {
      activePressTileIds.delete(tileId);
      return;
    }

    if (Math.abs(state.targetOffset - state.currentOffset) > 0.001) {
      // Snappy down-press (0.36) and bouncy spring release (0.24)
      const springRate = state.targetOffset < state.currentOffset ? 0.36 : 0.24;
      state.currentOffset += (state.targetOffset - state.currentOffset) * springRate;
      mesh.position.y = BASE_TILE_Y + state.currentOffset;
      if (bGroup) bGroup.position.y = BASE_BUILDING_Y + state.currentOffset;
      if (landmark) landmark.position.y = BASE_BUILDING_Y + state.currentOffset;

      // Only reposition tokens if a player is physically situated on this specific depressed tile
      if (gameState.phase !== 'MOVING' && updatePlayerTokensPosCb) {
        const hasPlayerOnTile = gameState.players?.some(p => p.position === tileId && !p.bankrupt);
        if (hasPlayerOnTile) {
          updatePlayerTokensPosCb();
        }
      }
    } else {
      state.currentOffset = state.targetOffset;
      mesh.position.y = BASE_TILE_Y + state.currentOffset;
      if (bGroup) bGroup.position.y = BASE_BUILDING_Y + state.currentOffset;
      if (landmark) landmark.position.y = BASE_BUILDING_Y + state.currentOffset;
      if (state.targetOffset === 0) {
        activePressTileIds.delete(tileId);
      }
    }
  });
}
