/**
 * test/multiplayer/multiplayerSpeedTurbo.test.js
 * Verification that turbo / game speed controls are disabled and locked to 1x in multiplayer.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';

setupBrowserMocks();

import { matchSettings, cycleGameSpeed } from '../../src/game/state.js';
import { networkState } from '../../src/network/p2pState.js';
import { updateGameSpeedUI } from '../../src/ui/hud/controls.js';
import { updateMultiplayerUI } from '../../src/network/p2pUI.js';
import { createSafeLobbyStatePacket } from '../../src/network/protocol.js';
import { hudStore, resetHudState } from '../../src/svelte/stores/hudStore.js';

describe('Multiplayer Speed & Turbo Mode Lockout', () => {
  beforeEach(() => {
    resetHudState();
    networkState.isMultiplayer = false;
    networkState.isHost = false;
    matchSettings.gameSpeed = 1;
  });

  it('allows cycling game speeds (1x -> 2x -> 4x Turbo) in offline/singleplayer', () => {
    networkState.isMultiplayer = false;
    matchSettings.gameSpeed = 1;

    const s1 = cycleGameSpeed();
    assert.equal(s1, 2);
    assert.equal(matchSettings.gameSpeed, 2);

    const s2 = cycleGameSpeed();
    assert.equal(s2, 4);
    assert.equal(matchSettings.gameSpeed, 4);

    const s3 = cycleGameSpeed();
    assert.equal(s3, 1);
    assert.equal(matchSettings.gameSpeed, 1);
  });

  it('locks game speed to 1x and blocks cycling when in multiplayer', () => {
    networkState.isMultiplayer = true;
    matchSettings.gameSpeed = 4; // Simulated legacy state

    const speed = cycleGameSpeed();
    assert.equal(speed, 1, 'cycleGameSpeed must return 1 in multiplayer');
    assert.equal(matchSettings.gameSpeed, 1, 'matchSettings.gameSpeed must be locked to 1');

    let hud;
    const unsub = hudStore.subscribe(val => { hud = val; });
    unsub();
    assert.equal(hud.gameSpeed, 1, 'hudStore must reflect 1x speed');
  });

  it('updateGameSpeedUI enforces 1x in hudStore and matchSettings in multiplayer', () => {
    networkState.isMultiplayer = true;
    matchSettings.gameSpeed = 4;

    updateGameSpeedUI();

    assert.equal(matchSettings.gameSpeed, 1);
    let hud;
    const unsub = hudStore.subscribe(val => { hud = val; });
    unsub();
    assert.equal(hud.gameSpeed, 1);
  });

  it('updateMultiplayerUI resets game speed to 1x and updates hudStore', () => {
    networkState.isMultiplayer = true;
    matchSettings.gameSpeed = 2;

    updateMultiplayerUI();

    assert.equal(matchSettings.gameSpeed, 1);
    let hud;
    const unsub = hudStore.subscribe(val => { hud = val; });
    unsub();
    assert.equal(hud.isMultiplayer, true);
    assert.equal(hud.gameSpeed, 1);
  });

  it('createSafeLobbyStatePacket guarantees standard 1x game speed', () => {
    matchSettings.gameSpeed = 4;
    const packet = createSafeLobbyStatePacket(matchSettings, [], 2);
    assert.equal(packet.matchSettings.gameSpeed, 1, 'Multiplayer lobby packet must specify 1x gameSpeed');
  });
});
