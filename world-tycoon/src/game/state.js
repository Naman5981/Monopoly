/**
 * game/state.js
 * Central reactive game-state store shared across all modules.
 */

import { PLAYER_THEMES, BOARD_TILES } from './data.js';
import { networkState } from '../network/p2pState.js';

export const PLAYER_NAME_STORAGE_KEY = 'WORLD_TYCOON_PLAYER_NAME';

/**
 * Retrieve saved human player name from persistent storage.
 * Defaults to 'TYCOON' if not set or if set to the legacy placeholder 'YOU'.
 * @returns {string}
 */
export function getSavedPlayerName() {
  if (typeof localStorage === 'undefined') return 'TYCOON';
  try {
    const direct = localStorage.getItem(PLAYER_NAME_STORAGE_KEY);
    if (direct && direct.trim() && direct.trim().toUpperCase() !== 'YOU') {
      return direct.trim().toUpperCase().slice(0, 14);
    }
    const profileRaw = localStorage.getItem('WORLD_TYCOON_PROFILE_V3');
    if (profileRaw) {
      const parsed = JSON.parse(profileRaw);
      if (parsed && parsed.name && parsed.name.trim() && parsed.name.trim().toUpperCase() !== 'YOU') {
        return parsed.name.trim().toUpperCase().slice(0, 14);
      }
    }
  } catch (_) {}
  return 'TYCOON';
}

/**
 * Persist human player name to localStorage and profile store.
 * @param {string} rawName
 * @returns {string} The cleaned, persisted name
 */
export function savePlayerName(rawName) {
  const clean = (rawName || '').trim().toUpperCase().slice(0, 14);
  const finalName = (clean && clean !== 'YOU') ? clean : 'TYCOON';
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(PLAYER_NAME_STORAGE_KEY, finalName);
      const profileRaw = localStorage.getItem('WORLD_TYCOON_PROFILE_V3');
      if (profileRaw) {
        const parsed = JSON.parse(profileRaw);
        parsed.name = finalName;
        localStorage.setItem('WORLD_TYCOON_PROFILE_V3', JSON.stringify(parsed));
      }
    } catch (_) {}
  }
  return finalName;
}

const initialPlayerName = getSavedPlayerName();
if (PLAYER_THEMES[0]) {
  PLAYER_THEMES[0].name = initialPlayerName;
}

export const matchSettings = {
  startingCash: 2_000_000,
  turnDuration: 15,
  lightingTheme: 'day', // 'day' | 'sunset' | 'night'
  boardStyle: 'wood', // 'wood' | 'cyberpunk' | 'elegant'
  boardEdition: 'world', // 'world' | 'rajasthan'
  monopolySetsToWin: 3, // Complete 3 color groups to win instantly
  lineMonopolyEnabled: true, // Conquering an entire side of the board wins instantly
  matchDurationMinutes: 15, // Match time limit (richest player by Net Worth wins, 0 for unlimited)
  gameSpeed: 1, // 1 | 2 | 4 (Fast-forward multiplier for animations and bot actions)
  customPlayers: [
    { name: initialPlayerName, isAI: false, charColor: 0x3b82f6, colorHex: '#3b82f6', hatColor: 0x334155, hatStyle: 0 },
    { name: 'BARON', isAI: true, charColor: 0xf97316, colorHex: '#fb923c', hatColor: 0xfde047, hatStyle: 1 },
    { name: 'ATLAS', isAI: true, charColor: 0x22c55e, colorHex: '#22c55e', hatColor: 0x1e293b, hatStyle: 2 },
    { name: 'NOVA', isAI: true, charColor: 0xec4899, colorHex: '#ec4899', hatColor: 0xffffff, hatStyle: 3 },
    { name: 'PHOENIX', isAI: true, charColor: 0xef4444, colorHex: '#ef4444', hatColor: 0xf97316, hatStyle: 0 },
    { name: 'CYBER', isAI: true, charColor: 0x06b6d4, colorHex: '#06b6d4', hatColor: 0x38bdf8, hatStyle: 3 }
  ]
};

export const setupPlayers = matchSettings.customPlayers;

export const debugState = {
  enabled: false,
  freezeAI: false,
  forcedD1: 3,
  forcedD2: 4,
  selectedTileId: 1,
  selectedPlayerIdx: 0,
};

export const gameState = {
  gameStarted: false,
  players: [],
  /** tileId → { owner: idx|null, level: 0..4, festivalBoost: bool } */
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
  netWorthHistory: [], // [{ turn: 0, time: '00:00', values: [2000000, 2000000] }]
};

export function cycleGameSpeed() {
  const speeds = [1, 2, 4];
  const curIdx = speeds.indexOf(matchSettings.gameSpeed || 1);
  const nextSpeed = speeds[(curIdx + 1) % speeds.length];
  matchSettings.gameSpeed = nextSpeed;
  if (typeof window !== 'undefined' && window.updateGameSpeedUI) window.updateGameSpeedUI();
  return nextSpeed;
}

/** Animated cash displayed in the HUD (lags behind real cash for rolling effect) */
export const displayedCash = [2000000, 2000000, 2000000, 2000000, 2000000, 2000000];

export let lobbyPlayerCount = 2;
export function setLobbyPlayerCount(n) { lobbyPlayerCount = n; }

const SAVED_VOLUME = (typeof localStorage !== 'undefined') ? localStorage.getItem('WORLD_TYCOON_SOUND_VOLUME') : null;
const INITIAL_VOL = SAVED_VOLUME !== null ? Math.max(0, Math.min(1, parseFloat(SAVED_VOLUME))) : 0.55;

export let soundVolume = isNaN(INITIAL_VOL) ? 0.55 : INITIAL_VOL;
export let lastNonZeroVolume = soundVolume > 0 ? soundVolume : 0.55;
export let soundEnabled = soundVolume > 0;

export function toggleSoundEnabled() {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    if (soundVolume === 0) soundVolume = lastNonZeroVolume || 0.55;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('WORLD_TYCOON_SOUND_VOLUME', (soundEnabled ? soundVolume : 0).toString());
  }
}

export function setSoundVolume(v) {
  const num = Math.max(0, Math.min(1, parseFloat(v)));
  soundVolume = isNaN(num) ? 0.75 : num;
  if (soundVolume > 0) {
    lastNonZeroVolume = soundVolume;
    soundEnabled = true;
  } else {
    soundEnabled = false;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('WORLD_TYCOON_SOUND_VOLUME', soundVolume.toString());
  }
}

export let tomatoThrows = 0;
export function incrementTomato() { tomatoThrows++; }

export let matchSeconds = 0;
export function incrementMatchSeconds() { matchSeconds++; }
export function setMatchSeconds(sec) { matchSeconds = typeof sec === 'number' ? sec : 0; }

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
    const isOnline = Boolean(networkState && networkState.isMultiplayer);
    const isConnectedPeer = isOnline && (
      Boolean(cp.isOnlinePeer) ||
      Boolean(cp.peerId) ||
      (networkState.isHost && i > 0 && cp.isAI === false)
    );

    let isAI = false;
    if (isOnline) {
      if (i === 0) {
        isAI = false;
      } else if (isConnectedPeer) {
        isAI = false;
        if (cp) {
          cp.isAI = false;
          cp.isOnlinePeer = true;
        }
      } else {
        isAI = cp.isAI !== undefined ? cp.isAI : true;
      }
    } else {
      isAI = cp.isAI !== undefined ? cp.isAI : (i > 0);
    }

    gameState.players.push({
      id: i,
      name: cp.name || PLAYER_THEMES[i].name,
      isAI,
      isOnlinePeer: isConnectedPeer,
      peerId: cp.peerId || null,
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
      gameState.properties[t.id] = { owner: null, level: 0, festivalBoost: false };
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
