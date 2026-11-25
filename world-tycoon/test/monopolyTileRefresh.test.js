/**
 * test/monopolyTileRefresh.test.js
 * Verifies that refreshTileAndGroup updates all sibling tiles in a color group
 * when a monopoly is completed or broken, ensuring 2x rent appears on every city in the set.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { BOARD_TILES } from '../src/game/data.js';
import { gameState } from '../src/game/state.js';
import { context } from '../src/three/core/context.js';
import { refreshTileAndGroup } from '../src/three/board/tiles.js';

describe('Monopoly Sibling Tile Texture Refresh (/bug-hunter)', () => {
  let brownTiles;
  let otherTile;

  beforeEach(() => {
    brownTiles = BOARD_TILES.filter(t => t.group === 'brown');
    otherTile = BOARD_TILES.find(t => t.group && t.group !== 'brown');

    gameState.gameStarted = true;
    gameState.players = [
      { id: 0, name: 'P1', cash: 2000000, bankrupt: false, colorHex: '#3b82f6', charColor: 0x3b82f6 },
      { id: 1, name: 'P2', cash: 2000000, bankrupt: false, colorHex: '#ef4444', charColor: 0xef4444 }
    ];
    gameState.properties = {};
    BOARD_TILES.forEach(t => {
      gameState.properties[t.id] = { owner: null, level: 0, festivalBoost: false };
    });

    // Mock mesh materials for brownTiles + otherTile to track texture replacements
    context.tilesMeshMap = {};
    context.tileBuildingGroups = {};
    for (const t of [...brownTiles, otherTile]) {
      const topMat = {
        map: { dispose: () => {} },
        emissiveMap: null,
        emissive: { setHex: () => {} },
        emissiveIntensity: 0,
        needsUpdate: false
      };
      context.tilesMeshMap[t.id] = {
        material: [{}, {}, topMat]
      };
    }
  });

  it('refreshes all sibling tiles in the same color group when completing a monopoly', () => {
    const [cityA, cityB] = brownTiles;
    gameState.properties[cityA.id].owner = 0;
    gameState.properties[cityB.id].owner = 0;

    const initialMapA = context.tilesMeshMap[cityA.id].material[2].map;
    const initialMapB = context.tilesMeshMap[cityB.id].material[2].map;
    const initialMapOther = context.tilesMeshMap[otherTile.id].material[2].map;

    refreshTileAndGroup(cityB.id);

    assert.notEqual(context.tilesMeshMap[cityA.id].material[2].map, initialMapA, 'Sibling cityA texture should be refreshed');
    assert.notEqual(context.tilesMeshMap[cityB.id].material[2].map, initialMapB, 'Target cityB texture should be refreshed');
    assert.equal(context.tilesMeshMap[cityA.id].material[2].needsUpdate, true);
    assert.equal(context.tilesMeshMap[cityB.id].material[2].needsUpdate, true);
    assert.equal(context.tilesMeshMap[otherTile.id].material[2].map, initialMapOther, 'Unrelated group tile should not be refreshed');
  });
});
