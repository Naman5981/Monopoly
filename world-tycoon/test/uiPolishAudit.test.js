import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { gameState, resetGameStateForNewMatch, matchSettings } from '../src/game/state.js';
import { BOARD_TILES } from '../src/game/data.js';
import { openPortfolioModal, closePortfolioModal } from '../src/ui/modals/inspector.js';
import { openRulesModal, closeRulesModal } from '../src/ui/modals/system.js';
import { modalStore } from '../src/svelte/stores/modalStore.js';

describe('UI Polish & Design Gaps Audit (/better-ui /anti-ui-slop)', () => {
  beforeEach(() => {
    resetGameStateForNewMatch();
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.players = [
      { id: 0, name: 'Naman', cash: 1500000, position: 0, isAI: false, bankrupt: false },
      { id: 1, name: 'Baron', cash: 1500000, position: 0, isAI: true, bankrupt: false }
    ];
  });

  it('openPortfolioModal populates owned cities and rent yields in modalStore', () => {
    // Give player 0 Bangkok (id: 5) and Cairo (id: 1)
    gameState.properties[5].owner = 0;
    gameState.properties[5].level = 2;
    gameState.properties[1].owner = 0;
    gameState.properties[1].level = 0;

    openPortfolioModal();

    let portfolioState = null;
    const unsub = modalStore.subscribe(val => { portfolioState = val.portfolio; });
    unsub();

    assert.equal(portfolioState.visible, true);
    assert.equal(portfolioState.totalCities, 2);
    assert.equal(portfolioState.properties.length, 2);
    assert.equal(portfolioState.properties[0].name, 'CAIRO');
    assert.equal(portfolioState.properties[1].name, 'BANGKOK');

    closePortfolioModal();

    unsub();
    const unsub2 = modalStore.subscribe(val => { portfolioState = val.portfolio; });
    unsub2();
    assert.equal(portfolioState.visible, false);
  });

  it('openRulesModal and closeRulesModal cleanly toggle modalStore.rules', () => {
    openRulesModal();

    let rulesState = null;
    const unsub = modalStore.subscribe(val => { rulesState = val.rules; });
    unsub();
    assert.equal(rulesState.visible, true);

    closeRulesModal();

    const unsub2 = modalStore.subscribe(val => { rulesState = val.rules; });
    unsub2();
    assert.equal(rulesState.visible, false);
  });
});
