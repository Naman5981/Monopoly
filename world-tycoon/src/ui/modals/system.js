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
import { animateModalSpringOpen, animateModalSpringClose } from '../anim.js';

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
  const m = document.getElementById('modal-rules');
  if (m) {
    m.style.removeProperty('display');
    m.style.removeProperty('pointer-events');
    animateModalSpringOpen(m, '#modal-rules .game-modal-shell');
    playSFX('hop');
  }
}

export function closeRulesModal() {
  const m = document.getElementById('modal-rules');
  if (m) {
    animateModalSpringClose(m, '#modal-rules .game-modal-shell', () => {
      m.classList.add('hidden');
      m.classList.remove('flex');
      m.style.setProperty('display', 'none', 'important');
    });
  }
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
  if (!d) return;
  const isHidden = d.classList.contains('hidden') || d.style.display === 'none';
  if (isHidden) {
    d.classList.remove('hidden');
    d.classList.add('flex');
    d.style.removeProperty('display');
    d.style.setProperty('display', 'flex', 'important');
    d.style.setProperty('z-index', '1000', 'important');
    d.style.pointerEvents = 'auto';
    playSFX('hop');
  } else {
    d.classList.add('hidden');
    d.classList.remove('flex');
    d.style.setProperty('display', 'none', 'important');
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   EXIT TO LOBBY CONFIRMATION MODAL
───────────────────────────────────────────────────────────────────────────── */
export function openConfirmExitLobbyModal() {
  const m = document.getElementById('modal-confirm-exit-lobby');
  if (m) {
    const titleEl = document.getElementById('confirm-exit-lobby-title');
    const descEl = document.getElementById('confirm-exit-lobby-desc');

    if (networkState.isMultiplayer) {
      if (networkState.isHost) {
        if (titleEl) titleEl.textContent = 'RETURN TO LOBBY?';
        if (descEl) descEl.textContent = 'End the online match for everyone and return all table players to the room lobby?';
      } else {
        if (titleEl) titleEl.textContent = 'LEAVE MATCH?';
        if (descEl) descEl.textContent = 'Exit current match back to the lobby? An autonomous AI bot will take over your empire.';
      }
    } else {
      if (titleEl) titleEl.textContent = 'EXIT TO LOBBY?';
      if (descEl) descEl.textContent = 'End current game session and return to lobby? Unsaved match progress will be lost.';
    }

    m.style.removeProperty('display');
    m.style.removeProperty('pointer-events');
    animateModalSpringOpen(m, '#modal-confirm-exit-lobby .game-modal-shell');
    playSFX('hop');
  }
}

export function closeConfirmExitLobbyModal() {
  const m = document.getElementById('modal-confirm-exit-lobby');
  if (m) {
    animateModalSpringClose(m, '#modal-confirm-exit-lobby .game-modal-shell', () => {
      m.classList.add('hidden');
      m.classList.remove('flex');
      m.style.setProperty('display', 'none', 'important');
    });
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
