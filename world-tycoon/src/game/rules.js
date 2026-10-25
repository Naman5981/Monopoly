/**
 * game/rules.js
 * Core game-rule calculations: rent, group ownership, bankruptcy resolution.
 */

import { BOARD_TILES, PLAYER_THEMES } from './data.js';
import { gameState, displayedCash, matchSettings, matchSeconds } from './state.js';
import { fmtMoney } from './utils.js';

/** Check whether a player owns every city in a colour group. */
export function ownsFullColorGroup(playerIdx, groupKey) {
  if (!groupKey) return false;
  const tiles = BOARD_TILES.filter(t => t.type === 'city' && t.group === groupKey);
  return tiles.length > 0 && tiles.every(t => {
    const st = gameState.properties[t.id];
    return st && st.owner === playerIdx;
  });
}

/** Calculate standard base rent without festival multiplier. */
export function calculateBaseTileRent(tileId) {
  const tile = BOARD_TILES[tileId];
  const st = gameState.properties[tileId];
  if (!tile || !st || st.owner === null) return 0;

  if (tile.type === 'resort') {
    const ownedResorts = BOARD_TILES.filter(
      t => t.type === 'resort' && gameState.properties[t.id]?.owner === st.owner
    ).length;
    return tile.rent[Math.min(ownedResorts - 1, tile.rent.length - 1)] || tile.rent[0];
  }

  let base = tile.rent[st.level || 0] || tile.rent[0];
  if ((st.level || 0) === 0 && ownsFullColorGroup(st.owner, tile.group)) base *= 2;
  return base;
}

/** Calculate current rent owed for a tile landing. */
export function calculateTileRent(tileId) {
  const base = calculateBaseTileRent(tileId);
  const st = gameState.properties[tileId];
  return (st && st.festivalBoost) ? base * 2 : base;
}

/**
 * Auto-liquidate buildings to cover a debt, then declare bankruptcy
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

  if (p.cash < 0) {
    p.bankrupt = true;
    p.cash = 0;
    BOARD_TILES.forEach(t => {
      const st = gameState.properties[t.id];
      if (st && st.owner === playerIdx) {
        st.owner = null;
        st.level = 0;
        refreshCallbacks?.onRefreshTile?.(t.id);
      }
    });
    refreshCallbacks?.onLog?.(`💥 <strong>${p.name}</strong> went BANKRUPT!`);
    return false;
  }
  return true;
}

/** Count how many distinct full color sets a player completely owns. */
export function countCompletedColorGroups(playerIdx) {
  if (playerIdx === null || playerIdx === undefined || !gameState.players || !gameState.players[playerIdx]) return 0;
  const groups = new Set();
  BOARD_TILES.forEach(t => {
    if (t.type === 'city' && t.group) groups.add(t.group);
  });
  let count = 0;
  for (const grp of groups) {
    if (ownsFullColorGroup(playerIdx, grp)) {
      count++;
    }
  }
  return count;
}

/** Check if player owns all purchasable cities along an entire side of the board (Side 1..4). */
export function checkLineMonopoly(playerIdx) {
  if (playerIdx === null || playerIdx === undefined || !gameState.players || !gameState.players[playerIdx]) return 0;
  const sides = [
    [1, 3, 4, 5, 6, 7],      // Side 1 (Bottom)
    [9, 10, 11, 13, 14, 15],  // Side 2 (Left)
    [17, 19, 20, 21, 22, 23], // Side 3 (Top)
    [25, 26, 27, 28, 30, 31]  // Side 4 (Right)
  ];
  for (let s = 0; s < sides.length; s++) {
    const sideTiles = sides[s];
    const ownsAll = sideTiles.every(id => {
      const st = gameState.properties[id];
      return st && st.owner === playerIdx;
    });
    if (ownsAll) {
      return s + 1; // Side 1..4
    }
  }
  return 0;
}

/** Calculate player's total net worth (Cash + Properties + Upgrades). */
export function calculatePlayerNetWorth(playerIdx) {
  const p = gameState.players && gameState.players[playerIdx];
  if (!p || p.bankrupt) return 0;
  let netWorth = p.cash;
  for (const t of BOARD_TILES) {
    const st = gameState.properties[t.id];
    if (st && st.owner === playerIdx) {
      netWorth += t.price;
      if (st.level > 0 && t.houseCost) {
        netWorth += st.level * t.houseCost;
      }
    }
  }
  return netWorth;
}

/** Comprehensive victory evaluator supporting Bankruptcy, Triple Monopoly, Line Monopoly, and Net Worth Time Cap. */
export function checkVictoryConditions() {
  if (!gameState.gameStarted || gameState.phase === 'SETUP' || !gameState.players || gameState.players.length === 0) {
    return null;
  }

  // 1. Bankruptcy Elimination (Last player standing)
  const alive = gameState.players.filter(pl => !pl.bankrupt);
  if (alive.length === 1) {
    return {
      winner: alive[0],
      type: 'bankruptcy',
      title: 'BANKRUPTCY SUPREMACY!',
      desc: 'All rival tycoons bankrupted. You are the last tycoon standing on the global board!'
    };
  }

  // 2. Triple Monopoly Victory (First to complete 3 full color groups)
  const requiredSets = matchSettings.monopolySetsToWin || 3;
  for (let i = 0; i < gameState.players.length; i++) {
    const p = gameState.players[i];
    if (p.bankrupt) continue;
    const completedSets = countCompletedColorGroups(i);
    if (completedSets >= requiredSets) {
      return {
        winner: p,
        type: 'triple_monopoly',
        title: 'TRIPLE MONOPOLY SUPREMACY!',
        desc: `Completed ${completedSets} full color groups! Unstoppable real estate empire dominance!`
      };
    }
  }

  // 3. Line Monopoly Victory (Owns all cities along an entire side of the board)
  if (matchSettings.lineMonopolyEnabled !== false) {
    for (let i = 0; i < gameState.players.length; i++) {
      const p = gameState.players[i];
      if (p.bankrupt) continue;
      const side = checkLineMonopoly(i);
      if (side > 0) {
        const sideNames = ['Southern Waterfront', 'Western Heritage', 'Northern Capitals', 'Eastern Megacities'];
        return {
          winner: p,
          type: 'line_monopoly',
          title: 'LINE MONOPOLY VICTORY!',
          desc: `Conquered the entire ${sideNames[side - 1]} edge of the global board!`
        };
      }
    }
  }

  // 4. Match Time Limit / Net Worth Cap
  const maxMinutes = matchSettings.matchDurationMinutes || 0;
  if (maxMinutes > 0 && matchSeconds >= maxMinutes * 60) {
    let bestPlayer = null;
    let maxWorth = -1;
    gameState.players.forEach((p, idx) => {
      if (!p.bankrupt) {
        const worth = calculatePlayerNetWorth(idx);
        if (worth > maxWorth) {
          maxWorth = worth;
          bestPlayer = p;
        }
      }
    });
    if (bestPlayer) {
      return {
        winner: bestPlayer,
        type: 'net_worth_time',
        title: 'RICHEST TYCOON VICTORY!',
        desc: `Match time limit expired (${maxMinutes}m)! Crowned champion with the highest total Net Worth of ${fmtMoney(maxWorth)}!`
      };
    }
  }

  return null;
}

