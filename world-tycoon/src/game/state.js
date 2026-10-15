/**
 * game/state.js
 * Central reactive game-state store shared across all modules.
 */

import { PLAYER_THEMES, BOARD_TILES } from './data.js';

export const matchSettings = {
  startingCash: 2_000_000,
  turnDuration: 15,
  lightingTheme: 'day', // 'day' | 'sunset' | 'night'
  boardStyle: 'wood', // 'wood' | 'cyberpunk' | 'elegant'
  customPlayers: [
    { name: 'YOU', isAI: false, charColor: 0xef4444, colorHex: '#6c5ce7', hatColor: 0x334155, hatStyle: 0 },
    { name: 'BIDIK', isAI: true, charColor: 0xf97316, colorHex: '#f39c12', hatColor: 0xfde047, hatStyle: 1 },
    { name: 'ATLAS', isAI: true, charColor: 0x10b981, colorHex: '#10b981', hatColor: 0x1e293b, hatStyle: 2 },
    { name: 'NOVA', isAI: true, charColor: 0xec4899, colorHex: '#ec4899', hatColor: 0xffffff, hatStyle: 3 },
    { name: 'PHOENIX', isAI: true, charColor: 0xef4444, colorHex: '#ef4444', hatColor: 0xf97316, hatStyle: 0 },
    { name: 'CYBER', isAI: true, charColor: 0x06b6d4, colorHex: '#06b6d4', hatColor: 0x38bdf8, hatStyle: 3 }
  ]
};

export const setupPlayers = matchSettings.customPlayers;

export const gameState = {
  gameStarted: false,
  players: [],
  /** tileId → { owner: idx|null, level: 0..4, mortgaged: bool, festivalBoost: bool } */
  properties: {},
  currentPlayerIdx: 0,
  /** 'ROLL' | 'MOVING' | 'MODAL' | 'WORLD_TOUR' | 'END' */
  phase: 'ROLL',
  doublesCount: 0,
  festivalPot: 0,
  turnTimeLeft: 15,
  activeInspectorTile: null,
  auction: null,
  pendingBuyTile: null,
  pendingDoubles: false,
  upgradesThisVisit: 0,
};

/** Animated cash displayed in the HUD (lags behind real cash for rolling effect) */
export const displayedCash = [2000000, 2000000, 2000000, 2000000, 2000000, 2000000];

export let lobbyPlayerCount = 2;
export function setLobbyPlayerCount(n) { lobbyPlayerCount = n; }

export let soundEnabled = true;
export function toggleSoundEnabled() { soundEnabled = !soundEnabled; }

export let tomatoThrows = 0;
export function incrementTomato() { tomatoThrows++; }

export let matchSeconds = 0;
export function incrementMatchSeconds() { matchSeconds++; }

export let localPlayerIdx = 0;
export function setLocalPlayerIdx(idx) { localPlayerIdx = idx; }
export function getLocalPlayerIdx() { return localPlayerIdx; }

/**
 * Returns true only when it is the local human player's active turn
 * and the game is in an actionable phase.
 */
export function isHumanTurnActionable() {
  const p = gameState.players[gameState.currentPlayerIdx];
  if (!p || p.isAI || gameState.currentPlayerIdx !== localPlayerIdx) return false;
  return (gameState.phase === 'ROLL' || gameState.phase === 'END');
}

/**
 * Re-initialise game state for a fresh match with configured settings.
 * @param {number} count — number of players (2-4)
 */
export function resetGameStateForNewMatch(count) {
  gameState.players = [];
  const startCash = matchSettings.startingCash || 2_000_000;

  for (let i = 0; i < count; i++) {
    const cp = matchSettings.customPlayers[i] || PLAYER_THEMES[i];
    gameState.players.push({
      name: cp.name || PLAYER_THEMES[i].name,
      isAI: cp.isAI !== undefined ? cp.isAI : (i > 0),
      cash: startCash,
      position: 0,
      inIsland: false,
      islandTurns: 0,
      bankrupt: false,
    });
    displayedCash[i] = startCash;
  }

  gameState.properties = {};
  BOARD_TILES.forEach(t => {
    if (t.type === 'city' || t.type === 'resort') {
      gameState.properties[t.id] = { owner: null, level: 0, mortgaged: false, festivalBoost: false };
    }
  });

  gameState.currentPlayerIdx = 0;
  gameState.phase = 'ROLL';
  gameState.festivalPot = 0;
  gameState.turnTimeLeft = matchSettings.turnDuration || 15;
  gameState.doublesCount = 0;
  gameState.auction = null;
  gameState.pendingBuyTile = null;
  gameState.pendingDoubles = false;
  gameState.upgradesThisVisit = 0;
  gameState.activeInspectorTile = null;
  gameState.achievedMonopolies = {};
  gameState.gameStarted = true;
  matchSeconds = 0;
}
