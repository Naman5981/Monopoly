/**
 * test/svelte/phase5Lobby.test.js
 * Verification of Lobby setup reactive Svelte 5 store & player card roster synchronization.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';

setupBrowserMocks();

import { lobbyStore, updateLobbyStore, resetLobbyStore } from '../../src/svelte/stores/lobbyStore.js';
import { renderPlayerCards, togglePlayerRole } from '../../src/ui/setup/playerCards.js';
import { matchSettings, lobbyPlayerCount, setLobbyPlayerCount } from '../../src/game/state.js';
import { networkState } from '../../src/network/p2pState.js';

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

  it('reflects connected online peer state in lobbyStore', () => {
    networkState.isMultiplayer = true;
    matchSettings.customPlayers[1].isOnlinePeer = true;
    renderPlayerCards();
    let state;
    const unsub = lobbyStore.subscribe(val => { state = val; });
    unsub();
    networkState.isMultiplayer = false;
    assert.equal(state.players[1].isConnectedPeer, true);
  });

  it('tracks and resets portalRoomCode in lobbyStore for invite links', () => {
    updateLobbyStore({ portalRoomCode: 'P6ZL' });
    let state;
    const unsub = lobbyStore.subscribe(val => { state = val; });
    assert.equal(state.portalRoomCode, 'P6ZL');
    resetLobbyStore();
    assert.equal(state.portalRoomCode, '');
    unsub();
  });
});
