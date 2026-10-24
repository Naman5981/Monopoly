/**
 * network/p2pGuest.js
 * Guest peer connection, room joining, profile synchronization, and incoming host message reception.
 */

import { gameState, setupPlayers, matchSettings, setLobbyPlayerCount, setLocalPlayerIdx, getSavedPlayerName } from '../game/state.js';
import { PLAYER_THEMES, applyBoardEdition } from '../game/data.js';
import { getSceneLighting, applyBoardStyle, refreshAllTileTexturesAndMaterials, updateLobbyHeroAvatar } from '../three/scene.js';
import { applyLightingMode, stopVictoryCelebration } from '../three/effects.js';
import { logEvent, renderCornerHUDs } from '../ui/hud.js';
import { networkState, networkCallbacks, formatPeerRoomId } from './p2pState.js';
import { updateMultiplayerUI, leaveMultiplayerRoom, handleMatchDisconnectReturnToLobby } from './p2pUI.js';
import { executeIncomingNetworkAction } from './p2pActions.js';

export function joinRoom(roomCode, playerProfile = {}) {
  return new Promise((resolve, reject) => {
    if (typeof Peer === 'undefined') {
      reject(new Error('PeerJS library is not loaded. Please check your internet connection.'));
      return;
    }

    if (networkState.peer) {
      try { networkState.peer.destroy(); } catch (_) {}
    }

    const code = roomCode.toUpperCase().trim();
    const targetPeerId = formatPeerRoomId(code);

    networkState.status = 'connecting';
    networkState.statusText = `Connecting to room ${code}...`;
    networkState.roomCode = code;
    networkState.isHost = false;
    networkState.isMultiplayer = true;

    const peer = new Peer(null, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });

    networkState.peer = peer;

    peer.on('open', (id) => {
      networkState.peerId = id;
      const conn = peer.connect(targetPeerId, { reliable: true });
      networkState.hostConn = conn;

      conn.on('open', () => {
        networkState.status = 'connected';
        networkState.statusText = `Joined Room: ${code}`;
        conn.send({
          type: 'GUEST_JOIN',
          ...playerProfile
        });
        updateMultiplayerUI();
        resolve(code);
      });

      conn.on('data', (data) => {
        handleGuestReceivedMessage(data);
      });

      conn.on('close', () => {
        networkState.status = 'offline';
        networkState.statusText = 'Disconnected from host.';
        updateMultiplayerUI();
        if (gameState.gameStarted) {
          handleMatchDisconnectReturnToLobby('Room host disconnected or refreshed their browser.');
        } else {
          logEvent('⚠️ Disconnected from host room.');
        }
      });

      conn.on('error', (err) => {
        console.warn('[P2P Guest Conn Error]', err);
        networkState.status = 'error';
        networkState.statusText = 'Failed to connect to room.';
        updateMultiplayerUI();
        reject(err);
      });
    });

    peer.on('error', (err) => {
      console.warn('[P2P Guest Peer Error]', err);
      networkState.status = 'error';
      networkState.statusText = 'Peer network error.';
      updateMultiplayerUI();
      reject(err);
    });
  });
}

export function sendClientProfileUpdate(profile) {
  if (networkState.isHost || !networkState.hostConn || !networkState.hostConn.open) return;
  try {
    networkState.hostConn.send({
      type: 'CLIENT_UPDATE_PROFILE',
      playerIdx: networkState.localPlayerIdx,
      ...profile
    });
  } catch (err) {
    console.warn('[P2P sendClientProfileUpdate Error]', err);
  }
}

export function applyGameplayMatchSettings(src) {
  if (!src) return;
  if (typeof src.startingCash === 'number') matchSettings.startingCash = src.startingCash;
  if (typeof src.turnDuration === 'number') matchSettings.turnDuration = src.turnDuration;
  if (typeof src.matchDurationMinutes === 'number') matchSettings.matchDurationMinutes = src.matchDurationMinutes;
  if (typeof src.monopolySetsToWin === 'number') matchSettings.monopolySetsToWin = src.monopolySetsToWin;
  if (typeof src.lineMonopolyEnabled === 'boolean') matchSettings.lineMonopolyEnabled = src.lineMonopolyEnabled;
  if (src.lightingTheme && ['day', 'sunset', 'night'].includes(src.lightingTheme)) {
    matchSettings.lightingTheme = src.lightingTheme;
    applyLightingMode(src.lightingTheme, getSceneLighting());
  }
  if (src.boardStyle && ['wood', 'cyberpunk', 'elegant'].includes(src.boardStyle)) {
    matchSettings.boardStyle = src.boardStyle;
    applyBoardStyle(src.boardStyle);
  }
  if (src.boardEdition && (src.boardEdition === 'world' || src.boardEdition === 'rajasthan')) {
    matchSettings.boardEdition = src.boardEdition;
    applyBoardEdition(src.boardEdition);
    refreshAllTileTexturesAndMaterials();
  }
  if (window.renderMatchSettingButtons) window.renderMatchSettingButtons();
}

import { isValidPacket } from './protocol.js';

export function handleGuestReceivedMessage(msg) {
  if (!isValidPacket(msg)) {
    console.warn('[P2P Protocol] Guest received invalid packet:', msg);
    return;
  }

  switch (msg.type) {
    case 'JOIN_ACCEPTED': {
      networkState.localPlayerIdx = msg.assignedSlot;
      setLocalPlayerIdx(msg.assignedSlot);
      if (msg.lobbyPlayerCount) setLobbyPlayerCount(msg.lobbyPlayerCount);
      if (msg.matchSettings) applyGameplayMatchSettings(msg.matchSettings);
      if (msg.setupPlayers) {
        setupPlayers.splice(0, setupPlayers.length, ...msg.setupPlayers);
        setupPlayers.forEach((sp, idx) => {
          if (!matchSettings.customPlayers[idx]) {
            matchSettings.customPlayers[idx] = { ...sp };
          } else {
            Object.assign(matchSettings.customPlayers[idx], sp);
          }
          if (PLAYER_THEMES[idx]) {
            Object.assign(PLAYER_THEMES[idx], sp);
          }
        });
      }
      const mySavedName = getSavedPlayerName();
      if (matchSettings.customPlayers[msg.assignedSlot]) {
        if (!matchSettings.customPlayers[msg.assignedSlot].name || matchSettings.customPlayers[msg.assignedSlot].name === 'YOU') {
          matchSettings.customPlayers[msg.assignedSlot].name = mySavedName;
        }
        setupPlayers[msg.assignedSlot].name = matchSettings.customPlayers[msg.assignedSlot].name;
        if (PLAYER_THEMES[msg.assignedSlot]) {
          PLAYER_THEMES[msg.assignedSlot].name = matchSettings.customPlayers[msg.assignedSlot].name;
        }
        sendClientProfileUpdate({ name: matchSettings.customPlayers[msg.assignedSlot].name });
      }
      if (window.selectSetupPlayer) {
        window.selectSetupPlayer(msg.assignedSlot);
      }
      if (window.setLobbyView) {
        window.setLobbyView('multiplayer-room');
      }
      logEvent(`✅ Joined room as <strong>Player ${networkState.localPlayerIdx + 1}</strong>!`);
      updateMultiplayerUI();
      if (networkCallbacks.onLobbyUpdate) networkCallbacks.onLobbyUpdate();
      break;
    }

    case 'JOIN_REJECTED': {
      alert(`Could not join room: ${msg.reason || 'Room is full'}`);
      leaveMultiplayerRoom();
      break;
    }

    case 'LOBBY_STATE': {
      if (msg.lobbyPlayerCount) setLobbyPlayerCount(msg.lobbyPlayerCount);
      if (msg.matchSettings) applyGameplayMatchSettings(msg.matchSettings);
      if (msg.setupPlayers) {
        setupPlayers.splice(0, setupPlayers.length, ...msg.setupPlayers);
        setupPlayers.forEach((sp, idx) => {
          if (!matchSettings.customPlayers[idx]) {
            matchSettings.customPlayers[idx] = { ...sp };
          } else {
            Object.assign(matchSettings.customPlayers[idx], sp);
          }
          if (PLAYER_THEMES[idx]) {
            Object.assign(PLAYER_THEMES[idx], sp);
          }
          if (gameState && gameState.players && gameState.players[idx] && sp.name) {
            gameState.players[idx].name = sp.name;
          }
        });
      }
      const curSelected = (window.selectedSetupPlayerIdx !== undefined) ? window.selectedSetupPlayerIdx : networkState.localPlayerIdx;
      const curP = matchSettings.customPlayers[curSelected] || matchSettings.customPlayers[networkState.localPlayerIdx];
      if (curP) {
        updateLobbyHeroAvatar(curP.hatStyle || 0, curP.colorHex || '#3b82f6', curP.charColor || 0x3b82f6);
      }
      updateMultiplayerUI();
      if (networkCallbacks.onLobbyUpdate) networkCallbacks.onLobbyUpdate();
      if (gameState && gameState.gameStarted) {
        renderCornerHUDs();
      }
      break;
    }

    case 'PLAYER_DISCONNECTED': {
      if (msg.setupPlayers) {
        setupPlayers.splice(0, setupPlayers.length, ...msg.setupPlayers);
        setupPlayers.forEach((sp, idx) => {
          if (!matchSettings.customPlayers[idx]) {
            matchSettings.customPlayers[idx] = { ...sp };
          } else {
            Object.assign(matchSettings.customPlayers[idx], sp);
          }
          if (PLAYER_THEMES[idx]) {
            Object.assign(PLAYER_THEMES[idx], sp);
          }
        });
      }
      if (msg.lobbyPlayerCount) {
        setLobbyPlayerCount(msg.lobbyPlayerCount);
      }
      if (msg.playerIdx !== undefined && gameState.players && gameState.players[msg.playerIdx]) {
        gameState.players[msg.playerIdx].isAI = true;
      }
      const leavingName = setupPlayers[msg.playerIdx]?.name || `Player ${msg.playerIdx !== undefined ? msg.playerIdx + 1 : ''}`;
      logEvent(`⚠️ <strong>${leavingName}</strong> disconnected (converted to AI).`);
      updateMultiplayerUI();
      if (networkCallbacks.onLobbyUpdate) networkCallbacks.onLobbyUpdate();
      if (gameState && gameState.gameStarted) {
        renderCornerHUDs();
      }
      break;
    }

    case 'RETURN_TO_LOBBY': {
      if (window.terminateMatchAndReturnToLobby) {
        window.terminateMatchAndReturnToLobby(true);
      } else {
        stopVictoryCelebration();
        document.getElementById('modal-victory')?.classList.add('hidden');
        document.getElementById('modal-victory')?.classList.remove('flex');
        gameState.gameStarted = false;
        gameState.phase = 'SETUP';
        if (window.closeAllGameModals) window.closeAllGameModals();
        if (window.openLandingSetupScreen) {
          window.openLandingSetupScreen();
        }
      }
      if (msg.lobbyPlayerCount) setLobbyPlayerCount(msg.lobbyPlayerCount);
      if (msg.matchSettings) applyGameplayMatchSettings(msg.matchSettings);
      if (msg.setupPlayers) {
        setupPlayers.splice(0, setupPlayers.length, ...msg.setupPlayers);
        setupPlayers.forEach((sp, idx) => {
          if (!matchSettings.customPlayers[idx]) {
            matchSettings.customPlayers[idx] = { ...sp };
          } else {
            Object.assign(matchSettings.customPlayers[idx], sp);
          }
          if (PLAYER_THEMES[idx]) {
            Object.assign(PLAYER_THEMES[idx], sp);
          }
        });
      }
      logEvent('👑 Table Host brought all room players back to the lobby.');
      break;
    }

    case 'START_MATCH': {
      stopVictoryCelebration();
      document.getElementById('modal-victory')?.classList.add('hidden');
      document.getElementById('modal-victory')?.classList.remove('flex');
      if (window.closeAllGameModals) window.closeAllGameModals();

      const landing = document.getElementById('landing-setup-screen');
      if (landing) {
        landing.classList.add('hidden');
        landing.style.display = 'none';
      }

      const btnText = document.getElementById('btn-victory-play-again-text');
      if (btnText) btnText.textContent = 'PLAY AGAIN';
      const playBtn = document.getElementById('btn-victory-play-again');
      if (playBtn) playBtn.disabled = false;
      const statusEl = document.getElementById('victory-multiplayer-status');
      if (statusEl) statusEl.classList.add('hidden');

      if (msg.lobbyPlayerCount) setLobbyPlayerCount(msg.lobbyPlayerCount);
      if (msg.matchSettings) applyGameplayMatchSettings(msg.matchSettings);
      if (msg.setupPlayers) {
        setupPlayers.splice(0, setupPlayers.length, ...msg.setupPlayers);
        setupPlayers.forEach((sp, idx) => {
          if (!matchSettings.customPlayers[idx]) {
            matchSettings.customPlayers[idx] = { ...sp };
          } else {
            Object.assign(matchSettings.customPlayers[idx], sp);
          }
          if (PLAYER_THEMES[idx]) {
            Object.assign(PLAYER_THEMES[idx], sp);
          }
        });
      }
      if (networkCallbacks.onStartGame) {
        networkCallbacks.onStartGame();
      }
      break;
    }

    case 'ACTION_SYNC_BOARD_EDITION': {
      if (msg.boardEdition) {
        matchSettings.boardEdition = msg.boardEdition;
        applyBoardEdition(msg.boardEdition);
        refreshAllTileTexturesAndMaterials();
        if (window.renderMatchSettingButtons) window.renderMatchSettingButtons();
      }
      break;
    }

    case 'ACTION_ROLL':
    case 'ACTION_BUY_CITY':
    case 'ACTION_BUYOUT_CITY':
    case 'ACTION_UPGRADE_CITY':
    case 'ACTION_PAY_BAIL':
    case 'ACTION_SELL_CITY_FOR_RENT':
    case 'ACTION_AUCTION_BID':
    case 'ACTION_AUCTION_PASS':
    case 'ACTION_TRADE_OFFER':
    case 'ACTION_TRADE_RESPONSE':
    case 'ACTION_SETTLE_RENT':
    case 'ACTION_BANKRUPTCY':
    case 'ACTION_FESTIVAL_BOOST':
    case 'ACTION_WORLD_TOUR':
    case 'ACTION_CHANCE_PRIZE':
    case 'ACTION_MONOPOLY':
    case 'ACTION_END_TURN':
    case 'ACTION_REACTION':
    case 'ACTION_REQUEST_PLAY_AGAIN':
    case 'ACTION_GUEST_LOBBY': {
      executeIncomingNetworkAction(msg);
      break;
    }

    case 'FULL_STATE_SYNC': {
      if (msg.gameState && networkCallbacks.onSyncState) {
        networkCallbacks.onSyncState(msg.gameState);
      }
      break;
    }

    case 'MATCH_DISCONNECTED_TO_LOBBY': {
      handleMatchDisconnectReturnToLobby(msg.reason || 'A player disconnected from the match.');
      break;
    }

    default:
      break;
  }
}
