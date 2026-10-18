/**
 * ui/modals/victory.js
 * Victory screen celebration, play again rematch logic, return to lobby, and color-group monopoly celebrations.
 */

import { BOARD_TILES, GROUP_META } from '../../game/data.js';
import { gameState, localPlayerIdx, matchSettings } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX, stopAdaptiveMusic } from '../../game/audio.js';
import { ownsFullColorGroup } from '../../game/rules.js';
import { networkState, broadcastAction, broadcastReturnToLobby, broadcastStartOnlineMatch } from '../../network/p2p.js';
import { setMonopolyTileHighlights, startIntroCameraFlyIn } from '../../three/scene.js';
import { fireConfettiBurst, spawnAnimatedReaction, startVictoryCelebration, stopVictoryCelebration } from '../../three/effects.js';
import { logEvent } from '../hud.js';
import { renderNetWorthTimelineChart } from './leaderboard.js';
import { engineCallbacks, isLobbyScreenActive, closeAllGameModals } from './common.js';
import { ARCHETYPES } from '../setup.js';
import { awardMatchPoints } from '../wardrobe.js';
import { animateVictoryTally, animateNumberCounter, animateModalPunchIn, animateMonopolyRibbonUnfurl } from '../anim.js';
import { playVictoryCinematicOrbit, playIntroCinematicFlyIn } from '../../three/theatre.js';
import { setPlayerPortraitMood } from '../portraitRenderer.js';

/* ─────────────────────────────────────────────────────────────────────────────
   VICTORY CELEBRATION MODAL
───────────────────────────────────────────────────────────────────────────── */
export function showVictoryModal(winner, victoryDetails = null) {
  // If victory dialog is already active and displayed, do NOT re-trigger (prevents audio/animation stutter loop)
  if (gameState.phase === 'VICTORY') {
    const existingModal = document.getElementById('modal-victory');
    if (existingModal && !existingModal.classList.contains('hidden') && existingModal.style.display === 'flex') {
      return;
    }
  }

  // Set phase to VICTORY to immediately freeze turn timer, dice rolls, and AI action loops
  gameState.phase = 'VICTORY';
  stopAdaptiveMusic();

  // Cancel all pending timers (AI rolls, auto-end turn, etc.)
  if (typeof window.cancelAllGameTimers === 'function') {
    window.cancelAllGameTimers();
  }

  // Ensure lobby screen is hidden so victory dialog box is unconditionally visible
  const landingScreen = document.getElementById('landing-setup-screen');
  if (landingScreen) {
    landingScreen.classList.add('hidden');
    landingScreen.style.display = 'none';
    landingScreen.style.opacity = '0';
  }

  // Close conflicting modals (such as intermediate monopoly celebrations)
  const monopolyModal = document.getElementById('modal-monopoly-celebration');
  if (monopolyModal) {
    monopolyModal.classList.add('hidden');
    monopolyModal.classList.remove('flex');
    monopolyModal.style.display = 'none';
  }

  // Immediately make victory modal and card visible with top z-index
  const modal = document.getElementById('modal-victory');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('z-index', '9999', 'important');
  }

  const card = document.getElementById('victory-card');
  if (card) {
    card.style.setProperty('opacity', '1', 'important');
    card.style.setProperty('pointer-events', 'auto', 'important');
    card.classList.remove('victory-card-animate');
    void card.offsetWidth; // Force CSS layout reflow
    card.classList.add('victory-card-animate');
    animateModalPunchIn('#victory-card');
  }

  const winnerObj = winner || (gameState.players && gameState.players.find(p => !p.bankrupt)) || (gameState.players && gameState.players[0]) || { id: 0, name: 'Player 1', cash: 5000000 };
  const isLocalHuman = winnerObj && (winnerObj.id === localPlayerIdx || (!winnerObj.isAI && (localPlayerIdx === undefined || localPlayerIdx === 0)));

  try {
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
    if (propsEl && winnerObj && gameState.properties) {
      const pIdx = winnerObj.id !== undefined ? winnerObj.id : (gameState.players ? gameState.players.indexOf(winnerObj) : 0);
      const ownedCount = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === pIdx).length;
      propsEl.textContent = `${ownedCount} Cities`;
    }
  } catch (statErr) {
    console.warn('[Victory] Header stat formatting fallback:', statErr);
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
      animateNumberCounter(rewardTotalEl, 0, rewardResult.totalEarned, '+', ' ⭐', 700);
    }
    if (balanceEl) {
      animateNumberCounter(balanceEl, rewardResult.newBalance - rewardResult.totalEarned, rewardResult.newBalance, '', ' ⭐', 700);
    }
    if (rewardBreakdownEl) {
      rewardBreakdownEl.innerHTML = rewardResult.breakdown.map(item => `
        <span class="inline-flex items-center gap-1 bg-amber-100/90 text-amber-950 px-2 py-0.5 rounded-full border border-amber-200 shadow-2xs">
          <span>${item.label}:</span>
          <strong class="tabular-nums">+${item.pts} ⭐</strong>
        </span>
      `).join('');
      animateVictoryTally('#victory-reward-breakdown > span');
    }
  } catch (err) {
    console.warn('Failed to calculate victory rewards:', err);
  }

  try {
    renderNetWorthTimelineChart('victory-timeline-chart');
  } catch (chartErr) {
    console.warn('[Victory] Timeline chart render fallback:', chartErr);
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

  // Theatre.js cinematic 360-degree victory orbit & character portrait emotional reactions
  playVictoryCinematicOrbit(14000);
  const winnerIdx = winnerObj.id !== undefined ? winnerObj.id : (gameState.players ? gameState.players.indexOf(winnerObj) : 0);
  setPlayerPortraitMood(winnerIdx, 'cheering', 15000);
  (gameState.players || []).forEach((p, idx) => {
    if (idx !== winnerIdx) {
      setPlayerPortraitMood(idx, p.bankrupt ? 'bankrupt' : 'crying', 15000);
    }
  });
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
    modal.style.removeProperty('display');
    modal.style.removeProperty('z-index');
    modal.style.display = 'none';
  }
  const card = document.getElementById('victory-card');
  if (card) {
    card.style.removeProperty('opacity');
    card.style.removeProperty('pointer-events');
  }
  closeAllGameModals();

  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastStartOnlineMatch();
  }

  playIntroCinematicFlyIn();
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
    modal.style.removeProperty('display');
    modal.style.removeProperty('z-index');
    modal.style.display = 'none';
  }
  const card = document.getElementById('victory-card');
  if (card) {
    card.style.removeProperty('opacity');
    card.style.removeProperty('pointer-events');
  }
  closeAllGameModals();

  if (engineCallbacks.terminateMatchAndReturnToLobby) {
    engineCallbacks.terminateMatchAndReturnToLobby();
  } else if (typeof window.terminateMatchAndReturnToLobby === 'function') {
    window.terminateMatchAndReturnToLobby();
  } else {
    gameState.gameStarted = false;
    gameState.phase = 'SETUP';

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
}

export function closeVictoryAndPlayAgain() {
  handlePlayAgainAction();
}

/* ─────────────────────────────────────────────────────────────────────────────
   MONOPOLY CELEBRATION MODAL (better-ui)
───────────────────────────────────────────────────────────────────────────── */
export function openMonopolyCelebrationModal(playerIdx, groupKey) {
  const landingScreen = document.getElementById('landing-setup-screen');
  if (landingScreen && landingScreen.style.display !== 'none' && !landingScreen.classList.contains('hidden') && landingScreen.style.opacity !== '0') {
    return;
  }
  const p = (gameState.players && gameState.players[playerIdx]) || { name: 'Player 1', colorHex: '#ef4444' };
  const group = GROUP_META[groupKey];
  if (!group) return;

  // 1. Update Avatar Hero Medallion
  const sourceCanvas = document.getElementById(`hud-avatar-canvas-${playerIdx}`);
  const targetCanvas = document.getElementById('monopoly-avatar-canvas');
  const fallbackDiv = document.getElementById('monopoly-avatar-fallback');
  const disc = document.getElementById('monopoly-avatar-disc');

  if (disc && p.colorHex) {
    disc.style.boxShadow = `0 0 0 4px #ffffff, 0 0 0 8px ${p.colorHex}55, 0 16px 36px rgba(0, 0, 0, 0.45)`;
  }

  let canvasDrawn = false;
  if (sourceCanvas && targetCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
    try {
      const ctx = targetCanvas.getContext('2d');
      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      ctx.drawImage(sourceCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
      targetCanvas.classList.remove('hidden');
      if (fallbackDiv) fallbackDiv.classList.add('hidden');
      canvasDrawn = true;
    } catch (err) {
      console.warn('[Monopoly] Avatar canvas render fallback:', err);
    }
  }

  if (!canvasDrawn && fallbackDiv) {
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
      const baseRent = t.rent ? (Array.isArray(t.rent) ? t.rent[0] : t.rent) : (t.price ? Math.round(t.price * 0.1) : 50000);
      const boostedRent = (baseRent || 50000) * 2;
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
  animateMonopolyRibbonUnfurl(group.name, group.hex);

  const m = document.getElementById('modal-monopoly-celebration');
  const card = document.getElementById('modal-monopoly-card');
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
    m.style.setProperty('display', 'flex', 'important');
    m.style.setProperty('z-index', '9999', 'important');
    if (card) {
      card.style.setProperty('opacity', '1', 'important');
      card.style.setProperty('transform', 'scale(1)', 'important');
      card.classList.remove('monopoly-card-leaving');
      card.classList.add('monopoly-card-entering');
      void card.offsetWidth; // Force CSS layout reflow
      requestAnimationFrame(() => {
        card.classList.remove('monopoly-card-entering');
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
      });
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
    card.classList.add('monopoly-card-leaving');
    card.style.opacity = '0';
    card.style.transform = 'scale(0.92)';
  }
  setTimeout(() => {
    if (m) {
      m.classList.add('hidden');
      m.classList.remove('flex');
      m.style.removeProperty('display');
      m.style.removeProperty('z-index');
    }
    if (card) {
      card.classList.remove('monopoly-card-leaving');
      card.style.opacity = '';
      card.style.transform = '';
    }
  }, 220);
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

if (typeof window !== 'undefined') {
  window.openMonopolyCelebrationModal = openMonopolyCelebrationModal;
  window.closeMonopolyModal = closeMonopolyModal;
  window.triggerMonopolyCelebration = (group = 'brown', pIdx = 0) => openMonopolyCelebrationModal(pIdx, group);
}
