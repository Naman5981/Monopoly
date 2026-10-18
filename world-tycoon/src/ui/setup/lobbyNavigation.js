/**
 * ui/setup/lobbyNavigation.js
 * Handles navigation between Title screen, Local Pass & Play lobby, and Multiplayer Portal/Room views.
 */

import { playSFX } from '../../game/audio.js';
import { networkState, leaveMultiplayerRoom } from '../../network/p2p.js';
import { animateLobbyViewTransition } from '../anim.js';

export let currentLobbyView = 'title'; // 'title' | 'local' | 'multiplayer-portal' | 'multiplayer-room'

export function setLobbyView(viewName, triggerSound = true) {
  currentLobbyView = viewName;
  const screen = document.getElementById('landing-setup-screen');
  if (screen) {
    screen.classList.remove('lobby-view-title', 'lobby-view-local', 'lobby-view-multiplayer-portal', 'lobby-view-multiplayer-room');
    screen.classList.add(`lobby-view-${viewName}`);
  }

  const backBtn = document.getElementById('btn-lobby-back-to-title');
  if (backBtn) {
    if (viewName === 'title') {
      backBtn.classList.add('hidden');
      backBtn.classList.remove('flex', 'inline-flex');
    } else {
      backBtn.classList.remove('hidden');
      backBtn.classList.add('inline-flex');
    }
  }

  animateLobbyViewTransition(viewName);

  if (triggerSound) {
    playSFX('hop');
  }
}

export function showTitleScreen(renderPlayerCards, renderMatchSettingButtons) {
  if (networkState.isMultiplayer && (networkState.isHost || networkState.status === 'connected' || networkState.status === 'hosting')) {
    if (!confirm('Leave current multiplayer room and return to Title Menu?')) {
      return;
    }
    leaveMultiplayerRoom();
  }
  setLobbyView('title');
  if (typeof renderPlayerCards === 'function') renderPlayerCards();
  else if (window.renderPlayerCards) window.renderPlayerCards();
  if (typeof renderMatchSettingButtons === 'function') renderMatchSettingButtons();
  else if (window.renderMatchSettingButtons) window.renderMatchSettingButtons();
}

export function showLocalSetup(renderPlayerCards, renderMatchSettingButtons) {
  if (networkState.isMultiplayer) {
    leaveMultiplayerRoom();
  }
  setLobbyView('local');
  const playBtn = document.getElementById('landing-play-btn');
  if (playBtn) {
    playBtn.disabled = false;
    playBtn.innerHTML = '<i class="fa-solid fa-play text-xl mr-2"></i> START MATCH';
    playBtn.classList.remove('game-btn-blue', 'opacity-85', 'opacity-75', 'cursor-not-allowed', 'bg-slate-500');
    playBtn.classList.add('game-btn-green');
  }
  if (typeof renderPlayerCards === 'function') renderPlayerCards();
  else if (window.renderPlayerCards) window.renderPlayerCards();
  if (typeof renderMatchSettingButtons === 'function') renderMatchSettingButtons();
  else if (window.renderMatchSettingButtons) window.renderMatchSettingButtons();
}

export function showMultiplayerSetup(renderPlayerCards, renderMatchSettingButtons) {
  if (networkState.isMultiplayer && (networkState.isHost || networkState.status === 'connected' || networkState.status === 'hosting')) {
    setLobbyView('multiplayer-room');
  } else {
    setLobbyView('multiplayer-portal');
  }
  if (typeof renderPlayerCards === 'function') renderPlayerCards();
  else if (window.renderPlayerCards) window.renderPlayerCards();
  if (typeof renderMatchSettingButtons === 'function') renderMatchSettingButtons();
  else if (window.renderMatchSettingButtons) window.renderMatchSettingButtons();
}

export function selectMatchMode(mode, triggerLeave = true) {
  const isOnline = mode === 'online';
  if (isOnline) {
    showMultiplayerSetup();
  } else {
    showLocalSetup();
  }
  if (triggerLeave) {
    playSFX('hop');
  }
}
