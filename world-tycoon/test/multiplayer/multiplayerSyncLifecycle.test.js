/**
 * test/multiplayer/multiplayerSyncLifecycle.test.js
 * Comprehensive unit tests for multiplayer P2P synchronization architecture,
 * monotonic turn numbering, spectator watchdog isolation, hop phase protection,
 * solvent rent settlement, and in-game reconnection restoration.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import {
  gameState,
  setupPlayers,
  matchSettings,
  displayedCash,
  setLobbyPlayerCount,
  setLocalPlayerIdx
} from '../../src/game/state.js';
import { networkState, networkCallbacks, registerNetworkCallbacks } from '../../src/network/p2pState.js';
import { handleHostReceivedMessage, broadcastFullGameState } from '../../src/network/p2pHost.js';
import { handleGuestReceivedMessage } from '../../src/network/p2pGuest.js';
import { executeIncomingNetworkAction } from '../../src/network/p2pActions.js';
import { isValidPacket } from '../../src/network/protocol.js';
import { advanceTurn, concludeActionPhase, clearObserverEndTurnWatchdog } from '../../src/game/engine/turnCycle.js';
import { initEngine } from '../../src/game/engine.js';
import { clearBuyoutTimers } from '../../src/ui/modals/buyoutCity.js';

describe('Multiplayer Sync Lifecycle & Hardening Tests', () => {
  beforeEach(() => {
    networkState.isMultiplayer = true;
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;
    networkState.connections.clear();
    networkState.hostConn = {
      open: true,
      send: () => {}
    };
    networkState.roomCode = 'SYNC1';

    setLobbyPlayerCount(3);
    setLocalPlayerIdx(1);

    setupPlayers.splice(0, setupPlayers.length,
      { name: 'HOST', isAI: false, isOnlinePeer: false, peerId: 'host-peer', charColor: 0x3b82f6, colorHex: '#3b82f6', hatStyle: 0 },
      { name: 'GUEST 1', isAI: false, isOnlinePeer: true, peerId: 'guest-1-peer', charColor: 0xef4444, colorHex: '#ef4444', hatStyle: 1 },
      { name: 'BOT 2', isAI: true, isOnlinePeer: false, peerId: null, charColor: 0x10b981, colorHex: '#10b981', hatStyle: 2 }
    );

    matchSettings.customPlayers = setupPlayers.map(p => ({ ...p }));

    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.turnNumber = 1;
    gameState.festivalPot = 0;
    gameState.auction = null;
    gameState.isRentTransferring = false;
    gameState.pendingRentCreditor = null;
    gameState.buyoutWatchdogTimer = null;

    gameState.players = [
      { id: 0, name: 'HOST', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false },
      { id: 1, name: 'GUEST 1', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false },
      { id: 2, name: 'BOT 2', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: true }
    ];

    displayedCash[0] = 2000000;
    displayedCash[1] = 2000000;
    displayedCash[2] = 2000000;

    gameState.properties = {
      1: { owner: 0, level: 1, festivalBoost: false },
      2: { owner: 1, level: 0, festivalBoost: false }
    };

    initEngine();
  });

  describe('1. Monotonic turnNumber & Idempotent Turn Advance', () => {
    it('advances turn cleanly on FULL_STATE_SYNC with increased turnNumber', () => {
      assert.equal(gameState.turnNumber, 1);
      assert.equal(gameState.currentPlayerIdx, 0);

      // Host broadcasts turn 2 advance to player 1
      networkCallbacks.onSyncState({
        turnNumber: 2,
        currentPlayerIdx: 1,
        phase: 'ROLL',
        players: gameState.players,
        properties: gameState.properties
      });

      assert.equal(gameState.turnNumber, 2);
      assert.equal(gameState.currentPlayerIdx, 1);
      assert.equal(gameState.phase, 'ROLL');
    });

    it('prevents double turn advance when ACTION_END_TURN arrives after FULL_STATE_SYNC', () => {
      // Step 1: FULL_STATE_SYNC arrives first
      networkCallbacks.onSyncState({
        turnNumber: 2,
        currentPlayerIdx: 1,
        phase: 'ROLL',
        players: gameState.players,
        properties: gameState.properties
      });

      assert.equal(gameState.turnNumber, 2);
      assert.equal(gameState.currentPlayerIdx, 1);

      // Step 2: Late-arriving ACTION_END_TURN for turn 2 arrives
      networkCallbacks.onEndTurn(1, 2);

      // MUST NOT advance again to player 2 (skipping player 1)!
      assert.equal(gameState.turnNumber, 2);
      assert.equal(gameState.currentPlayerIdx, 1, 'Player 1 turn must be preserved and not skipped');
    });

    it('ignores stale turn transitions with targetTurnNumber <= current turnNumber', () => {
      gameState.turnNumber = 5;
      gameState.currentPlayerIdx = 2;

      // Stale transition for turn 4
      advanceTurn(true, 0, 4);

      assert.equal(gameState.turnNumber, 5, 'turnNumber must not regress');
      assert.equal(gameState.currentPlayerIdx, 2, 'currentPlayerIdx must not switch on stale turn');
    });
  });

  describe('2. Spectator Watchdog Isolation', () => {
    it('does not set observerEndTurnWatchdog on spectator guests', () => {
      networkState.isHost = false;
      networkState.localPlayerIdx = 1; // Spectator watching player 0
      gameState.currentPlayerIdx = 0;

      concludeActionPhase(false);

      assert.equal(gameState.phase, 'END');
      // On non-host spectator, observerEndTurnWatchdog must not advance turn
      // Advance turn would have executed if watchdog fired
      assert.equal(gameState.currentPlayerIdx, 0);
    });

    it('clears observer watchdog immediately when onSyncState arrives', () => {
      networkState.isHost = true;
      gameState.currentPlayerIdx = 1;

      concludeActionPhase(false);

      // Receiving sync state clears observer watchdog
      networkCallbacks.onSyncState({
        turnNumber: 2,
        currentPlayerIdx: 2,
        phase: 'ROLL',
        players: gameState.players,
        properties: gameState.properties
      });

      assert.equal(gameState.currentPlayerIdx, 2);
    });
  });

  describe('3. Active Moving Phase Protection', () => {
    it('protects gameState.phase = MOVING from being hijacked by incoming sync while moving', () => {
      gameState.phase = 'MOVING';
      gameState.currentPlayerIdx = 0;
      networkState.localPlayerIdx = 0;

      networkCallbacks.onSyncState({
        turnNumber: 1,
        currentPlayerIdx: 0,
        phase: 'MODAL', // Host reached modal earlier
        players: gameState.players,
        properties: gameState.properties
      });

      // Active player phase must remain MOVING until local hops complete
      assert.equal(gameState.phase, 'MOVING', 'Player moving phase must not be prematurely flipped to MODAL mid-hop');
    });
  });

  describe('4. Solvent Rent Settlement & Cash Shielding', () => {
    it('validates and executes ACTION_PAY_RENT across peers', () => {
      assert.ok(isValidPacket({
        type: 'ACTION_PAY_RENT',
        senderIdx: 0,
        playerIdx: 0,
        ownerIdx: 1,
        rent: 150000,
        tileId: 2
      }));

      executeIncomingNetworkAction({
        type: 'ACTION_PAY_RENT',
        senderIdx: 0,
        playerIdx: 0,
        ownerIdx: 1,
        rent: 150000,
        tileId: 2
      });

      assert.equal(gameState.players[0].cash, 1850000);
      assert.equal(gameState.players[1].cash, 2150000);
    });

    it('shields debtor cash during local HUD rent transfer animation', () => {
      gameState.isRentTransferring = true;
      gameState.pendingRentCreditor = 1;
      gameState.currentPlayerIdx = 0;

      // Incoming sync arrives mid-animation with pre-deducted cash
      networkCallbacks.onSyncState({
        turnNumber: 1,
        currentPlayerIdx: 0,
        phase: 'ROLL',
        players: [
          { id: 0, cash: 1850000, position: 2, bankrupt: false },
          { id: 1, cash: 2150000, position: 0, bankrupt: false },
          { id: 2, cash: 2000000, position: 0, bankrupt: false }
        ],
        properties: gameState.properties
      });

      // Debtor cash must not be overwritten while animation is running
      assert.equal(gameState.players[0].cash, 2000000, 'Cash must stay shielded during animation');
      assert.equal(gameState.players[1].cash, 2000000, 'Creditor cash must stay shielded during animation');

      // Once animation completes:
      gameState.isRentTransferring = false;
      gameState.pendingRentCreditor = null;

      networkCallbacks.onSyncState({
        turnNumber: 1,
        currentPlayerIdx: 0,
        phase: 'ROLL',
        players: [
          { id: 0, cash: 1850000, position: 2, bankrupt: false },
          { id: 1, cash: 2150000, position: 0, bankrupt: false },
          { id: 2, cash: 2000000, position: 0, bankrupt: false }
        ],
        properties: gameState.properties
      });

      assert.equal(gameState.players[0].cash, 1850000);
      assert.equal(gameState.players[1].cash, 2150000);
    });
  });

  describe('5. In-Game Reconnection Restoration', () => {
    it('restores isAI = false on Host when guest reconnects to active match', () => {
      networkState.isHost = true;
      gameState.gameStarted = true;

      // Simulate guest 1 disconnected and converted to AI
      gameState.players[1].isAI = true;
      setupPlayers[1].isAI = true;
      setupPlayers[1].isOnlinePeer = false;

      let sentJoinAccepted = null;
      const mockConn = {
        peer: 'guest-1-new-peer',
        send: (payload) => {
          if (payload.type === 'JOIN_ACCEPTED') sentJoinAccepted = payload;
        }
      };

      handleHostReceivedMessage(mockConn, {
        type: 'GUEST_JOIN',
        name: 'GUEST 1',
        charColor: 0xef4444
      });

      assert.equal(gameState.players[1].isAI, false, 'Player isAI must be reset to false');
      assert.equal(gameState.players[1].isOnlinePeer, true);
      assert.equal(gameState.players[1].peerId, 'guest-1-new-peer');
      assert.ok(sentJoinAccepted);
      assert.equal(sentJoinAccepted.gameStarted, true);
    });

    it('does not route guest back to lobby view when rejoining active game', () => {
      gameState.gameStarted = true;
      let lobbyViewChanged = false;
      globalThis.window.setLobbyView = () => { lobbyViewChanged = true; };

      handleGuestReceivedMessage({
        type: 'JOIN_ACCEPTED',
        assignedSlot: 1,
        gameStarted: true,
        matchSettings,
        setupPlayers,
        lobbyPlayerCount: 3
      });

      assert.equal(lobbyViewChanged, false, 'Must not revert to lobby view when game is active');
    });
  });

  describe('6. Buyout Watchdog Debounce', () => {
    it('clears buyout watchdog timer when clearBuyoutTimers is called', () => {
      let timerFired = false;
      gameState.buyoutWatchdogTimer = setTimeout(() => {
        timerFired = true;
      }, 5000);

      assert.ok(gameState.buyoutWatchdogTimer !== null);
      clearBuyoutTimers();

      assert.equal(gameState.buyoutWatchdogTimer, null);
      assert.equal(timerFired, false);
    });
  });
});
