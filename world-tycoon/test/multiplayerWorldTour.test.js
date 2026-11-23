/**
 * test/multiplayerWorldTour.test.js
 * Comprehensive unit test suite for Multiplayer World Tour Flight Selection & State Parity:
 * - AirportLandingStrategy sets gameState.phase = 'WORLD_TOUR' across all peers (Host & Guest)
 * - Authoritative Host broadcasts broadcastFullGameState with phase = 'WORLD_TOUR'
 * - Active player vs remote observer visual state isolation (banner, highlights, status pills)
 * - Chance card move to Tile 24 establishes WORLD_TOUR phase without stale 'MOVING' overwrite
 * - onSyncState preserves active player's WORLD_TOUR phase against transient sync packets
 * - onSyncState updates spectator phase to WORLD_TOUR when incomingState is WORLD_TOUR
 * - onTileClick executes executeWorldTourFlight and NEVER opens the property inspector modal
 * - Observer clicking tile during another player's World Tour returns cleanly without opening inspector
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { gameState, displayedCash } from '../src/game/state.js';
import { networkState, networkCallbacks } from '../src/network/p2pState.js';
import { BOARD_TILES } from '../src/game/data.js';
import { AirportLandingStrategy } from '../src/game/engine/strategies/AirportLandingStrategy.js';
import { applyChancePrize } from '../src/game/engine/chance.js';
import { executeWorldTourFlight } from '../src/game/engine/flight.js';
import { initEngine } from '../src/game/engine.js';
import { handleTileClick } from '../src/game/engine/tileClick.js';

describe('Multiplayer World Tour Flight Selection Parity', () => {
  let broadcastedActions;
  let flightEvaluatedDest;

  beforeEach(() => {
    broadcastedActions = [];
    flightEvaluatedDest = null;

    globalThis.__WT_TEST__ = true;

    networkState.isMultiplayer = true;
    networkState.isHost = false;
    networkState.localPlayerIdx = 1; // Bob (Guest)
    networkState.connections.clear();

    const mockConn = { open: true, send: (msg) => broadcastedActions.push(msg) };
    networkState.connections.set('peer-host', mockConn);
    networkState.hostConn = mockConn;

    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 1; // Bob's turn
    gameState.pendingDoubles = false;
    gameState.festivalPot = 0;

    gameState.players = [
      { id: 0, name: 'Alice (Host)', cash: 1500000, position: 0, isAI: false, bankrupt: false },
      { id: 1, name: 'Bob (Guest)', cash: 1500000, position: 24, isAI: false, bankrupt: false }
    ];

    displayedCash[0] = 1500000;
    displayedCash[1] = 1500000;

    // Reset banner DOM
    let banner = document.getElementById('world-tour-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'world-tour-banner';
      document.body.appendChild(banner);
    }
    banner.classList.add('hidden');
    banner.classList.remove('flex');

    // Reset inspector modal DOM
    let insp = document.getElementById('modal-tile-inspector');
    if (!insp) {
      insp = document.createElement('div');
      insp.id = 'modal-tile-inspector';
      document.body.appendChild(insp);
    }
    insp.classList.add('hidden');
    insp.classList.remove('flex');

    initEngine();
  });

  afterEach(() => {
    delete globalThis.__WT_TEST__;
  });

  it('1. AirportLandingStrategy sets phase = WORLD_TOUR and shows banner on active Guest', async () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1; // Active guest

    const strategy = new AirportLandingStrategy(async (pIdx, dest) => {
      flightEvaluatedDest = dest;
    });

    await strategy.execute({
      playerIdx: 1,
      player: gameState.players[1]
    });

    assert.equal(gameState.phase, 'WORLD_TOUR', 'Phase must be set to WORLD_TOUR');
    const banner = document.getElementById('world-tour-banner');
    assert.equal(banner?.classList.contains('hidden'), false, 'Banner must be visible for active player');
  });

  it('2. AirportLandingStrategy sets phase = WORLD_TOUR and broadcasts full state on Host for Guest landing', async () => {
    networkState.isHost = true;
    networkState.localPlayerIdx = 0; // Host is observing Guest (playerIdx = 1)

    const strategy = new AirportLandingStrategy(async (pIdx, dest) => {
      flightEvaluatedDest = dest;
    });

    await strategy.execute({
      playerIdx: 1,
      player: gameState.players[1]
    });

    assert.equal(gameState.phase, 'WORLD_TOUR', 'Host must also set phase to WORLD_TOUR');
    const banner = document.getElementById('world-tour-banner');
    assert.equal(banner?.classList.contains('hidden'), true, 'Banner must remain hidden on observer');

    const syncMsg = broadcastedActions.find(a => a.type === 'FULL_STATE_SYNC');
    assert.ok(syncMsg, 'Host must broadcast FULL_STATE_SYNC upon entering WORLD_TOUR');
    assert.equal(syncMsg.gameState.phase, 'WORLD_TOUR', 'Broadcasted phase must be WORLD_TOUR');
  });

  it('3. onSyncState does not downgrade active Guest WORLD_TOUR phase to MOVING', () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1; // Guest
    gameState.phase = 'WORLD_TOUR';
    gameState.currentPlayerIdx = 1;

    // Simulate stale in-flight FULL_STATE_SYNC from Host arriving with phase = 'MOVING'
    networkCallbacks.onSyncState({
      currentPlayerIdx: 1,
      phase: 'MOVING',
      players: [
        { id: 0, name: 'Alice (Host)', cash: 1500000, position: 0 },
        { id: 1, name: 'Bob (Guest)', cash: 1500000, position: 24 }
      ],
      properties: {}
    }, 1);

    assert.equal(gameState.phase, 'WORLD_TOUR', 'Active Guest phase must remain protected as WORLD_TOUR');
  });

  it('4. onSyncState updates spectator phase to WORLD_TOUR when incomingState is WORLD_TOUR', () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1; // Guest observing Host (playerIdx = 0)
    gameState.phase = 'MOVING';
    gameState.currentPlayerIdx = 0;

    networkCallbacks.onSyncState({
      currentPlayerIdx: 0,
      phase: 'WORLD_TOUR',
      players: [
        { id: 0, name: 'Alice (Host)', cash: 1500000, position: 24 },
        { id: 1, name: 'Bob (Guest)', cash: 1500000, position: 10 }
      ],
      properties: {}
    }, 2);

    assert.equal(gameState.phase, 'WORLD_TOUR', 'Spectator phase must synchronize to WORLD_TOUR');
  });

  it('5. Chance card World Tour triggers Airport landing and establishes WORLD_TOUR phase', async () => {
    networkState.isHost = true;
    networkState.localPlayerIdx = 0;
    gameState.currentPlayerIdx = 1; // Guest drawing card

    let landingEvaluated = false;
    window.evaluateTileLanding = async (pIdx, isDoubles) => {
      landingEvaluated = true;
      const strategy = new AirportLandingStrategy();
      await strategy.execute({ playerIdx: pIdx, player: gameState.players[pIdx] });
    };

    const prize = {
      label: 'World Tour!',
      type: 'move',
      target: 24,
      desc: 'VIP Ticket to World Tour Airport!'
    };

    await applyChancePrize(1, prize, false, false, false);

    assert.equal(gameState.players[1].position, 24, 'Player position must be 24');
    assert.equal(landingEvaluated, true, 'evaluateTileLanding must have executed');
    assert.equal(gameState.phase, 'WORLD_TOUR', 'Phase must be WORLD_TOUR after Chance move');

    const syncMessages = broadcastedActions.filter(a => a.type === 'FULL_STATE_SYNC');
    const lastSync = syncMessages[syncMessages.length - 1];
    assert.ok(lastSync, 'Host must broadcast FULL_STATE_SYNC');
    assert.equal(lastSync.gameState.phase, 'WORLD_TOUR', 'Last broadcasted phase must be WORLD_TOUR');
  });

  it('6. executeWorldTourFlight updates position, sets phase = MOVING, and broadcasts ACTION_WORLD_TOUR', async () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;
    gameState.phase = 'WORLD_TOUR';
    gameState.currentPlayerIdx = 1;
    gameState.players[1].position = 24;

    const banner = document.getElementById('world-tour-banner');
    banner?.classList.remove('hidden');

    let landingTarget = null;
    await executeWorldTourFlight(10, false, 1, async (pIdx) => {
      landingTarget = gameState.players[pIdx].position;
    });

    assert.equal(gameState.players[1].position, 10, 'Player must fly to tile 10');
    assert.equal(banner?.classList.contains('hidden'), true, 'Banner must be hidden after flight');
    assert.equal(landingTarget, 10, 'Landing evaluation must run on destination tile');

    const flightAction = broadcastedActions.find(a => a.type === 'ACTION_WORLD_TOUR');
    assert.ok(flightAction, 'Must broadcast ACTION_WORLD_TOUR');
    assert.equal(flightAction.destTileId, 10, 'Must broadcast destination tile 10');
  });

  it('7. onTileClick during WORLD_TOUR executes flight and never opens inspector modal', () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;
    gameState.phase = 'WORLD_TOUR';
    gameState.currentPlayerIdx = 1; // Bob's turn
    gameState.players[1].position = 24;

    const banner = document.getElementById('world-tour-banner');
    banner?.classList.remove('hidden');

    const insp = document.getElementById('modal-tile-inspector');
    insp?.classList.add('hidden');

    let flightExecutedTile = null;
    window.executeWorldTourFlight = (destTileId) => {
      flightExecutedTile = destTileId;
    };

    handleTileClick(14); // Click Berlin (tile 14)

    assert.equal(flightExecutedTile, 14, 'Must execute flight to clicked tile');
    assert.equal(insp?.classList.contains('hidden'), true, 'Inspector modal must NEVER open during World Tour');
  });

  it('8. onTileClick by spectator during another player WORLD_TOUR returns cleanly without opening inspector', () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1; // Bob (spectator)
    gameState.phase = 'WORLD_TOUR';
    gameState.currentPlayerIdx = 0; // Alice's turn
    gameState.players[0].position = 24;

    const insp = document.getElementById('modal-tile-inspector');
    insp?.classList.add('hidden');

    let flightExecuted = false;
    window.executeWorldTourFlight = () => {
      flightExecuted = true;
    };

    handleTileClick(14);

    assert.equal(flightExecuted, false, 'Spectator must not trigger flight');
    assert.equal(insp?.classList.contains('hidden'), true, 'Inspector modal must not open for spectator in WORLD_TOUR');
  });
});
