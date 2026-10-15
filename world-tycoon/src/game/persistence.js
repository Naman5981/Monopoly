/**
 * game/persistence.js
 * Match state persistence in localStorage and resume management.
 */

import { gameState, matchSettings, displayedCash, matchSeconds } from './state.js';
import { BOARD_TILES, applyBoardEdition } from './data.js';
import { fmtMoney } from './utils.js';
import { refreshTileTextureAndBuildings, spawnAllPlayerTokens3D, updatePlayerTokenPositions3D, showSpeechBubble, applyBoardStyle } from '../three/scene.js';
import { renderCornerHUDs, updateRollButtonsUI, logEvent } from '../ui/hud.js';
import { playSFX } from './audio.js';

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
      displayedCash: [...displayedCash]
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
    gameState.phase = data.gameState.phase || 'ROLL';
    gameState.turnTimeLeft = data.gameState.turnTimeLeft || 15;
    gameState.festivalPot = data.gameState.festivalPot || 0;
    gameState.doublesCount = data.gameState.doublesCount || 0;
    gameState.achievedMonopolies = data.gameState.achievedMonopolies || {};
    gameState.players = data.gameState.players.map(p => ({ ...p }));
    gameState.properties = JSON.parse(JSON.stringify(data.gameState.properties));

    // 3. Restore clock & displayed cash
    if (typeof data.matchSeconds === 'number') {
      window.matchSeconds = data.matchSeconds;
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
    renderCornerHUDs();
    updateRollButtonsUI(true);

    // 6. Close all setup/resume modals
    closeResumeModal();
    const landing = document.getElementById('landing-setup-screen');
    if (landing) {
      landing.classList.add('hidden');
      landing.style.display = 'none';
    }

    playSFX('win');
    showSpeechBubble('🎮 Match resumed! Welcome back!', 3000);
    logEvent(`💾 <strong>Unfinished match resumed</strong> from previous session.`);
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

  const m = document.getElementById('modal-resume-match');
  if (!m) return false;

  // Populate preview card
  const curP = data.gameState.players[data.gameState.currentPlayerIdx] || data.gameState.players[0];
  const mins = String(Math.floor((data.matchSeconds || 0) / 60)).padStart(2, '0');
  const secs = String((data.matchSeconds || 0) % 60).padStart(2, '0');

  const metaEl = document.getElementById('resume-match-meta');
  if (metaEl) {
    metaEl.innerHTML = `
      <div class="flex items-center justify-between text-xs font-bold text-slate-700">
        <span>⏱️ Match Time: <strong class="text-indigo-600">${mins}:${secs}</strong></span>
        <span>🎲 Turn: <strong class="text-amber-600">${curP?.name}</strong></span>
      </div>
    `;
  }

  const rosterEl = document.getElementById('resume-player-roster');
  if (rosterEl) {
    rosterEl.innerHTML = data.gameState.players.map((p, idx) => {
      const ownedCount = Object.values(data.gameState.properties).filter(pr => pr && pr.owner === idx).length;
      return `
        <div class="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full" style="background:${p.colorHex || '#6366f1'}"></span>
            <span class="font-black text-slate-800">${p.name} ${p.isAI ? '(AI)' : ''}</span>
          </div>
          <div class="text-right">
            <span class="font-extrabold text-emerald-600">${fmtMoney(p.cash)}</span>
            <span class="text-[10px] text-slate-400 ml-1">(${ownedCount} cities)</span>
          </div>
        </div>
      `;
    }).join('');
  }

  m.classList.remove('hidden');
  m.classList.add('flex');
  return true;
}

export function closeResumeModal() {
  const m = document.getElementById('modal-resume-match');
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
}
