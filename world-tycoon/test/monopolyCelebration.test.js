import test from 'node:test';
import assert from 'node:assert/strict';
import { modalStore } from '../src/svelte/stores/modalStore.js';
import { openMonopolyCelebrationModal, closeMonopolyModal } from '../src/ui/modals/victory.js';
import { gameState } from '../src/game/state.js';
import { BOARD_TILES, GROUP_META, applyBoardEdition } from '../src/game/data.js';

test('Monopoly Celebration (Option C - Bottom Action Dock)', async (t) => {
  // Setup baseline game state
  applyBoardEdition('world');
  gameState.gameStarted = true;
  gameState.phase = 'ROLL';
  gameState.players = [
    { id: 0, name: 'Alice', colorHex: '#3b82f6', hatStyle: 0 },
    { id: 1, name: 'Bob', colorHex: '#ef4444', hatStyle: 1 }
  ];

  await t.test('opens monopoly celebration with rich deed data and visible=true', () => {
    openMonopolyCelebrationModal(0, 'lightblue');

    let currentSlice = null;
    const unsub = modalStore.subscribe(val => {
      currentSlice = val.monopolyCelebration;
    });
    unsub();

    assert.ok(currentSlice, 'monopolyCelebration slice exists');
    assert.equal(currentSlice.visible, true);
    assert.equal(currentSlice.winnerName, 'Alice');
    assert.equal(currentSlice.groupName, 'Sky Blue Set');
    assert.equal(currentSlice.groupColor, GROUP_META.lightblue.hex);
    assert.equal(currentSlice.playerColor, '#3b82f6');

    // Sky blue has 3 cities (Bengaluru, Bangkok, Athens)
    assert.equal(currentSlice.deedCards.length, 3);
    assert.equal(currentSlice.deedCards[0].name, 'BENGALURU');
    assert.ok(currentSlice.deedCards[0].rentFormatted.length > 0);
    assert.equal(currentSlice.deedCards[0].rentFormatted.includes('/ visit'), false, 'no duplicate / visit microcopy');
  });

  await t.test('closes monopoly celebration cleanly', () => {
    closeMonopolyModal();

    let currentSlice = null;
    const unsub = modalStore.subscribe(val => {
      currentSlice = val.monopolyCelebration;
    });
    unsub();

    assert.equal(currentSlice.visible, false);
  });

  await t.test('works for Rajasthan edition monopolies as well', () => {
    applyBoardEdition('rajasthan');
    openMonopolyCelebrationModal(1, 'brown');

    let currentSlice = null;
    const unsub = modalStore.subscribe(val => {
      currentSlice = val.monopolyCelebration;
    });
    unsub();

    assert.equal(currentSlice.visible, true);
    assert.equal(currentSlice.winnerName, 'Bob');
    assert.equal(currentSlice.groupName, 'Brown Set');
    // Brown set in Rajasthan has 2 cities: Bharatpur and Alwar
    assert.equal(currentSlice.deedCards.length, 2);
    assert.equal(currentSlice.deedCards[0].name, 'BHARATPUR');
    assert.equal(currentSlice.deedCards[1].name, 'ALWAR');

    closeMonopolyModal();
    applyBoardEdition('world');
  });
});
