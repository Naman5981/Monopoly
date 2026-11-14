/**
 * test/spaceRoll.test.js
 * Unit tests verifying Space to Roll hotkey conditions, isAnyModalOpen, and isHumanTurnActionable.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { isAnyModalOpen, updateModalSlice, closeAllModalsInStore } from '../src/svelte/stores/modalStore.js';
import { gameState, isHumanTurnActionable, setLocalPlayerIdx } from '../src/game/state.js';
import { hudStore, updateHudState } from '../src/svelte/stores/hudStore.js';
import { get } from 'svelte/store';

describe('Space to Roll & Modal Blocking Logic', () => {
  beforeEach(() => {
    closeAllModalsInStore();
    setLocalPlayerIdx(0);
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.players = [
      { id: 0, name: 'Human', isAI: false, cash: 2000000 },
      { id: 1, name: 'Bot', isAI: true, cash: 2000000 }
    ];
    updateHudState({
      rollButton: { visible: true, label: 'Roll', enabled: true }
    });
  });

  test('isAnyModalOpen returns false when initial state has no open modals', () => {
    assert.equal(isAnyModalOpen(), false);
  });

  test('isAnyModalOpen returns true when any modal slice is opened', () => {
    updateModalSlice('rules', { visible: true });
    assert.equal(isAnyModalOpen(), true);

    updateModalSlice('rules', { visible: false });
    assert.equal(isAnyModalOpen(), false);

    updateModalSlice('buyCity', { visible: true });
    assert.equal(isAnyModalOpen(), true);

    closeAllModalsInStore();
    assert.equal(isAnyModalOpen(), false);
  });

  test('isHumanTurnActionable correctly identifies when human can roll or advance turn', () => {
    // Human turn in ROLL phase
    assert.equal(isHumanTurnActionable(), true);

    // Human turn in END phase
    gameState.phase = 'END';
    assert.equal(isHumanTurnActionable(), true);

    // Human turn in MOVING phase (rolling in progress)
    gameState.phase = 'MOVING';
    assert.equal(isHumanTurnActionable(), false);

    // AI turn in ROLL phase
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 1;
    assert.equal(isHumanTurnActionable(), false);
  });

  test('StatusPill hudStore rollButton accurately reflects actionable state', () => {
    let s = get(hudStore);
    assert.equal(s.rollButton.visible, true);
    assert.equal(s.rollButton.enabled, true);

    updateHudState({ rollButton: { visible: false, label: 'Roll', enabled: false } });
    s = get(hudStore);
    assert.equal(s.rollButton.visible, false);
    assert.equal(s.rollButton.enabled, false);
  });
});
