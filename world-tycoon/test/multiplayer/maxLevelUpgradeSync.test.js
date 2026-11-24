/**
 * test/multiplayer/maxLevelUpgradeSync.test.js
 * Unit tests verifying Level 4 Landmark upgrade execution, packet relay, and screen position resolution.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import { gameState } from '../../src/game/state.js';
import { BOARD_TILES } from '../../src/game/data.js';
import { networkState, registerNetworkCallbacks } from '../../src/network/p2pState.js';
import { executeIncomingNetworkAction } from '../../src/network/p2pActions.js';
import { upgradeCityLevel } from '../../src/ui/modals/inspector.js';
import { getTileScreenPosition } from '../../src/three/scene.js';
import { confirmUpgradeFromModal, confirmUpgradeTwoLevelsFromModal } from '../../src/ui/modals/upgradeCity.js';
import { PropertyLandingStrategy } from '../../src/game/engine/strategies/PropertyLandingStrategy.js';

describe('Multiplayer Max Level Upgrade Synchronization', () => {
  beforeEach(() => {
    networkState.isMultiplayer = true;
    networkState.isHost = true;
    networkState.localPlayerIdx = 0;
    networkState.connections.clear();

    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.upgradesThisVisit = 0;

    gameState.players = [
      { id: 0, name: 'Host Nova', cash: 5000000, position: 1, bankrupt: false, inIsland: false, islandTurns: 0, isAI: true },
      { id: 1, name: 'Guest Alice', cash: 5000000, position: 1, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false }
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

  it('upgradeCityLevel to Level 4 Landmark succeeds without ReferenceError: checkSkyscraperBuilt', () => {
    gameState.properties[1].owner = 0;
    gameState.properties[1].level = 3;

    // Upgrading to level 4 must not throw
    assert.doesNotThrow(() => {
      upgradeCityLevel(1, true);
    });

    assert.equal(gameState.properties[1].level, 4);
  });

  it('getTileScreenPosition calculates screen coordinates without ReferenceError: getTileWorldPosition', () => {
    assert.doesNotThrow(() => {
      const pos = getTileScreenPosition(1);
      // In mock environment with camera, returns object or null safely without throwing
      if (pos) {
        assert.ok(typeof pos.x === 'number');
        assert.ok(typeof pos.y === 'number');
      }
    });
  });

  it('AI bot upgrading property to Level 4 Landmark broadcasts packet, clears thinking, and concludes turn', async () => {
    const tile = BOARD_TILES[1]; // Taipei
    gameState.properties[1].owner = 0;
    gameState.properties[1].level = 3;

    const broadcastedMsgs = [];
    networkState.connections.set('guest-conn', {
      open: true,
      send: (data) => { broadcastedMsgs.push(data); }
    });

    let concluded = false;
    window.concludeActionPhase = () => { concluded = true; };

    const strategy = new PropertyLandingStrategy();
    await strategy.handleAIOwnedCityLanding(0, tile, false);

    assert.equal(gameState.properties[1].level, 4);
    const upgradeMsg = broadcastedMsgs.find(m => m.type === 'ACTION_UPGRADE_CITY');
    assert.ok(upgradeMsg);
    assert.equal(upgradeMsg.tileId, 1);
    assert.equal(upgradeMsg.count, 1);
    assert.equal(concluded, true);
  });

  it('human player confirmUpgradeFromModal to Level 4 Landmark executes cleanly', () => {
    const tile = BOARD_TILES[1];
    gameState.properties[1].owner = 0;
    gameState.properties[1].level = 3;
    gameState.pendingUpgradeTile = tile;
    gameState.players[0].isAI = false;

    const broadcastedMsgs = [];
    networkState.connections.set('guest-conn', {
      open: true,
      send: (data) => { broadcastedMsgs.push(data); }
    });

    assert.doesNotThrow(() => {
      confirmUpgradeFromModal();
    });

    assert.equal(gameState.properties[1].level, 4);
    const upgradeMsg = broadcastedMsgs.find(m => m.type === 'ACTION_UPGRADE_CITY');
    assert.ok(upgradeMsg);
    assert.equal(upgradeMsg.tileId, 1);
  });

  it('human player confirmUpgradeTwoLevelsFromModal from Level 2 to Level 4 executes cleanly', () => {
    const tile = BOARD_TILES[1];
    gameState.properties[1].owner = 0;
    gameState.properties[1].level = 2;
    gameState.pendingUpgradeTile = tile;
    gameState.players[0].isAI = false;

    const broadcastedMsgs = [];
    networkState.connections.set('guest-conn', {
      open: true,
      send: (data) => { broadcastedMsgs.push(data); }
    });

    assert.doesNotThrow(() => {
      confirmUpgradeTwoLevelsFromModal();
    });

    assert.equal(gameState.properties[1].level, 4);
    const upgradeMsg = broadcastedMsgs.find(m => m.type === 'ACTION_UPGRADE_CITY');
    assert.ok(upgradeMsg);
    assert.equal(upgradeMsg.tileId, 1);
    assert.equal(upgradeMsg.count, 2);
  });

  it('guest peer receives and handles ACTION_UPGRADE_CITY cleanly', () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;

    let upgradedTileId = null;
    let upgradedCount = null;

    registerNetworkCallbacks({
      onUpgradeCity: (pIdx, tId, count) => {
        upgradedTileId = tId;
        upgradedCount = count;
      }
    });

    executeIncomingNetworkAction({
      type: 'ACTION_UPGRADE_CITY',
      senderIdx: 0,
      playerIdx: 0,
      tileId: 1,
      count: 2
    });

    assert.equal(upgradedTileId, 1);
    assert.equal(upgradedCount, 2);
  });
});
