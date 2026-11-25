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
import { get } from 'svelte/store';
import { modalStore, updateModalSlice } from '../../svelte/stores/modalStore.js';
import { hudStore, updateHudState } from '../../svelte/stores/hudStore.js';

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
  if (get(modalStore).rules?.visible) {
    closeRulesModal();
    return;
  }
  closeOtherInformationalModals('modal-rules');
  updateModalSlice('rules', { visible: true });
  animateModalSpringOpen('#modal-rules', '#modal-rules .game-modal-shell');
  playSFX('hop');
}

export function closeRulesModal() {
  updateModalSlice('rules', { visible: false });
  animateModalSpringClose('#modal-rules', '#modal-rules .game-modal-shell');
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
  const nextOpen = !get(hudStore).isEventLogOpen;
  updateHudState({ isEventLogOpen: nextOpen });
  if (nextOpen) playSFX('hop');

  if (typeof document !== 'undefined' && !document.getElementById('svelte-hud-mount')?.firstElementChild) {
    const d = document.getElementById('event-log-drawer');
    if (d) {
      d.classList.toggle('hidden', !nextOpen);
      d.classList.toggle('flex', nextOpen);
    }
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

  animateModalSpringOpen('#modal-confirm-exit-lobby', '#modal-confirm-exit-lobby .game-modal-shell');
  playSFX('hop');
}

export function closeConfirmExitLobbyModal() {
  updateModalSlice('confirmExitLobby', { visible: false });
  animateModalSpringClose('#modal-confirm-exit-lobby', '#modal-confirm-exit-lobby .game-modal-shell');
}

export function handleLobbyButtonClick() {
  if (gameState && gameState.gameStarted) {
    if (get(modalStore).confirmExitLobby?.visible) {
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
