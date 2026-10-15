/**
 * three/board/tilePress.js
 * Physics spring tile depression when clicked or landed on by a player.
 */

import { context } from '../core/context.js';
import { BOARD_TILES } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import { BASE_TILE_Y, BASE_BUILDING_Y } from './coords.js';

export let movingHopDestTileId = null;

export function setMovingHopDestTileId(id) {
  movingHopDestTileId = id;
}

/**
 * Triggers a spring push-down depression on a specific tile.
 * @param {number} tileId
 * @param {number} depth - Negative offset in world units (default -0.32)
 * @param {number} duration - Hold duration before spring release (default 240ms)
 */
export function triggerTileButtonPress(tileId, depth = -0.32, duration = 240) {
  const st = context.activeTileDepressions[tileId];
  if (!st) return;
  st.targetOffset = depth;
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
  BOARD_TILES.forEach(tile => {
    const state = context.activeTileDepressions[tile.id];
    const mesh = context.tilesMeshMap[tile.id];
    const bGroup = context.tileBuildingGroups[tile.id];
    const landmark = context.cornerLandmarkGroups[tile.id];
    if (!state || !mesh) return;

    if (Math.abs(state.targetOffset - state.currentOffset) > 0.001) {
      // Snappy down-press (0.36) and bouncy spring release (0.24)
      const springRate = state.targetOffset < state.currentOffset ? 0.36 : 0.24;
      state.currentOffset += (state.targetOffset - state.currentOffset) * springRate;
      mesh.position.y = BASE_TILE_Y + state.currentOffset;
      if (bGroup) bGroup.position.y = BASE_BUILDING_Y + state.currentOffset;
      if (landmark) landmark.position.y = BASE_BUILDING_Y + state.currentOffset;

      // Only reposition tokens if a player is physically situated on this specific depressed tile
      if (gameState.phase !== 'MOVING' && updatePlayerTokensPosCb) {
        const hasPlayerOnTile = gameState.players?.some(p => p.position === tile.id && !p.bankrupt);
        if (hasPlayerOnTile) {
          updatePlayerTokensPosCb();
        }
      }
    } else if (state.currentOffset !== state.targetOffset) {
      state.currentOffset = state.targetOffset;
      mesh.position.y = BASE_TILE_Y + state.currentOffset;
      if (bGroup) bGroup.position.y = BASE_BUILDING_Y + state.currentOffset;
      if (landmark) landmark.position.y = BASE_BUILDING_Y + state.currentOffset;
    }
  });
}
