import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import {
  BOARD_TILES,
  CHANCE_WHEEL_PRIZES,
  applyBoardEdition
} from '../src/game/data.js';
import { gameState, resetGameStateForNewMatch, matchSettings } from '../src/game/state.js';
import { applyChancePrize } from '../src/game/engine/chance.js';

test('Rajasthan Distinctive Chance Cards & Royal Fortune Deck', async (t) => {
  t.beforeEach(() => {
    resetGameStateForNewMatch(4);
    applyBoardEdition('rajasthan');
    matchSettings.boardEdition = 'rajasthan';
  });

  await t.test('verifies all 6 distinctive royal fortune cards are configured', () => {
    assert.equal(CHANCE_WHEEL_PRIZES.length, 6);

    const [vault, pushkar, cess, haveli, desertJail, startTrain] = CHANCE_WHEEL_PRIZES;

    // Slot 0: Amber Fort Vault
    assert.equal(vault.type, 'cash');
    assert.equal(vault.amount, 400000);
    assert.equal(vault.icon, '👑');
    assert.equal(vault.title, 'Amber Fort Vault');

    // Slot 1: Pushkar Fair Caravan (Target 16)
    assert.equal(pushkar.type, 'move');
    assert.equal(pushkar.target, 16);
    assert.equal(pushkar.icon, '🎪');
    assert.equal(pushkar.title, 'Pushkar Fair Caravan');

    // Slot 2: Heritage Trust Audit (-200K)
    assert.equal(cess.type, 'tax');
    assert.equal(cess.amount, 200000);
    assert.equal(cess.icon, '⚠️');
    assert.equal(cess.title, 'Heritage Trust Audit');

    // Slot 3: Maharaja's Architect Free Haveli
    assert.equal(haveli.type, 'upgrade');
    assert.equal(haveli.icon, '🏛️');
    assert.equal(haveli.title, "Maharaja's Architect");
    assert.equal(haveli.amount, 250000);

    // Slot 4: Desert Jail
    assert.equal(desertJail.type, 'island');
    assert.equal(desertJail.icon, '🏜️');
    assert.equal(desertJail.title, 'Thar Dust Storm');

    // Slot 5: Palace on Wheels Express to START (Target 0)
    assert.equal(startTrain.type, 'move');
    assert.equal(startTrain.target, 0);
    assert.equal(startTrain.icon, '🚂');
    assert.equal(startTrain.title, 'Palace on Wheels Express');
  });

  await t.test('Maharaja Architect upgrades lowest-level owned property for free', async () => {
    const haveliPrize = CHANCE_WHEEL_PRIZES.find(p => p.type === 'upgrade');
    assert.ok(haveliPrize);

    // Give player 0 two properties: Bundi (lvl 1) and Rawatbhata (lvl 0)
    gameState.properties[4] = { owner: 0, level: 1 };
    gameState.properties[5] = { owner: 0, level: 0 };

    const initialCash = gameState.players[0].cash;

    // Apply Maharaja's Architect
    await applyChancePrize(0, haveliPrize, false, true, false);

    // Lowest level (Rawatbhata) should have upgraded from 0 to 1
    assert.equal(gameState.properties[5].level, 1, 'Rawatbhata should upgrade to level 1');
    assert.equal(gameState.properties[4].level, 1, 'Bundi should remain level 1');
    assert.equal(gameState.players[0].cash, initialCash, 'Player cash must not be deducted for free upgrade');
  });

  await t.test('Maharaja Architect awards +250K grant fallback if player owns zero properties', async () => {
    const haveliPrize = CHANCE_WHEEL_PRIZES.find(p => p.type === 'upgrade');
    assert.ok(haveliPrize);

    // Clear all properties
    Object.keys(gameState.properties).forEach(id => {
      gameState.properties[id] = { owner: null, level: 0 };
    });

    const initialCash = gameState.players[0].cash;

    await applyChancePrize(0, haveliPrize, false, true, false);

    assert.equal(gameState.players[0].cash, initialCash + 250000, 'Must award 250K grant fallback');
  });

  await t.test('Pushkar Fair Caravan moves player directly to Tile 16 and triggers landing', async () => {
    const pushkarPrize = CHANCE_WHEEL_PRIZES.find(p => p.target === 16);
    assert.ok(pushkarPrize);

    let landingEvaluated = false;
    window.evaluateTileLanding = async (playerIdx, isDoubles) => {
      landingEvaluated = true;
      assert.equal(playerIdx, 0);
      assert.equal(gameState.players[0].position, 16);
    };

    await applyChancePrize(0, pushkarPrize, false, true, false);

    assert.equal(gameState.players[0].position, 16, 'Player must be on tile 16 (Pushkar Fair)');
    assert.ok(landingEvaluated, 'Tile landing evaluation must be triggered for festival');
  });

  await t.test('Palace on Wheels to START moves player to 0 and awards 350K salary', async () => {
    const startPrize = CHANCE_WHEEL_PRIZES.find(p => p.target === 0);
    assert.ok(startPrize);

    const initialCash = gameState.players[0].cash;
    gameState.players[0].position = 12; // on side 2

    await applyChancePrize(0, startPrize, false, true, false);

    assert.equal(gameState.players[0].position, 0, 'Player must advance to START');
    assert.equal(gameState.players[0].cash, initialCash + 350000, 'Must collect 350K START salary');
  });

  await t.test('Thar Dust Storm detains player in Desert Jail (Tile 8)', async () => {
    const jailPrize = CHANCE_WHEEL_PRIZES.find(p => p.type === 'island');
    assert.ok(jailPrize);

    gameState.players[0].position = 18;

    await applyChancePrize(0, jailPrize, false, true, false);

    assert.equal(gameState.players[0].position, 8, 'Player must be moved to Desert Jail (Tile 8)');
    assert.equal(gameState.players[0].inIsland, true, 'Player must have inIsland flag set');
  });

  await t.test('Amber Fort Vault adds 400K cash', async () => {
    const vaultPrize = CHANCE_WHEEL_PRIZES.find(p => p.type === 'cash');
    assert.ok(vaultPrize);

    const initialCash = gameState.players[0].cash;

    await applyChancePrize(0, vaultPrize, false, true, false);

    assert.equal(gameState.players[0].cash, initialCash + 400000, 'Must add 400K cash');
  });

  await t.test('Heritage Trust Audit deducts 200K cash and contributes to festival pot', async () => {
    const cessPrize = CHANCE_WHEEL_PRIZES.find(p => p.type === 'tax');
    assert.ok(cessPrize);

    const initialCash = gameState.players[0].cash;
    const initialPot = gameState.festivalPot || 0;

    await applyChancePrize(0, cessPrize, false, true, false);

    assert.equal(gameState.players[0].cash, initialCash - 200000, 'Must deduct 200K cash');
    assert.equal(gameState.festivalPot, initialPot + 200000, 'Must add 200K to festival pot');
  });
});
