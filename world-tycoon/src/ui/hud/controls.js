/**
 * ui/hud/controls.js
 * Roll dice & bail buttons, turn lock toasts, and game speed controls.
 */

import { gameState, matchSettings, soundEnabled, soundVolume, setSoundVolume, toggleSoundEnabled } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { networkState } from '../../network/p2p.js';
import { showSpeechBubble } from '../../three/scene.js';
import { animateToastAccordionPush } from '../anim.js';
import { hideDiceSumBadge } from './statusPill.js';
import { updateMasterVolume, playSFX, startAdaptiveMusic, stopAdaptiveMusic } from '../../game/audio.js';
import { updateHudState } from '../../svelte/stores/hudStore.js';

export function updateGameSpeedUI() {
  const speed = matchSettings.gameSpeed || 1;
  updateHudState({ gameSpeed: speed });
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
  updateHudState({ toast: { visible: true, text: msg } });
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
    updateHudState({ toast: { visible: false, text: '' } });
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
    updateHudState({
      rollButton: { visible: false, label: 'Roll', enabled: false },
      bailButton: { visible: false, label: 'Pay 150K Bail', canAfford: false }
    });
    return;
  }

  if (rollStation) rollStation.classList.remove('hidden');

  // In online multiplayer: If this is NOT our turn, completely hide the roll buttons!
  const isOnlineOtherTurn = networkState.isMultiplayer && (gameState.currentPlayerIdx !== networkState.localPlayerIdx);

  if (p.isAI || isOnlineOtherTurn) {
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
    updateHudState({
      rollButton: { visible: false, label: 'Roll', enabled: false },
      bailButton: { visible: false, label: 'Pay 150K Bail', canAfford: false }
    });
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
    const canAfford = p.inIsland ? (p.cash >= 150000) : false;
    if (p.inIsland) {
      updateBailButtons(true, canAfford, p.cash);
    } else {
      updateBailButtons(false, false);
    }
    updateHudState({
      rollButton: { visible: true, label: 'Roll', enabled: true },
      bailButton: { visible: Boolean(p.inIsland), label: canAfford ? 'Pay 150K Bail' : 'Need 150K Bail', canAfford }
    });
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
    updateHudState({
      rollButton: { visible: true, label: 'End Turn', enabled: true },
      bailButton: { visible: false, label: 'Pay 150K Bail', canAfford: false }
    });
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
    updateHudState({
      rollButton: { visible: false, label: 'Roll', enabled: false },
      bailButton: { visible: false, label: 'Pay 150K Bail', canAfford: false }
    });
  }
}

export function updateSoundUI() {
  const percent = soundEnabled ? Math.round(soundVolume * 100) : 0;
  updateHudState({
    soundVolume: percent,
    soundEnabled: Boolean(soundEnabled)
  });

  // In-game HUD slider & percentage label
  const slider = document.getElementById('sound-volume-slider');
  if (slider) slider.value = percent;
  const valText = document.getElementById('sound-volume-val');
  if (valText) valText.textContent = `${percent}%`;

  // Lobby setup slider & percentage label
  const setupSlider = document.getElementById('setup-sound-slider');
  if (setupSlider) setupSlider.value = percent;
  const setupValText = document.getElementById('setup-sound-volume-val');
  if (setupValText) setupValText.textContent = `${percent}%`;

  // Icon classes based on volume level
  const isMuted = !soundEnabled || soundVolume <= 0;
  const iconClass = isMuted
    ? 'fa-solid fa-volume-xmark text-rose-500'
    : soundVolume < 0.5
      ? 'fa-solid fa-volume-low text-sky-600'
      : 'fa-solid fa-volume-high text-sky-600';

  const btnIcon = document.getElementById('btn-sound-icon');
  if (btnIcon) btnIcon.className = `${iconClass} text-xs`;

  const setupBtnIcon = document.getElementById('setup-btn-sound-icon');
  if (setupBtnIcon) setupBtnIcon.className = `${iconClass} text-sm`;
}

export function handleSetGameVolume(val) {
  setSoundVolume(val);
  updateMasterVolume(soundEnabled ? soundVolume : 0);
  updateSoundUI();
}

export function handleToggleSound() {
  toggleSoundEnabled();
  updateMasterVolume(soundEnabled ? soundVolume : 0);
  updateSoundUI();
  if (soundEnabled) {
    playSFX('click', 0.8);
    if (gameState && gameState.gameStarted && gameState.phase !== 'VICTORY') {
      startAdaptiveMusic();
    }
  } else {
    stopAdaptiveMusic();
  }
}

if (typeof window !== 'undefined') {
  window.updateRollButtonsUI = updateRollButtonsUI;
  window.setGameVolume = handleSetGameVolume;
  window.toggleSound = handleToggleSound;
}


/**
 * Ensures zero-latency, natural desktop click interactions on all HUD buttons.
 * Eliminates unnatural pointerdown hijacking so buttons respond to clean clicks
 * with instant visual tactile feedback and no ghost modal closures.
 */
export function initFastHUDButtonInteractions() {
  if (typeof document === 'undefined') return;
  const hud = document.getElementById('main-game-hud-bar');
  if (!hud) return;

  const buttons = hud.querySelectorAll('button, [onclick]');
  buttons.forEach(btn => {
    btn.style.pointerEvents = 'auto';
  });
}

/**
 * Unhides and reveals all in-game HUD layers (TopBar, PlayerCards, StatusPill, MatchCapsule).
 */
export function revealGameHud() {
  if (typeof document === 'undefined') return;
  const elements = [
    'main-game-hud-bar',
    'hud-match-status-capsule',
    'hud-left-players',
    'hud-right-players',
    'hud-bottom-status-wrap'
  ];
  elements.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('hidden');
      el.style.removeProperty('display');
    }
  });
}

/**
 * Hides all in-game HUD layers and badges when returning to setup/lobby.
 */
export function hideGameHud() {
  if (typeof document === 'undefined') return;
  const elements = [
    'main-game-hud-bar',
    'hud-match-status-capsule',
    'hud-left-players',
    'hud-right-players',
    'hud-bottom-status-wrap',
    'turn-lock-toast',
    'world-tour-banner',
    'token-speech-bubble',
    'dice-sum-badge'
  ];
  elements.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.style.setProperty('display', 'none', 'important');
    }
  });
  const diceOverlay = document.getElementById('screen-dice-overlay');
  if (diceOverlay) {
    diceOverlay.classList.add('hidden');
    diceOverlay.style.display = 'none';
  }
}
