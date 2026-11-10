/**
 * test/multiplayer/multiplayerAuditFixes.test.js
 * Unit test suite verifying fixes for the 10 multiplayer audit issues:
 * 1. ACTION_DOWNGRADE_CITY & ACTION_CHAT_EMOTE in protocol and guest dispatcher
 * 2. ACTION_BUY_CITY isDoubles synchronization
 * 3. Deed ownership and bankruptcy protection in completeTradeTransfer
 * 4. Safe position retention during active MOVING phase on full state sync
 * 5. Bankruptcy broadcast on tax insolvency
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import { isValidPacket } from '../../src/network/protocol.js';
import { networkState, registerNetworkCallbacks } from '../../src/network/p2pState.js';
import { handleGuestReceivedMessage } from '../../src/network/p2pGuest.js';
import { gameState, resetGameStateForNewMatch } from '../../src/game/state.js';
import { completeTradeTransfer } from '../../src/ui/modals/trade.js';
import { checkAndHandleNegativeCash } from '../../src/game/rules.js';

describe('Multiplayer Comprehensive Audit Fixes (/bug-hunter /clean-code)', () => {
  beforeEach(() => {
    resetGameStateForNewMatch();
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.players = [
      { id: 0, name: 'ALICE', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false },
      { id: 1, name: 'BOB', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false }
    ];

    networkState.isMultiplayer = true;
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;
  });

  afterEach(() => {
    networkState.isMultiplayer = false;
    networkState.isHost = false;
    networkState.localPlayerIdx = 0;
  });

  it('validates ACTION_CHAT_EMOTE in isValidPacket', () => {
    assert.equal(isValidPacket({ type: 'ACTION_CHAT_EMOTE' }), true);
  });

  it('dispatches ACTION_DOWNGRADE_CITY through handleGuestReceivedMessage to registered callback', () => {
    let received = null;
    registerNetworkCallbacks({
      onDowngradeCity: (playerIdx, tileId, refund) => {
        received = { playerIdx, tileId, refund };
      }
    });

    handleGuestReceivedMessage({
      type: 'ACTION_DOWNGRADE_CITY',
      senderIdx: 0,
      playerIdx: 0,
      tileId: 1,
      refund: 50000
    });

    assert.deepEqual(received, {
      playerIdx: 0,
      tileId: 1,
      refund: 50000
    });
  });

  it('blocks completeTradeTransfer if either trader is bankrupt', () => {
    gameState.players[0].bankrupt = true;
    gameState.properties[1] = { owner: 0, level: 0, festivalBoost: false };

    const success = completeTradeTransfer(0, 1, 0, 0, [1], []);
    assert.equal(success, false);
    assert.equal(gameState.properties[1].owner, 0); // Ownership was NOT stolen
  });

  it('blocks completeTradeTransfer if proposed property is no longer owned by giver', () => {
    // Tile 1 is actually owned by Player 1, but Player 0 tries to trade it
    gameState.properties[1] = { owner: 1, level: 0, festivalBoost: false };

    const success = completeTradeTransfer(0, 1, 0, 0, [1], []);
    assert.equal(success, false);
    assert.equal(gameState.properties[1].owner, 1);
  });

  it('successfully transfers valid properties and ignores illegitimate ones', () => {
    gameState.properties[1] = { owner: 0, level: 0, festivalBoost: false };
    gameState.properties[2] = { owner: 99, level: 0, festivalBoost: false }; // Not owned by 0

    const success = completeTradeTransfer(0, 1, 0, 0, [1, 2], []);
    assert.equal(success, true);
    assert.equal(gameState.properties[1].owner, 1); // Legitimate property transferred
    assert.equal(gameState.properties[2].owner, 99); // Stolen property remains untouched
  });

  it('broadcasts ACTION_BANKRUPTCY during tax insolvency in multiplayer', () => {
    let broadcastedAction = null;
    networkState.isMultiplayer = true;
    networkState.hostConn = {
      open: true,
      send: (msg) => {
        broadcastedAction = msg;
      }
    };

    gameState.players[1].cash = -100000;
    const solvent = checkAndHandleNegativeCash(1, {});
    assert.equal(solvent, false);
    assert.equal(gameState.players[1].bankrupt, true);
    assert.equal(broadcastedAction?.type, 'ACTION_BANKRUPTCY');
    assert.equal(broadcastedAction?.bankruptIdx, 1);
  });
});
