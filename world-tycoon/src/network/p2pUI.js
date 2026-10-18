/**
 * network/p2pUI.js
 * Multiplayer UI state indicators, badges, invite link copying, and disconnect handlers.
 */

import { gameState, setLocalPlayerIdx } from '../game/state.js';
import { logEvent } from '../ui/hud.js';
import { playSFX } from '../game/audio.js';
import { networkState, networkCallbacks } from './p2pState.js';

export function leaveMultiplayerRoom() {
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

  updateMultiplayerUI();
  if (networkCallbacks.onLobbyUpdate) networkCallbacks.onLobbyUpdate();
}

export function handleMatchDisconnectReturnToLobby(reason = 'A player disconnected from the match.') {
  gameState.gameStarted = false;

  const noticeModal = document.getElementById('modal-disconnect-notice');
  const textEl = document.getElementById('disconnect-notice-text');
  if (textEl) {
    textEl.textContent = `${reason} The current match has been terminated and all participants have been returned to the lobby.`;
  }
  if (noticeModal) {
    noticeModal.classList.remove('hidden');
    noticeModal.classList.add('flex');
  }

  playSFX('hop');
  logEvent(`⚠️ Match ended: ${reason}`);
}

export function returnToLobbyFromDisconnect() {
  const noticeModal = document.getElementById('modal-disconnect-notice');
  if (noticeModal) {
    noticeModal.classList.add('hidden');
    noticeModal.classList.remove('flex');
  }

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

export function showCopyFeedback(triggerEl, message) {
  playSFX('hop');
  logEvent(message);
  if (triggerEl && triggerEl.tagName === 'BUTTON') {
    const origHtml = triggerEl.innerHTML;
    triggerEl.innerHTML = '<i class="fa-solid fa-check text-emerald-500 mr-1"></i> Copied!';
    triggerEl.classList.add('ring-2', 'ring-emerald-400');
    setTimeout(() => {
      triggerEl.innerHTML = origHtml;
      triggerEl.classList.remove('ring-2', 'ring-emerald-400');
    }, 2000);
  }
}

export function copyRoomInviteLink(e) {
  const targetBtn = (e && e.currentTarget) || (window.event && window.event.currentTarget) || document.querySelector('button[onclick*="copyRoomInviteLink"]');
  const url = `${window.location.origin}${window.location.pathname}?room=${networkState.roomCode}`;
  navigator.clipboard.writeText(url).then(() => {
    showCopyFeedback(targetBtn, `🔗 Room invite link copied to clipboard! (${url})`);
  }).catch(() => {
    showCopyFeedback(targetBtn, `📋 Room code copied: ${networkState.roomCode}`);
  });
}

export function copyRoomCodeOnly(e) {
  const targetBtn = (e && e.currentTarget) || (window.event && window.event.currentTarget) || document.querySelector('button[onclick*="copyRoomCodeOnly"]');
  navigator.clipboard.writeText(networkState.roomCode).then(() => {
    showCopyFeedback(targetBtn, `📋 Room code "${networkState.roomCode}" copied to clipboard!`);
  }).catch(() => {
    showCopyFeedback(targetBtn, `📋 Room code: ${networkState.roomCode}`);
  });
}

export function updateMultiplayerUI() {
  // Update HUD multiplayer pill
  const pill = document.getElementById('hud-multiplayer-pill');
  const pillText = document.getElementById('hud-multiplayer-text');
  const pillDot = document.getElementById('hud-multiplayer-dot');

  if (pill && pillText && pillDot) {
    if (networkState.isMultiplayer) {
      pill.classList.remove('hidden');
      pill.classList.add('inline-flex');
      const roleStr = networkState.isHost ? 'Host' : `P${networkState.localPlayerIdx + 1}`;
      pillText.textContent = `${networkState.roomCode} (${roleStr})`;
      pillDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
    } else {
      pill.classList.add('hidden');
      pill.classList.remove('inline-flex');
    }
  }

  // Update setup lobby indicators (p2p panel)
  const isRoomActive = networkState.isMultiplayer && Boolean(networkState.roomCode || networkState.isHost || networkState.status === 'hosting' || networkState.status === 'connected');
  const setupRoomBadge = document.getElementById('setup-p2p-badge');
  const setupRoomCodeEl = document.getElementById('setup-p2p-code-text');
  const setupStatusEl = document.getElementById('setup-p2p-status-text');

  if (setupRoomBadge && setupRoomCodeEl) {
    if (networkState.isMultiplayer && isRoomActive) {
      setupRoomBadge.classList.remove('hidden');
      setupRoomBadge.classList.add('flex');
      setupRoomCodeEl.textContent = networkState.roomCode;
    } else {
      setupRoomBadge.classList.add('hidden');
      setupRoomBadge.classList.remove('flex');
    }
  }

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
      if (setupStatusEl) {
        const prefix = networkState.isHost ? 'Hosting Room:' : 'Joined Room:';
        setupStatusEl.innerHTML = `${prefix} <strong>${networkState.roomCode || '----'}</strong>`;
      }
    } else {
      unconnectedControls.classList.remove('hidden');
      connectedControls.classList.add('hidden');
      connectedControls.classList.remove('grid');
      if (copyBtn) copyBtn.classList.add('hidden');
      if (copyCodeBtn) copyCodeBtn.classList.add('hidden');
      if (leaveBtn) leaveBtn.classList.add('hidden');
      if (setupStatusEl) {
        setupStatusEl.textContent = networkState.statusText || 'Ready';
      }
    }
  }

  // Hero Room Capsule in dedicated Multiplayer Room View
  const mpRoomCapsule = document.getElementById('mp-room-capsule');
  const mpRoomCodeDisplay = document.getElementById('mp-room-code-display');
  const mpRoleBadge = document.getElementById('mp-role-badge');
  if (mpRoomCapsule && mpRoomCodeDisplay) {
    if (networkState.isMultiplayer && (networkState.isHost || networkState.status === 'connected' || networkState.status === 'hosting')) {
      mpRoomCapsule.classList.remove('hidden');
      mpRoomCapsule.classList.add('flex');
      mpRoomCodeDisplay.textContent = networkState.roomCode || '----';
      if (mpRoleBadge) {
        if (networkState.isHost) {
          mpRoleBadge.textContent = 'HOST';
          mpRoleBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300';
        } else {
          mpRoleBadge.textContent = `PLAYER ${networkState.localPlayerIdx + 1}`;
          mpRoleBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-100 text-sky-800 border border-sky-300';
        }
      }
    } else {
      mpRoomCapsule.classList.add('hidden');
      mpRoomCapsule.classList.remove('flex');
    }
  }

  // Update big lobby PLAY button for host vs guest
  const landingPlayBtn = document.getElementById('landing-play-btn');
  if (landingPlayBtn) {
    if (networkState.isMultiplayer && !networkState.isHost) {
      landingPlayBtn.innerHTML = '<i class="fa-solid fa-hourglass-half text-lg mr-2"></i> WAITING FOR HOST';
      landingPlayBtn.classList.remove('game-btn-green');
      landingPlayBtn.classList.add('game-btn-blue', 'opacity-85');
    } else {
      landingPlayBtn.innerHTML = '<i class="fa-solid fa-play text-xl mr-2"></i> START MATCH';
      landingPlayBtn.classList.remove('game-btn-blue', 'opacity-85');
      landingPlayBtn.classList.add('game-btn-green');
    }
  }
}
