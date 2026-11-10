/**
 * test/svelte/phase2Hud.test.js
 * Verification of Phase 2: Reactive HUD & State synchronization via hudStore.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';

setupBrowserMocks();

import { hudStore, updateHudState, resetHudState } from '../../src/svelte/stores/hudStore.js';
import { gameState, matchSettings, setSoundVolume, toggleSoundEnabled } from '../../src/game/state.js';
import { updateGameSpeedUI, showTurnLockToast, updateRollButtonsUI, updateSoundUI, handleSetGameVolume } from '../../src/ui/hud/controls.js';
import { setStatusPill } from '../../src/ui/hud/statusPill.js';
import { renderCornerHUDs } from '../../src/ui/hud/cards.js';

describe('Phase 2: Reactive HUD & State Synchronization (/clean-code)', () => {
  before(() => {
    resetHudState();
  });

  it('initializes hudStore with standard game defaults', () => {
    let state;
    const unsub = hudStore.subscribe(val => { state = val; });
    unsub();

    assert.equal(state.clock, '00:00');
    assert.equal(state.gameSpeed, 1);
    assert.equal(state.monopolySets, '0/3 Sets');
    assert.equal(state.playerCount, '2/2');
    assert.equal(state.statusPill.visible, true);
  });

  it('synchronizes game speed controls into hudStore', () => {
    matchSettings.gameSpeed = 4;
    updateGameSpeedUI();

    let state;
    const unsub = hudStore.subscribe(val => { state = val; });
    unsub();

    assert.equal(state.gameSpeed, 4);

    matchSettings.gameSpeed = 2;
    updateGameSpeedUI();
    unsub();
    hudStore.subscribe(val => { state = val; })();
    assert.equal(state.gameSpeed, 2);
  });

  it('synchronizes toast notifications into hudStore', () => {
    showTurnLockToast('Custom turn message');

    let state;
    const unsub = hudStore.subscribe(val => { state = val; });
    unsub();

    assert.equal(state.toast.visible, true);
    assert.equal(state.toast.text, 'Custom turn message');
  });

  it('synchronizes status pill updates into hudStore', () => {
    setStatusPill('Rolling for Tokyo...', { isThinking: true, playerIdx: 0 });

    let state;
    const unsub = hudStore.subscribe(val => { state = val; });
    unsub();

    assert.equal(state.statusPill.text, 'Rolling for Tokyo...');
    assert.equal(state.statusPill.isThinking, true);
    assert.equal(state.statusPill.dotColor, '#3b82f6');
  });

  it('synchronizes roll button and bail states into hudStore during ROLL phase', () => {
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.players = [
      { name: 'Alice', isAI: false, cash: 200000, inIsland: true, islandTurns: 1, bankrupt: false },
      { name: 'Bot Bob', isAI: true, cash: 150000, inIsland: false, islandTurns: 0, bankrupt: false }
    ];

    updateRollButtonsUI(true);

    let state;
    const unsub = hudStore.subscribe(val => { state = val; });
    unsub();

    assert.equal(state.rollButton.visible, true);
    assert.equal(state.rollButton.label, 'Roll');
    assert.equal(state.rollButton.enabled, true);
    assert.equal(state.bailButton.visible, true);
    assert.equal(state.bailButton.canAfford, true);
  });

  it('synchronizes corner HUD cards and counts into hudStore', () => {
    gameState.players = [
      { name: 'Alice', isAI: false, cash: 250000, inIsland: false, bankrupt: false },
      { name: 'Bob', isAI: true, cash: 180000, inIsland: false, bankrupt: false }
    ];
    gameState.currentPlayerIdx = 0;

    renderCornerHUDs();

    let state;
    const unsub = hudStore.subscribe(val => { state = val; });
    unsub();

    assert.equal(state.playerCount, '2/2');
    assert.equal(state.leftPlayers.length, 1);
    assert.equal(state.rightPlayers.length, 1);
    assert.equal(state.leftPlayers[0].name, 'Alice');
    assert.equal(state.rightPlayers[0].name, 'Bob');
  });

  it('synchronizes audio volume changes into hudStore', () => {
    handleSetGameVolume(0.85);

    let state;
    const unsub = hudStore.subscribe(val => { state = val; });
    unsub();

    assert.equal(state.soundVolume, 85);
    assert.equal(state.soundEnabled, true);
  });
});
