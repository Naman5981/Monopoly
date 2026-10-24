/**
 * test/multiplayer/doublesRoll.test.js
 * Unit tests for multiplayer doubles handling, re-roll state sync, and UI actionability.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import { gameState, isHumanTurnActionable, setLocalPlayerIdx } from '../../src/game/state.js';
import { networkState, registerNetworkCallbacks } from '../../src/network/p2pState.js';
import { executeIncomingNetworkAction } from '../../src/network/p2pActions.js';
import { refreshActivePlayerTurnStatus } from '../../src/ui/hud.js';

describe('Multiplayer Doubles Roll & Turn Progression', () => {
  beforeEach(() => {
    networkState.isMultiplayer = true;
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;
    setLocalPlayerIdx(1);

    gameState.gameStarted = true;
    gameState.currentPlayerIdx = 0;
    gameState.phase = 'ROLL';
    gameState.doublesCount = 0;
    gameState.turnTimeLeft = 15;
    gameState.players = [
      { id: 0, name: 'LAPTOP', cash: 2000000, position: 23, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false },
      { id: 1, name: 'Y399', cash: 2000000, position: 10, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false }
    ];
    gameState.properties = {};
  });

  it('correctly reports actionability for active player vs observer on doubles', () => {
    // When Laptop (slot 0) has doubles re-roll
    gameState.currentPlayerIdx = 0;
    gameState.phase = 'ROLL';
    gameState.doublesCount = 1;

    // From Y399's perspective (localPlayerIdx = 1)
    networkState.localPlayerIdx = 1;
    setLocalPlayerIdx(1);
    assert.equal(isHumanTurnActionable(), false, 'Observer Y399 should NOT have actionable roll buttons');

    // From Laptop's perspective (localPlayerIdx = 0)
    networkState.localPlayerIdx = 0;
    setLocalPlayerIdx(0);
    assert.equal(isHumanTurnActionable(), true, 'Active player Laptop should have actionable roll buttons');
  });

  it('updates status pill text properly for active player and observer during doubles', () => {
    gameState.currentPlayerIdx = 0;
    gameState.phase = 'ROLL';
    gameState.doublesCount = 1;

    // Active player (Laptop) status check
    networkState.localPlayerIdx = 0;
    setLocalPlayerIdx(0);
    refreshActivePlayerTurnStatus();
    const pillTextActive = document.getElementById('hud-status-pill-text')?.innerHTML || '';
    assert.match(pillTextActive, /Doubles Re-Roll/, 'Active player should see Doubles Re-Roll prompt');

    // Observer (Y399) status check
    networkState.localPlayerIdx = 1;
    setLocalPlayerIdx(1);
    refreshActivePlayerTurnStatus();
    const pillTextObserver = document.getElementById('hud-status-pill-text')?.innerHTML || '';
    assert.match(pillTextObserver, /LAPTOP.*rolled doubles/, 'Observer should see waiting for doubles roll prompt');
  });

  it('relays ACTION_DOUBLES_ROLL packet cleanly to onDoublesRoll callback', () => {
    networkState.localPlayerIdx = 1;
    setLocalPlayerIdx(1);

    let doublesRollReceived = null;
    registerNetworkCallbacks({
      onDoublesRoll: (playerIdx, doublesCount, turnTimeLeft) => {
        doublesRollReceived = { playerIdx, doublesCount, turnTimeLeft };
      }
    });

    executeIncomingNetworkAction({
      type: 'ACTION_DOUBLES_ROLL',
      senderIdx: 0,
      playerIdx: 0,
      doublesCount: 1,
      turnTimeLeft: 15
    });

    assert.notEqual(doublesRollReceived, null);
    assert.equal(doublesRollReceived.playerIdx, 0);
    assert.equal(doublesRollReceived.doublesCount, 1);
    assert.equal(doublesRollReceived.turnTimeLeft, 15);
  });
});
