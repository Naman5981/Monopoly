/**
 * game/rules.js
 * Core game-rule calculations: rent, group ownership, bankruptcy resolution.
 */

import { BOARD_TILES } from './data.js';
import { gameState, matchSettings, matchSeconds } from './state.js';
import { fmtMoney } from './utils.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../network/p2p.js';

/**
 * Clean Code: Unified metadata for property building tiers (0 to 4).
 * Single Source of Truth for tier names, icons, and labels.
 *
 * @param {number} level - 0 (Base), 1-3 (Houses), 4 (Skyscraper)
 * @returns {{ label: string, shortLabel: string, isMax: boolean, badgeClass: string, icon: string }}
 */
export function getPropertyLevelMetadata(level) {
  const lvl = Math.max(0, Math.min(4, Number(level) || 0));
  switch (lvl) {
    case 0:
      return { label: 'Base Land', shortLabel: 'Base', isMax: false, badgeClass: 'tier-house', icon: 'pin' };
    case 1:
      return { label: '1 House', shortLabel: '1 House', isMax: false, badgeClass: 'tier-house', icon: 'building' };
    case 2:
      return { label: '2 Houses', shortLabel: '2 Houses', isMax: false, badgeClass: 'tier-house', icon: 'building' };
    case 3:
      return { label: '3 Houses', shortLabel: '3 Houses', isMax: false, badgeClass: 'tier-house', icon: 'building' };
    case 4:
      return { label: 'Skyscraper (MAX)', shortLabel: 'Skyscraper', isMax: true, badgeClass: 'tier-skyscraper-badge', icon: 'city' };
    default:
      return { label: 'Base Land', shortLabel: 'Base', isMax: false, badgeClass: 'tier-house', icon: 'pin' };
  }
}

/**
 * Check if two players are teammates in Team Mode.
 * @param {number} pIdx1
 * @param {number} pIdx2
 * @returns {boolean}
 */
export function isTeammate(pIdx1, pIdx2) {
  if (!matchSettings.teamMode) return false;
  if (pIdx1 === null || pIdx2 === null || pIdx1 === undefined || pIdx2 === undefined) return false;
  if (pIdx1 === pIdx2) return false;
  const p1 = gameState.players?.[pIdx1];
  const p2 = gameState.players?.[pIdx2];
  if (!p1 || !p2) return false;
  return p1.teamId !== undefined && p2.teamId !== undefined && p1.teamId === p2.teamId;
}

/**
 * Get all player indices belonging to a specific team.
 * @param {number} teamId
 * @returns {Array<number>}
 */
export function getTeamMembers(teamId) {
  if (!gameState.players) return [];
  const members = [];
  gameState.players.forEach((p, idx) => {
    if (p.teamId === teamId) members.push(idx);
  });
  return members;
}

/** Check whether a player or their team owns every city in a colour group. */
export function ownsFullColorGroup(playerIdx, groupKey) {
  if (!groupKey) return false;
  const tiles = BOARD_TILES.filter(t => t.type === 'city' && t.group === groupKey);
  if (tiles.length === 0) return false;

  if (matchSettings.teamMode) {
    const p = gameState.players?.[playerIdx];
    const teamId = p ? p.teamId : null;
    if (teamId !== null && teamId !== undefined) {
      return tiles.every(t => {
        const st = gameState.properties[t.id];
        if (!st || st.owner === null) return false;
        const owner = gameState.players?.[st.owner];
        return owner && owner.teamId === teamId;
      });
    }
  }

  return tiles.every(t => {
    const st = gameState.properties[t.id];
    return st && st.owner === playerIdx;
  });
}

/**
 * Check if a player (or team) owns all but one city in a colour group (1 city away from monopoly).
 * @param {number} playerIdx
 * @param {string} groupKey
 * @returns {{ isNear: boolean, missingTile: object|null, ownedCount: number, totalCount: number }}
 */
export function checkNearMonopolyGroup(playerIdx, groupKey) {
  if (!groupKey || playerIdx === null || playerIdx === undefined) {
    return { isNear: false, missingTile: null, ownedCount: 0, totalCount: 0 };
  }
  const cities = BOARD_TILES.filter(t => t.type === 'city' && t.group === groupKey);
  if (cities.length <= 1) {
    return { isNear: false, missingTile: null, ownedCount: 0, totalCount: cities.length };
  }

  if (matchSettings.teamMode) {
    const p = gameState.players?.[playerIdx];
    const teamId = p ? p.teamId : null;
    if (teamId !== null && teamId !== undefined) {
      const teamOwned = cities.filter(t => {
        const st = gameState.properties[t.id];
        if (!st || st.owner === null) return false;
        const owner = gameState.players?.[st.owner];
        return owner && owner.teamId === teamId;
      });
      const isNear = teamOwned.length === cities.length - 1;
      const missingTile = isNear ? cities.find(t => {
        const st = gameState.properties[t.id];
        if (!st || st.owner === null) return true;
        const owner = gameState.players?.[st.owner];
        return !owner || owner.teamId !== teamId;
      }) || null : null;

      return {
        isNear,
        missingTile,
        ownedCount: teamOwned.length,
        totalCount: cities.length
      };
    }
  }

  const owned = cities.filter(t => gameState.properties[t.id]?.owner === playerIdx);
  const isNear = owned.length === cities.length - 1;
  const missingTile = isNear ? cities.find(t => gameState.properties[t.id]?.owner !== playerIdx) || null : null;

  return {
    isNear,
    missingTile,
    ownedCount: owned.length,
    totalCount: cities.length
  };
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
export function calculateTileRent(tileId, landingPlayerIdx = null) {
  const st = gameState.properties[tileId];
  if (!st || st.owner === null) return 0;
  if (landingPlayerIdx !== null && isTeammate(st.owner, landingPlayerIdx)) {
    return 0; // Teammate pays ZERO rent!
  }
  const base = calculateBaseTileRent(tileId);
  return (st && st.festivalBoost) ? base * 2 : base;
}

/**
 * Auto-liquidate buildings to cover a debt, then declare bankruptcy
 * if still insolvent.
 * Returns false if the player went bankrupt.
 */
export function checkAndHandleNegativeCash(playerIdx, refreshCallbacks, creditorIdx = null) {
  const p = gameState.players[playerIdx];
  if (!p || p.cash >= 0) return true;

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
    const creditor = (creditorIdx !== null && creditorIdx !== undefined && creditorIdx !== playerIdx)
      ? gameState.players[creditorIdx]
      : null;

    let inheritedCount = 0;
    BOARD_TILES.forEach(t => {
      const st = gameState.properties[t.id];
      if (st && st.owner === playerIdx) {
        if (creditor && !creditor.bankrupt) {
          st.owner = creditorIdx;
          inheritedCount++;
        } else {
          st.owner = null;
          st.level = 0;
        }
        refreshCallbacks?.onRefreshTile?.(t.id);
      }
    });

    if (creditor && !creditor.bankrupt && inheritedCount > 0) {
      refreshCallbacks?.onLog?.(`💥 <strong>${p.name}</strong> went BANKRUPT to <strong>${creditor.name}</strong>! <strong>${creditor.name}</strong> inherited ${inheritedCount} properties.`);
    } else {
      refreshCallbacks?.onLog?.(`💥 <strong>${p.name}</strong> went BANKRUPT!`);
    }

    if (networkState && networkState.isMultiplayer) {
      broadcastAction('ACTION_BANKRUPTCY', {
        bankruptIdx: playerIdx,
        creditorIdx: creditor ? creditorIdx : undefined,
        paidCash: 0
      });
      if (networkState.isHost) {
        broadcastFullGameState();
      }
    }

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

/** Check if player (or their team) owns all purchasable cities along an entire side of the board (Side 1..4). */
export function checkLineMonopoly(playerIdx) {
  if (playerIdx === null || playerIdx === undefined || !gameState.players || !gameState.players[playerIdx]) return 0;
  const p = gameState.players[playerIdx];
  const teamId = matchSettings.teamMode ? p.teamId : null;

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
      if (!st || st.owner === null) return false;
      if (teamId !== null && teamId !== undefined) {
        const owner = gameState.players?.[st.owner];
        return owner && owner.teamId === teamId;
      }
      return st.owner === playerIdx;
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

/** Calculate combined net worth of an entire team. */
export function calculateTeamNetWorth(teamId) {
  if (!gameState.players) return 0;
  let total = 0;
  gameState.players.forEach((p, idx) => {
    if (p.teamId === teamId && !p.bankrupt) {
      total += calculatePlayerNetWorth(idx);
    }
  });
  return total;
}

/**
 * Validate team distribution balance for Team Mode.
 * Rules:
 * - Must be exactly 4 players (2 vs 2) or 6 players (3 vs 3).
 * - Odd counts (5 players, 3 players) are blocked.
 *
 * @param {number} playerCount
 * @param {Array} customPlayers
 * @returns {{ valid: boolean, error: string|null, t0Count: number, t1Count: number }}
 */
export function validateTeamModeBalance(playerCount, customPlayers = []) {
  if (playerCount < 4) {
    return {
      valid: false,
      error: 'Team Mode requires at least 4 players (2 vs 2)!',
      t0Count: 0,
      t1Count: 0
    };
  }

  if (playerCount === 5) {
    return {
      valid: false,
      error: 'Team Mode requires 4 players (2 vs 2) or 6 players (3 vs 3)! (Current: 5 players)',
      t0Count: 0,
      t1Count: 0
    };
  }

  let t0Count = 0;
  let t1Count = 0;
  for (let i = 0; i < playerCount; i++) {
    const cp = customPlayers[i];
    const teamId = cp?.teamId !== undefined ? cp.teamId : (i % 2);
    if (teamId === 0) t0Count++;
    else t1Count++;
  }

  if (playerCount === 4) {
    if (t0Count !== 2 || t1Count !== 2) {
      return {
        valid: false,
        error: `Teams must be balanced (2 vs 2)! Current: ${t0Count} Red vs ${t1Count} Blue`,
        t0Count,
        t1Count
      };
    }
  } else if (playerCount === 6) {
    if (t0Count !== 3 || t1Count !== 3) {
      return {
        valid: false,
        error: `Teams must be balanced (3 vs 3)! Current: ${t0Count} Red vs ${t1Count} Blue`,
        t0Count,
        t1Count
      };
    }
  }

  return { valid: true, error: null, t0Count, t1Count };
}

/** Comprehensive victory evaluator supporting Bankruptcy, Monopolies, Line Monopoly, and Net Worth Time Cap. */
export function checkVictoryConditions() {
  if (!gameState.gameStarted || gameState.phase === 'SETUP' || !gameState.players || gameState.players.length === 0) {
    return null;
  }

  // ─── 1. Bankruptcy Elimination ───
  if (matchSettings.teamMode) {
    const aliveTeams = new Set(gameState.players.filter(pl => !pl.bankrupt).map(pl => pl.teamId));
    if (aliveTeams.size === 1) {
      const winningTeamId = [...aliveTeams][0];
      const teamName = winningTeamId === 0 ? 'TEAM RED' : 'TEAM BLUE';
      const winningPlayers = gameState.players.filter(pl => pl.teamId === winningTeamId);
      return {
        winner: winningPlayers[0] || gameState.players[0],
        teamId: winningTeamId,
        teamName,
        teamMembers: winningPlayers,
        isTeamVictory: true,
        type: 'bankruptcy',
        title: `${teamName} SUPREMACY!`,
        desc: `All rival team tycoons eliminated! ${teamName} reigns supreme over the global board!`
      };
    }
  } else {
    const alive = gameState.players.filter(pl => !pl.bankrupt);
    if (alive.length === 1) {
      return {
        winner: alive[0],
        type: 'bankruptcy',
        title: 'BANKRUPTCY SUPREMACY!',
        desc: 'All rival tycoons bankrupted. You are the last tycoon standing on the global board!'
      };
    }
  }

  // ─── 2. Monopoly Victory (3 Sets in Solo, 4 Sets in Team Mode) ───
  const requiredSets = matchSettings.teamMode ? (matchSettings.monopolySetsToWin || 4) : (matchSettings.monopolySetsToWin || 3);
  for (let i = 0; i < gameState.players.length; i++) {
    const p = gameState.players[i];
    if (p.bankrupt) continue;
    const completedSets = countCompletedColorGroups(i);
    if (completedSets >= requiredSets) {
      if (matchSettings.teamMode) {
        const teamName = p.teamId === 0 ? 'TEAM RED' : 'TEAM BLUE';
        const winningPlayers = gameState.players.filter(pl => pl.teamId === p.teamId);
        return {
          winner: p,
          teamId: p.teamId,
          teamName,
          teamMembers: winningPlayers,
          isTeamVictory: true,
          type: 'quad_monopoly',
          title: `${teamName} QUAD MONOPOLY SUPREMACY!`,
          desc: `Completed ${completedSets} full color districts across the team! Unstoppable real estate dominance!`
        };
      }
      return {
        winner: p,
        type: 'triple_monopoly',
        title: 'TRIPLE MONOPOLY SUPREMACY!',
        desc: `Completed ${completedSets} full color groups! Unstoppable real estate empire dominance!`
      };
    }
  }

  // ─── 3. Line Monopoly Victory ───
  if (matchSettings.lineMonopolyEnabled !== false) {
    for (let i = 0; i < gameState.players.length; i++) {
      const p = gameState.players[i];
      if (p.bankrupt) continue;
      const side = checkLineMonopoly(i);
      if (side > 0) {
        const sideNames = ['Southern Waterfront', 'Western Heritage', 'Northern Capitals', 'Eastern Megacities'];
        if (matchSettings.teamMode) {
          const teamName = p.teamId === 0 ? 'TEAM RED' : 'TEAM BLUE';
          const winningPlayers = gameState.players.filter(pl => pl.teamId === p.teamId);
          return {
            winner: p,
            teamId: p.teamId,
            teamName,
            teamMembers: winningPlayers,
            isTeamVictory: true,
            type: 'line_monopoly',
            title: `${teamName} LINE MONOPOLY!`,
            desc: `${teamName} conquered the entire ${sideNames[side - 1]} edge of the global board!`
          };
        }
        return {
          winner: p,
          type: 'line_monopoly',
          title: 'LINE MONOPOLY VICTORY!',
          desc: `Conquered the entire ${sideNames[side - 1]} edge of the global board!`
        };
      }
    }
  }

  // ─── 4. Match Time Limit / Net Worth Cap ───
  const maxMinutes = matchSettings.matchDurationMinutes || 0;
  if (maxMinutes > 0 && matchSeconds >= maxMinutes * 60) {
    if (matchSettings.teamMode) {
      let bestTeamId = 0;
      let maxTeamWorth = -1;
      [0, 1].forEach(tId => {
        const tWorth = calculateTeamNetWorth(tId);
        if (tWorth > maxTeamWorth) {
          maxTeamWorth = tWorth;
          bestTeamId = tId;
        }
      });
      const teamName = bestTeamId === 0 ? 'TEAM RED' : 'TEAM BLUE';
      const winningPlayers = gameState.players.filter(pl => pl.teamId === bestTeamId);
      return {
        winner: winningPlayers[0] || gameState.players[0],
        teamId: bestTeamId,
        teamName,
        teamMembers: winningPlayers,
        isTeamVictory: true,
        type: 'net_worth_time',
        title: `${teamName} RICHEST ALLIANCE!`,
        desc: `Match time limit expired (${maxMinutes}m)! ${teamName} crowned champions with combined Net Worth of ${fmtMoney(maxTeamWorth)}!`
      };
    }

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

