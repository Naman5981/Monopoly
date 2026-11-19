/**
 * test/multiplayer/p2pHostGuestSync.test.js
 * Unit tests for Host-Guest synchronization, connection lifecycle, and state consistency.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import {
  handleHostReceivedMessage,
  broadcastFullGameState,
  broadcastLobbySettings,
  broadcastReturnToLobby
} from '../../src/network/p2pHost.js';
import { handleGuestReceivedMessage } from '../../src/network/p2pGuest.js';
import { networkState, networkCallbacks, registerNetworkCallbacks } from '../../src/network/p2pState.js';
import { gameState, setupPlayers, matchSettings, lobbyPlayerCount, setLobbyPlayerCount, setLocalPlayerIdx } from '../../src/game/state.js';
import { PLAYER_THEMES } from '../../src/game/data.js';

describe('P2P Host-Guest Lifecycle & State Sync', () => {
  beforeEach(() => {
    networkState.isMultiplayer = true;
    networkState.isHost = true;
    networkState.localPlayerIdx = 0;
    networkState.connections.clear();
    networkState.hostConn = null;
    networkState.roomCode = 'TEST';

    setLobbyPlayerCount(4);
    setLocalPlayerIdx(0);

    // Reset setupPlayers
    setupPlayers.splice(0, setupPlayers.length,
      { name: 'HOST', isAI: false, isOnlinePeer: false, peerId: null, charColor: 0x3b82f6, colorHex: '#3b82f6', hatStyle: 0 },
      { name: 'BOT 1', isAI: true, isOnlinePeer: false, peerId: null, charColor: 0xef4444, colorHex: '#ef4444', hatStyle: 1 },
      { name: 'BOT 2', isAI: true, isOnlinePeer: false, peerId: null, charColor: 0x10b981, colorHex: '#10b981', hatStyle: 2 },
      { name: 'BOT 3', isAI: true, isOnlinePeer: false, peerId: null, charColor: 0xf59e0b, colorHex: '#f59e0b', hatStyle: 3 }
    );

    matchSettings.customPlayers = setupPlayers.map(p => ({ ...p }));

    gameState.gameStarted = true;
    gameState.phase = 'TURN_START';
    gameState.currentPlayerIdx = 0;
    gameState.festivalPot = 500000;
    gameState.players = [
      { id: 0, name: 'HOST', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false },
      { id: 1, name: 'BOT 1', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: true },
      { id: 2, name: 'BOT 2', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: true },
      { id: 3, name: 'BOT 3', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: true }
    ];
    gameState.properties = {
      1: { owner: 0, level: 2, festivalBoost: true, festivalMultiplier: 2 },
      2: { owner: null, level: 0, festivalBoost: false, festivalMultiplier: 1 }
    };
  });

  describe('Host GUEST_JOIN handling', () => {
    it('accepts incoming guest, assigns slot 1, parses color and theme', () => {
      let sentToGuest = null;
      const mockConn = {
        peer: 'guest-peer-123',
        send: (msg) => { sentToGuest = msg; }
      };

      handleHostReceivedMessage(mockConn, {
        type: 'GUEST_JOIN',
        name: 'GuestRacer',
        charColor: '#8b5cf6',
        archetype: 4
      });

      assert.notEqual(sentToGuest, null);
      assert.equal(sentToGuest.type, 'JOIN_ACCEPTED');
      assert.equal(sentToGuest.assignedSlot, 1);
      assert.equal(sentToGuest.roomCode, 'TEST');

      // Verify slot 1 in setupPlayers was claimed
      assert.equal(setupPlayers[1].name, 'GUESTRACER');
      assert.equal(setupPlayers[1].isAI, false);
      assert.equal(setupPlayers[1].isOnlinePeer, true);
      assert.equal(setupPlayers[1].peerId, 'guest-peer-123');
      assert.equal(setupPlayers[1].colorHex, '#8b5cf6');
      assert.equal(setupPlayers[1].charColor, 0x8b5cf6);
      assert.equal(setupPlayers[1].hatStyle, 4);

      // Verify customPlayers and PLAYER_THEMES sync
      assert.equal(matchSettings.customPlayers[1].name, 'GUESTRACER');
      assert.equal(matchSettings.customPlayers[1].isAI, false);
      assert.equal(matchSettings.customPlayers[1].colorHex, '#8b5cf6');
      assert.equal(PLAYER_THEMES[1].name, 'GUESTRACER');
      assert.equal(PLAYER_THEMES[1].isAI, false);
      assert.equal(PLAYER_THEMES[1].color, 0x8b5cf6);
    });

    it('rejects guest when all slots are occupied by online peers', () => {
      // Fill all slots
      setupPlayers.forEach((p, idx) => {
        p.isAI = false;
        p.isOnlinePeer = true;
      });
      setLobbyPlayerCount(4);

      let sentToGuest = null;
      const mockConn = {
        peer: 'late-guest-999',
        send: (msg) => { sentToGuest = msg; }
      };

      // Increase to max 6 occupied slots
      while (setupPlayers.length < 6) {
        setupPlayers.push({
          name: `P${setupPlayers.length}`,
          isAI: false,
          isOnlinePeer: true,
          peerId: 'peer-' + setupPlayers.length
        });
      }
      setLobbyPlayerCount(6);

      handleHostReceivedMessage(mockConn, {
        type: 'GUEST_JOIN',
        name: 'LatePlayer'
      });

      assert.notEqual(sentToGuest, null);
      assert.equal(sentToGuest.type, 'JOIN_REJECTED');
      assert.equal(sentToGuest.reason, 'Room is already full (maximum players reached).');
    });
  });

  describe('Host CLIENT_UPDATE_PROFILE', () => {
    it('sanitizes profile update and syncs customPlayers and PLAYER_THEMES', () => {
      setupPlayers[1].isOnlinePeer = true;
      setupPlayers[1].peerId = 'guest-1';

      const mockConn = { peer: 'guest-1', send: () => {} };

      handleHostReceivedMessage(mockConn, {
        type: 'CLIENT_UPDATE_PROFILE',
        senderIdx: 1,
        name: 'super star tycoon',
        colorHex: '#10B981',
        hatStyle: 3
      });

      assert.equal(setupPlayers[1].name, 'SUPER STAR TYC'); // clamped to 14
      assert.equal(setupPlayers[1].colorHex, '#10b981');
      assert.equal(setupPlayers[1].charColor, 0x10b981);
      assert.equal(setupPlayers[1].hatStyle, 3);
      assert.equal(matchSettings.customPlayers[1].name, 'SUPER STAR TYC');
      assert.equal(PLAYER_THEMES[1].name, 'SUPER STAR TYC');
    });
  });

  describe('broadcastFullGameState & Guest FULL_STATE_SYNC', () => {
    it('preserves festivalBoost and player states during broadcast and guest sync', () => {
      networkState.isHost = true;
      let broadcastedPayload = null;
      networkState.connections.set('guest-conn', {
        open: true,
        send: (msg) => { broadcastedPayload = msg; }
      });

      // Property 1 has festivalBoost = true
      gameState.properties[1].festivalBoost = true;
      gameState.doublesCount = 1;
      gameState.turnTimeLeft = 14;
      broadcastFullGameState();

      assert.notEqual(broadcastedPayload, null);
      assert.equal(broadcastedPayload.type, 'FULL_STATE_SYNC');
      assert.equal(broadcastedPayload.gameState.properties['1'].festivalBoost, true);
      assert.equal(broadcastedPayload.gameState.properties['1'].festival, true);
      assert.equal(broadcastedPayload.gameState.doublesCount, 1);
      assert.equal(broadcastedPayload.gameState.turnTimeLeft, 14);

      // Now test Guest receiving this FULL_STATE_SYNC
      networkState.isHost = false;
      networkState.localPlayerIdx = 1;

      // Guest starts with festivalBoost = false and different cash/phase
      const guestGameState = {
        currentPlayerIdx: 0,
        phase: 'DICE_ROLLING',
        festivalPot: 0,
        players: [
          { id: 0, name: 'HOST', cash: 1000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false },
          { id: 1, name: 'GUEST', cash: 1000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false }
        ],
        properties: {
          1: { owner: 0, level: 2, festivalBoost: false },
          2: { owner: null, level: 0, festivalBoost: false }
        }
      };

      let syncedState = null;
      registerNetworkCallbacks({
        onSyncState: (incoming) => {
          syncedState = incoming;
          // Mimic engine.js onSyncState behavior
          if (incoming.phase && guestGameState.phase !== 'SETUP' && guestGameState.phase !== 'VICTORY') {
            guestGameState.phase = incoming.phase;
          }
          if (incoming.properties) {
            Object.keys(incoming.properties).forEach(id => {
              const src = incoming.properties[id];
              guestGameState.properties[id].festivalBoost = Boolean(src.festivalBoost || src.festival);
            });
          }
          if (incoming.players) {
            incoming.players.forEach((srcP, idx) => {
              if (guestGameState.players[idx]) {
                guestGameState.players[idx].cash = srcP.cash;
              }
            });
          }
        }
      });

      handleGuestReceivedMessage(broadcastedPayload);

      assert.notEqual(syncedState, null);
      assert.equal(guestGameState.properties['1'].festivalBoost, true);
      assert.equal(guestGameState.phase, 'TURN_START');
      assert.equal(guestGameState.players[0].cash, 2000000);
    });
  });

  describe('RETURN_TO_LOBBY remote guard', () => {
    it('calls terminateMatchAndReturnToLobby with remote=true without echoing ACTION_GUEST_LOBBY', () => {
      networkState.isHost = false;
      networkState.localPlayerIdx = 1;

      let guestLobbyEchoed = false;
      networkState.hostConn = {
        open: true,
        send: (msg) => {
          if (msg.type === 'ACTION_GUEST_LOBBY') guestLobbyEchoed = true;
        }
      };

      let terminateArgs = [];
      globalThis.window.terminateMatchAndReturnToLobby = (isRemote) => {
        terminateArgs.push(isRemote);
      };

      handleGuestReceivedMessage({
        type: 'RETURN_TO_LOBBY',
        lobbyPlayerCount: 4,
        matchSettings,
        setupPlayers
      });

      assert.equal(terminateArgs.length, 1);
      assert.equal(terminateArgs[0], true, 'Expected isRemote=true to prevent echo loop');
      assert.equal(guestLobbyEchoed, false, 'Guest should NOT echo ACTION_GUEST_LOBBY back to Host');
    });
  });

  describe('World Tour & Chance Multiplayer Relay (/bug-hunter)', () => {
    it('relays ACTION_WORLD_TOUR from guest to other peers and updates player position on host', () => {
      let relayedMsg = null;
      let executedWorldTour = null;

      const mockGuest1 = {
        peer: 'guest-1',
        open: true,
        send: () => {}
      };
      const mockGuest2 = {
        peer: 'guest-2',
        open: true,
        send: (msg) => { relayedMsg = msg; }
      };

      networkState.connections.set('guest-1', mockGuest1);
      networkState.connections.set('guest-2', mockGuest2);

      // Player 1 (guest) is on World Tour (Tile 24)
      gameState.players[1].position = 24;

      registerNetworkCallbacks({
        onWorldTour: (playerIdx, destTileId) => {
          executedWorldTour = { playerIdx, destTileId };
          gameState.players[playerIdx].position = destTileId;
        }
      });

      // Guest 1 sends ACTION_WORLD_TOUR flying to Mumbai (Tile 3)
      handleHostReceivedMessage(mockGuest1, {
        type: 'ACTION_WORLD_TOUR',
        senderIdx: 1,
        playerIdx: 1,
        destTileId: 3
      });

      // 1. Must be relayed to Guest 2
      assert.notEqual(relayedMsg, null, 'Host must relay ACTION_WORLD_TOUR to other connected peers');
      assert.equal(relayedMsg.type, 'ACTION_WORLD_TOUR');
      assert.equal(relayedMsg.destTileId, 3);

      // 2. Must be executed locally on Host
      assert.deepEqual(executedWorldTour, { playerIdx: 1, destTileId: 3 });
      assert.equal(gameState.players[1].position, 3, 'Host must update player position to destination tile');

      // 3. Full state broadcast from Host must contain destination position (3), not World Tour (24)
      let broadcastSnapshot = null;
      mockGuest1.send = (msg) => {
        if (msg.type === 'FULL_STATE_SYNC') broadcastSnapshot = msg;
      };
      broadcastFullGameState();

      assert.notEqual(broadcastSnapshot, null);
      assert.equal(broadcastSnapshot.gameState.players[1].position, 3, 'Guest position must remain at destination tile, not reset to World Tour');
    });

    it('relays ACTION_RENT_DEBT across peers and invokes onRentDebt on Host and Guest', () => {
      let hostExecutedDebt = null;
      networkCallbacks.onRentDebt = (msg) => {
        hostExecutedDebt = msg;
      };

      const mockGuest1 = { peer: 'guest-1', open: true, send: () => {} };
      let relayedMsg = null;
      const mockGuest2 = {
        peer: 'guest-2',
        open: true,
        send: (msg) => { relayedMsg = msg; }
      };

      networkState.connections.set('guest-1', mockGuest1);
      networkState.connections.set('guest-2', mockGuest2);

      const debtPacket = {
        type: 'ACTION_RENT_DEBT',
        debtorIdx: 1,
        creditorIdx: 0,
        rentOwed: 250000,
        tileId: 5,
        isDoubles: false
      };

      // 1. Host receives ACTION_RENT_DEBT from Guest 1
      handleHostReceivedMessage(mockGuest1, debtPacket);

      // Must be relayed to Guest 2
      assert.notEqual(relayedMsg, null, 'Host must relay ACTION_RENT_DEBT to other connected peers');
      assert.equal(relayedMsg.type, 'ACTION_RENT_DEBT');
      assert.equal(relayedMsg.debtorIdx, 1);
      assert.equal(relayedMsg.rentOwed, 250000);

      // Must execute locally on Host
      assert.notEqual(hostExecutedDebt, null, 'Host must execute onRentDebt');
      assert.equal(hostExecutedDebt.debtorIdx, 1);
      assert.equal(hostExecutedDebt.rentOwed, 250000);

      // 2. Guest receives ACTION_RENT_DEBT
      let guestExecutedDebt = null;
      networkCallbacks.onRentDebt = (msg) => {
        guestExecutedDebt = msg;
      };

      handleGuestReceivedMessage(debtPacket);
      assert.notEqual(guestExecutedDebt, null, 'Guest must execute onRentDebt');
      assert.equal(guestExecutedDebt.debtorIdx, 1);
      assert.equal(guestExecutedDebt.rentOwed, 250000);
    });
  });
});
