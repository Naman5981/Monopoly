/**
 * game/persistence.js
 * Match state persistence in localStorage and resume management.
 */

import { gameState, matchSettings, displayedCash, matchSeconds, setMatchSeconds, isHumanTurnActionable, localPlayerIdx } from './state.js';
import { BOARD_TILES, applyBoardEdition } from './data.js';
import { fmtMoney } from './utils.js';
import { refreshTileTextureAndBuildings, spawnAllPlayerTokens3D, updatePlayerTokenPositions3D, showSpeechBubble, applyBoardStyle } from '../three/scene.js';
import { renderCornerHUDs, updateRollButtonsUI, logEvent } from '../ui/hud.js';
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

    playSFX('win');
    startAdaptiveMusic();
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

  const m = document.getElementById('modal-resume-match');
  if (!m) return false;

  // Populate preview card
  const curP = data.gameState.players[data.gameState.currentPlayerIdx] || data.gameState.players[0];
  const mins = String(Math.floor((data.matchSeconds || 0) / 60)).padStart(2, '0');
  const secs = String((data.matchSeconds || 0) % 60).padStart(2, '0');

  const metaEl = document.getElementById('resume-match-meta');
  if (metaEl) {
    const multiTag = data.isMultiplayer ? `
      <div class="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-amber-300">
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-tower-broadcast"></i> Multiplayer Session (${data.isHost ? 'Host' : 'Guest'})</span>
        <span class="font-mono font-black bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">Room ${data.roomCode || 'CODE'}</span>
      </div>
    ` : '';

    metaEl.innerHTML = `
      <div class="flex items-center justify-between text-xs font-bold text-slate-300">
        <span class="flex items-center gap-1.5">
          <i class="fa-solid fa-stopwatch text-emerald-400"></i>
          <span>Match Time:</span>
          <strong class="font-mono text-emerald-300 font-black">${mins}:${secs}</strong>
        </span>
        <span class="flex items-center gap-1.5">
          <i class="fa-solid fa-dice text-amber-400"></i>
          <span>Turn:</span>
          <span class="inline-flex items-center gap-1.5 font-display font-black text-white px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
            <span class="w-2 h-2 rounded-full inline-block shrink-0 shadow-xs" style="background:${curP?.colorHex || '#10b981'}"></span>
            <span>${curP?.name || 'Player'}</span>
          </span>
        </span>
      </div>
      ${multiTag}
    `;
  }

  const rosterEl = document.getElementById('resume-player-roster');
  if (rosterEl) {
    rosterEl.innerHTML = data.gameState.players.map((p, idx) => {
      const ownedCount = Object.values(data.gameState.properties).filter(pr => pr && pr.owner === idx).length;
      return `
        <div class="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-xs transition-colors">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full shrink-0 shadow-xs" style="background:${p.colorHex || '#6366f1'}"></span>
            <span class="font-display font-black text-white text-xs sm:text-sm tracking-wide">${p.name}</span>
            ${p.isAI ? '<span class="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md bg-white/10 text-slate-400 border border-white/10">AI</span>' : ''}
          </div>
          <div class="text-right flex items-center gap-1.5">
            <span class="font-mono font-black text-emerald-400 text-xs sm:text-sm">${fmtMoney(p.cash)}</span>
            <span class="text-[11px] text-slate-400 font-semibold font-mono">(${ownedCount} ${ownedCount === 1 ? 'city' : 'cities'})</span>
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
    if (typeof anime !== 'undefined') anime.remove(m);
    m.classList.add('hidden');
    m.classList.remove('flex');
    m.style.setProperty('display', 'none', 'important');
    m.style.removeProperty('opacity');
    m.style.removeProperty('pointer-events');
  }
}
