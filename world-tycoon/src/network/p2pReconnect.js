/**
 * network/p2pReconnect.js
 * P2P reconnection grace period, host session resurrection, and AI bot takeover fallback.
 */

import { gameState, setLocalPlayerIdx, isHumanTurnActionable } from '../game/state.js';
import { networkState } from './p2pState.js';
import { hostRoom, broadcastFullGameState } from './p2pHost.js';
import { joinRoom } from './p2pGuest.js';
import { updateMultiplayerUI, handleMatchDisconnectReturnToLobby } from './p2pUI.js';
import { renderCornerHUDs, updateRollButtonsUI, logEvent } from '../ui/hud.js';
import { resumeActiveTurn } from '../game/engine.js';
import { cancelAllGameTimers } from '../game/engine/turnCycle.js';
import { closeTurnActionModals } from '../ui/modals/common.js';
import { updateModalSlice } from '../svelte/stores/modalStore.js';
import { playSFX } from '../game/audio.js';

let reconnectIntervalId = null;
let reconnectCountdownSeconds = 0;
let activeReconnectRoomCode = null;

/**
 * Converts all remote human players into autonomous AI bots so the match can continue seamlessly offline.
 */
export function convertRemotePlayersToBots() {
  networkState.isReconnecting = false;
  cancelGuestReconnectGracePeriod();
  closeReconnectGraceModal();

  const myIdx = (typeof networkState.localPlayerIdx === 'number' ? networkState.localPlayerIdx : 0);
  
  if (gameState && Array.isArray(gameState.players)) {
    gameState.players.forEach((p, idx) => {
      if (idx !== myIdx) {
        p.isAI = true;
      }
    });
  }

  networkState.isMultiplayer = false;
  networkState.isHost = false;
  networkState.status = 'offline';
  networkState.statusText = 'Playing vs AI bots';
  networkState.connections.clear();

  renderCornerHUDs();
  updateRollButtonsUI(isHumanTurnActionable());
  updateMultiplayerUI();

  if (!isHumanTurnActionable()) {
    resumeActiveTurn();
  }

  playSFX('hop');
  logEvent('🤖 <strong>Disconnected players converted to AI bots.</strong> You can now finish the match offline.');
}

export function showReconnectGraceModal(roomCode, secondsRemaining) {
  const statusDesc = secondsRemaining > 0 
    ? `Host refreshed or disconnected. Attempting to re-link to Room ${roomCode}...` 
    : 'Host did not reconnect in time.';

  updateModalSlice('reconnectGrace', {
    visible: true,
    roomCode: roomCode || 'ROOM',
    secondsRemaining: Math.max(0, secondsRemaining),
    statusDesc
  });
}

export function closeReconnectGraceModal() {
  networkState.isReconnecting = false;
  updateModalSlice('reconnectGrace', { visible: false });
}

export function cancelGuestReconnectGracePeriod() {
  networkState.isReconnecting = false;
  if (reconnectIntervalId) {
    clearInterval(reconnectIntervalId);
    reconnectIntervalId = null;
  }
  reconnectCountdownSeconds = 0;
  activeReconnectRoomCode = null;
}

export function startGuestReconnectGracePeriod(roomCode, timeoutSeconds = 30) {
  if (!roomCode || !gameState.gameStarted) {
    handleMatchDisconnectReturnToLobby('Room host disconnected.');
    return;
  }

  cancelGuestReconnectGracePeriod();
  networkState.isReconnecting = true;
  cancelAllGameTimers();
  closeTurnActionModals();

  activeReconnectRoomCode = roomCode;
  reconnectCountdownSeconds = timeoutSeconds;

  showReconnectGraceModal(roomCode, reconnectCountdownSeconds);
  playSFX('hop');
  logEvent(`⏳ Host connection lost. Entering 30-second reconnection window for Room <strong>${roomCode}</strong>...`);

  let isAttempting = false;

  reconnectIntervalId = setInterval(async () => {
    reconnectCountdownSeconds--;
    showReconnectGraceModal(roomCode, Math.max(0, reconnectCountdownSeconds));

    if (reconnectCountdownSeconds <= 0) {
      cancelGuestReconnectGracePeriod();
      const statusEl = document.getElementById('reconnect-status-desc');
      if (statusEl) {
        statusEl.innerHTML = '<span class="text-rose-400 font-bold">Reconnection timed out.</span> The host did not return.';
      }
      return;
    }

    // Try re-connecting to host every ~3 seconds
    if (!isAttempting && reconnectCountdownSeconds % 3 === 0) {
      isAttempting = true;
      try {
        const myName = gameState.players[networkState.localPlayerIdx]?.name || 'Player';
        const myColor = gameState.players[networkState.localPlayerIdx]?.colorHex || '#3b82f6';
        
        await joinRoom(roomCode, myName, myColor);
        cancelGuestReconnectGracePeriod();
        closeReconnectGraceModal();
        logEvent(`🎉 <strong>Reconnected to Room ${roomCode}!</strong> Resuming match.`);
        playSFX('win');
      } catch (err) {
        // Still waiting for host to resurrect peer room
      } finally {
        isAttempting = false;
      }
    }
  }, 1000);
}

export async function reconnectHostRoom(roomCode) {
  if (!roomCode) return false;
  
  try {
    logEvent(`🔄 Attempting to resurrect Room <strong>${roomCode}</strong> on signaling server...`);
    await hostRoom(roomCode);
    logEvent(`👑 Room <strong>${roomCode}</strong> successfully re-hosted! Waiting for guests to re-link...`);
    return true;
  } catch (err) {
    console.warn('[P2P Reconnect] Could not immediately reclaim room code:', err);
    if (err.type === 'unavailable-id') {
      logEvent(`⏳ Room <strong>${roomCode}</strong> is still clearing on signaling server. Retrying in 3s...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      try {
        await hostRoom(roomCode);
        logEvent(`👑 Room <strong>${roomCode}</strong> successfully reclaimed!`);
        return true;
      } catch (retryErr) {
        console.warn('[P2P Reconnect] Second attempt to host failed:', retryErr);
      }
    }
    return false;
  }
}
