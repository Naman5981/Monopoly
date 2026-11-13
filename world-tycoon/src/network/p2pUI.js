/**
 * network/p2pUI.js
 * Multiplayer UI state indicators, badges, invite link copying, and disconnect handlers.
 */

import { gameState, setupPlayers, setLocalPlayerIdx } from '../game/state.js';
import { logEvent } from '../ui/hud.js';
import { playSFX } from '../game/audio.js';
import { networkState, networkCallbacks, stopHostHeartbeat } from './p2pState.js';
import { updateHudState } from '../svelte/stores/hudStore.js';
import { updateModalSlice } from '../svelte/stores/modalStore.js';
import { updateLobbyStore } from '../svelte/stores/lobbyStore.js';

export function leaveMultiplayerRoom() {
  stopHostHeartbeat();
  if (networkState.peer) {
    try { networkState.peer.destroy(); } catch (_) {}
  }
  networkState.isMultiplayer = false;
  networkState.isHost = false;
  networkState.localPlayerIdx = 0;
  setLocalPlayerIdx(0);
  networkState.roomCode = '';
  networkState.peer = null;
  networkState.hostConn = null;
  networkState.connections.clear();
  networkState.status = 'offline';
  networkState.statusText = '';

  setupPlayers.forEach((p, idx) => {
    if (idx > 0) {
      p.isOnlinePeer = false;
      p.peerId = null;
      p.isAI = true;
    }
  });

  updateHudState({
    isMultiplayer: false,
    roomCode: '',
    isHost: false,
    localPlayerIdx: 0
  });
  updateMultiplayerUI();
  if (networkCallbacks.onLobbyUpdate) networkCallbacks.onLobbyUpdate();
}

export function handleMatchDisconnectReturnToLobby(reason = 'A player disconnected from the match.') {
  gameState.gameStarted = false;
  const fullMsg = `${reason} The current match has been terminated and all participants have been returned to the lobby.`;

  updateModalSlice('disconnectNotice', {
    visible: true,
    message: fullMsg
  });

  playSFX('hop');
  logEvent(`⚠️ Match ended: ${reason}`);
}

export function returnToLobbyFromDisconnect() {
  updateModalSlice('disconnectNotice', { visible: false });

  if (window.openLandingSetupScreen) {
    window.openLandingSetupScreen();
  } else {
    // Fallback: Close modals and open landing
    ['modal-tile-inspector', 'modal-buy-city', 'modal-trade', 'modal-portfolio', 'modal-monopoly-celebration', 'modal-rules'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('hidden');
        el.classList.remove('flex');
      }
    });
    const landing = document.getElementById('landing-setup-screen');
    if (landing) {
      landing.classList.remove('hidden');
      landing.style.display = 'flex';
      landing.style.opacity = '1';
      landing.style.transform = 'scale(1) translateY(0)';
    }
  }
}

function showCopyFeedback(message) {
  playSFX('hop');
  logEvent(message);
  updateLobbyStore({ networkStatus: 'Copied!', networkStatusKind: 'neutral' });
  setTimeout(updateMultiplayerUI, 2000);
}

export function copyRoomInviteLink() {
  const url = `${window.location.origin}${window.location.pathname}?room=${networkState.roomCode}`;
  navigator.clipboard.writeText(url).then(() => {
    showCopyFeedback(`🔗 Room invite link copied to clipboard! (${url})`);
  }).catch(() => {
    showCopyFeedback(`📋 Room code copied: ${networkState.roomCode}`);
  });
}

export function copyRoomCodeOnly() {
  navigator.clipboard.writeText(networkState.roomCode).then(() => {
    showCopyFeedback(`📋 Room code "${networkState.roomCode}" copied to clipboard!`);
  }).catch(() => {
    showCopyFeedback(`📋 Room code: ${networkState.roomCode}`);
  });
}

export function updateMultiplayerUI() {
  // Sync multiplayer status to reactive Svelte HUD
  updateHudState({
    isMultiplayer: Boolean(networkState.isMultiplayer),
    roomCode: networkState.roomCode || '',
    isHost: Boolean(networkState.isHost),
    localPlayerIdx: networkState.localPlayerIdx ?? 0
  });

  const isRoomActive = networkState.isMultiplayer && Boolean(
    networkState.roomCode || networkState.isHost || networkState.status === 'hosting' || networkState.status === 'connected'
  );
  updateLobbyStore({
    isMultiplayer: Boolean(networkState.isMultiplayer),
    isHost: Boolean(networkState.isHost),
    isRoomActive,
    roomCode: networkState.roomCode || '',
    localPlayerIdx: networkState.localPlayerIdx ?? 0,
    networkStatus: isRoomActive
      ? `${networkState.isHost ? 'Hosting Room' : 'Joined Room'}: ${networkState.roomCode || '----'}`
      : (networkState.statusText || 'Ready'),
    networkStatusKind: networkState.status === 'error' ? 'error' : 'neutral'
  });

  // Toggle setup panel controls (Host Room & Enter Room Code hidden when room is active)
  const unconnectedControls = document.getElementById('p2p-unconnected-controls');
  const connectedControls = document.getElementById('p2p-connected-controls');
  const copyBtn = document.getElementById('btn-p2p-copy-link');
  const copyCodeBtn = document.getElementById('btn-p2p-copy-code');
  const leaveBtn = document.getElementById('btn-p2p-leave');

  if (unconnectedControls && connectedControls) {
    if (isRoomActive) {
      unconnectedControls.classList.add('hidden');
      connectedControls.classList.remove('hidden');
      connectedControls.classList.add('grid');
      if (copyBtn) copyBtn.classList.remove('hidden');
      if (copyCodeBtn) copyCodeBtn.classList.remove('hidden');
      if (leaveBtn) leaveBtn.classList.remove('hidden');
    } else {
      unconnectedControls.classList.remove('hidden');
      connectedControls.classList.add('hidden');
      connectedControls.classList.remove('grid');
      if (copyBtn) copyBtn.classList.add('hidden');
      if (copyCodeBtn) copyCodeBtn.classList.add('hidden');
      if (leaveBtn) leaveBtn.classList.add('hidden');
    }
  }
}
