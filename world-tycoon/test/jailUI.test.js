import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';

setupBrowserMocks();

const { gameState, displayedCash } = await import('../src/game/state.js');
const { renderCornerHUDs } = await import('../src/ui/hud/cards.js');
const { animateIslandDetentionBars, animateIslandJailbreak } = await import('../src/ui/anim/events.js');

test('Jail UI Readability & Island Detention Card Optimization (/better-ui)', async (t) => {
  // Setup 2 players
  gameState.players = [
    { id: 0, name: 'ALEX', cash: 2000000, position: 8, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false },
    { id: 1, name: 'BARON', cash: 1500000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: true }
  ];
  displayedCash[0] = 2000000;
  displayedCash[1] = 1500000;
  gameState.currentPlayerIdx = 0;
  gameState.gameStarted = true;

  await t.test('renderCornerHUDs mounts .island-iron-bars and adds .in-island-detention when player is in island', () => {
    gameState.players[1].inIsland = true;
    gameState.players[1].islandTurns = 1;

    renderCornerHUDs();

    const card = document.getElementById('hud-card-1');
    assert.ok(card, 'Card 1 must exist');
    assert.ok(card.classList.contains('in-island-detention'), 'Card 1 must have in-island-detention class');

    const bars = card.querySelector('.island-iron-bars');
    assert.ok(bars, '.island-iron-bars element must be mounted on card');
    assert.equal(bars.children.length, 4, 'Must have 4 iron rods for shatter animation');

    const badge = card.querySelector('.hud-detention-badge');
    assert.ok(badge, 'Detention badge must exist in card header');
    assert.ok(badge.textContent.includes('JAIL 1/3'), `Badge text must indicate turn, got: ${badge.textContent}`);

    // Verify player name and cash value remain intact
    const nameEl = card.querySelector('.hud-player-name');
    assert.equal(nameEl.textContent, 'BARON');

    const cashEl = document.getElementById('hud-cash-val-1');
    assert.ok(cashEl.textContent.includes('1.5M'));
  });

  await t.test('animateIslandDetentionBars adds in-island-detention and creates iron rods without blur classes', () => {
    const card = document.getElementById('hud-card-0');
    assert.ok(card);

    animateIslandDetentionBars(0);

    assert.ok(card.classList.contains('in-island-detention'));
    const bars = card.querySelector('.island-iron-bars');
    assert.ok(bars);
    assert.ok(!bars.className.includes('backdrop-blur'), 'Bars overlay must not contain blur classes');
    assert.ok(!bars.className.includes('bg-slate-950/40'), 'Bars overlay must not have heavy opaque dark mud');
  });

  await t.test('animateIslandJailbreak removes bars and clears detention class from card', () => {
    const card = document.getElementById('hud-card-0');
    assert.ok(card);

    animateIslandJailbreak(0);

    assert.ok(!card.classList.contains('in-island-detention'), 'Card must no longer have in-island-detention class');
  });

  await t.test('renderCornerHUDs removes bars and detention styling when player escapes island', () => {
    gameState.players[1].inIsland = false;
    gameState.players[1].islandTurns = 0;

    renderCornerHUDs();

    const card = document.getElementById('hud-card-1');
    assert.ok(!card.classList.contains('in-island-detention'), 'Card 1 must remove in-island-detention');
    const bars = card.querySelector('.island-iron-bars');
    assert.equal(bars, null, 'Iron bars element must be removed when released');

    const islandEl = card.querySelector('.hud-island-icon');
    assert.equal(islandEl.innerHTML, '', 'Detention badge must be cleared when released from island');
  });
});
