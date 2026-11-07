import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';

setupBrowserMocks();

import { gameState, resetGameStateForNewMatch } from '../src/game/state.js';
import { checkAndHandleNegativeCash } from '../src/game/rules.js';
import { cancelAllGameTimers } from '../src/game/engine/turnCycle.js';

describe('Bankruptcy Rules & Creditor Asset Recovery (/clean-code /bug-hunter)', () => {
  beforeEach(() => {
    resetGameStateForNewMatch(2);
    gameState.gameStarted = true;
    gameState.players[0].cash = 100000;
    gameState.players[1].cash = 500000;
    gameState.properties[1] = { owner: 0, level: 2, festivalBoost: false };
    gameState.properties[3] = { owner: 0, level: 0, festivalBoost: false };
  });

  it('liquidates houses to cover deficit when player has cash deficit', () => {
    gameState.players[0].cash = -50000;
    let refreshedTiles = [];
    const res = checkAndHandleNegativeCash(0, {
      onRefreshTile: (id) => refreshedTiles.push(id)
    });

    assert.equal(res, true, 'Player should remain solvent after house liquidation');
    assert.equal(gameState.players[0].bankrupt, false);
    assert.ok(gameState.players[0].cash >= 0, 'Cash should be restored to non-negative');
    assert.ok(gameState.properties[1].level < 2, 'House level should be reduced to cover debt');
    assert.ok(refreshedTiles.includes(1), 'Tile refresh callback should be notified');
  });

  it('transfers deeds to creditor upon total insolvency', () => {
    gameState.players[0].cash = -5000000; // Unrecoverable debt
    const logs = [];
    const res = checkAndHandleNegativeCash(0, {
      onLog: (msg) => logs.push(msg),
      onRefreshTile: () => {}
    }, 1);

    assert.equal(res, false, 'Player must be declared bankrupt');
    assert.equal(gameState.players[0].bankrupt, true);
    assert.equal(gameState.players[0].cash, 0);
    assert.equal(gameState.properties[1].owner, 1, 'Creditor must inherit property 1');
    assert.equal(gameState.properties[3].owner, 1, 'Creditor must inherit property 3');
    assert.ok(logs.some(l => l.includes('inherited')), 'Log must state that creditor inherited properties');
  });

  it('reverts deeds to unowned if bankrupt without creditor (tax/bank debt)', () => {
    gameState.players[0].cash = -5000000;
    const logs = [];
    const res = checkAndHandleNegativeCash(0, {
      onLog: (msg) => logs.push(msg),
      onRefreshTile: () => {}
    }, null);

    assert.equal(res, false, 'Player must be declared bankrupt');
    assert.equal(gameState.players[0].bankrupt, true);
    assert.equal(gameState.properties[1].owner, null, 'Properties must revert to unowned');
    assert.equal(gameState.properties[3].owner, null, 'Properties must revert to unowned');
    assert.equal(gameState.properties[1].level, 0, 'Building levels reset to 0');
  });

  it('cleans up window.resumeBotTurnAfterTrade on cancelAllGameTimers', () => {
    window.resumeBotTurnAfterTrade = () => {};
    assert.equal(typeof window.resumeBotTurnAfterTrade, 'function');
    cancelAllGameTimers();
    assert.equal(window.resumeBotTurnAfterTrade, null, 'window.resumeBotTurnAfterTrade must be nulled');
  });
});
