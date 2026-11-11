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
import { engineCallbacks } from '../src/ui/modals/common.js';
import { modalStore } from '../src/svelte/stores/modalStore.js';

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
});
