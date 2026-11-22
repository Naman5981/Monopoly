/**
 * ui/modals/system.js
 * System modals: setup/lobby settings, game rules, exit confirmation, and social emotes/tomato throw.
 */

import { PLAYER_THEMES } from '../../game/data.js';
import { gameState, lobbyPlayerCount, setLobbyPlayerCount, isHumanTurnActionable } from '../../game/state.js';
import { playSFX } from '../../game/audio.js';
import { showSpeechBubble } from '../../three/scene.js';
import { stopVictoryCelebration } from '../../three/effects.js';
import { networkState, broadcastAction } from '../../network/p2p.js';
import { closeAllGameModals, closeOtherInformationalModals } from './common.js';
import { animateModalSpringOpen, animateModalSpringClose } from '../anim.js';
import { renderCornerHUDs, refreshActivePlayerTurnStatus, updateRollButtonsUI } from '../hud.js';
import { updateModalSlice } from '../../svelte/stores/modalStore.js';
import { updateHudState } from '../../svelte/stores/hudStore.js';

/* ─────────────────────────────────────────────────────────────────────────────
   SETUP / LOBBY MODAL (LEGACY FALLBACK)
───────────────────────────────────────────────────────────────────────────── */
export function openSetupModal() {
  if (window.openLandingSetupScreen) {
    window.openLandingSetupScreen();
  }
}

export function closeSetupModal() {}

export function setLobbyCount(n) {
  setLobbyPlayerCount(n);
}

export function renderLobbyControls() {}

/* ─────────────────────────────────────────────────────────────────────────────
   RULES MODAL
───────────────────────────────────────────────────────────────────────────── */
export function openRulesModal() {
  const m = document.getElementById('modal-rules');
  if (m && m.classList.contains('flex') && !m.classList.contains('hidden')) {
    closeRulesModal();
    return;
  }
  closeOtherInformationalModals('modal-rules');
  updateModalSlice('rules', { visible: true });
  if (m) {
    m.style.removeProperty('display');
    m.style.removeProperty('pointer-events');
    animateModalSpringOpen(m, '#modal-rules .game-modal-shell');
    playSFX('hop');
  }
}

export function closeRulesModal() {
  updateModalSlice('rules', { visible: false });
  const m = document.getElementById('modal-rules');
  if (m) {
    animateModalSpringClose(m, '#modal-rules .game-modal-shell', () => {
      m.classList.add('hidden');
      m.classList.remove('flex');
      m.style.setProperty('display', 'none', 'important');
    });
  }
  if (gameState.gameStarted && gameState.phase !== 'SETUP') {
    renderCornerHUDs();
    refreshActivePlayerTurnStatus();
    updateRollButtonsUI(isHumanTurnActionable());
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   QUICK EMOTES & SPEECH
───────────────────────────────────────────────────────────────────────────── */
export function sendQuickEmote(text) {
  showSpeechBubble(text, 2500);
  if (networkState && networkState.isMultiplayer) {
    broadcastAction('ACTION_CHAT_EMOTE', {
      text,
      senderIdx: networkState.localPlayerIdx
    });
  }
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
    d.style.pointerEvents = 'auto';
    playSFX('hop');
    updateHudState({ isEventLogOpen: true });
  } else {
    d.classList.add('hidden');
    d.classList.remove('flex');
    d.style.setProperty('display', 'none', 'important');
    updateHudState({ isEventLogOpen: false });
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   EXIT TO LOBBY CONFIRMATION MODAL
───────────────────────────────────────────────────────────────────────────── */
export function openConfirmExitLobbyModal() {
  let title = 'EXIT TO LOBBY?';
  let description = 'End current game session and return to lobby? Unsaved match progress will be lost.';

  if (networkState && networkState.isMultiplayer) {
    if (networkState.isHost) {
      title = 'RETURN TO LOBBY?';
      description = 'End the online match for everyone and return all table players to the room lobby?';
    } else {
      title = 'LEAVE MATCH?';
      description = 'Exit current match back to the lobby? An autonomous AI bot will take over your empire.';
    }
  }

  updateModalSlice('confirmExitLobby', {
    visible: true,
    title,
    description
  });

  const m = document.getElementById('modal-confirm-exit-lobby');
  if (m) {
    m.style.removeProperty('display');
    m.style.removeProperty('pointer-events');
    animateModalSpringOpen(m, '#modal-confirm-exit-lobby .game-modal-shell');
    playSFX('hop');
  }
}

export function closeConfirmExitLobbyModal() {
  updateModalSlice('confirmExitLobby', { visible: false });
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
    const m = document.getElementById('modal-confirm-exit-lobby');
    if (m && m.classList.contains('flex') && !m.classList.contains('hidden')) {
      closeConfirmExitLobbyModal();
      return;
    }
    closeOtherInformationalModals('modal-confirm-exit-lobby');
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
