/**
 * ui/hud/controls.js
 * Roll dice & bail buttons, turn lock toasts, and game speed controls.
 */

import { gameState, matchSettings } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { networkState } from '../../network/p2p.js';
import { showSpeechBubble } from '../../three/scene.js';
import { animateToastAccordionPush } from '../anim.js';
import { hideDiceSumBadge } from './statusPill.js';

export function updateGameSpeedUI() {
  const speed = matchSettings.gameSpeed || 1;
  const label = document.getElementById('game-speed-label');
  const btn = document.getElementById('btn-game-speed');
  if (label) {
    if (speed === 4) {
      label.textContent = '🚀 4× Turbo';
      if (btn) btn.className = 'hud-capsule-btn px-2 py-0.5 rounded-full text-rose-600 bg-rose-50 hover:bg-rose-100 font-black cursor-pointer animate-pulse transition';
    } else if (speed === 2) {
      label.textContent = '⚡ 2× Fast';
      if (btn) btn.className = 'hud-capsule-btn px-2 py-0.5 rounded-full text-amber-600 bg-amber-50 hover:bg-amber-100 font-black cursor-pointer transition';
    } else {
      label.textContent = '⚡ 1×';
      if (btn) btn.className = 'hud-capsule-btn px-2 py-0.5 rounded-full text-slate-700 hover:text-sky-600 hover:bg-slate-100 font-black cursor-pointer transition';
    }
  }
}

/** Show the turn-lock warning toast. */
export function showTurnLockToast(msg = 'Wait for your turn to manage cities!') {
  const toast = document.getElementById('turn-lock-toast');
  const textEl = document.getElementById('turn-lock-toast-text');
  if (!toast || !textEl) return;
  textEl.textContent = msg;
  toast.classList.remove('hidden');
  toast.style.display = 'flex';
  animateToastAccordionPush(toast);
  showSpeechBubble(msg, 2000);
  if (toast._timer) clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.add('hidden');
    toast.style.display = 'none';
  }, 2200);
}

/** Update the roll / end-turn buttons and manage-cities / trade pill locks. */
export function updateRollButtonsUI(isHumanTurnActionable) {
  const btnCenter = document.getElementById('btn-center-roll');
  const btnBottom = document.getElementById('btn-bottom-roll');
  const lblCenter = document.getElementById('center-roll-label');
  const lblBottom = document.getElementById('bottom-roll-label');
  const btnBail = document.getElementById('btn-escape-island');
  const btnCenterBail = document.getElementById('btn-center-escape-island');
  const lblBottomBail = document.getElementById('bottom-bail-label');
  const lblCenterBail = document.getElementById('center-bail-label');

  const updateBailButtons = (show, canAfford, currentCash = 0) => {
    const bailButtons = [btnBail, btnCenterBail].filter(Boolean);
    for (const btn of bailButtons) {
      if (!show) {
        btn.classList.add('hidden');
        btn.classList.remove('inline-flex');
        btn.style.display = 'none';
        btn.disabled = true;
      } else {
        btn.classList.remove('hidden');
        btn.classList.add('inline-flex');
        btn.style.display = 'inline-flex';
        btn.disabled = !canAfford;
        btn.setAttribute('aria-disabled', String(!canAfford));
        if (canAfford) {
          btn.title = 'Pay $150K bail to exit Island immediately';
        } else {
          btn.title = `Need $150K bail to exit Island (You have $${fmtMoney(currentCash)})`;
        }
      }
    }
    const labelText = canAfford ? 'Pay 150K Bail' : 'Need 150K Bail';
    if (lblBottomBail) lblBottomBail.textContent = labelText;
    if (lblCenterBail) lblCenterBail.textContent = labelText;
  };

  const btnManage = document.getElementById('btn-manage-cities');
  const iconManage = document.getElementById('icon-manage-cities');
  const btnTrade = document.getElementById('btn-trade');
  const iconTrade = document.getElementById('icon-trade');

  if (btnManage) {
    btnManage.classList.remove('pill-locked');
    btnManage.removeAttribute('aria-disabled');
    if (iconManage) iconManage.className = 'fa-solid fa-city text-indigo-600';
  }
  if (btnTrade) {
    btnTrade.classList.remove('pill-locked');
    btnTrade.removeAttribute('aria-disabled');
    if (iconTrade) iconTrade.className = 'fa-solid fa-handshake text-emerald-600';
  }

  const rollStation = document.getElementById('hud-roll-station');
  const p = gameState.players ? gameState.players[gameState.currentPlayerIdx] : null;

  if (!p || !gameState.gameStarted || gameState.phase === 'SETUP' || gameState.phase === 'VICTORY') {
    hideDiceSumBadge();
    if (rollStation) rollStation.classList.add('hidden');
    if (btnCenter) {
      btnCenter.classList.add('hidden');
      btnCenter.style.display = 'none';
    }
    if (btnBottom) {
      btnBottom.classList.add('hidden');
      btnBottom.style.display = 'none';
    }
    updateBailButtons(false, false);
    return;
  }

  if (rollStation) rollStation.classList.remove('hidden');

  // In online multiplayer: If this is NOT our turn, completely hide the roll buttons!
  const isOnlineOtherTurn = networkState.isMultiplayer && (gameState.currentPlayerIdx !== networkState.localPlayerIdx);

  if (p.isAI || isOnlineOtherTurn) {
    if (btnCenter) {
      btnCenter.classList.add('hidden');
      btnCenter.style.display = 'none';
    }
    if (btnBottom) {
      btnBottom.classList.add('hidden');
      btnBottom.style.display = 'none';
    }
    updateBailButtons(false, false);
    return;
  }

  if (gameState.phase === 'ROLL') {
    hideDiceSumBadge();
    if (btnCenter) {
      btnCenter.classList.remove('hidden');
      btnCenter.style.display = 'inline-flex';
      btnCenter.disabled = false;
    }
    if (btnBottom) {
      btnBottom.classList.remove('hidden');
      btnBottom.style.display = 'inline-flex';
      btnBottom.disabled = false;
    }
    if (lblCenter) lblCenter.textContent = 'Roll';
    if (lblBottom) lblBottom.textContent = 'Roll';
    if (p.inIsland) {
      const canAfford = p.cash >= 150000;
      updateBailButtons(true, canAfford, p.cash);
    } else {
      updateBailButtons(false, false);
    }
  } else if (gameState.phase === 'END') {
    if (btnCenter) {
      btnCenter.classList.remove('hidden');
      btnCenter.style.display = 'inline-flex';
      btnCenter.disabled = false;
    }
    if (btnBottom) {
      btnBottom.classList.remove('hidden');
      btnBottom.style.display = 'inline-flex';
      btnBottom.disabled = false;
    }
    if (lblCenter) lblCenter.textContent = 'End Turn';
    if (lblBottom) lblBottom.textContent = 'End Turn';
    updateBailButtons(false, false);
  } else {
    // MOVING, MODAL, CHANCE, FLIGHT, etc.
    if (btnCenter) {
      btnCenter.classList.add('hidden');
      btnCenter.style.display = 'none';
    }
    if (btnBottom) {
      btnBottom.classList.add('hidden');
      btnBottom.style.display = 'none';
    }
    updateBailButtons(false, false);
  }
}

if (typeof window !== 'undefined') {
  window.updateRollButtonsUI = updateRollButtonsUI;
}


/**
 * Attaches zero-latency pointerdown handlers to all HUD interactive elements.
 * Eliminates human-release wait (150ms-250ms) and mobile double-tap recognizer delay (300ms).
 * Safe against ghost backdrop dismissals due to modal._openedAt backdrop guard.
 */
export function initFastHUDButtonInteractions() {
  if (typeof document === 'undefined') return;
  const hud = document.getElementById('main-game-hud-bar');
  if (!hud) return;

  const buttons = hud.querySelectorAll('button, [onclick]');
  buttons.forEach(btn => {
    let lastTrigger = 0;

    const executeFastAction = (e) => {
      const now = performance.now();
      if (now - lastTrigger < 180) return;
      lastTrigger = now;

      if (e) {
        e.stopPropagation();
      }

      if (btn.id === 'btn-top-lobby') {
        if (window.handleLobbyButtonClick) window.handleLobbyButtonClick();
      } else if (btn.id === 'btn-manage-cities') {
        if (window.openPortfolioModal) window.openPortfolioModal();
      } else if (btn.id === 'btn-trade') {
        if (window.openTradeModal) window.openTradeModal();
      } else if (btn.id === 'btn-lighting-mode') {
        if (window.cycleLightingMode) window.cycleLightingMode();
      } else if (btn.id === 'btn-sound') {
        if (window.toggleSound) window.toggleSound();
      } else if (btn.id === 'btn-game-speed') {
        if (window.cycleGameSpeed) window.cycleGameSpeed();
      } else if (btn.id === 'btn-top-leaderboard') {
        if (window.toggleLeaderboardModal) window.toggleLeaderboardModal();
      } else if (btn.getAttribute('onclick')?.includes('openRulesModal')) {
        if (window.openRulesModal) window.openRulesModal();
      } else if (btn.getAttribute('onclick')?.includes('toggleEventLogDrawer')) {
        if (window.toggleEventLogDrawer) window.toggleEventLogDrawer();
      } else if (btn.getAttribute('onclick')?.includes('toggleDebugPanel')) {
        if (window.toggleDebugPanel) window.toggleDebugPanel();
      } else if (typeof btn.onclick === 'function') {
        btn.onclick(e);
      }
    };

    // Instant execution on finger contact or mouse button down (0ms latency!)
    btn.addEventListener('pointerdown', (e) => {
      if (e.button === 0 || e.pointerType === 'touch') {
        executeFastAction(e);
      }
    }, { passive: false });

    // Block duplicate click when pointerdown already ran, but execute if clicked via keyboard
    btn.addEventListener('click', (e) => {
      const now = performance.now();
      if (now - lastTrigger < 250) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        executeFastAction(e);
      }
    });
  });
}
