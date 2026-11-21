import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { gameState, resetGameStateForNewMatch, matchSettings } from '../src/game/state.js';
import { BOARD_TILES } from '../src/game/data.js';
import { openPortfolioModal, closePortfolioModal } from '../src/ui/modals/inspector.js';
import { openRulesModal, closeRulesModal, toggleEventLogDrawer } from '../src/ui/modals/system.js';
import { modalStore } from '../src/svelte/stores/modalStore.js';
import { hudStore } from '../src/svelte/stores/hudStore.js';
import { bannerStore, dismissBanner } from '../src/svelte/stores/bannerStore.js';
import { revealGameHud, hideGameHud } from '../src/ui/hud/controls.js';
import { showRentTransferBanner } from '../src/ui/hud/cards.js';

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

  it('toggleEventLogDrawer cleanly synchronizes hudStore and manages bottom-left drawer', () => {
    const drawer = document.getElementById('event-log-drawer');
    drawer.classList.add('hidden');
    drawer.classList.remove('flex');

    toggleEventLogDrawer();

    let hud = null;
    const unsub = hudStore.subscribe(val => { hud = val; });
    unsub();
    assert.equal(hud.isEventLogOpen, true);
    assert.equal(drawer.classList.contains('hidden'), false);

    toggleEventLogDrawer();
    const unsub2 = hudStore.subscribe(val => { hud = val; });
    unsub2();
    assert.equal(hud.isEventLogOpen, false);
    assert.equal(drawer.classList.contains('hidden'), true);
  });

  it('revealGameHud and hideGameHud properly control hud-bottom-left-container', () => {
    const container = document.getElementById('hud-bottom-left-container');
    container.classList.add('hidden');

    revealGameHud();
    assert.equal(container.classList.contains('hidden'), false);

    hideGameHud();
    assert.equal(container.classList.contains('hidden'), true);
  });

  it('showRentTransferBanner dispatches rentTransfer event to Svelte bannerStore', () => {
    showRentTransferBanner('Naman', 'Baron', 55000, 0, 1, 'Tokyo', '#ef4444');

    let banner = null;
    const unsub = bannerStore.subscribe(val => { banner = val; });
    unsub();

    assert.equal(banner.activeBanner, 'rentTransfer');
    assert.equal(banner.data.fromName, 'Naman');
    assert.equal(banner.data.toName, 'Baron');
    assert.equal(banner.data.amount, 55000);
    assert.equal(banner.data.cityName, 'Tokyo');
    assert.equal(banner.data.groupColor, '#ef4444');

    dismissBanner();
    const unsub2 = bannerStore.subscribe(val => { banner = val; });
    unsub2();
    assert.equal(banner.activeBanner, null);
  });
});
