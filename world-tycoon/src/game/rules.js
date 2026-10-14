/**
 * game/rules.js
 * Core game-rule calculations: rent, group ownership, bankruptcy resolution.
 */

import { BOARD_TILES, PLAYER_THEMES } from './data.js';
import { gameState, displayedCash } from './state.js';
import { fmtMoney } from './utils.js';
import { playSFX } from './audio.js';

/** Check whether a player owns every city in a colour group (none mortgaged). */
export function ownsFullColorGroup(playerIdx, groupKey) {
  if (!groupKey) return false;
  const tiles = BOARD_TILES.filter(t => t.type === 'city' && t.group === groupKey);
  return tiles.length > 0 && tiles.every(t => {
    const st = gameState.properties[t.id];
    return st && st.owner === playerIdx && !st.mortgaged;
  });
}

/** Calculate current rent owed for a tile landing. */
export function calculateTileRent(tileId) {
  const tile = BOARD_TILES[tileId];
  const st = gameState.properties[tileId];
  if (!tile || !st || st.owner === null || st.mortgaged) return 0;

  if (tile.type === 'resort') {
    const ownedResorts = BOARD_TILES.filter(
      t => t.type === 'resort' && gameState.properties[t.id]?.owner === st.owner
    ).length;
    return tile.rent[Math.min(ownedResorts - 1, tile.rent.length - 1)] || tile.rent[0];
  }

  let base = tile.rent[st.level || 0] || tile.rent[0];
  if ((st.level || 0) === 0 && ownsFullColorGroup(st.owner, tile.group)) base *= 2;
  if (st.festivalBoost) base *= 2;
  return base;
}

/**
 * Auto-liquidate buildings / mortgage to cover a debt, then declare bankruptcy
 * if still insolvent.
 * Returns false if the player went bankrupt.
 */
export function checkAndHandleNegativeCash(playerIdx, refreshCallbacks) {
  const p = gameState.players[playerIdx];
  if (p.cash >= 0) return true;

  for (const t of BOARD_TILES) {
    const st = gameState.properties[t.id];
    while (p.cash < 0 && st && st.owner === playerIdx && st.level > 0) {
      const refund = t.houseCost / 2;
      p.cash += refund;
      st.level--;
      refreshCallbacks?.onRefreshTile?.(t.id);
    }
  }
  for (const t of BOARD_TILES) {
    const st = gameState.properties[t.id];
    if (p.cash < 0 && st && st.owner === playerIdx && !st.mortgaged) {
      const gain = t.price / 2;
      st.mortgaged = true;
      p.cash += gain;
      refreshCallbacks?.onRefreshTile?.(t.id);
    }
  }

  if (p.cash < 0) {
    p.bankrupt = true;
    p.cash = 0;
    BOARD_TILES.forEach(t => {
      const st = gameState.properties[t.id];
      if (st && st.owner === playerIdx) {
        st.owner = null;
        st.level = 0;
        st.mortgaged = false;
        refreshCallbacks?.onRefreshTile?.(t.id);
      }
    });
    refreshCallbacks?.onLog?.(`💥 <strong>${p.name}</strong> went BANKRUPT!`);
    return false;
  }
  return true;
}
