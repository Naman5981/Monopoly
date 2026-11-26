/**
 * test/chanceCardFanDeck.test.js
 * Verification of Concept C: 3D Mystery Chance Card Fan Deck (/anti-ui-slop /better-ui /multiplayer).
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { gameState } from '../src/game/state.js';
import { networkState } from '../src/network/p2pState.js';
import { CHANCE_WHEEL_PRIZES } from '../src/game/data.js';
import { modalStore } from '../src/svelte/stores/modalStore.js';
import { openChanceWheelModal, spinChanceWheel, clearChanceTimers } from '../src/ui/modals/chanceWheel.js';

describe('Concept C: 3D Mystery Chance Card Fan Deck Suite (/better-ui /multiplayer)', () => {
  beforeEach(() => {
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.players = [
      { id: 'p0', name: 'Naman', cash: 2000000, isAI: false, position: 12 },
      { id: 'p1', name: 'Bot-1', cash: 2000000, isAI: true, position: 0 }
    ];
    networkState.isMultiplayer = false;
    networkState.localPlayerIdx = 0;
  });

  afterEach(() => {
    clearChanceTimers();
  });

  it('verifies all 7 chance prizes have rich metadata, semantic colors, icons, and subtitles', () => {
    assert.equal(CHANCE_WHEEL_PRIZES.length, 7);
    CHANCE_WHEEL_PRIZES.forEach((p, i) => {
      assert.ok(p.label, `Prize ${i} must have label`);
      assert.ok(p.color && p.color.startsWith('#'), `Prize ${i} must have valid hex color`);
      assert.ok(p.icon, `Prize ${i} must have icon`);
      assert.ok(p.sub, `Prize ${i} must have subtitle tag`);
      assert.ok(p.title, `Prize ${i} must have title`);
      assert.ok(p.desc, `Prize ${i} must have description`);
    });
  });

  it('initializes modalStore with 3D card deck state on openChanceWheelModal', () => {
    openChanceWheelModal(false, 0);

    let currentSlice;
    const unsub = modalStore.subscribe(val => { currentSlice = val.chanceWheel; });
    unsub();

    assert.equal(currentSlice.visible, true);
    assert.equal(currentSlice.isSpinning, false);
    assert.equal(currentSlice.drawingIdx, -1);
    assert.equal(currentSlice.winnerIdx, -1);
    assert.equal(currentSlice.hasWon, false);
    assert.equal(currentSlice.wonPrize, null);
  });

  it('updates modalStore with winning prize and winnerIdx on card flip resolution', async () => {
    openChanceWheelModal(false, 0);
    spinChanceWheel(2, 5, 0, false); // Target index 2: Carbon Tax Audit

    let currentSlice;
    const unsub = modalStore.subscribe(val => { currentSlice = val.chanceWheel; });
    unsub();

    assert.equal(currentSlice.isSpinning, true);

    // Wait for the sweep (2050ms) to resolve the card flip
    await new Promise(r => setTimeout(r, 2200));

    const unsub2 = modalStore.subscribe(val => { currentSlice = val.chanceWheel; });
    unsub2();

    assert.equal(currentSlice.winnerIdx, 2);
    assert.equal(currentSlice.hasWon, true);
    assert.ok(currentSlice.wonPrize);
    assert.match(currentSlice.wonPrize.title, /TAX AUDIT/i);
  });

  it('configures spectator mode in multiplayer so observers watch card sweep', () => {
    networkState.isMultiplayer = true;
    networkState.localPlayerIdx = 1;
    networkState.isHost = false;

    openChanceWheelModal(false, 0);

    let currentSlice;
    const unsub = modalStore.subscribe(val => { currentSlice = val.chanceWheel; });
    unsub();

    assert.equal(currentSlice.visible, true);
    assert.equal(currentSlice.isSpectator, true);
  });

  it('verifies ChanceWheelModal renders clean single-hero card without duplicate outcome banner', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const sveltePath = fs.existsSync('src/svelte/modals/ChanceWheelModal.svelte')
      ? path.resolve('src/svelte/modals/ChanceWheelModal.svelte')
      : path.resolve('world-tycoon/src/svelte/modals/ChanceWheelModal.svelte');
    const content = fs.readFileSync(sveltePath, 'utf8');

    // No duplicate banner or stacked toast
    assert.ok(!content.includes('id="chance-wheel-won-banner"'), 'Must eliminate duplicate winner banner');

    // Card face separation: front face only in winner block, back face in unrevealed block (zero mirroring bleed)
    assert.ok(content.includes('{#if isWinner}'), 'Must isolate winner card face');
    assert.ok(content.includes('card-surface-front'), 'Must render card-surface-front for winner');
    assert.ok(content.includes('card-surface-back'), 'Must render card-surface-back for unrevealed cards');
  });

  it('supports direct interactive card picking with chosen card index', async () => {
    openChanceWheelModal(false, 0);
    spinChanceWheel(4); // Pick card index 4 directly

    let currentSlice;
    const unsub = modalStore.subscribe(val => { currentSlice = val.chanceWheel; });
    unsub();

    assert.equal(currentSlice.isSpinning, true);
    await new Promise(r => setTimeout(r, 2200));

    const unsub2 = modalStore.subscribe(val => { currentSlice = val.chanceWheel; });
    unsub2();

    assert.equal(currentSlice.winnerIdx, 4);
    assert.equal(currentSlice.hasWon, true);
  });
});
