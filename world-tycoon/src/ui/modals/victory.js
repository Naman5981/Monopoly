/**
 * ui/modals/victory.js
 * Victory screen celebration, play again rematch logic, return to lobby, and color-group monopoly celebrations.
 */

import { BOARD_TILES, GROUP_META } from '../../game/data.js';
import { gameState, localPlayerIdx, matchSettings } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX } from '../../game/audio.js';
import { ownsFullColorGroup } from '../../game/rules.js';
import { networkState, broadcastAction, broadcastReturnToLobby, broadcastStartOnlineMatch } from '../../network/p2p.js';
import { setMonopolyTileHighlights, startIntroCameraFlyIn } from '../../three/scene.js';
import { fireConfettiBurst, spawnAnimatedReaction, startVictoryCelebration, stopVictoryCelebration } from '../../three/effects.js';
import { logEvent } from '../hud.js';
import { renderNetWorthTimelineChart } from './leaderboard.js';
import { engineCallbacks, isLobbyScreenActive, closeAllGameModals } from './common.js';

/* ─────────────────────────────────────────────────────────────────────────────
   VICTORY CELEBRATION MODAL
───────────────────────────────────────────────────────────────────────────── */
export function showVictoryModal(winner, victoryDetails = null) {
  if (isLobbyScreenActive()) return;
  const winnerObj = winner || gameState.players.find(p => !p.bankrupt) || gameState.players[0];
  const isLocalHuman = winnerObj && (winnerObj.id === localPlayerIdx || (!winnerObj.isAI && (localPlayerIdx === undefined || localPlayerIdx === 0)));

  const titleEl = document.getElementById('victory-title');
  if (titleEl) {
    if (victoryDetails?.type === 'triple_monopoly') {
      titleEl.textContent = isLocalHuman ? 'TRIPLE MONOPOLY!' : `${winnerObj?.name || 'Player'} TRIPLE WIN!`;
    } else if (victoryDetails?.type === 'line_monopoly') {
      titleEl.textContent = isLocalHuman ? 'LINE MONOPOLY!' : `${winnerObj?.name || 'Player'} LINE WIN!`;
    } else if (victoryDetails?.type === 'net_worth_time') {
      titleEl.textContent = isLocalHuman ? 'RICHEST TYCOON!' : `${winnerObj?.name || 'Player'} WON!`;
    } else {
      titleEl.textContent = isLocalHuman ? 'YOU WON!' : `${winnerObj?.name || 'Player'} WON!`;
    }
  }

  const subtitleEl = document.getElementById('victory-subtitle');
  if (subtitleEl) {
    subtitleEl.textContent = victoryDetails?.title || (isLocalHuman ? 'Supreme World Real Estate Tycoon' : 'Master of the Global Board');
  }

  const accoladeTitle = document.getElementById('victory-accolade-title');
  const accoladeDesc = document.getElementById('victory-accolade-desc');
  const accoladeIcon = document.getElementById('victory-accolade-icon');

  if (accoladeTitle) {
    accoladeTitle.textContent = victoryDetails?.title || 'GLOBAL TYCOON SUPREMACY!';
  }
  if (accoladeDesc) {
    accoladeDesc.textContent = victoryDetails?.desc || 'All rival tycoons bankrupted. You rule the entire global real estate empire!';
  }
  if (accoladeIcon) {
    if (victoryDetails?.type === 'triple_monopoly') accoladeIcon.textContent = '🏰';
    else if (victoryDetails?.type === 'line_monopoly') accoladeIcon.textContent = '🌐';
    else if (victoryDetails?.type === 'net_worth_time') accoladeIcon.textContent = '⏱️';
    else accoladeIcon.textContent = '👑';
  }

  const cashEl = document.getElementById('victory-stat-cash');
  if (cashEl && winnerObj) {
    cashEl.textContent = fmtMoney(winnerObj.cash || 0);
  }

  const propsEl = document.getElementById('victory-stat-props');
  if (propsEl && winnerObj) {
    const pIdx = winnerObj.id !== undefined ? winnerObj.id : gameState.players.indexOf(winnerObj);
    const ownedCount = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === pIdx).length;
    propsEl.textContent = `${ownedCount} Cities`;
  }

  const modal = document.getElementById('modal-victory');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    renderNetWorthTimelineChart('victory-timeline-chart');
  }

  const card = document.getElementById('victory-card');
  if (card) {
    card.classList.remove('victory-card-animate');
    void card.offsetWidth; // re-flow
    card.classList.add('victory-card-animate');
  }

  // Reset rematch button & multiplayer status indicators
  const statusEl = document.getElementById('victory-multiplayer-status');
  if (statusEl) {
    statusEl.innerHTML = '';
    statusEl.classList.add('hidden');
  }

  const playBtn = document.getElementById('btn-victory-play-again');
  if (playBtn) {
    playBtn.disabled = false;
    playBtn.classList.remove('ring-4', 'ring-amber-300', 'animate-pulse');
  }

  const playBtnText = document.getElementById('btn-victory-play-again-text');
  if (playBtnText) {
    playBtnText.textContent = 'PLAY AGAIN';
  }

  startVictoryCelebration(winnerObj);
}

export function handlePlayAgainAction() {
  if (networkState.isMultiplayer && !networkState.isHost) {
    const myName = (matchSettings.customPlayers[networkState.localPlayerIdx] || {}).name || 'Tycoon Friend';
    broadcastAction('ACTION_REQUEST_PLAY_AGAIN', {
      playerName: myName
    });
    const btnText = document.getElementById('btn-victory-play-again-text');
    if (btnText) btnText.textContent = 'WAITING FOR HOST...';
    const statusEl = document.getElementById('victory-multiplayer-status');
    if (statusEl) {
      statusEl.innerHTML = '<i class="fa-solid fa-hourglass-half fa-spin mr-1"></i> Rematch requested! Waiting for Room Host to start...';
      statusEl.classList.remove('hidden');
    }
    const btn = document.getElementById('btn-victory-play-again');
    if (btn) btn.disabled = true;
    playSFX('hop');
    logEvent('⏳ Rematch requested from Room Host.');
    return;
  }

  stopVictoryCelebration();
  const modal = document.getElementById('modal-victory');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  closeAllGameModals();

  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastStartOnlineMatch();
  }

  startIntroCameraFlyIn();
  if (engineCallbacks.startNewMatch) {
    engineCallbacks.startNewMatch();
  } else if (window.startNewMatch) {
    window.startNewMatch();
  }
}

export function handleReturnToLobbyFromVictory() {
  stopVictoryCelebration();
  const modal = document.getElementById('modal-victory');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  closeAllGameModals();
  gameState.gameStarted = false;

  if (networkState.isMultiplayer) {
    if (networkState.isHost) {
      broadcastReturnToLobby();
      logEvent('👑 Table Host brought all room players back to the lobby.');
    } else {
      broadcastAction('ACTION_GUEST_LOBBY', {
        senderIdx: networkState.localPlayerIdx
      });
      logEvent('🚪 Returned to room lobby.');
    }
  }

  if (window.openLandingSetupScreen) {
    window.openLandingSetupScreen();
  } else if (window.openSetupModal) {
    window.openSetupModal();
  }
}

export function closeVictoryAndPlayAgain() {
  handlePlayAgainAction();
}

/* ─────────────────────────────────────────────────────────────────────────────
   MONOPOLY CELEBRATION MODAL
───────────────────────────────────────────────────────────────────────────── */
export function openMonopolyCelebrationModal(playerIdx, groupKey) {
  if (isLobbyScreenActive()) return;
  const p = gameState.players[playerIdx];
  const group = GROUP_META[groupKey];
  if (!p || !group) return;

  const winnerEl = document.getElementById('monopoly-winner-name');
  const groupEl = document.getElementById('monopoly-group-name');
  const headerEl = document.getElementById('monopoly-modal-header');
  const tilesContainer = document.getElementById('monopoly-tiles-list');

  if (winnerEl) winnerEl.textContent = `${p.name} ACHIEVED A MONOPOLY!`;
  if (groupEl) groupEl.textContent = `${group.name} Set Completed`;
  if (headerEl) headerEl.style.background = `linear-gradient(135deg, ${group.hex}, #1e1b4b)`;

  const groupTiles = BOARD_TILES.filter(t => t.type === 'city' && t.group === groupKey);

  if (tilesContainer) {
    tilesContainer.innerHTML = groupTiles.map(t => {
      const baseRent = t.rent[0];
      const boostedRent = baseRent * 2;
      return `
        <div class="flex items-center justify-between p-3.5 rounded-2xl border-2 border-slate-200/90 bg-white shadow-xs">
          <div class="flex items-center gap-3">
            <span class="w-4 h-4 rounded-full border-2 border-white shadow-xs flex-shrink-0" style="background:${group.hex}"></span>
            <div>
              <div class="font-display font-extrabold text-base text-slate-900 leading-tight">${t.name}</div>
              <div class="text-xs text-slate-600 font-bold mt-0.5">City Value: ${fmtMoney(t.price)}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm font-black text-emerald-700">${fmtMoney(boostedRent)} <span class="text-xs font-bold text-emerald-800">/ visit</span></div>
            <div class="text-xs font-black text-amber-700 tracking-wider uppercase mt-0.5">⚡ 2× BOOSTED</div>
          </div>
        </div>
      `;
    }).join('');
  }

  playSFX('win');
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.45, 120);
  spawnAnimatedReaction('money');
  setMonopolyTileHighlights(groupTiles.map(t => t.id), group.hex);

  const m = document.getElementById('modal-monopoly-celebration');
  const card = document.getElementById('modal-monopoly-card');
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
    if (card) {
      setTimeout(() => {
        card.classList.remove('scale-90', 'opacity-0');
        card.classList.add('scale-100', 'opacity-100');
      }, 30);
    }
  }

  logEvent(`👑 <strong>${p.name}</strong> completed the <strong>${group.name}</strong> Monopoly! All cities collect <strong>2× Rent</strong>!`);
}

export function closeMonopolyModal() {
  const m = document.getElementById('modal-monopoly-celebration');
  const card = document.getElementById('modal-monopoly-card');
  if (card) {
    card.classList.remove('scale-100', 'opacity-100');
    card.classList.add('scale-90', 'opacity-0');
  }
  setTimeout(() => {
    if (m) {
      m.classList.add('hidden');
      m.classList.remove('flex');
    }
  }, 250);
}

export function checkAndTriggerMonopoly(playerIdx, groupKey) {
  if (!groupKey) return;
  if (!gameState.achievedMonopolies) gameState.achievedMonopolies = {};

  const key = `${playerIdx}_${groupKey}`;
  if (gameState.achievedMonopolies[key]) return;

  if (ownsFullColorGroup(playerIdx, groupKey)) {
    gameState.achievedMonopolies[key] = true;
    openMonopolyCelebrationModal(playerIdx, groupKey);
    if (networkState.isMultiplayer) {
      broadcastAction('ACTION_MONOPOLY', { playerIdx, groupKey });
    }
  }
}
