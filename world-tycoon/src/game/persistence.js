/**
 * game/persistence.js
 * Match state persistence in localStorage and resume management.
 */

import { gameState, matchSettings, displayedCash, matchSeconds, setMatchSeconds, isHumanTurnActionable, localPlayerIdx } from './state.js';
import { BOARD_TILES, applyBoardEdition } from './data.js';
import { fmtMoney } from './utils.js';
import { refreshTileTextureAndBuildings, spawnAllPlayerTokens3D, updatePlayerTokenPositions3D, showSpeechBubble, applyBoardStyle } from '../three/scene.js';
import { renderCornerHUDs, updateRollButtonsUI, revealGameHud, logEvent } from '../ui/hud.js';
import { updateModalSlice } from '../svelte/stores/modalStore.js';
import { playSFX, startAdaptiveMusic } from './audio.js';
import { resumeActiveTurn } from './engine.js';
import { closeAllGameModals } from '../ui/modals/common.js';
import { networkState } from '../network/p2pState.js';

const STORAGE_KEY = 'WORLD_TYCOON_SAVED_MATCH_V1';

/**
 * Save complete snapshot of current match to localStorage.
 */
export function saveCurrentMatchToStorage() {
  if (!gameState.gameStarted || !gameState.players || gameState.players.length === 0) return;
  // Don't save if match already won (all except 1 bankrupt)
  const activePlayers = gameState.players.filter(p => !p.bankrupt);
  if (activePlayers.length <= 1) return;

  try {
    const data = {
      version: 1,
      timestamp: Date.now(),
      matchSeconds: matchSeconds || 0,
      matchSettings: {
        startingCash: matchSettings.startingCash,
        turnDuration: matchSettings.turnDuration,
        lightingTheme: matchSettings.lightingTheme,
        boardStyle: matchSettings.boardStyle,
        boardEdition: matchSettings.boardEdition,
        customPlayers: matchSettings.customPlayers,
        playerCount: gameState.players.length
      },
      gameState: {
        gameStarted: true,
        currentPlayerIdx: gameState.currentPlayerIdx,
        phase: gameState.phase,
        turnTimeLeft: gameState.turnTimeLeft,
        festivalPot: gameState.festivalPot,
        doublesCount: gameState.doublesCount,
        achievedMonopolies: gameState.achievedMonopolies || {},
        players: gameState.players.map(p => ({ ...p })),
        properties: JSON.parse(JSON.stringify(gameState.properties))
      },
      displayedCash: [...displayedCash],
      isMultiplayer: Boolean(networkState.isMultiplayer),
      isHost: Boolean(networkState.isHost),
      roomCode: networkState.roomCode || null,
      localPlayerIdx: typeof localPlayerIdx === 'number' ? localPlayerIdx : (networkState.localPlayerIdx || 0)
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[Persistence] Failed to save match:', err);
  }
}

/**
 * Check if a valid unfinished saved match exists in localStorage.
 */
export function getSavedMatchData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.gameState && data.gameState.gameStarted && Array.isArray(data.gameState.players)) {
      const active = data.gameState.players.filter(p => !p.bankrupt);
      if (active.length > 1) {
        return data;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Remove saved match from storage.
 */
export function clearSavedMatch() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}

/**
 * Resume saved match into live game engine.
 */
export function resumeSavedMatch() {
  const data = getSavedMatchData();
  if (!data) return false;

  try {
    // 1. Restore match settings
    if (data.matchSettings) {
      matchSettings.startingCash = data.matchSettings.startingCash;
      matchSettings.turnDuration = data.matchSettings.turnDuration;
      matchSettings.lightingTheme = data.matchSettings.lightingTheme;
      if (data.matchSettings.boardStyle) {
        matchSettings.boardStyle = data.matchSettings.boardStyle;
        applyBoardStyle(matchSettings.boardStyle);
      }
      if (data.matchSettings.boardEdition) {
        matchSettings.boardEdition = data.matchSettings.boardEdition;
        applyBoardEdition(matchSettings.boardEdition);
      }
      if (Array.isArray(data.matchSettings.customPlayers)) {
        matchSettings.customPlayers = data.matchSettings.customPlayers;
      }
    }

    // 2. Restore game state
    gameState.gameStarted = true;
    gameState.currentPlayerIdx = data.gameState.currentPlayerIdx ?? 0;
    // Always sanitize phase to ROLL so match doesn't hang if previously saved mid-action/mid-hop
    gameState.phase = 'ROLL';
    gameState.turnTimeLeft = data.gameState.turnTimeLeft || 15;
    gameState.festivalPot = data.gameState.festivalPot || 0;
    gameState.doublesCount = data.gameState.doublesCount || 0;
    gameState.achievedMonopolies = data.gameState.achievedMonopolies || {};
    gameState.players = data.gameState.players.map(p => ({ ...p }));
    gameState.properties = JSON.parse(JSON.stringify(data.gameState.properties));

    // 3. Restore clock & displayed cash
    if (typeof data.matchSeconds === 'number') {
      setMatchSeconds(data.matchSeconds);
    }
    if (Array.isArray(data.displayedCash)) {
      displayedCash.splice(0, displayedCash.length, ...data.displayedCash);
    }

    // 4. Update 3D Scene
    BOARD_TILES.forEach(t => {
      refreshTileTextureAndBuildings(t.id);
    });
    spawnAllPlayerTokens3D();
    updatePlayerTokenPositions3D();

    // 5. Update HUD
    revealGameHud();
    renderCornerHUDs();
    updateRollButtonsUI(isHumanTurnActionable());

    // 6. Close all setup/resume modals
    closeAllGameModals();
    closeResumeModal();
    const landing = document.getElementById('landing-setup-screen');
    if (landing) {
      landing.classList.add('hidden');
      landing.classList.remove('flex');
      landing.style.setProperty('display', 'none', 'important');
    }

    try {
      playSFX('win');
      startAdaptiveMusic();
    } catch (_) {}
    showSpeechBubble('🎮 Match resumed! Welcome back!', 3000);
    logEvent(`💾 <strong>Unfinished match resumed</strong> from previous session.`);

    // 7. If this was a multiplayer match, attempt resilient P2P session resurrection
    if (data.isMultiplayer && data.roomCode) {
      if (data.isHost) {
        if (typeof window !== 'undefined' && typeof window.reconnectHostRoom === 'function') {
          window.reconnectHostRoom(data.roomCode);
        }
      } else {
        if (typeof window !== 'undefined' && typeof window.startGuestReconnectGracePeriod === 'function') {
          window.startGuestReconnectGracePeriod(data.roomCode, 30);
        }
      }
    } else {
      // Offline local continuation: ensure no phantom human players stall turn rotation
      const myIdx = (typeof localPlayerIdx === 'number' ? localPlayerIdx : 0);
      gameState.players.forEach((p, idx) => {
        if (idx !== myIdx && !p.isAI && data.isMultiplayer) {
          p.isAI = true;
        }
      });
    }

    // 8. Kick off the active turn immediately (starts AI dice roll timer or enables human roll)
    resumeActiveTurn();

    return true;
  } catch (err) {
    console.error('[Persistence] Error resuming match:', err);
    clearSavedMatch();
    return false;
  }
}

/**
 * Open the "Resume Last Match?" dialog if a saved match is detected.
 */
export function checkAndPromptResumeMatch() {
  const data = getSavedMatchData();
  if (!data) return false;

  const curP = data.gameState.players[data.gameState.currentPlayerIdx] || data.gameState.players[0];
  const mins = String(Math.floor((data.matchSeconds || 0) / 60)).padStart(2, '0');
  const secs = String((data.matchSeconds || 0) % 60).padStart(2, '0');

  const players = (data.gameState.players || []).map((p, idx) => {
    const ownedCount = Object.values(data.gameState.properties || {}).filter(pr => pr && pr.owner === idx).length;
    return {
      name: p.name,
      colorHex: p.colorHex || '#6366f1',
      isAI: Boolean(p.isAI),
      cashFormatted: fmtMoney(p.cash),
      ownedCount
    };
  });

  updateModalSlice('resumeMatch', {
    visible: true,
    matchTimeFormatted: `${mins}:${secs}`,
    currentPlayerName: curP?.name || 'Player',
    currentPlayerColor: curP?.colorHex || '#10b981',
    isMultiplayer: Boolean(data.isMultiplayer),
    isHost: Boolean(data.isHost),
    roomCode: data.roomCode || '',
    players
  });

  return true;
}

export function closeResumeModal() {
  updateModalSlice('resumeMatch', { visible: false });
  const m = document.getElementById('modal-resume-match');
  if (m) {
    if (typeof anime !== 'undefined') anime.remove(m);
    m.classList.add('hidden');
    m.classList.remove('flex');
    m.style.setProperty('display', 'none', 'important');
    m.style.removeProperty('opacity');
    m.style.removeProperty('pointer-events');
  }
}
