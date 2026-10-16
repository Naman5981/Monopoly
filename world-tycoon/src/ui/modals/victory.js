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
import { ARCHETYPES } from '../setup.js';
import { awardMatchPoints } from '../wardrobe.js';

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
    if (victoryDetails?.type === 'triple_monopoly') {
      accoladeIcon.innerHTML = `<svg class="ui-icon w-8 h-8 text-amber-500" aria-hidden="true"><use href="#icon-city"></use></svg>`;
    } else if (victoryDetails?.type === 'line_monopoly') {
      accoladeIcon.innerHTML = `<svg class="ui-icon w-8 h-8 text-sky-500" aria-hidden="true"><use href="#icon-globe"></use></svg>`;
    } else if (victoryDetails?.type === 'net_worth_time') {
      accoladeIcon.innerHTML = `<svg class="ui-icon w-8 h-8 text-emerald-500" aria-hidden="true"><use href="#icon-money"></use></svg>`;
    } else {
      accoladeIcon.innerHTML = `<svg class="ui-icon w-8 h-8 text-amber-500" aria-hidden="true"><use href="#icon-crown"></use></svg>`;
    }
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

  // Calculate and award Tycoon Stars for match completion
  try {
    const humanPlayer = gameState.players?.find(p => !p.isAI) || gameState.players?.[0];
    const humanIdx = humanPlayer ? (humanPlayer.id !== undefined ? humanPlayer.id : gameState.players.indexOf(humanPlayer)) : 0;
    const isHumanWinner = winnerObj && (winnerObj.id === humanIdx || winnerObj === humanPlayer);

    let humanOwnedCities = 0;
    let humanMonopolies = 0;
    if (humanPlayer && gameState.properties) {
      humanOwnedCities = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === humanIdx).length;
      const checkedGroups = new Set();
      BOARD_TILES.forEach(t => {
        if (t.type === 'city' && t.group && !checkedGroups.has(t.group)) {
          checkedGroups.add(t.group);
          if (ownsFullColorGroup(humanIdx, t.group)) {
            humanMonopolies++;
          }
        }
      });
    }

    const rewardResult = awardMatchPoints({
      isWinner: isHumanWinner,
      propertiesOwned: humanOwnedCities,
      monopoliesCount: humanMonopolies
    });

    const rewardTotalEl = document.getElementById('victory-reward-total');
    const rewardBreakdownEl = document.getElementById('victory-reward-breakdown');
    const balanceEl = document.getElementById('victory-profile-balance');

    if (rewardTotalEl) {
      rewardTotalEl.textContent = `+${rewardResult.totalEarned} ⭐`;
    }
    if (balanceEl) {
      balanceEl.textContent = `${rewardResult.newBalance.toLocaleString()} ⭐`;
    }
    if (rewardBreakdownEl) {
      rewardBreakdownEl.innerHTML = rewardResult.breakdown.map(item => `
        <span class="inline-flex items-center gap-1 bg-amber-100/90 text-amber-950 px-2 py-0.5 rounded-full border border-amber-200 shadow-2xs">
          <span>${item.label}:</span>
          <strong class="tabular-nums">+${item.pts} ⭐</strong>
        </span>
      `).join('');
    }
  } catch (err) {
    console.warn('Failed to calculate victory rewards:', err);
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
   MONOPOLY CELEBRATION MODAL (better-ui)
───────────────────────────────────────────────────────────────────────────── */
export function openMonopolyCelebrationModal(playerIdx, groupKey) {
  if (isLobbyScreenActive()) return;
  const p = gameState.players[playerIdx];
  const group = GROUP_META[groupKey];
  if (!p || !group) return;

  // 1. Update Avatar Hero Medallion
  const sourceCanvas = document.getElementById(`hud-avatar-canvas-${playerIdx}`);
  const targetCanvas = document.getElementById('monopoly-avatar-canvas');
  const fallbackDiv = document.getElementById('monopoly-avatar-fallback');
  const disc = document.getElementById('monopoly-avatar-disc');

  if (disc && p.colorHex) {
    disc.style.boxShadow = `0 0 0 4px #ffffff, 0 0 0 8px ${p.colorHex}55, 0 16px 36px rgba(0, 0, 0, 0.45)`;
  }

  if (sourceCanvas && targetCanvas) {
    const ctx = targetCanvas.getContext('2d');
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.drawImage(sourceCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
    targetCanvas.classList.remove('hidden');
    if (fallbackDiv) fallbackDiv.classList.add('hidden');
  } else if (fallbackDiv) {
    if (targetCanvas) targetCanvas.classList.add('hidden');
    fallbackDiv.classList.remove('hidden');
    const iconEl = document.getElementById('monopoly-avatar-icon');
    const initialEl = document.getElementById('monopoly-avatar-initial');
    if (iconEl) {
      const arch = ARCHETYPES ? ARCHETYPES[p.hatStyle || 0] : null;
      iconEl.textContent = arch?.icon || '🎩';
    }
    if (initialEl) initialEl.textContent = p.name || 'YOU';
  }

  // 2. Render Side-by-Side Tangible Property Deed Cards
  const groupTiles = BOARD_TILES.filter(t => t.type === 'city' && t.group === groupKey);
  const cardsContainer = document.getElementById('monopoly-cards-row');

  if (cardsContainer) {
    cardsContainer.innerHTML = groupTiles.map(t => {
      const baseRent = t.rent[0];
      const boostedRent = baseRent * 2;
      return `
        <div class="monopoly-deed-card">
          <div class="monopoly-deed-header" style="background-color: ${group.hex}">
            <div class="monopoly-deed-check" style="background-color: ${p.colorHex || '#ef4444'}">
              <svg class="ui-icon w-3 h-3 text-white" aria-hidden="true"><use href="#icon-check"></use></svg>
            </div>
          </div>
          <div class="monopoly-deed-name" title="${t.name}">${t.name}</div>
          <div class="monopoly-deed-rent">${fmtMoney(boostedRent)} / visit</div>
        </div>
      `;
    }).join('');
  }

  // 3. Update Ribbon Subtitle
  const winnerEl = document.getElementById('monopoly-winner-name');
  if (winnerEl) winnerEl.textContent = p.name;

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
        card.classList.remove('scale-[0.96]', 'opacity-0');
        card.classList.add('scale-100', 'opacity-100');
      }, 30);
    }
  }

  // Auto-dismiss after 4.8 seconds
  if (m) {
    if (m._autoCloseTimer) clearTimeout(m._autoCloseTimer);
    m._autoCloseTimer = setTimeout(() => {
      closeMonopolyModal();
    }, 4800);
  }

  logEvent(`👑 <strong>${p.name}</strong> completed the <strong>${group.name}</strong> Monopoly! All cities collect <strong>2× Rent</strong>!`);
}

export function closeMonopolyModal() {
  const m = document.getElementById('modal-monopoly-celebration');
  const card = document.getElementById('modal-monopoly-card');
  if (m && m._autoCloseTimer) {
    clearTimeout(m._autoCloseTimer);
    m._autoCloseTimer = null;
  }
  if (card) {
    card.classList.remove('scale-100', 'opacity-100');
    card.classList.add('scale-[0.96]', 'opacity-0');
  }
  setTimeout(() => {
    if (m) {
      m.classList.add('hidden');
      m.classList.remove('flex');
    }
  }, 180);
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
