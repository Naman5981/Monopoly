/**
 * ui/modals/system.js
 * System modals: setup/lobby settings, game rules, exit confirmation, and social emotes/tomato throw.
 */

import { PLAYER_THEMES } from '../../game/data.js';
import { gameState, lobbyPlayerCount, setLobbyPlayerCount } from '../../game/state.js';
import { playSFX } from '../../game/audio.js';
import { showSpeechBubble } from '../../three/scene.js';
import { stopVictoryCelebration } from '../../three/effects.js';
import { networkState } from '../../network/p2pState.js';
import { closeAllGameModals } from './common.js';

/* ─────────────────────────────────────────────────────────────────────────────
   SETUP / LOBBY MODAL
───────────────────────────────────────────────────────────────────────────── */
export function openSetupModal() {
  stopVictoryCelebration();
  document.getElementById('modal-victory')?.classList.add('hidden');
  document.getElementById('modal-victory')?.classList.remove('flex');
  renderLobbyControls();
  const m = document.getElementById('modal-setup');
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
  }
}

export function setLobbyCount(n) {
  setLobbyPlayerCount(n);
  renderLobbyControls();
}

export function renderLobbyControls() {
  [2, 3, 4, 5, 6].forEach(n => {
    const b = document.getElementById(`lobby-cnt-${n}`);
    if (b) {
      b.className = n === lobbyPlayerCount
        ? 'px-3 py-1.5 rounded-xl text-xs font-extrabold bg-indigo-600 text-white cursor-pointer'
        : 'px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-200 text-slate-600 cursor-pointer';
    }
  });

  const list = document.getElementById('lobby-players-list');
  if (!list) return;
  list.innerHTML = '';
  const myIdx = networkState.isMultiplayer ? networkState.localPlayerIdx : 0;
  for (let i = 0; i < lobbyPlayerCount; i++) {
    const th = PLAYER_THEMES[i] || { name: `PLAYER ${i + 1}`, colorHex: '#3b82f6', isAI: i > 0 };
    list.innerHTML += `
      <div class="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200">
        <div class="flex items-center gap-2">
          <span class="w-3.5 h-3.5 rounded-full" style="background:${th.colorHex}"></span>
          <input type="text" value="${th.name}" oninput="window.setPlayerSetupName(${i}, this.value)" onchange="window.setPlayerSetupName(${i}, this.value)" class="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-extrabold w-28 uppercase">
        </div>
        <span class="text-xs font-bold text-slate-500">${i === myIdx ? 'Human (YOU)' : (th.isAI ? 'Smart AI Bot' : 'Player')}</span>
      </div>
    `;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   RULES MODAL
───────────────────────────────────────────────────────────────────────────── */
export function openRulesModal() {
  document.getElementById('modal-rules').classList.remove('hidden');
  document.getElementById('modal-rules').classList.add('flex');
}

export function closeRulesModal() {
  document.getElementById('modal-rules').classList.add('hidden');
  document.getElementById('modal-rules').classList.remove('flex');
}

/* ─────────────────────────────────────────────────────────────────────────────
   TOMATO / EMOTES
───────────────────────────────────────────────────────────────────────────── */
let tomatoThrows = 0;

export function throwTomatoAtOpponent() {
  tomatoThrows++;
  const elCounter = document.getElementById('tomato-counter');
  if (elCounter) elCounter.textContent = tomatoThrows;

  const tomato = document.createElement('div');
  tomato.className = 'flying-tomato';
  tomato.textContent = '🍅';
  tomato.style.left = '120px';
  tomato.style.top = '90px';
  document.body.appendChild(tomato);

  requestAnimationFrame(() => {
    tomato.style.left = `${window.innerWidth - 160}px`;
    tomato.style.top = '95px';
    tomato.style.transform = 'rotate(360deg) scale(1.35)';
  });

  setTimeout(() => {
    tomato.textContent = '💥';
    playSFX('hop');
    setTimeout(() => tomato.remove(), 350);
  }, 550);
}

export function toggleEmotePopover() {
  const p = document.getElementById('emote-popover');
  p.classList.toggle('hidden');
  p.classList.toggle('flex');
}

export function sendQuickEmote(text) {
  toggleEmotePopover();
  if (text.includes('🍅')) throwTomatoAtOpponent();
  showSpeechBubble(text, 2500);
}

export function toggleEventLogDrawer() {
  const d = document.getElementById('event-log-drawer');
  d.classList.toggle('hidden');
  d.classList.toggle('flex');
}

/* ─────────────────────────────────────────────────────────────────────────────
   EXIT TO LOBBY CONFIRMATION MODAL
───────────────────────────────────────────────────────────────────────────── */
export function openConfirmExitLobbyModal() {
  const m = document.getElementById('modal-confirm-exit-lobby');
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
  }
}

export function closeConfirmExitLobbyModal() {
  const m = document.getElementById('modal-confirm-exit-lobby');
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
}

export function handleLobbyButtonClick() {
  if (gameState && gameState.gameStarted) {
    openConfirmExitLobbyModal();
  } else {
    if (window.openLandingSetupScreen) {
      window.openLandingSetupScreen();
    }
  }
}

export function confirmExitToLobbyAction() {
  closeConfirmExitLobbyModal();
  if (window.terminateMatchAndReturnToLobby) {
    window.terminateMatchAndReturnToLobby();
  } else {
    gameState.gameStarted = false;
    gameState.phase = 'SETUP';
    closeAllGameModals();
    if (window.openLandingSetupScreen) {
      window.openLandingSetupScreen();
    }
  }
}
