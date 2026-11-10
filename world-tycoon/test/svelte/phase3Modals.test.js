/**
 * test/svelte/phase3Modals.test.js
 * Verification of Phase 3: Modal consolidation into declarative Svelte stores & controllers.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';

setupBrowserMocks();

import { modalStore, updateModalSlice, closeAllModalsInStore } from '../../src/svelte/stores/modalStore.js';
import { gameState } from '../../src/game/state.js';
import { BOARD_TILES } from '../../src/game/data.js';
import { openTradeModal, closeTradeModal } from '../../src/ui/modals/trade.js';
import { openBuyoutCityModal, passBuyoutCity, clearBuyoutTimers } from '../../src/ui/modals/buyoutCity.js';
import { openInspectorModal, closeInspectorModal } from '../../src/ui/modals/inspector.js';
import { openChanceWheelModal, spinChanceWheel, clearChanceTimers } from '../../src/ui/modals/chanceWheel.js';
import { openFestivalBoostModal, closeFestivalBoostModal, openFestivalBoostModalFromBanner } from '../../src/ui/modals/festivalBoost.js';

describe('Phase 3: Modal Consolidation & Reactive Modal Store (/clean-code)', () => {
  beforeEach(() => {
    closeAllModalsInStore();
    clearBuyoutTimers();
    clearChanceTimers();

    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.players = [
      { id: 0, name: 'Alice', cash: 2000000, isAI: false, bankrupt: false },
      { id: 1, name: 'Bob', cash: 2000000, isAI: false, bankrupt: false }
    ];
    gameState.properties = {};
    BOARD_TILES.forEach(t => {
      gameState.properties[t.id] = { owner: null, level: 0, mortgaged: false, festivalBoost: false };
    });
  });

  it('initializes modalStore with all 5 modal slices hidden', () => {
    let state;
    const unsub = modalStore.subscribe(val => { state = val; });
    unsub();

    assert.equal(state.trade.visible, false);
    assert.equal(state.buyout.visible, false);
    assert.equal(state.inspector.visible, false);
    assert.equal(state.chanceWheel.visible, false);
    assert.equal(state.festivalBoost.visible, false);
  });

  it('updates trade modal state on openTradeModal and closeTradeModal', () => {
    openTradeModal();

    let state;
    const unsub1 = modalStore.subscribe(val => { state = val; });
    unsub1();

    assert.equal(state.trade.visible, true);
    assert.ok(state.trade.myWallet.length > 0);

    closeTradeModal();

    const unsub2 = modalStore.subscribe(val => { state = val; });
    unsub2();

    assert.equal(state.trade.visible, false);
  });

  it('updates buyout modal state on openBuyoutCityModal and passBuyoutCity', () => {
    const tile = BOARD_TILES.find(t => t.name === 'BANGKOK') || BOARD_TILES[5];
    gameState.properties[tile.id].owner = 1;

    openBuyoutCityModal(tile, false);

    let state;
    const unsub1 = modalStore.subscribe(val => { state = val; });
    unsub1();

    assert.equal(state.buyout.visible, true);
    assert.equal(state.buyout.sellerName, 'Bob');
    assert.ok(state.buyout.buyoutCost > 0);

    passBuyoutCity();

    const unsub2 = modalStore.subscribe(val => { state = val; });
    unsub2();

    assert.equal(state.buyout.visible, false);
  });

  it('updates inspector modal state on openInspectorModal and closeInspectorModal', () => {
    const tile = BOARD_TILES[1];
    gameState.properties[tile.id].owner = 0; // Owned by Alice

    openInspectorModal(tile.id);

    let state;
    const unsub1 = modalStore.subscribe(val => { state = val; });
    unsub1();

    assert.equal(state.inspector.visible, true);
    assert.equal(state.inspector.isOwner, true);
    assert.equal(state.inspector.ownerName, 'Alice');

    closeInspectorModal();

    const unsub2 = modalStore.subscribe(val => { state = val; });
    unsub2();

    assert.equal(state.inspector.visible, false);
  });

  it('updates chance wheel state on openChanceWheelModal and spinChanceWheel', () => {
    openChanceWheelModal(false, 0);

    let state;
    const unsub1 = modalStore.subscribe(val => { state = val; });
    unsub1();

    assert.equal(state.chanceWheel.visible, true);
    assert.equal(state.chanceWheel.isSpinning, false);

    spinChanceWheel(0, 5, 0, false);

    const unsub2 = modalStore.subscribe(val => { state = val; });
    unsub2();

    assert.equal(state.chanceWheel.isSpinning, true);
  });

  it('updates festival boost modal state on openFestivalBoostModal and closeFestivalBoostModal', () => {
    const owned = [BOARD_TILES[1], BOARD_TILES[3]];
    gameState.properties[BOARD_TILES[1].id].owner = 0;
    gameState.properties[BOARD_TILES[3].id].owner = 0;

    openFestivalBoostModal(owned, false, 0);

    let state;
    const unsub1 = modalStore.subscribe(val => { state = val; });
    unsub1();

    assert.equal(state.festivalBoost.ownedProperties.length, 2);

    openFestivalBoostModalFromBanner();

    const unsub2 = modalStore.subscribe(val => { state = val; });
    unsub2();

    assert.equal(state.festivalBoost.visible, true);

    closeFestivalBoostModal(true);

    const unsub3 = modalStore.subscribe(val => { state = val; });
    unsub3();

    assert.equal(state.festivalBoost.visible, false);
  });

  it('resets all modals with closeAllModalsInStore', () => {
    updateModalSlice('trade', { visible: true });
    updateModalSlice('buyout', { visible: true });
    updateModalSlice('inspector', { visible: true });

    closeAllModalsInStore();

    let state;
    const unsub = modalStore.subscribe(val => { state = val; });
    unsub();

    assert.equal(state.trade.visible, false);
    assert.equal(state.buyout.visible, false);
    assert.equal(state.inspector.visible, false);
    assert.equal(state.chanceWheel.visible, false);
    assert.equal(state.festivalBoost.visible, false);
  });
});
