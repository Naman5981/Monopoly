/**
 * test/islandBailUI.test.js
 * Unit tests verifying Island Detention bail controls, visibility on center board
 * and bottom dock, affordability checks, and post-bail state transitions.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { gameState, isHumanTurnActionable, setLocalPlayerIdx } from '../src/game/state.js';
import { networkState } from '../src/network/p2pState.js';
import { updateRollButtonsUI, refreshActivePlayerTurnStatus } from '../src/ui/hud.js';
import { handlePayIslandBail } from '../src/game/engine/turnCycle.js';

describe('Island Detention Bail UI & Lifecycle (/bug-hunter)', () => {
  let btnBottomRoll, btnCenterRoll, btnBottomBail, btnCenterBail, lblBottomBail, lblCenterBail, statusPillText;

  beforeEach(() => {
    networkState.isMultiplayer = false;
    networkState.isHost = true;
    networkState.localPlayerIdx = 0;
    setLocalPlayerIdx(0);

    gameState.gameStarted = true;
    gameState.currentPlayerIdx = 0;
    gameState.phase = 'ROLL';
    gameState.festivalPot = 20000;
    gameState.players = [
      { id: 0, name: 'Alice', cash: 500000, position: 8, inIsland: true, islandTurns: 0, isAI: false, bankrupt: false },
      { id: 1, name: 'Bob', cash: 500000, position: 0, inIsland: false, islandTurns: 0, isAI: false, bankrupt: false }
    ];

    btnBottomRoll = document.getElementById('btn-bottom-roll');
    btnCenterRoll = document.getElementById('btn-center-roll');
    btnBottomBail = document.getElementById('btn-escape-island');
    btnCenterBail = document.getElementById('btn-center-escape-island');
    lblBottomBail = document.getElementById('bottom-bail-label');
    lblCenterBail = document.getElementById('center-bail-label');
    statusPillText = document.getElementById('hud-status-pill-text');
  });

  it('reveals both center and bottom bail buttons in enabled state when player has >= $150K cash', () => {
    gameState.players[0].inIsland = true;
    gameState.players[0].cash = 350000;
    gameState.phase = 'ROLL';

    updateRollButtonsUI(true);

    assert.equal(btnBottomBail.classList.contains('hidden'), false, 'Bottom bail button should not be hidden');
    assert.equal(btnBottomBail.style.display, 'inline-flex', 'Bottom bail button should display inline-flex');
    assert.equal(btnBottomBail.disabled, false, 'Bottom bail button should be enabled');
    assert.equal(btnBottomBail.getAttribute('aria-disabled'), 'false');
    assert.equal(lblBottomBail.textContent, 'Pay 150K Bail');

    assert.equal(btnCenterBail.classList.contains('hidden'), false, 'Center bail button should not be hidden');
    assert.equal(btnCenterBail.style.display, 'inline-flex', 'Center bail button should display inline-flex');
    assert.equal(btnCenterBail.disabled, false, 'Center bail button should be enabled');
    assert.equal(btnCenterBail.getAttribute('aria-disabled'), 'false');
    assert.equal(lblCenterBail.textContent, 'Pay 150K Bail');
  });

  it('reveals bail buttons in disabled state when player is stuck on island but has < $150K cash', () => {
    gameState.players[0].inIsland = true;
    gameState.players[0].cash = 95000;
    gameState.phase = 'ROLL';

    updateRollButtonsUI(true);

    assert.equal(btnBottomBail.classList.contains('hidden'), false, 'Bottom bail button must remain visible');
    assert.equal(btnBottomBail.style.display, 'inline-flex');
    assert.equal(btnBottomBail.disabled, true, 'Bottom bail button must be disabled when unaffordable');
    assert.equal(btnBottomBail.getAttribute('aria-disabled'), 'true');
    assert.equal(lblBottomBail.textContent, 'Need 150K Bail');
    assert.ok(btnBottomBail.title.includes('Need $150K bail'));

    assert.equal(btnCenterBail.classList.contains('hidden'), false, 'Center bail button must remain visible');
    assert.equal(btnCenterBail.style.display, 'inline-flex');
    assert.equal(btnCenterBail.disabled, true, 'Center bail button must be disabled when unaffordable');
    assert.equal(btnCenterBail.getAttribute('aria-disabled'), 'true');
    assert.equal(lblCenterBail.textContent, 'Need 150K Bail');
  });

  it('hides both bail buttons when the player is not on island', () => {
    gameState.players[0].inIsland = false;
    gameState.phase = 'ROLL';

    updateRollButtonsUI(true);

    assert.equal(btnBottomBail.classList.contains('hidden'), true, 'Bottom bail button should be hidden');
    assert.equal(btnBottomBail.style.display, 'none');
    assert.equal(btnCenterBail.classList.contains('hidden'), true, 'Center bail button should be hidden');
    assert.equal(btnCenterBail.style.display, 'none');
  });

  it('hides both bail buttons during non-actionable turn (e.g. AI turn or multiplayer observer)', () => {
    gameState.players[0].inIsland = true;
    gameState.players[0].cash = 300000;
    gameState.players[0].isAI = true;

    updateRollButtonsUI(false);

    assert.equal(btnBottomBail.classList.contains('hidden'), true);
    assert.equal(btnCenterBail.classList.contains('hidden'), true);
  });

  it('handlePayIslandBail deducts $150K, frees player, updates pot, and hides bail buttons immediately', () => {
    gameState.players[0].inIsland = true;
    gameState.players[0].islandTurns = 2;
    gameState.players[0].cash = 400000;
    gameState.festivalPot = 50000;

    handlePayIslandBail();

    assert.equal(gameState.players[0].cash, 250000, 'Cash should be deducted by $150K');
    assert.equal(gameState.festivalPot, 200000, 'Festival pot should increase by $150K');
    assert.equal(gameState.players[0].inIsland, false, 'Player should be freed from Island');
    assert.equal(gameState.players[0].islandTurns, 0, 'Island turns count should be reset to 0');

    // UI should immediately hide bail buttons once freed
    assert.equal(btnBottomBail.classList.contains('hidden'), true, 'Bottom bail button should now be hidden');
    assert.equal(btnCenterBail.classList.contains('hidden'), true, 'Center bail button should now be hidden');

    // Roll button should remain available to roll
    assert.equal(btnBottomRoll.disabled, false);
    assert.equal(btnCenterRoll.disabled, false);
  });

  it('handlePayIslandBail aborts without side effects if player lacks $150K cash or is not on island', () => {
    gameState.players[0].inIsland = true;
    gameState.players[0].cash = 80000;
    gameState.festivalPot = 10000;

    handlePayIslandBail();

    assert.equal(gameState.players[0].cash, 80000, 'Cash should remain unchanged');
    assert.equal(gameState.festivalPot, 10000, 'Pot should remain unchanged');
    assert.equal(gameState.players[0].inIsland, true, 'Player should remain on island');

    gameState.players[0].inIsland = false;
    gameState.players[0].cash = 500000;
    handlePayIslandBail();
    assert.equal(gameState.players[0].cash, 500000, 'Non-island player should not pay bail');
  });

  it('refreshActivePlayerTurnStatus provides clear guidance on bail vs rolling doubles', () => {
    gameState.players[0].inIsland = true;
    gameState.players[0].islandTurns = 1;
    gameState.players[0].cash = 250000;

    refreshActivePlayerTurnStatus();
    assert.ok(statusPillText.innerHTML.includes('Island Detention (1/3)'));
    assert.ok(statusPillText.innerHTML.includes('Pay $150K bail or roll doubles'));

    gameState.players[0].cash = 50000;
    refreshActivePlayerTurnStatus();
    assert.ok(statusPillText.innerHTML.includes('Need $150K for bail'));
  });
});
