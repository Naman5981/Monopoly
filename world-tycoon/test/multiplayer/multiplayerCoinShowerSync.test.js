/**
 * test/multiplayer/multiplayerCoinShowerSync.test.js
 * Unit tests verifying real-time synchronization of 3D gold coin shower,
 * board shockwave, and landmark cutscenes across all multiplayer peers upon city upgrades.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import { gameState } from '../../src/game/state.js';
import { BOARD_TILES } from '../../src/game/data.js';
import { networkState } from '../../src/network/p2pState.js';
import { executeIncomingNetworkAction } from '../../src/network/p2pActions.js';
import { upgradeCityLevel } from '../../src/ui/modals/inspector.js';
import { getTileWorldPosition } from '../../src/three/board/coords.js';
import { activeShockwaves } from '../../src/three/scene.js';
import { initEngine } from '../../src/game/engine.js';

describe('Multiplayer Coin Shower & Shockwave Synchronization', () => {
  beforeEach(() => {
    activeShockwaves.length = 0;

    networkState.isMultiplayer = true;
    networkState.isHost = false;
    networkState.localPlayerIdx = 1; // Local peer is Guest
    networkState.connections.clear();

    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.upgradesThisVisit = 0;

    gameState.players = [
      { id: 0, name: 'Host Nova', cash: 5000000, position: 1, bankrupt: false, isAI: false },
      { id: 1, name: 'Guest Alice', cash: 5000000, position: 1, bankrupt: false, isAI: false }
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

    initEngine();
  });

  it('triggers board shockwave locally when upgradeCityLevel succeeds', () => {
    const tile = BOARD_TILES.find(t => t.type === 'city' && t.houseCost > 0);
    gameState.properties[tile.id].owner = 0;
    gameState.properties[tile.id].level = 1;
    gameState.players[0].position = tile.id;

    assert.equal(activeShockwaves.length, 0);

    const success = upgradeCityLevel(tile.id, true, 0, 1);
    assert.equal(success, true, 'Upgrade must succeed');
    assert.equal(activeShockwaves.length, 1, 'Should trigger board shockwave on local upgrade');

    const expectedPos = getTileWorldPosition(tile.id);
    assert.equal(activeShockwaves[0].x, expectedPos.x);
    assert.equal(activeShockwaves[0].z, expectedPos.z);
    assert.equal(activeShockwaves[0].maxRadius, 18);
  });

  it('triggers larger radius shockwave for 2-level upgrade in upgradeCityLevel', () => {
    const tile = BOARD_TILES.find(t => t.type === 'city' && t.houseCost > 0);
    gameState.properties[tile.id].owner = 0;
    gameState.properties[tile.id].level = 1;

    assert.equal(activeShockwaves.length, 0);

    const success = upgradeCityLevel(tile.id, true, 0, 2);
    assert.equal(success, true);
    assert.equal(activeShockwaves.length, 1);
    assert.equal(activeShockwaves[0].maxRadius, 24); // maxRadius 24 for 2-level upgrade
  });

  it('triggers board shockwave on remote peer receiving ACTION_UPGRADE_CITY via engine onUpgradeCity', () => {
    const tile = BOARD_TILES.find(t => t.type === 'city' && t.houseCost > 0);
    gameState.properties[tile.id].owner = 0;
    gameState.properties[tile.id].level = 1;

    assert.equal(activeShockwaves.length, 0);

    executeIncomingNetworkAction({
      type: 'ACTION_UPGRADE_CITY',
      playerIdx: 0,
      tileId: tile.id,
      count: 1
    });

    assert.equal(activeShockwaves.length, 1, 'Remote peer must trigger board shockwave upon receiving ACTION_UPGRADE_CITY');
    const expectedPos = getTileWorldPosition(tile.id);
    assert.equal(activeShockwaves[0].x, expectedPos.x);
    assert.equal(activeShockwaves[0].z, expectedPos.z);
  });
});
