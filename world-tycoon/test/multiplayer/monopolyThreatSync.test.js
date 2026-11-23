/**
 * test/multiplayer/monopolyThreatSync.test.js
 * Unit tests verifying monopoly completion, threat alerts, and P2P packet relay parity.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import { gameState } from '../../src/game/state.js';
import { BOARD_TILES, GROUP_META } from '../../src/game/data.js';
import { networkState, networkCallbacks, registerNetworkCallbacks } from '../../src/network/p2pState.js';
import { broadcastAction, executeIncomingNetworkAction } from '../../src/network/p2pActions.js';
import { checkAndTriggerMonopoly, checkAndTriggerMonopolyThreat } from '../../src/ui/modals/victory.js';
import { modalStore } from '../../src/svelte/stores/modalStore.js';
import { bannerStore } from '../../src/svelte/stores/bannerStore.js';
import { get } from 'svelte/store';

describe('Multiplayer Monopoly & Threat Synchronization', () => {
  beforeEach(() => {
    networkState.isMultiplayer = true;
    networkState.isHost = true;
    networkState.localPlayerIdx = 0;
    networkState.connections.clear();

    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.achievedMonopolies = {};
    gameState.triggeredMonopolyThreats = {};

    gameState.players = [
      { id: 0, name: 'Host Nova', cash: 2000000, position: 1, bankrupt: false, inIsland: false, islandTurns: 0, isAI: true },
      { id: 1, name: 'Guest Alice', cash: 2000000, position: 2, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false }
    ];

    gameState.properties = {};
    BOARD_TILES.forEach(t => {
      gameState.properties[t.id] = {
        owner: null,
        level: 0,
        festivalBoost: false,
        takeoverCount: 0
      };
    });
  });

  it('triggers monopoly threat alert and broadcasts ACTION_MONOPOLY_THREAT when 1 tile away', () => {
    // Brown group has 2 cities: tile 1 (Taipei) and tile 3 (Cairo)
    // Host Nova owns tile 1
    gameState.properties[1].owner = 0;

    let broadcastedMsg = null;
    networkState.connections.set('guest-conn', {
      open: true,
      send: (data) => { broadcastedMsg = data; }
    });

    const result = checkAndTriggerMonopoly(0, 'brown');
    assert.equal(result.monopoly, false);
    assert.equal(result.threat, true);
    assert.equal(result.missingTileId, 3);

    // Host recorded the triggered threat
    assert.ok(gameState.triggeredMonopolyThreats['0_brown']);

    // ACTION_MONOPOLY_THREAT was broadcast to guest
    assert.ok(broadcastedMsg);
    assert.equal(broadcastedMsg.type, 'ACTION_MONOPOLY_THREAT');
    assert.equal(broadcastedMsg.playerIdx, 0);
    assert.equal(broadcastedMsg.groupKey, 'brown');
    assert.equal(broadcastedMsg.missingTileId, 3);
  });

  it('completes monopoly, opens celebration modal, and broadcasts ACTION_MONOPOLY without reference error', () => {
    // Host Nova owns both tile 1 and tile 3 (Brown group complete)
    gameState.properties[1].owner = 0;
    gameState.properties[3].owner = 0;

    let broadcastedMsg = null;
    networkState.connections.set('guest-conn', {
      open: true,
      send: (data) => { broadcastedMsg = data; }
    });

    const result = checkAndTriggerMonopoly(0, 'brown');
    assert.equal(result.monopoly, true);
    assert.equal(result.threat, false);

    // Host recorded the achieved monopoly
    assert.ok(gameState.achievedMonopolies['0_brown']);

    // Celebration modal opened in Svelte modalStore
    const modals = get(modalStore);
    assert.equal(modals.monopolyCelebration?.visible, true);
    assert.equal(modals.monopolyCelebration?.winnerName, 'Host Nova');

    // ACTION_MONOPOLY was broadcast to guest
    assert.ok(broadcastedMsg);
    assert.equal(broadcastedMsg.type, 'ACTION_MONOPOLY');
    assert.equal(broadcastedMsg.playerIdx, 0);
    assert.equal(broadcastedMsg.groupKey, 'brown');
  });

  it('client peer executes incoming ACTION_MONOPOLY packet cleanly', () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;

    let receivedPlayerIdx = null;
    let receivedGroupKey = null;

    registerNetworkCallbacks({
      onMonopoly: (pIdx, gKey) => {
        receivedPlayerIdx = pIdx;
        receivedGroupKey = gKey;
      }
    });

    executeIncomingNetworkAction({
      type: 'ACTION_MONOPOLY',
      senderIdx: 0,
      playerIdx: 0,
      groupKey: 'brown'
    });

    assert.equal(receivedPlayerIdx, 0);
    assert.equal(receivedGroupKey, 'brown');
  });

  it('client peer executes incoming ACTION_MONOPOLY_THREAT packet cleanly', () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;

    let threatPlayerIdx = null;
    let threatGroupKey = null;
    let threatMissingTileId = null;

    registerNetworkCallbacks({
      onMonopolyThreat: (pIdx, gKey, missingId) => {
        threatPlayerIdx = pIdx;
        threatGroupKey = gKey;
        threatMissingTileId = missingId;
      }
    });

    executeIncomingNetworkAction({
      type: 'ACTION_MONOPOLY_THREAT',
      senderIdx: 0,
      playerIdx: 0,
      groupKey: 'brown',
      missingTileId: 3
    });

    assert.equal(threatPlayerIdx, 0);
    assert.equal(threatGroupKey, 'brown');
    assert.equal(threatMissingTileId, 3);
  });
});
