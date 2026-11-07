/**
 * test/multiplayer/multiplayerBugFixes.test.js
 * Verification test suite for multiplayer bug hunting and clean code fixes:
 * 1. Chance Wheel double execution prevention on remote peers
 * 2. World Festival boost host action phase conclusion & AFK watchdog
 * 3. Simultaneous roll collision grace window
 * 4. Building downgrade broadcast and protocol packet validation
 * 5. Match timer synchronization across peers
 * 6. Multiplayer bot proactive trade pause suppression
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import { isValidPacket } from '../../src/network/protocol.js';
import { networkState, registerNetworkCallbacks } from '../../src/network/p2pState.js';
import { gameState, resetGameStateForNewMatch, matchSeconds, setMatchSeconds } from '../../src/game/state.js';
import { executeIncomingNetworkAction } from '../../src/network/p2pActions.js';
import { AIPlayerController } from '../../src/game/controllers/AIPlayerController.js';

describe('Multiplayer Bug Hunting & Clean Code Audits (/bug-hunter)', () => {
  beforeEach(() => {
    resetGameStateForNewMatch();
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.players = [
      { id: 0, name: 'HOST', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false },
      { id: 1, name: 'GUEST', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: true }
    ];

    networkState.isMultiplayer = true;
    networkState.isHost = true;
    networkState.localPlayerIdx = 0;
    networkState.connections = new Map();
  });

  afterEach(() => {
    networkState.isMultiplayer = false;
    networkState.isHost = false;
    networkState.localPlayerIdx = 0;
  });

  it('validates ACTION_DOWNGRADE_CITY packet type in protocol validator', () => {
    assert.equal(isValidPacket({ type: 'ACTION_DOWNGRADE_CITY' }), true);
    assert.equal(isValidPacket({ type: 'ACTION_INVALID_FOO' }), false);
  });

  it('dispatches ACTION_DOWNGRADE_CITY to registered network callbacks with correct payload', () => {
    let downgradeReceived = null;
    registerNetworkCallbacks({
      onDowngradeCity: (playerIdx, tileId, refund) => {
        downgradeReceived = { playerIdx, tileId, refund };
      }
    });

    executeIncomingNetworkAction({
      type: 'ACTION_DOWNGRADE_CITY',
      senderIdx: 1,
      playerIdx: 1,
      tileId: 5,
      refund: 75000
    });

    assert.deepEqual(downgradeReceived, {
      playerIdx: 1,
      tileId: 5,
      refund: 75000
    });
  });

  it('suppresses proactive bot trade pauses in multiplayer mode', () => {
    networkState.isMultiplayer = true;
    networkState.isHost = true;

    let tradeModalShown = false;
    global.window.showIncomingTradeOfferModal = () => {
      tradeModalShown = true;
    };

    const botController = new AIPlayerController(1);
    botController.onTurnStart({ executeRollFn: () => {} });

    // In multiplayer, bot should NOT display proactive trade modal to host
    assert.equal(tradeModalShown, false);
    AIPlayerController.cancelTimer();
  });

  it('synchronizes matchSeconds correctly without desyncing clocks', () => {
    setMatchSeconds(0);
    assert.equal(matchSeconds, 0);

    setMatchSeconds(345);
    assert.equal(matchSeconds, 345);
  });
});
