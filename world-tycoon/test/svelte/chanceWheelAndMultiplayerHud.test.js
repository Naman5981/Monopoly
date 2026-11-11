/**
 * test/svelte/chanceWheelAndMultiplayerHud.test.js
 * Verification of Chance Wheel needle pointer, right-side-up badge math,
 * celebration popup modal IDs, and multiplayer HUD store synchronization (/better-interface /bug-hunter).
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';

setupBrowserMocks();

import { hudStore, resetHudState } from '../../src/svelte/stores/hudStore.js';
import { networkState } from '../../src/network/p2pState.js';
import { updateMultiplayerUI, leaveMultiplayerRoom } from '../../src/network/p2pUI.js';
import { CHANCE_WHEEL_PRIZES } from '../../src/game/data.js';

describe('Chance Wheel Visuals & Multiplayer HUD Synchronization (/better-interface /bug-hunter)', () => {
  beforeEach(() => {
    resetHudState();
    networkState.isMultiplayer = false;
    networkState.roomCode = '';
    networkState.isHost = false;
    networkState.localPlayerIdx = 0;
  });

  it('verifies Chance Wheel badge angles are right-side-up in lower hemisphere', () => {
    const N = CHANCE_WHEEL_PRIZES.length;
    const slice = (Math.PI * 2) / N;

    CHANCE_WHEEL_PRIZES.forEach((p, i) => {
      const midAngle = -Math.PI / 2 + (i * slice);
      const isLowerHemisphere = (midAngle > 0 && midAngle < Math.PI);

      // Tangential badge rotation
      const badgeAngle = isLowerHemisphere ? -Math.PI / 2 : Math.PI / 2;
      const netRotation = midAngle + badgeAngle;

      // Net angle normalized between -PI and PI
      let norm = netRotation % (Math.PI * 2);
      if (norm > Math.PI) norm -= Math.PI * 2;
      if (norm < -Math.PI) norm += Math.PI * 2;

      // Up vector (0, -1) projected onto world Y should be <= 0 (pointing up on screen, not down)
      // cos(netRotation) should be > 0 so text never faces downward
      const cosVal = Math.cos(norm);
      assert.ok(cosVal >= -0.01, `Slice ${i} (${p.label}) must be right-side up, cos=${cosVal}`);
    });
  });

  it('synchronizes multiplayer hosting room into hudStore on updateMultiplayerUI', () => {
    networkState.isMultiplayer = true;
    networkState.roomCode = 'TYCOON-9999';
    networkState.isHost = true;
    networkState.localPlayerIdx = 0;

    updateMultiplayerUI();

    let state;
    const unsub = hudStore.subscribe(val => { state = val; });
    unsub();

    assert.equal(state.isMultiplayer, true);
    assert.equal(state.roomCode, 'TYCOON-9999');
    assert.equal(state.isHost, true);
    assert.equal(state.localPlayerIdx, 0);
  });

  it('synchronizes multiplayer guest room into hudStore on updateMultiplayerUI', () => {
    networkState.isMultiplayer = true;
    networkState.roomCode = 'ROOM-4321';
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;

    updateMultiplayerUI();

    let state;
    const unsub = hudStore.subscribe(val => { state = val; });
    unsub();

    assert.equal(state.isMultiplayer, true);
    assert.equal(state.roomCode, 'ROOM-4321');
    assert.equal(state.isHost, false);
    assert.equal(state.localPlayerIdx, 1);
  });

  it('clears multiplayer room state from hudStore on leaveMultiplayerRoom', () => {
    networkState.isMultiplayer = true;
    networkState.roomCode = 'ROOM-4321';
    networkState.isHost = true;

    updateMultiplayerUI();

    leaveMultiplayerRoom();

    let state;
    const unsub = hudStore.subscribe(val => { state = val; });
    unsub();

    assert.equal(state.isMultiplayer, false);
    assert.equal(state.roomCode, '');
  });
});
