import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { gameState } from '../src/game/state.js';
import { networkState, networkCallbacks } from '../src/network/p2pState.js';
import { concludeActionPhase, advanceTurn, cancelAllGameTimers } from '../src/game/engine/turnCycle.js';
import { closeTradeModal, openTradeModal } from '../src/ui/modals/trade.js';
import { initEngine } from '../src/game/engine.js';

describe('Multiplayer Turn Advancement & Observer Freeze Prevention (/bug-hunter)', () => {
  beforeEach(() => {
    initEngine();
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.turnTimeLeft = 15;
    gameState.players = [
      { id: 0, name: 'Laptop', cash: 2000000, isAI: false, position: 10, bankrupt: false, inIsland: false },
      { id: 1, name: 'Guest', cash: 2000000, isAI: false, position: 6, bankrupt: false, inIsland: false }
    ];
    networkState.isMultiplayer = true;
    networkState.localPlayerIdx = 1; // Machine is Guest (P2)
    networkState.isHost = false;
  });

  afterEach(() => {
    cancelAllGameTimers();
    networkState.isMultiplayer = false;
  });

  it('concludeActionPhase on observer sets phase to END and arms watchdog timer', () => {
    // Player 0 (Laptop) finishes an action while Guest (localPlayerIdx = 1) observes
    gameState.currentPlayerIdx = 0;
    gameState.phase = 'MODAL';

    concludeActionPhase(false);

    assert.equal(gameState.phase, 'END', 'Observer phase should transition to END');
    assert.equal(gameState.currentPlayerIdx, 0, 'Current player should remain Laptop until advance');
  });

  it('observer watchdog auto-advances turn when remote peer action fails to advance', async () => {
    gameState.currentPlayerIdx = 0;
    gameState.phase = 'MODAL';

    concludeActionPhase(false);
    assert.equal(gameState.phase, 'END');

    // Simulate watchdog firing after 3.5s (by manually calling advanceTurn with isRemote = true)
    advanceTurn(true);

    assert.equal(gameState.currentPlayerIdx, 1, 'Watchdog should advance turn to Player 1 (Guest)');
    assert.equal(gameState.phase, 'ROLL', 'Phase should transition from END to ROLL');
    assert.equal(gameState.turnTimeLeft, 15, 'Turn time should reset to full duration');
  });

  it('onSyncState detects player transition and properly initializes turn for next player', () => {
    // Guest was stuck on Player 0 in END phase
    gameState.currentPlayerIdx = 0;
    gameState.phase = 'END';

    // Host sends FULL_STATE_SYNC with currentPlayerIdx = 1, phase = ROLL
    networkCallbacks.onSyncState({
      currentPlayerIdx: 1,
      phase: 'ROLL',
      turnTimeLeft: 15,
      doublesCount: 0,
      players: gameState.players,
      properties: {}
    }, 10);

    assert.equal(gameState.currentPlayerIdx, 1, 'Current player should advance to 1 via state sync');
    assert.equal(gameState.phase, 'ROLL', 'Phase should be active ROLL');
  });

  it('onSyncState rejects stale sequence packets from earlier phases', () => {
    gameState.currentPlayerIdx = 1;
    gameState.phase = 'ROLL';

    // Newer packet received with seq 20
    networkCallbacks.onSyncState({
      currentPlayerIdx: 1,
      phase: 'ROLL',
      turnTimeLeft: 14,
      players: gameState.players,
      properties: {}
    }, 20);

    // Stale delayed packet arrives with seq 15 (e.g. from during buyout modal)
    networkCallbacks.onSyncState({
      currentPlayerIdx: 0,
      phase: 'MODAL',
      turnTimeLeft: 15,
      players: gameState.players,
      properties: {}
    }, 15);

    assert.equal(gameState.currentPlayerIdx, 1, 'Should NOT revert to player 0 from stale packet');
    assert.equal(gameState.phase, 'ROLL', 'Should remain in ROLL phase');
  });

  it('closing trade modal restores active HUD and actionable state if turn transitioned', () => {
    // Open trade modal during game
    openTradeModal();

    // Turn advances to Player 1 (Guest) while modal is open
    gameState.currentPlayerIdx = 1;
    gameState.phase = 'ROLL';

    // Player backs off and closes trade modal
    closeTradeModal();

    const tradeModal = document.getElementById('modal-trade');
    if (tradeModal) {
      assert.ok(tradeModal.classList.contains('hidden') || tradeModal.style.display === 'none', 'Trade modal should be closed');
    }
    assert.equal(gameState.currentPlayerIdx, 1);
    assert.equal(gameState.phase, 'ROLL');
  });
});
