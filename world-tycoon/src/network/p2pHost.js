/**
 * network/p2pHost.js
 * Room hosting, connection acceptance, host message routing, and state broadcasting.
 */

import { gameState, setupPlayers, matchSettings, lobbyPlayerCount, setLobbyPlayerCount, setLocalPlayerIdx, getSavedPlayerName, matchSeconds } from '../game/state.js';
import { logEvent, renderCornerHUDs } from '../ui/hud.js';
import { playSFX } from '../game/audio.js';
import { PLAYER_THEMES } from '../game/data.js';
import { networkState, networkCallbacks, generateRoomCode, formatPeerRoomId, ICE_SERVERS, startHostHeartbeat } from './p2pState.js';
import { updateMultiplayerUI } from './p2pUI.js';
import { executeIncomingNetworkAction } from './p2pActions.js';
import { isValidPacket, sanitizeProfileUpdate, createSafeLobbyStatePacket } from './protocol.js';
import { CANDY_PALETTE, ensureBotsHaveUniqueColors } from '../ui/setup/playerCustomization.js';

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
        iceServers: ICE_SERVERS,
        sdpSemantics: 'unified-plan'
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

      startHostHeartbeat();
      updateMultiplayerUI();
      logEvent(`👑 Room <strong>${code}</strong> created! Share this code with friends.`);
      resolve(code);
    });

    peer.on('disconnected', () => {
      console.warn(`[P2P Host] Signaling connection disconnected for room ${code}. Reconnecting...`);
      if (networkState.isHost && networkState.peer && !networkState.peer.destroyed) {
        try {
          networkState.peer.reconnect();
        } catch (err) {
          console.warn('[P2P Host] Reconnect error:', err);
        }
      }
    });

    peer.on('connection', (conn) => {
      initHostPeerConnection(conn);
    });

    peer.on('error', (err) => {
      console.warn('[P2P Host Error]', err);
      if (err.type === 'unavailable-id' && !customCode) {
        console.warn(`[P2P Host] Room code ${code} was already occupied. Retrying with a new code...`);
        hostRoom(null).then(resolve).catch(reject);
        return;
      }
      networkState.status = 'error';
      networkState.statusText = err.type === 'unavailable-id'
        ? `Room code ${code} is currently in use. Please try again.`
        : 'Room creation failed.';
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
    if (gameState.gameStarted) {
      setTimeout(() => {
        broadcastFullGameState();
        logEvent('🎉 <strong>Guest reconnected!</strong> Synchronized match state.');
      }, 300);
    }
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
        if (typeof window !== 'undefined' && typeof window.getActiveIncomingTradeProposal === 'function') {
          const prop = window.getActiveIncomingTradeProposal();
          if (prop && (prop.proposerIdx === targetIdx || prop.targetIdx === targetIdx)) {
            if (typeof window.closeIncomingTradeModal === 'function') {
              window.closeIncomingTradeModal(true);
            }
          }
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
      if (matchSettings.customPlayers[leavingIdx]) {
        matchSettings.customPlayers[leavingIdx].isAI = true;
        matchSettings.customPlayers[leavingIdx].isOnlinePeer = false;
        matchSettings.customPlayers[leavingIdx].name = setupPlayers[leavingIdx].name;
      }
      if (PLAYER_THEMES[leavingIdx]) {
        PLAYER_THEMES[leavingIdx].isAI = true;
        PLAYER_THEMES[leavingIdx].name = setupPlayers[leavingIdx].name;
      }
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
          ensureBotsHaveUniqueColors();
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
        if (clean.buildingSkin) {
          setupPlayers[idx].buildingSkin = clean.buildingSkin;
          if (matchSettings.customPlayers[idx]) matchSettings.customPlayers[idx].buildingSkin = clean.buildingSkin;
        }
        if (clean.diceTrail) {
          setupPlayers[idx].diceTrail = clean.diceTrail;
          if (matchSettings.customPlayers[idx]) matchSettings.customPlayers[idx].diceTrail = clean.diceTrail;
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
        
        // Preserve guest's pre-selected appearance from their side
        const guestHatStyle = msg.hatStyle !== undefined ? msg.hatStyle : (msg.archetype !== undefined ? msg.archetype : 0);
        setupPlayers[slotIdx].hatStyle = guestHatStyle;
        setupPlayers[slotIdx].archetype = guestHatStyle;
        if (msg.hatColor) setupPlayers[slotIdx].hatColor = msg.hatColor;
        if (msg.pedestal) setupPlayers[slotIdx].pedestal = msg.pedestal;

        let guestColorHex = msg.colorHex || (typeof msg.charColor === 'string' ? msg.charColor : null);
        let guestCharColor = typeof msg.charColor === 'number' ? msg.charColor : null;
        if (guestColorHex && !guestCharColor) {
          guestCharColor = parseInt(guestColorHex.replace('#', ''), 16);
        }
        if (!guestColorHex && guestCharColor) {
          guestColorHex = `#${guestCharColor.toString(16).padStart(6, '0')}`;
        }
        if (!guestColorHex) {
          guestColorHex = '#3b82f6';
          guestCharColor = 0x3b82f6;
        }

        // Avoid color conflicts with already taken slots (e.g. host slot 0)
        const usedColors = setupPlayers
          .slice(0, slotIdx)
          .map(p => (p.colorHex || '').toLowerCase());
        if (usedColors.includes(guestColorHex.toLowerCase())) {
          const free = CANDY_PALETTE.find(c => !usedColors.includes(c.hex.toLowerCase()));
          if (free) {
            guestColorHex = free.hex;
            guestCharColor = free.charColor;
          }
        }

        setupPlayers[slotIdx].colorHex = guestColorHex;
        setupPlayers[slotIdx].charColor = guestCharColor;

        // Also sync matchSettings.customPlayers and PLAYER_THEMES
        if (matchSettings.customPlayers[slotIdx]) {
          matchSettings.customPlayers[slotIdx].isAI = false;
          matchSettings.customPlayers[slotIdx].isOnlinePeer = true;
          matchSettings.customPlayers[slotIdx].name = setupPlayers[slotIdx].name;
          matchSettings.customPlayers[slotIdx].hatStyle = guestHatStyle;
          if (msg.hatColor) matchSettings.customPlayers[slotIdx].hatColor = msg.hatColor;
          matchSettings.customPlayers[slotIdx].colorHex = guestColorHex;
          matchSettings.customPlayers[slotIdx].charColor = guestCharColor;
          if (msg.pedestal) matchSettings.customPlayers[slotIdx].pedestal = msg.pedestal;
        }
        if (PLAYER_THEMES[slotIdx]) {
          PLAYER_THEMES[slotIdx].name = setupPlayers[slotIdx].name;
          PLAYER_THEMES[slotIdx].isAI = false;
          if (msg.hatColor) PLAYER_THEMES[slotIdx].hatColor = msg.hatColor;
          PLAYER_THEMES[slotIdx].colorHex = guestColorHex;
          PLAYER_THEMES[slotIdx].charColor = guestCharColor;
          PLAYER_THEMES[slotIdx].color = guestCharColor;
        }

        // Reassign any remaining bots with conflicting colors to random unused colors
        ensureBotsHaveUniqueColors();

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
    case 'ACTION_DOUBLES_ROLL':
    case 'ACTION_BUY_CITY':
    case 'ACTION_PASS_BUY_CITY':
    case 'ACTION_BUYOUT_CITY':
    case 'ACTION_PASS_BUYOUT':
    case 'ACTION_UPGRADE_CITY':
    case 'ACTION_DOWNGRADE_CITY':
    case 'ACTION_END_UPGRADE':
    case 'ACTION_PAY_BAIL':
    case 'ACTION_RENT_DEBT':
    case 'ACTION_SELL_CITY_FOR_RENT':
    case 'ACTION_SETTLE_RENT':
    case 'ACTION_BANKRUPTCY':
    case 'ACTION_FESTIVAL_BOOST':
    case 'ACTION_AUCTION_START':
    case 'ACTION_AUCTION_BID':
    case 'ACTION_AUCTION_PASS':
    case 'ACTION_AUCTION_CONCLUDE':
    case 'ACTION_TRADE_OFFER':
    case 'ACTION_TRADE_RESPONSE':
    case 'ACTION_WORLD_TOUR':
    case 'ACTION_CHANCE_PRIZE':
    case 'ACTION_CHANCE_SPIN':
    case 'ACTION_MONOPOLY':
    case 'ACTION_MONOPOLY_THREAT':
    case 'ACTION_SYNC_BOARD_EDITION':
    case 'ACTION_END_TURN':
    case 'ACTION_REACTION':
    case 'ACTION_CHAT_EMOTE':
    case 'ACTION_REQUEST_PLAY_AGAIN':
    case 'ACTION_TEAM_BAILOUT':
    case 'ACTION_GUEST_LOBBY': {
      networkState.connections.forEach((c) => {
        if (c.peer !== conn.peer && c.open) {
          try { c.send(msg); } catch (e) { console.warn('[P2P Relay Error]', e); }
        }
      });
      executeIncomingNetworkAction(msg);
      if (msg.type === 'ACTION_TRADE_RESPONSE' && msg.accepted) {
        broadcastFullGameState();
      }
      break;
    }
    case 'ACTION_GUEST_TEAM_SELECT': {
      if (typeof msg.playerIdx === 'number' && typeof msg.teamId === 'number') {
        const teamHex = msg.teamId === 0 ? '#ef4444' : '#3b82f6';
        const teamChar = msg.teamId === 0 ? 0xef4444 : 0x3b82f6;
        if (setupPlayers[msg.playerIdx]) {
          setupPlayers[msg.playerIdx].teamId = msg.teamId;
          setupPlayers[msg.playerIdx].colorHex = teamHex;
          setupPlayers[msg.playerIdx].charColor = teamChar;
        }
        if (matchSettings.customPlayers[msg.playerIdx]) {
          matchSettings.customPlayers[msg.playerIdx].teamId = msg.teamId;
          matchSettings.customPlayers[msg.playerIdx].colorHex = teamHex;
          matchSettings.customPlayers[msg.playerIdx].charColor = teamChar;
        }
        if (PLAYER_THEMES[msg.playerIdx]) {
          PLAYER_THEMES[msg.playerIdx].colorHex = teamHex;
          PLAYER_THEMES[msg.playerIdx].charColor = teamChar;
        }
        if (typeof window !== 'undefined' && typeof window.renderPlayerCards === 'function') {
          window.renderPlayerCards();
        }
        broadcastLobbySettings();
      }
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

let fullStateSeq = 0;

export function broadcastFullGameState() {
  if (!networkState.isHost) return;
  broadcastToAll({
    type: 'FULL_STATE_SYNC',
    stateSeq: ++fullStateSeq,
    timestamp: Date.now(),
    gameState: {
      currentPlayerIdx: gameState.currentPlayerIdx,
      phase: gameState.phase,
      doublesCount: gameState.doublesCount || 0,
      turnTimeLeft: gameState.turnTimeLeft || 15,
      matchSeconds: typeof matchSeconds === 'number' ? matchSeconds : (gameState.matchSeconds || 0),
      festivalPot: gameState.festivalPot,
      auction: (gameState.auction && gameState.auction.active && gameState.auction.tile) ? {
        active: true,
        tileId: gameState.auction.tile.id,
        sellerIdx: gameState.auction.sellerIdx,
        currentBid: gameState.auction.currentBid,
        hasBids: gameState.auction.hasBids,
        highBidderIdx: gameState.auction.highBidderIdx,
        isDoubles: Boolean(gameState.auction.isDoubles),
        increments: gameState.auction.increments,
        secondsLeft: gameState.auction.secondsLeft,
        passedPlayerIndices: Array.from(gameState.auction.passedPlayerIndices || [])
      } : null,
      auctionQueueMeta: gameState.auctionQueueMeta ? {
        sellerIdx: gameState.auctionQueueMeta.sellerIdx,
        isDoubles: Boolean(gameState.auctionQueueMeta.isDoubles),
        totalCount: gameState.auctionQueueMeta.totalCount
      } : null,
      pendingAuctionsCount: gameState.pendingAuctions ? gameState.pendingAuctions.length : 0,
      players: gameState.players.map((p, idx) => ({
        id: p.id,
        name: p.name,
        cash: p.cash,
        position: p.position,
        bankrupt: Boolean(p.bankrupt),
        inIsland: Boolean(p.inIsland),
        islandTurns: p.islandTurns || 0,
        isAI: Boolean(p.isAI),
        teamId: typeof p.teamId === 'number' ? p.teamId : (idx % 2)
      })),
      properties: Object.keys(gameState.properties).reduce((acc, k) => {
        const prop = gameState.properties[k];
        if (prop) {
          acc[k] = {
            owner: prop.owner,
            level: prop.level,
            festival: Boolean(prop.festivalBoost || prop.festival),
            festivalBoost: Boolean(prop.festivalBoost || prop.festival),
            festivalMultiplier: prop.festivalMultiplier || 1,
            takeoverCount: Number(prop.takeoverCount || 0)
          };
        }
        return acc;
      }, {})
    }
  });
}
