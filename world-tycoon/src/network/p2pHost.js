/**
 * network/p2pHost.js
 * Room hosting, connection acceptance, host message routing, and state broadcasting.
 */

import { gameState, setupPlayers, matchSettings, lobbyPlayerCount, setLobbyPlayerCount, setLocalPlayerIdx, getSavedPlayerName } from '../game/state.js';
import { logEvent, renderCornerHUDs } from '../ui/hud.js';
import { playSFX } from '../game/audio.js';
import { PLAYER_THEMES } from '../game/data.js';
import { networkState, networkCallbacks, generateRoomCode, formatPeerRoomId } from './p2pState.js';
import { updateMultiplayerUI } from './p2pUI.js';
import { executeIncomingNetworkAction } from './p2pActions.js';
import { isValidPacket, sanitizeProfileUpdate, createSafeLobbyStatePacket } from './protocol.js';

export function hostRoom(customCode = null) {
  return new Promise((resolve, reject) => {
    if (typeof Peer === 'undefined') {
      reject(new Error('PeerJS library is not loaded. Please check your internet connection.'));
      return;
    }

    if (networkState.peer) {
      try { networkState.peer.destroy(); } catch (_) {}
    }

    const code = customCode ? customCode.toUpperCase().trim() : generateRoomCode();
    const peerId = formatPeerRoomId(code);

    networkState.status = 'connecting';
    networkState.statusText = 'Creating room...';
    networkState.roomCode = code;
    networkState.isHost = true;
    networkState.isMultiplayer = true;
    networkState.localPlayerIdx = 0;
    setLocalPlayerIdx(0);
    networkState.connections.clear();

    const peer = new Peer(peerId, {
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
      networkState.status = 'hosting';
      networkState.statusText = `Hosting Room: ${code}`;
      const hostSavedName = getSavedPlayerName();
      setupPlayers[0].name = hostSavedName;
      if (matchSettings.customPlayers[0]) matchSettings.customPlayers[0].name = hostSavedName;
      if (PLAYER_THEMES[0]) PLAYER_THEMES[0].name = hostSavedName;
      setupPlayers[0].isAI = false;
      setupPlayers[0].isOnlinePeer = false;
      setupPlayers[0].peerId = id;

      updateMultiplayerUI();
      logEvent(`👑 Room <strong>${code}</strong> created! Share this code with friends.`);
      resolve(code);
    });

    peer.on('connection', (conn) => {
      initHostPeerConnection(conn);
    });

    peer.on('error', (err) => {
      console.warn('[P2P Host Error]', err);
      networkState.status = 'error';
      networkState.statusText = 'Room creation failed.';
      updateMultiplayerUI();
      reject(err);
    });
  });
}

function initHostPeerConnection(conn) {
  const registerGuest = () => {
    networkState.connections.set(conn.peer, conn);
    networkState.connectedPeersCount = networkState.connections.size;
    updateMultiplayerUI();
  };

  if (conn.open) {
    registerGuest();
  } else {
    conn.on('open', registerGuest);
  }

  conn.on('data', (data) => {
    if (!networkState.connections.has(conn.peer)) {
      networkState.connections.set(conn.peer, conn);
      networkState.connectedPeersCount = networkState.connections.size;
      updateMultiplayerUI();
    }
    handleHostReceivedMessage(conn, data);
  });

  conn.on('close', () => {
    networkState.connections.delete(conn.peer);
    networkState.connectedPeersCount = networkState.connections.size;

    // If game has already started, convert the disconnected player to an autonomous AI bot!
    if (gameState.gameStarted) {
      const idx = gameState.players.findIndex(p => p.peerId === conn.peer || (setupPlayers[p.id] && setupPlayers[p.id].peerId === conn.peer));
      const targetIdx = idx !== -1 ? idx : null;
      let name = 'A player';

      if (targetIdx !== null && gameState.players[targetIdx]) {
        gameState.players[targetIdx].isAI = true;
        name = gameState.players[targetIdx].name;
        if (setupPlayers[targetIdx]) {
          setupPlayers[targetIdx].isAI = true;
          setupPlayers[targetIdx].isOnlinePeer = false;
          setupPlayers[targetIdx].peerId = null;
        }
        if (networkCallbacks.onPlayerConvertedToAI) {
          networkCallbacks.onPlayerConvertedToAI(targetIdx);
        }
        broadcastToAll({
          type: 'PLAYER_DISCONNECTED',
          playerIdx: targetIdx,
          setupPlayers,
          lobbyPlayerCount
        });
        broadcastFullGameState();
      }
      logEvent(`⚠️ <strong>${name}</strong> disconnected. Converted to AI bot.`);
      updateMultiplayerUI();
      if (networkCallbacks.onLobbyUpdate) networkCallbacks.onLobbyUpdate();
      return;
    }

    // If still in lobby, convert slot to AI
    const leavingIdx = setupPlayers.findIndex(p => p.peerId === conn.peer);
    if (leavingIdx !== -1) {
      setupPlayers[leavingIdx].isAI = true;
      setupPlayers[leavingIdx].isOnlinePeer = false;
      setupPlayers[leavingIdx].peerId = null;
      setupPlayers[leavingIdx].name = `${setupPlayers[leavingIdx].name} (AI)`;
      broadcastToAll({
        type: 'PLAYER_DISCONNECTED',
        playerIdx: leavingIdx,
        setupPlayers,
        lobbyPlayerCount
      });
      logEvent(`⚠️ <strong>${setupPlayers[leavingIdx].name}</strong> disconnected.`);
    }

    updateMultiplayerUI();
    if (networkCallbacks.onLobbyUpdate) networkCallbacks.onLobbyUpdate();
  });
}

export function handleHostReceivedMessage(conn, msg) {
  if (!isValidPacket(msg)) {
    console.warn('[P2P Protocol] Host received invalid packet:', msg);
    return;
  }

  switch (msg.type) {
    case 'CLIENT_UPDATE_PROFILE': {
      let idx = setupPlayers.findIndex(p => p.peerId === conn.peer);
      if (idx === -1 && typeof msg.playerIdx === 'number') {
        idx = msg.playerIdx;
      }
      if (typeof idx === 'number' && idx >= 0 && idx < 6 && setupPlayers[idx]) {
        if (idx >= lobbyPlayerCount) {
          setLobbyPlayerCount(idx + 1);
        }
        const clean = sanitizeProfileUpdate(msg);
        if (clean.name) {
          setupPlayers[idx].name = clean.name;
          if (matchSettings.customPlayers[idx]) matchSettings.customPlayers[idx].name = clean.name;
          if (PLAYER_THEMES[idx]) PLAYER_THEMES[idx].name = clean.name;
          if (gameState && gameState.players && gameState.players[idx]) {
            gameState.players[idx].name = clean.name;
          }
        }
        if (clean.colorHex) {
          setupPlayers[idx].colorHex = clean.colorHex;
          if (clean.charColor) setupPlayers[idx].charColor = clean.charColor;
          if (matchSettings.customPlayers[idx]) {
            matchSettings.customPlayers[idx].colorHex = clean.colorHex;
            if (clean.charColor) matchSettings.customPlayers[idx].charColor = clean.charColor;
          }
          if (PLAYER_THEMES[idx]) {
            PLAYER_THEMES[idx].colorHex = clean.colorHex;
            if (clean.charColor) PLAYER_THEMES[idx].charColor = clean.charColor;
          }
        }
        if (typeof clean.hatStyle === 'number') {
          setupPlayers[idx].hatStyle = clean.hatStyle;
          if (clean.hatColor) setupPlayers[idx].hatColor = clean.hatColor;
          if (matchSettings.customPlayers[idx]) {
            matchSettings.customPlayers[idx].hatStyle = clean.hatStyle;
            if (clean.hatColor) matchSettings.customPlayers[idx].hatColor = clean.hatColor;
          }
          if (PLAYER_THEMES[idx]) {
            PLAYER_THEMES[idx].hatColor = clean.hatColor;
          }
        }
        if (clean.pedestal) {
          setupPlayers[idx].pedestal = clean.pedestal;
          if (matchSettings.customPlayers[idx]) matchSettings.customPlayers[idx].pedestal = clean.pedestal;
        }
        broadcastLobbySettings();
        if (networkCallbacks.onLobbyUpdate) networkCallbacks.onLobbyUpdate();
        if (gameState && gameState.gameStarted) {
          renderCornerHUDs();
          broadcastFullGameState();
        }
      }
      break;
    }

    case 'GUEST_JOIN': {
      // Find an available player slot for the guest (slots 1 to 5)
      let slotIdx = setupPlayers.findIndex((p, idx) => idx > 0 && p.isAI && !p.isOnlinePeer);
      if (slotIdx === -1 && lobbyPlayerCount < 6) {
        // Automatically expand player count if room allows
        slotIdx = lobbyPlayerCount;
        setLobbyPlayerCount(lobbyPlayerCount + 1);
      }

      if (slotIdx !== -1) {
        if (slotIdx >= lobbyPlayerCount) {
          setLobbyPlayerCount(slotIdx + 1);
        }
        setupPlayers[slotIdx].isAI = false;
        setupPlayers[slotIdx].isOnlinePeer = true;
        setupPlayers[slotIdx].peerId = conn.peer;
        const incomingName = (msg.name || '').trim().toUpperCase().slice(0, 14);
        const guestName = (incomingName && incomingName !== 'YOU') ? incomingName : `PLAYER ${slotIdx + 1}`;
        setupPlayers[slotIdx].name = guestName;
        if (msg.archetype !== undefined) {
          setupPlayers[slotIdx].hatStyle = msg.archetype;
          setupPlayers[slotIdx].archetype = msg.archetype;
        }
        if (msg.charColor) {
          const parsedCharColor = typeof msg.charColor === 'string'
            ? parseInt(msg.charColor.replace('#', ''), 16)
            : msg.charColor;
          setupPlayers[slotIdx].charColor = parsedCharColor;
          setupPlayers[slotIdx].colorHex = typeof msg.charColor === 'string'
            ? msg.charColor
            : `#${parsedCharColor.toString(16).padStart(6, '0')}`;
        }

        // Also sync matchSettings.customPlayers and PLAYER_THEMES
        if (matchSettings.customPlayers[slotIdx]) {
          matchSettings.customPlayers[slotIdx].isAI = false;
          matchSettings.customPlayers[slotIdx].name = setupPlayers[slotIdx].name;
          if (msg.archetype !== undefined) matchSettings.customPlayers[slotIdx].hatStyle = msg.archetype;
          if (msg.charColor) {
            matchSettings.customPlayers[slotIdx].colorHex = setupPlayers[slotIdx].colorHex;
            matchSettings.customPlayers[slotIdx].charColor = setupPlayers[slotIdx].charColor;
          }
        }
        if (PLAYER_THEMES[slotIdx]) {
          PLAYER_THEMES[slotIdx].name = setupPlayers[slotIdx].name;
          PLAYER_THEMES[slotIdx].isAI = false;
          if (msg.charColor) {
            PLAYER_THEMES[slotIdx].colorHex = setupPlayers[slotIdx].colorHex;
            PLAYER_THEMES[slotIdx].color = setupPlayers[slotIdx].charColor;
          }
        }

        conn.send({
          type: 'JOIN_ACCEPTED',
          assignedSlot: slotIdx,
          roomCode: networkState.roomCode,
          matchSettings,
          setupPlayers,
          lobbyPlayerCount
        });

        broadcastToAll({
          type: 'LOBBY_STATE',
          matchSettings,
          setupPlayers,
          lobbyPlayerCount
        });

        playSFX('hop');
        logEvent(`👋 <strong>${setupPlayers[slotIdx].name}</strong> joined the room!`);
        if (networkCallbacks.onLobbyUpdate) networkCallbacks.onLobbyUpdate();
      } else {
        conn.send({
          type: 'JOIN_REJECTED',
          reason: 'Room is already full (maximum players reached).'
        });
      }
      break;
    }

    case 'ACTION_ROLL':
    case 'ACTION_BUY_CITY':
    case 'ACTION_BUYOUT_CITY':
    case 'ACTION_UPGRADE_CITY':
    case 'ACTION_PAY_BAIL':
    case 'ACTION_SELL_CITY_FOR_RENT':
    case 'ACTION_SETTLE_RENT':
    case 'ACTION_BANKRUPTCY':
    case 'ACTION_FESTIVAL_BOOST':
    case 'ACTION_AUCTION_BID':
    case 'ACTION_AUCTION_PASS':
    case 'ACTION_TRADE_OFFER':
    case 'ACTION_TRADE_RESPONSE':
    case 'ACTION_WORLD_TOUR':
    case 'ACTION_CHANCE_PRIZE':
    case 'ACTION_MONOPOLY':
    case 'ACTION_END_TURN':
    case 'ACTION_REACTION':
    case 'ACTION_REQUEST_PLAY_AGAIN':
    case 'ACTION_GUEST_LOBBY': {
      // Re-broadcast to all other connected peers
      networkState.connections.forEach((c) => {
        if (c.peer !== conn.peer && c.open) {
          try { c.send(msg); } catch (e) { console.warn('[P2P Relay Error]', e); }
        }
      });
      // Execute locally on Host
      executeIncomingNetworkAction(msg);
      break;
    }

    default:
      break;
  }
}

export function broadcastToAll(msg) {
  if (!networkState.isHost) return;
  networkState.connections.forEach(conn => {
    if (conn.open) {
      try { conn.send(msg); } catch (e) { console.warn('[P2P Send Error]', e); }
    }
  });
}

export function broadcastLobbySettings() {
  if (!networkState.isHost) return;
  broadcastToAll(createSafeLobbyStatePacket(matchSettings, setupPlayers, lobbyPlayerCount));
}

export function broadcastStartOnlineMatch() {
  if (!networkState.isHost) return;
  broadcastToAll({
    type: 'START_MATCH',
    matchSettings,
    setupPlayers,
    lobbyPlayerCount
  });
}

export function broadcastReturnToLobby() {
  if (!networkState.isHost) return;
  broadcastToAll({
    type: 'RETURN_TO_LOBBY',
    matchSettings,
    setupPlayers,
    lobbyPlayerCount
  });
}

export function broadcastFullGameState() {
  if (!networkState.isHost) return;
  broadcastToAll({
    type: 'FULL_STATE_SYNC',
    gameState: {
      currentPlayerIdx: gameState.currentPlayerIdx,
      phase: gameState.phase,
      matchSeconds: gameState.matchSeconds,
      festivalPot: gameState.festivalPot,
      players: gameState.players.map(p => ({
        id: p.id,
        name: p.name,
        cash: p.cash,
        position: p.position,
        bankrupt: Boolean(p.bankrupt),
        inIsland: Boolean(p.inIsland),
        islandTurns: p.islandTurns || 0,
        isAI: Boolean(p.isAI)
      })),
      properties: Object.keys(gameState.properties).reduce((acc, k) => {
        const prop = gameState.properties[k];
        if (prop) {
          acc[k] = {
            owner: prop.owner,
            level: prop.level,
            festival: Boolean(prop.festivalBoost || prop.festival),
            festivalBoost: Boolean(prop.festivalBoost || prop.festival),
            festivalMultiplier: prop.festivalMultiplier || 1
          };
        }
        return acc;
      }, {})
    }
  });
}
