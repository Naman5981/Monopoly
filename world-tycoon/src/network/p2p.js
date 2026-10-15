/**
 * network/p2p.js
 * Serverless Peer-to-Peer Multiplayer using WebRTC & PeerJS.
 * One player acts as Room Host, and friends connect directly via WebRTC DataChannels.
 */

import { gameState, setupPlayers, matchSettings, lobbyPlayerCount, setLobbyPlayerCount } from '../game/state.js';
import { logEvent } from '../ui/hud.js';
import { playSFX } from '../game/audio.js';
import { spawnAnimatedReaction, stopVictoryCelebration } from '../three/effects.js';

// Network state
export const networkState = {
  isMultiplayer: false,
  isHost: false,
  localPlayerIdx: 0,
  roomCode: '',
  peerId: '',
  peer: null,
  connections: new Map(), // For host: peerId -> conn
  hostConn: null,         // For guest: conn to host
  connectedPeersCount: 0,
  status: 'offline',      // 'offline' | 'connecting' | 'hosting' | 'connected' | 'error'
  statusText: ''
};

// Handlers registered by game engine
let networkCallbacks = {
  onLobbyUpdate: () => {},
  onStartGame: () => {},
  onDiceRoll: () => {},
  onBuyCity: () => {},
  onUpgradeCity: () => {},
  onMortgageCity: () => {},
  onAuctionAction: () => {},
  onTradeAction: () => {},
  onReaction: () => {},
  onWorldTour: () => {},
  onChancePrize: () => {},
  onMonopoly: () => {},
  onEndTurn: () => {},
  onSyncState: () => {}
};

export function registerNetworkCallbacks(cbs) {
  networkCallbacks = { ...networkCallbacks, ...cbs };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function generateRoomCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let res = '';
  for (let i = 0; i < 4; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export function formatPeerRoomId(code) {
  return `worldtycoon-v1-${code.toUpperCase().trim()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Host Room
// ─────────────────────────────────────────────────────────────────────────────
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
    networkState.statusText = 'Initializing WebRTC host...';
    networkState.roomCode = code;
    networkState.isHost = true;
    networkState.isMultiplayer = true;
    networkState.localPlayerIdx = 0;
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

    peer.on('open', (id) => {
      networkState.peer = peer;
      networkState.peerId = id;
      networkState.status = 'hosting';
      networkState.statusText = `Hosting Room: ${code}`;
      networkState.connectedPeersCount = 1;

      // Ensure Player 0 is marked as Human (Host)
      if (setupPlayers[0]) {
        setupPlayers[0].isAI = false;
        setupPlayers[0].isOnlinePeer = false;
      }

      playSFX('pop');
      updateMultiplayerUI();
      resolve(code);
    });

    peer.on('connection', (conn) => {
      handleIncomingGuestConnection(conn);
    });

    peer.on('error', (err) => {
      console.warn('[P2P Host Error]', err);
      if (err.type === 'unavailable-id') {
        // If code collision, try another random code
        if (!customCode) {
          hostRoom().then(resolve).catch(reject);
          return;
        }
      }
      networkState.status = 'error';
      networkState.statusText = err.message || 'Host error occurred';
      updateMultiplayerUI();
      reject(err);
    });
  });
}

function handleIncomingGuestConnection(conn) {
  conn.on('open', () => {
    networkState.connections.set(conn.peer, conn);
    networkState.connectedPeersCount = networkState.connections.size + 1;
    updateMultiplayerUI();

    // Send current lobby state to the new guest
    conn.send({
      type: 'LOBBY_STATE',
      roomCode: networkState.roomCode,
      matchSettings,
      setupPlayers,
      lobbyPlayerCount
    });
  });

  conn.on('data', (data) => {
    handleHostReceivedMessage(conn, data);
  });

  conn.on('close', () => {
    networkState.connections.delete(conn.peer);
    networkState.connectedPeersCount = networkState.connections.size + 1;

    if (gameState.gameStarted && networkState.isMultiplayer) {
      const leavingIdx = setupPlayers.findIndex(p => p.peerId === conn.peer);
      const name = leavingIdx !== -1 ? setupPlayers[leavingIdx].name : 'A player';
      broadcastToAll({
        type: 'MATCH_DISCONNECTED_TO_LOBBY',
        reason: `${name} disconnected from the match.`
      });
      handleMatchDisconnectReturnToLobby(`${name} disconnected from the match.`);
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

function handleHostReceivedMessage(conn, msg) {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'GUEST_JOIN': {
      // Find an available player slot for the guest (slot 1, 2, or 3)
      let slotIdx = setupPlayers.findIndex((p, idx) => idx > 0 && p.isAI && !p.isOnlinePeer);
      if (slotIdx === -1 && lobbyPlayerCount < 4) {
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
        if (msg.name) setupPlayers[slotIdx].name = msg.name.trim();
        if (msg.archetype !== undefined) setupPlayers[slotIdx].archetype = msg.archetype;
        if (msg.charColor) setupPlayers[slotIdx].charColor = msg.charColor;

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
    case 'ACTION_UPGRADE_CITY':
    case 'ACTION_MORTGAGE_CITY':
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
      // Relay action to all peers and execute locally
      broadcastToAll(msg);
      executeIncomingNetworkAction(msg);
      break;
    }

    default:
      break;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Join Room (Guest)
// ─────────────────────────────────────────────────────────────────────────────
export function joinRoom(roomCode, guestInfo = {}) {
  return new Promise((resolve, reject) => {
    if (typeof Peer === 'undefined') {
      reject(new Error('PeerJS library is not loaded. Please check your internet connection.'));
      return;
    }

    if (networkState.peer) {
      try { networkState.peer.destroy(); } catch (_) {}
    }

    const cleanCode = roomCode.toUpperCase().trim().replace(/^TYCOON-/, '').replace(/^ROOM-/, '');
    const hostPeerId = formatPeerRoomId(cleanCode);

    networkState.status = 'connecting';
    networkState.statusText = `Connecting to Room ${cleanCode}...`;
    networkState.roomCode = cleanCode;
    networkState.isHost = false;
    networkState.isMultiplayer = true;
    updateMultiplayerUI();

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

    peer.on('open', (myId) => {
      networkState.peer = peer;
      networkState.peerId = myId;

      const conn = peer.connect(hostPeerId, { reliable: true });

      conn.on('open', () => {
        networkState.hostConn = conn;
        networkState.status = 'connected';
        networkState.statusText = `Connected to Room ${cleanCode}`;

        // Send join request
        conn.send({
          type: 'GUEST_JOIN',
          name: guestInfo.name || 'Tycoon Friend',
          archetype: guestInfo.archetype || 'gentleman',
          charColor: guestInfo.charColor || '#3b82f6'
        });

        playSFX('hop');
        updateMultiplayerUI();
        resolve(cleanCode);
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

function handleGuestReceivedMessage(msg) {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'JOIN_ACCEPTED': {
      networkState.localPlayerIdx = msg.assignedSlot;
      if (msg.lobbyPlayerCount) setLobbyPlayerCount(msg.lobbyPlayerCount);
      if (msg.matchSettings) Object.assign(matchSettings, msg.matchSettings);
      if (msg.setupPlayers) {
        setupPlayers.splice(0, setupPlayers.length, ...msg.setupPlayers);
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
      if (msg.matchSettings) Object.assign(matchSettings, msg.matchSettings);
      if (msg.setupPlayers) {
        setupPlayers.splice(0, setupPlayers.length, ...msg.setupPlayers);
      }
      updateMultiplayerUI();
      if (networkCallbacks.onLobbyUpdate) networkCallbacks.onLobbyUpdate();
      break;
    }

    case 'RETURN_TO_LOBBY': {
      if (window.terminateMatchAndReturnToLobby) {
        window.terminateMatchAndReturnToLobby();
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
      if (msg.matchSettings) Object.assign(matchSettings, msg.matchSettings);
      if (msg.setupPlayers) {
        setupPlayers.splice(0, setupPlayers.length, ...msg.setupPlayers);
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
      if (msg.matchSettings) Object.assign(matchSettings, msg.matchSettings);
      if (msg.setupPlayers) {
        setupPlayers.splice(0, setupPlayers.length, ...msg.setupPlayers);
      }
      if (networkCallbacks.onStartGame) {
        networkCallbacks.onStartGame();
      }
      break;
    }

    case 'ACTION_ROLL':
    case 'ACTION_BUY_CITY':
    case 'ACTION_UPGRADE_CITY':
    case 'ACTION_MORTGAGE_CITY':
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

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast & Send Outgoing Actions
// ─────────────────────────────────────────────────────────────────────────────
export function broadcastAction(actionType, payload = {}) {
  const msg = {
    type: actionType,
    senderIdx: networkState.localPlayerIdx,
    timestamp: Date.now(),
    ...payload
  };

  if (!networkState.isMultiplayer) return;

  if (networkState.isHost) {
    broadcastToAll(msg);
  } else if (networkState.hostConn && networkState.hostConn.open) {
    networkState.hostConn.send(msg);
  }
}

function broadcastToAll(msg) {
  if (!networkState.isHost) return;
  networkState.connections.forEach(conn => {
    if (conn.open) {
      try { conn.send(msg); } catch (e) { console.warn('[P2P Send Error]', e); }
    }
  });
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
      players: gameState.players,
      properties: gameState.properties
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Execute Incoming Action
// ─────────────────────────────────────────────────────────────────────────────
function executeIncomingNetworkAction(msg) {
  // If we were the sender, we already initiated this locally
  if (msg.senderIdx === networkState.localPlayerIdx) return;

  switch (msg.type) {
    case 'ACTION_ROLL':
      if (networkCallbacks.onDiceRoll) {
        networkCallbacks.onDiceRoll(msg.playerIdx, msg.d1, msg.d2, msg.total, msg.isDoubles);
      }
      break;

    case 'ACTION_BUY_CITY':
      if (networkCallbacks.onBuyCity) {
        networkCallbacks.onBuyCity(msg.playerIdx, msg.tileId);
      }
      break;

    case 'ACTION_UPGRADE_CITY':
      if (networkCallbacks.onUpgradeCity) {
        networkCallbacks.onUpgradeCity(msg.playerIdx, msg.tileId);
      }
      break;

    case 'ACTION_MORTGAGE_CITY':
      if (networkCallbacks.onMortgageCity) {
        networkCallbacks.onMortgageCity(msg.playerIdx, msg.tileId, msg.mortgaged);
      }
      break;

    case 'ACTION_AUCTION_BID':
    case 'ACTION_AUCTION_PASS':
      if (networkCallbacks.onAuctionAction) {
        networkCallbacks.onAuctionAction(msg);
      }
      break;

    case 'ACTION_TRADE_OFFER':
    case 'ACTION_TRADE_RESPONSE':
      if (networkCallbacks.onTradeAction) {
        networkCallbacks.onTradeAction(msg);
      }
      break;

    case 'ACTION_WORLD_TOUR':
      if (networkCallbacks.onWorldTour) {
        networkCallbacks.onWorldTour(msg.playerIdx, msg.destTileId);
      }
      break;

    case 'ACTION_CHANCE_PRIZE':
      if (networkCallbacks.onChancePrize) {
        networkCallbacks.onChancePrize(msg.playerIdx, msg.prize, msg.isDoubles);
      }
      break;

    case 'ACTION_MONOPOLY':
      if (networkCallbacks.onMonopoly) {
        networkCallbacks.onMonopoly(msg.playerIdx, msg.groupKey);
      }
      break;

    case 'ACTION_REACTION':
      if (msg.reactionType) {
        spawnAnimatedReaction(msg.reactionType);
        playSFX('pop');
      }
      break;

    case 'ACTION_END_TURN':
      if (networkCallbacks.onEndTurn) {
        networkCallbacks.onEndTurn(msg.nextPlayerIdx);
      }
      break;

    case 'ACTION_REQUEST_PLAY_AGAIN': {
      const pName = msg.playerName || setupPlayers[msg.senderIdx]?.name || 'Tycoon Friend';
      logEvent(`🔔 <strong>${pName}</strong> wants to Play Again!`);
      const statusEl = document.getElementById('victory-multiplayer-status');
      if (statusEl) {
        statusEl.innerHTML = `🔔 <strong>${pName}</strong> wants to Play Again! Click <strong>PLAY AGAIN</strong> to start.`;
        statusEl.classList.remove('hidden');
      }
      const playBtn = document.getElementById('btn-victory-play-again');
      if (playBtn) {
        playBtn.classList.add('ring-4', 'ring-amber-300', 'animate-pulse');
        setTimeout(() => playBtn.classList.remove('ring-4', 'ring-amber-300', 'animate-pulse'), 5000);
      }
      playSFX('hop');
      break;
    }

    case 'ACTION_GUEST_LOBBY': {
      const pName = setupPlayers[msg.senderIdx]?.name || 'A player';
      logEvent(`🚪 <strong>${pName}</strong> returned to the lobby.`);
      break;
    }

    default:
      break;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI Integration & Helpers
// ─────────────────────────────────────────────────────────────────────────────
export function leaveMultiplayerRoom() {
  if (networkState.peer) {
    try { networkState.peer.destroy(); } catch (_) {}
  }
  networkState.isMultiplayer = false;
  networkState.isHost = false;
  networkState.localPlayerIdx = 0;
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

  // Close any active modals
  ['modal-tile-inspector', 'modal-buy-city', 'modal-trade', 'modal-portfolio', 'modal-monopoly-celebration', 'modal-rules'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  });

  // Open setup / landing screen
  const landing = document.getElementById('landing-setup-screen');
  if (landing) {
    landing.classList.remove('hidden');
    landing.style.display = 'flex';
    landing.style.opacity = '1';
    landing.style.transform = 'scale(1) translateY(0)';
  }
}

export function copyRoomInviteLink() {
  const url = `${window.location.origin}${window.location.pathname}?room=${networkState.roomCode}`;
  navigator.clipboard.writeText(url).then(() => {
    playSFX('hop');
    alert(`Room Link Copied to Clipboard!\n\n${url}\n\nShare this link with your friends to join directly!`);
  }).catch(() => {
    alert(`Room Code: ${networkState.roomCode}\n\nShare this code with your friends!`);
  });
}

export function copyRoomCodeOnly() {
  navigator.clipboard.writeText(networkState.roomCode).then(() => {
    playSFX('hop');
    alert(`Room Code "${networkState.roomCode}" copied to clipboard!`);
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

  // Update setup lobby indicators
  const setupRoomBadge = document.getElementById('setup-p2p-badge');
  const setupRoomCodeEl = document.getElementById('setup-p2p-code-text');
  const setupStatusEl = document.getElementById('setup-p2p-status-text');

  if (setupRoomBadge && setupRoomCodeEl) {
    if (networkState.isMultiplayer) {
      setupRoomBadge.classList.remove('hidden');
      setupRoomBadge.classList.add('flex');
      setupRoomCodeEl.textContent = networkState.roomCode;
      if (setupStatusEl) setupStatusEl.textContent = networkState.statusText;
    } else {
      setupRoomBadge.classList.add('hidden');
      setupRoomBadge.classList.remove('flex');
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
      landingPlayBtn.innerHTML = '<i class="fa-solid fa-play text-xl mr-2"></i> PLAY';
      landingPlayBtn.classList.remove('game-btn-blue', 'opacity-85');
      landingPlayBtn.classList.add('game-btn-green');
    }
  }
}
