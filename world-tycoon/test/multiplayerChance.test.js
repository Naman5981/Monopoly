/**
 * test/multiplayerChance.test.js
 * Comprehensive unit test suite for Multiplayer Chance Fortune Card Synchronization:
 * - Card selection animation reception on remote spectators
 * - 3D flipped card reveal (winnerIdx, hasWon, wonPrize) in modalStore
 * - ACTION_CHANCE_SPIN and ACTION_CHANCE_PRIZE packet synchronization
 * - Preservation of in-flight reveal animation without premature modal destruction
 * - displayedCash synchronization and authoritative broadcastFullGameState on Host
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { gameState, displayedCash } from '../src/game/state.js';
import { networkState, networkCallbacks } from '../src/network/p2pState.js';
import { CHANCE_WHEEL_PRIZES, BOARD_TILES } from '../src/game/data.js';
import {
  openChanceWheelModal,
  spinChanceWheel,
  executeRemoteChanceSpin,
  revealChanceWinnerCard,
  handleRemoteChancePrize,
  clearChanceTimers
} from '../src/ui/modals/chanceWheel.js';
import { applyChancePrize } from '../src/game/engine/chance.js';
import { modalStore, updateModalSlice, getModalSlice } from '../src/svelte/stores/modalStore.js';
import { engineCallbacks } from '../src/ui/modals/common.js';

describe('Multiplayer Chance Card Reveal & State Transfer (/bug-hunter)', () => {
  let broadcastedActions;
  let broadcastedFullState;

  beforeEach(() => {
    broadcastedActions = [];
    broadcastedFullState = false;

    networkState.isMultiplayer = true;
    networkState.isHost = false;
    networkState.localPlayerIdx = 1; // Remote spectator (Guest)
    networkState.connections.clear();

    const mockConn = { open: true, send: (msg) => broadcastedActions.push(msg) };
    networkState.connections.set('peer-1', mockConn);
    networkState.hostConn = mockConn;

    gameState.gameStarted = true;
    gameState.phase = 'MODAL';
    gameState.currentPlayerIdx = 0; // Host (active player)
    gameState.pendingDoubles = false;
    gameState.festivalPot = 0;

    gameState.players = [
      { id: 0, name: 'Alice (Host)', cash: 1500000, position: 2, isAI: false, bankrupt: false },
      { id: 1, name: 'Bob (Guest)', cash: 1500000, position: 10, isAI: false, bankrupt: false }
    ];

    displayedCash[0] = 1500000;
    displayedCash[1] = 1500000;

    globalThis.window.broadcastFullGameState = () => {
      broadcastedFullState = true;
    };
  });

  afterEach(() => {
    clearChanceTimers();
  });

  it('broadcasts ACTION_CHANCE_SPIN with exact prizeIdx when active player initiates draw', () => {
    networkState.isHost = true;
    networkState.localPlayerIdx = 0; // Host is active
    gameState.currentPlayerIdx = 0;

    openChanceWheelModal(false, 0);
    spinChanceWheel(2, 5, 0, false, false);

    const spinAction = broadcastedActions.find(a => a.type === 'ACTION_CHANCE_SPIN');
    assert.notEqual(spinAction, undefined, 'Must broadcast ACTION_CHANCE_SPIN to peers');
    assert.equal(spinAction.prizeIdx, 2);
    assert.equal(spinAction.playerIdx, 0);
    assert.equal(spinAction.fullSpins, 5);
  });

  it('configures spectator modal and initiates remote sweep on receiving ACTION_CHANCE_SPIN', () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1; // Spectator
    gameState.currentPlayerIdx = 0; // Active player

    executeRemoteChanceSpin(0, 3, 6, false);

    const state = getModalSlice('chanceWheel');
    assert.equal(state.visible, true, 'Modal must be open on spectator screen');
    assert.equal(state.isSpectator, true, 'Spectator flag must be set');
    assert.equal(state.isSpinning, true, 'Card selecting animation must be active');
    assert.equal(state.winnerIdx, -1, 'Winner card must not be locked before sweep completes');
  });

  it('reveals winning card in 3D (hasWon=true, wonPrize, winnerIdx) on spectator screen', async () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1; // Spectator
    gameState.currentPlayerIdx = 0;

    openChanceWheelModal(false, 0);

    const targetPrize = CHANCE_WHEEL_PRIZES[0]; // +400K Grant
    let capturedWonState = null;
    const unsub = modalStore.subscribe(val => {
      if (val.chanceWheel?.hasWon) {
        capturedWonState = { ...val.chanceWheel };
      }
    });

    await revealChanceWinnerCard(0, targetPrize, 0, false, true);
    unsub();

    assert.notEqual(capturedWonState, null, 'Won state must be captured during reveal window');
    assert.equal(capturedWonState.hasWon, true, 'Winner state must be true on spectator screen');
    assert.equal(capturedWonState.winnerIdx, 0, 'Exact winner card index must be selected in Svelte');
    assert.notEqual(capturedWonState.wonPrize, null, 'Prize metadata must be populated for card front render');
    assert.equal(capturedWonState.wonPrize.title, '+400K CASH!');
    assert.equal(capturedWonState.playerName, 'Alice (Host)', 'Player name must be set for spectator card title');
  });

  it('handleRemoteChancePrize preserves in-flight spinning modal without destroying it', () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;

    openChanceWheelModal(false, 0);
    // Spin is in flight
    updateModalSlice('chanceWheel', { isSpinning: true });

    const targetPrize = CHANCE_WHEEL_PRIZES[1];
    handleRemoteChancePrize(0, targetPrize, false);

    // Modal must still be visible and spinning (not prematurely killed by showChanceAwardPopup)
    const state = getModalSlice('chanceWheel');
    assert.equal(state.visible, true, 'Modal must remain visible while sweep is in-flight');
    assert.equal(state.isSpinning, true, 'In-flight spin must not be interrupted');
  });

  it('transfers cash reward, updates displayedCash, and broadcasts full state on Host', async () => {
    networkState.isHost = true;
    networkState.localPlayerIdx = 0;

    const cashPrize = CHANCE_WHEEL_PRIZES[0]; // +400,000
    const initialCash = gameState.players[0].cash;

    await applyChancePrize(0, cashPrize, false, false, false);

    assert.equal(gameState.players[0].cash, initialCash + 400000, 'Authoritative cash must be credited');
    assert.equal(displayedCash[0], initialCash + 400000, 'displayedCash must update for HUD player cards');
  });

  it('transfers tax deduction, updates displayedCash and festivalPot, and broadcasts full state on Host', async () => {
    networkState.isHost = true;
    networkState.localPlayerIdx = 0;

    const taxPrize = CHANCE_WHEEL_PRIZES[2]; // -200,000 fine
    const initialCash = gameState.players[0].cash;

    await applyChancePrize(0, taxPrize, false, false, false);

    assert.equal(gameState.players[0].cash, initialCash - 200000, 'Authoritative cash must be deducted');
    assert.equal(displayedCash[0], initialCash - 200000, 'displayedCash must reflect deduction');
    assert.equal(gameState.festivalPot, 200000, 'Festival pool must receive tax fine');
  });

  it('transfers island detention and updates player state on both host and guest', async () => {
    networkState.isHost = true;
    networkState.localPlayerIdx = 0;

    const islandPrize = CHANCE_WHEEL_PRIZES[4]; // Go to Island
    await applyChancePrize(0, islandPrize, false, false, false);

    assert.equal(gameState.players[0].position, 8, 'Player must be teleported to Island (Tile 8)');
    assert.equal(gameState.players[0].inIsland, true, 'inIsland must be set to true');
    assert.equal(gameState.players[0].islandTurns, 0, 'islandTurns counter must be initialized');
  });

  it('transfers express jet flight to START, collects salary, and updates displayedCash', async () => {
    networkState.isHost = true;
    networkState.localPlayerIdx = 0;

    const startPrize = CHANCE_WHEEL_PRIZES[1]; // Fly to START
    const initialCash = gameState.players[0].cash;

    await applyChancePrize(0, startPrize, false, false, false);

    assert.equal(gameState.players[0].position, 0, 'Player must fly directly to START (Tile 0)');
    assert.equal(gameState.players[0].cash, initialCash + 350000, 'START bonus salary (+350k) must be awarded');
    assert.equal(displayedCash[0], initialCash + 350000, 'displayedCash must reflect START salary');
  });

  it('handleRemoteChancePrize resolves Rajasthan edition prizes without throwing ReferenceError', () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;

    const rajasthanJailPrize = {
      label: 'Desert Jail',
      type: 'island',
      desc: 'Detained in Thar Desert outpost. Miss turns unless bail is paid or doubles rolled.',
      themeColor: '#ef4444'
    };

    // Must not throw ReferenceError: pIdx is not defined or array lookup failure
    assert.doesNotThrow(() => {
      handleRemoteChancePrize(0, rajasthanJailPrize, false, 4);
    });

    const state = getModalSlice('chanceWheel');
    assert.equal(state.visible, true, 'Modal should be visible displaying the resolved prize');
  });

  it('concludes action phase and broadcasts full state after player sent to Island', async () => {
    networkState.isHost = true;
    networkState.localPlayerIdx = 0;

    let concludedPhase = false;
    globalThis.window.concludeActionPhase = (doubles) => {
      concludedPhase = true;
      gameState.phase = 'END';
    };

    const islandPrize = { type: 'island', label: 'Go to Island', desc: 'Detained' };
    await applyChancePrize(0, islandPrize, false, false, false);

    assert.equal(concludedPhase, true, 'Must conclude action phase on Island detention');
    const syncAction = broadcastedActions.find(a => a.type === 'FULL_STATE_SYNC');
    assert.notEqual(syncAction, undefined, 'Host must broadcast FULL_STATE_SYNC after concluding');
    assert.equal(gameState.players[0].inIsland, true);
    assert.equal(gameState.players[0].position, 8);
  });
});
