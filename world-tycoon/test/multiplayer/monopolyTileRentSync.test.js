/**
 * test/multiplayer/monopolyTileRentSync.test.js
 * Regression tests ensuring 2x monopoly rent updates across all sibling city tiles
 * during FULL_STATE_SYNC, bankruptcy transfers, and remote property sales.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import { BOARD_TILES } from '../../src/game/data.js';
import { gameState, matchSettings } from '../../src/game/state.js';
import { fmtMoney } from '../../src/game/utils.js';
import { calculateTileRent, checkAndHandleNegativeCash } from '../../src/game/rules.js';
import { initEngine } from '../../src/game/engine.js';
import { networkState, networkCallbacks } from '../../src/network/p2pState.js';
import { executeIncomingNetworkAction } from '../../src/network/p2pActions.js';
import { context } from '../../src/three/core/context.js';
import { refreshTilesAndGroups } from '../../src/three/board/tiles.js';

function createFakeTileMesh(tileId) {
  return {
    userData: { tileId },
    material: [
      { color: { copy() {} }, emissive: { setStyle() {}, setHex() {} }, needsUpdate: false },
      { color: { copy() {} }, emissive: { setStyle() {}, setHex() {} }, needsUpdate: false },
      {
        map: { dispose() {} },
        emissiveMap: { dispose() {} },
        emissive: { setHex() {} },
        needsUpdate: false
      },
      { color: { copy() {} }, emissive: { setStyle() {}, setHex() {} }, needsUpdate: false },
      { color: { copy() {} }, emissive: { setStyle() {}, setHex() {} }, needsUpdate: false },
      { color: { copy() {} }, emissive: { setStyle() {}, setHex() {} }, needsUpdate: false }
    ]
  };
}

function captureRenderedRentStrings(fn) {
  const renderedByTile = {};
  const origCreateElement = document.createElement;
  let currentTileName = null;

  document.createElement = (tag) => {
    const el = origCreateElement(tag);
    if (String(tag).toLowerCase() === 'canvas') {
      const origGetContext = el.getContext.bind(el);
      el.getContext = (type) => {
        const ctx = origGetContext(type);
        if (type !== '2d') return ctx;
        return new Proxy(ctx, {
          get(target, prop) {
            if (prop === 'fillText') {
              return (text, x, y, maxW) => {
                const str = String(text);
                const matchedTile = BOARD_TILES.find(t => t.name === str);
                if (matchedTile) {
                  currentTileName = matchedTile.id;
                } else if (currentTileName !== null && /^\d/.test(str)) {
                  renderedByTile[currentTileName] = str;
                }
                return target.fillText(text, x, y, maxW);
              };
            }
            return target[prop];
          }
        });
      };
    }
    return el;
  };

  try {
    fn();
  } finally {
    document.createElement = origCreateElement;
  }
  return renderedByTile;
}

describe('Monopoly 2x Rent Tile Refresh Synchronization (/bug-hunter)', () => {
  beforeEach(() => {
    matchSettings.teamMode = false;
    matchSettings.boardStyle = 'wood';
    networkState.isMultiplayer = true;
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;
    networkState.connections.clear();

    gameState.gameStarted = true;
    gameState.phase = 'ACTION';
    gameState.currentPlayerIdx = 0;
    gameState.players = [
      { id: 0, name: 'P1', cash: 2000000, position: 0, bankrupt: false, isAI: false },
      { id: 1, name: 'P2', cash: 2000000, position: 0, bankrupt: false, isAI: false }
    ];
    gameState.properties = {};
    for (const t of BOARD_TILES) {
      if (t.type === 'city' || t.type === 'resort') {
        gameState.properties[t.id] = { owner: null, level: 0, festivalBoost: false, takeoverCount: 0 };
      }
      context.tilesMeshMap[t.id] = createFakeTileMesh(t.id);
    }

    initEngine();
  });

  it('onFullStateSync renders 2x monopoly rent on EVERY city in a newly completed group', () => {
    // Brown group is tiles 1 and 3
    gameState.properties[1].owner = 0;
    gameState.properties[3].owner = null;

    const incomingState = {
      currentPlayerIdx: 0,
      phase: 'END',
      players: [
        { id: 0, name: 'P1', cash: 1900000, position: 3, bankrupt: false },
        { id: 1, name: 'P2', cash: 2000000, position: 0, bankrupt: false }
      ],
      properties: {
        1: { owner: 0, level: 0, festivalBoost: false, takeoverCount: 0 },
        3: { owner: 0, level: 0, festivalBoost: false, takeoverCount: 0 }
      }
    };

    const rendered = captureRenderedRentStrings(() => {
      networkCallbacks.onSyncState(incomingState);
    });

    assert.equal(calculateTileRent(1), BOARD_TILES[1].rent[0] * 2);
    assert.equal(calculateTileRent(3), BOARD_TILES[3].rent[0] * 2);
    assert.equal(rendered[1], fmtMoney(BOARD_TILES[1].rent[0] * 2));
    assert.equal(rendered[3], fmtMoney(BOARD_TILES[3].rent[0] * 2));
  });

  it('ACTION_BANKRUPTCY renders 2x rent on both inherited cities and pre-existing creditor siblings', () => {
    // Creditor (P1, idx 0) already owns tile 1; bankrupt player (P2, idx 1) owns tile 3
    gameState.properties[1].owner = 0;
    gameState.properties[3].owner = 1;

    const rendered = captureRenderedRentStrings(() => {
      executeIncomingNetworkAction({
        type: 'ACTION_BANKRUPTCY',
        senderIdx: 0,
        bankruptIdx: 1,
        creditorIdx: 0,
        paidCash: 0
      });
    });

    assert.equal(gameState.properties[3].owner, 0);
    assert.equal(rendered[1], fmtMoney(BOARD_TILES[1].rent[0] * 2));
    assert.equal(rendered[3], fmtMoney(BOARD_TILES[3].rent[0] * 2));
  });

  it('ACTION_SELL_CITY_FOR_RENT reverts sibling city rent from 2x back to 1x', () => {
    gameState.properties[1].owner = 0;
    gameState.properties[3].owner = 0;

    const rendered = captureRenderedRentStrings(() => {
      executeIncomingNetworkAction({
        type: 'ACTION_SELL_CITY_FOR_RENT',
        senderIdx: 0,
        playerIdx: 0,
        tileId: 3,
        saleVal: 30000
      });
    });

    assert.equal(gameState.properties[3].owner, null);
    assert.equal(calculateTileRent(1), BOARD_TILES[1].rent[0]);
    assert.equal(rendered[1], fmtMoney(BOARD_TILES[1].rent[0]));
  });

  it('refreshTilesAndGroups deduplicates tile refreshes and updates all group siblings', () => {
    gameState.properties[1].owner = 0;
    gameState.properties[3].owner = 0;
    let disposeCountTile1 = 0;
    let disposeCountTile3 = 0;
    context.tilesMeshMap[1].material[2].map.dispose = () => { disposeCountTile1++; };
    context.tilesMeshMap[3].material[2].map.dispose = () => { disposeCountTile3++; };

    refreshTilesAndGroups([1, 3]);

    assert.equal(disposeCountTile1, 1);
    assert.equal(disposeCountTile3, 1);
  });

  it('checkAndHandleNegativeCash refreshes sibling tiles after all bankruptcy transfers complete', () => {
    gameState.players[1].cash = -50000;
    gameState.properties[1].owner = 0;
    gameState.properties[3].owner = 1;

    const refreshedIds = [];
    const ok = checkAndHandleNegativeCash(1, {
      onRefreshTile: (id) => refreshedIds.push(id)
    }, 0);

    assert.equal(ok, false);
    assert.equal(gameState.properties[3].owner, 0);
    assert.ok(refreshedIds.includes(1));
    assert.ok(refreshedIds.includes(3));
  });
});
