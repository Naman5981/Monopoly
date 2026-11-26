import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { gameState } from '../src/game/state.js';
import { BOARD_TILES, CHANCE_WHEEL_PRIZES } from '../src/game/data.js';
import {
  openUpgradeCityModal,
  renderUpgradeModalContent,
  confirmUpgradeFromModal,
  closeUpgradeCityModal
} from '../src/ui/modals/upgradeCity.js';
import { PropertyLandingStrategy } from '../src/game/engine/strategies/PropertyLandingStrategy.js';
import { engineCallbacks } from '../src/ui/modals/common.js';
import { modalStore, updateModalSlice } from '../src/svelte/stores/modalStore.js';

function getUpgradeVisible() {
  let visible = false;
  modalStore.subscribe(v => { visible = Boolean(v?.upgradeCity?.visible); })();
  return visible;
}

describe('Upgrade City Modal & Chance Wheel Visual Optimization (/better-layout /fixing-motion-performance)', () => {
  beforeEach(() => {
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.upgradesThisVisit = 0;
    gameState.players = [
      { id: 'p0', name: 'Naman', cash: 2000000, isAI: false, position: 1 },
      { id: 'p1', name: 'Bot-1', cash: 1500000, isAI: true, position: 0 }
    ];
    // Property 1 (ATHENS)
    gameState.properties[1] = {
      owner: 0,
      level: 1,
      mortgaged: false
    };
  });

  it('populates clear player treasury balance and upgrade cost in modal state', () => {
    const tile = BOARD_TILES[1];
    renderUpgradeModalContent(tile);

    let modalState = {};
    const unsub = modalStore.subscribe(val => { modalState = val.upgradeCity || {}; });
    unsub();

    assert.equal(modalState.visible, true);
    assert.equal(modalState.playerCashFormatted, '2M');
    assert.equal(modalState.upgradeCostFormatted, '80K');
    assert.equal(modalState.remainingCashFormatted, '1.92M');
    assert.ok(modalState.canUpgrade, 'Player should be able to afford upgrade');
  });

  it('executes 1 level upgrade and immediately concludes and closes modal without second alert box', () => {
    const tile = BOARD_TILES[1];
    let actionConcluded = false;
    engineCallbacks.concludeActionPhase = () => { actionConcluded = true; };

    openUpgradeCityModal(tile, false);
    assert.equal(gameState.phase, 'MODAL');

    // Confirm upgrade 1 level
    confirmUpgradeFromModal();

    assert.equal(gameState.properties[1].level, 2, 'Property level should increment from 1 to 2');
    assert.equal(gameState.players[0].cash, 1920000, 'Cash should be deducted by houseCost (80k)');

    let modalState = {};
    const unsub = modalStore.subscribe(val => { modalState = val.upgradeCity || {}; });
    unsub();

    assert.equal(modalState.visible, false, 'Modal must close immediately after upgrading without asking again');
    assert.equal(actionConcluded, true, 'Turn action phase must be concluded');
  });

  it('verifies chance wheel prizes use calm alternating luxury palette instead of rainbow clutter', () => {
    assert.equal(CHANCE_WHEEL_PRIZES.length, 6);
    // Even slices should be slate-800 (#1e293b) and odd slices indigo-900 (#312e81)
    assert.equal(CHANCE_WHEEL_PRIZES[0].color, '#1e293b');
    assert.equal(CHANCE_WHEEL_PRIZES[1].color, '#312e81');
    assert.equal(CHANCE_WHEEL_PRIZES[2].color, '#1e293b');
    assert.equal(CHANCE_WHEEL_PRIZES[3].color, '#312e81');
    assert.equal(CHANCE_WHEEL_PRIZES[4].color, '#1e293b');
    assert.equal(CHANCE_WHEEL_PRIZES[5].color, '#312e81');
  });

  it('correctly upgrades tile.id (and not playerIdx) when bot lands on its self-owned property', async () => {
    // Setup bot player 1 owning tile 10 (Madrid)
    const targetTileId = 10;
    const tile = BOARD_TILES[targetTileId];
    gameState.players[1] = { id: 'p1', name: 'Baron', cash: 1500000, isAI: true, position: targetTileId };
    gameState.properties[targetTileId] = {
      owner: 1,
      level: 1,
      mortgaged: false
    };
    // Ensure player 0 owns tile 1 (Cairo) at level 1
    gameState.properties[1] = {
      owner: 0,
      level: 1,
      mortgaged: false
    };

    const strategy = new PropertyLandingStrategy();
    const initialBotCash = gameState.players[1].cash;
    let turnConcluded = false;
    global.window.concludeActionPhase = () => { turnConcluded = true; };

    await strategy.handleAIOwnedCityLanding(1, tile, false);

    // Verify tile 10 was upgraded (can upgrade 2 levels to level 3 if bot has ample cushion)
    assert.ok(gameState.properties[targetTileId].level >= 2, 'Bot property level must increment');
    assert.ok(gameState.players[1].cash < initialBotCash, 'Bot cash must be deducted by upgrade cost');

    // Verify tile 1 (playerIdx) was untouched and remains level 1
    assert.equal(gameState.properties[1].level, 1, 'Player 0 tile 1 must not be modified by bot upgrade');
    assert.equal(turnConcluded, true, 'Turn phase must conclude');
  });

  it('skips UpgradeCityModal and concludes turn when human cannot afford 1 level on self-owned city', async () => {
    const tile = BOARD_TILES[10];
    gameState.currentPlayerIdx = 0;
    gameState.phase = 'MOVING';
    gameState.players[0] = { id: 'p0', name: 'Host', cash: (tile.houseCost || 100000) - 1000, isAI: false, position: 10 };
    gameState.properties[10] = { owner: 0, level: 1, mortgaged: false };
    updateModalSlice('upgradeCity', { visible: false });

    let concluded = false;
    global.window.concludeActionPhase = () => { concluded = true; };

    const strategy = new PropertyLandingStrategy();
    await strategy.handleSelfOwnedProperty(0, gameState.players[0], tile, gameState.properties[10], false);

    assert.equal(getUpgradeVisible(), false, 'Upgrade modal must not open when cash < houseCost');
    assert.equal(concluded, true, 'Turn phase must conclude immediately');
    assert.notEqual(gameState.phase, 'MODAL');
  });

  it('skips UpgradeCityModal and concludes turn when human cannot afford 1 level on ally city', async () => {
    const tile = BOARD_TILES[10];
    gameState.currentPlayerIdx = 0;
    gameState.phase = 'MOVING';
    gameState.players[0] = { id: 'p0', name: 'Host', cash: 0, isAI: false, position: 10, teamId: 0 };
    gameState.players[1] = { id: 'p1', name: 'Ally', cash: 500000, isAI: false, position: 0, teamId: 0 };
    gameState.properties[10] = { owner: 1, level: 1, mortgaged: false };
    updateModalSlice('upgradeCity', { visible: false });

    let concluded = false;
    global.window.concludeActionPhase = () => { concluded = true; };

    const strategy = new PropertyLandingStrategy();
    await strategy.handleTeammateProperty(0, gameState.players[0], tile, gameState.properties[10], false);

    assert.equal(getUpgradeVisible(), false, 'Upgrade modal must not open on ally city when cash < houseCost');
    assert.equal(concluded, true, 'Turn phase must conclude immediately');
    assert.notEqual(gameState.phase, 'MODAL');
  });
});
