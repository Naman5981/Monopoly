/**
 * test/svelte/phase5Lobby.test.js
 * Verification of Lobby setup reactive Svelte 5 store & player card roster synchronization.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';

setupBrowserMocks();

import { lobbyStore, updateLobbyStore, resetLobbyStore } from '../../src/svelte/stores/lobbyStore.js';
import { renderPlayerCards, togglePlayerRole, buildPlayerCardActionControls } from '../../src/ui/setup/playerCards.js';
import { matchSettings, lobbyPlayerCount, setLobbyPlayerCount } from '../../src/game/state.js';

describe('Phase 5: Pre-Game Lobby & Svelte Store Synchronization (/clean-code)', () => {
  beforeEach(() => {
    resetLobbyStore();
  });

  it('initializes lobbyStore with default 4 players', () => {
    let state;
    const unsub = lobbyStore.subscribe(val => { state = val; });
    unsub();

    assert.equal(state.playerCount, 4);
    assert.equal(state.selectedPlayerIdx, 0);
    assert.equal(state.players.length, 4);
    assert.equal(state.players[0].name, 'TYCOON');
    assert.equal(state.players[0].isAI, false);
    assert.equal(state.players[1].isAI, true);
  });

  it('updates lobbyStore when updateLobbyStore is invoked', () => {
    updateLobbyStore({ playerCount: 3, selectedPlayerIdx: 2 });

    let state;
    const unsub = lobbyStore.subscribe(val => { state = val; });
    unsub();

    assert.equal(state.playerCount, 3);
    assert.equal(state.selectedPlayerIdx, 2);
  });

  it('synchronizes renderPlayerCards with lobbyStore', () => {
    matchSettings.customPlayers[0].name = 'TEST_LEADER';
    renderPlayerCards();

    let state;
    const unsub = lobbyStore.subscribe(val => { state = val; });
    unsub();

    assert.equal(state.players[0].name, 'TEST_LEADER');
  });

  it('preserves buildPlayerCardActionControls contract', () => {
    const controls = buildPlayerCardActionControls(1, false, true, true, true, false);
    assert.ok(controls.includes('ONLINE'), 'Must include ONLINE tag');
  });
});
