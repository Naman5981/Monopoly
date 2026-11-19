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

  await t.test('after 3 chances, player is forced to pay 150K fine; if sufficient money, deducts 150K and clears HUD detention', async () => {
    const prevRAF = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now() + 10000), 0);

    const { executePlayerRoll } = await import('../src/game/engine/turnCycle.js');
    const { updateRollButtonsUI } = await import('../src/ui/hud/controls.js');

    // Player 0 detained on island with $500K cash
    gameState.currentPlayerIdx = 0;
    gameState.players[0].inIsland = true;
    gameState.players[0].islandTurns = 2; // Already served 2 chances
    gameState.players[0].cash = 500000;
    gameState.players[0].position = 8;
    gameState.phase = 'ROLL';
    gameState.festivalPot = 0;

    const card = document.getElementById('hud-card-0');
    card.classList.add('in-island-detention');
    let bars = document.createElement('div');
    bars.className = 'island-iron-bars';
    card.appendChild(bars);

    updateRollButtonsUI(true);
    const btnBail = document.getElementById('btn-escape-island');
    assert.equal(btnBail.classList.contains('hidden'), false, 'Bail button should initially be visible');

    try {
      // 3rd chance roll: non-doubles (1, 2)
      await executePlayerRoll(1, 2);

      // Player should now be released from island
      assert.equal(gameState.players[0].inIsland, false, 'Player should be freed from Island after 3 turns');
      assert.equal(gameState.players[0].islandTurns, 0, 'Island turns count should be reset to 0');
      // Cash must be deducted by 150K fine
      assert.equal(gameState.players[0].cash, 350000, 'Player cash should be deducted by 150K fine');
      assert.equal(gameState.festivalPot, 150000, '150K fine should be added to festival pot');

      // Card styling & bars must be completely cleared from HUD
      assert.equal(card.classList.contains('in-island-detention'), false, 'in-island-detention class must be removed');
      assert.equal(card.querySelector('.island-iron-bars'), null, 'island-iron-bars elements must be removed');
    } finally {
      globalThis.requestAnimationFrame = prevRAF;
    }
  });

  await t.test('after 3 chances with insufficient money (< 150K), opens sell property modal if player owns properties', async () => {
    const prevRAF = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now() + 10000), 0);

    const { executePlayerRoll } = await import('../src/game/engine/turnCycle.js');
    const { updateRollButtonsUI } = await import('../src/ui/hud/controls.js');

    // Player 0 detained with only $40K (< $150K) but owns Cairo (Tile 1)
    gameState.currentPlayerIdx = 0;
    gameState.players[0].inIsland = true;
    gameState.players[0].islandTurns = 2;
    gameState.players[0].cash = 40000;
    gameState.properties = gameState.properties || {};
    const cairoProp = { owner: 0, level: 0, mortgaged: false };
    gameState.properties[1] = cairoProp;
    const { BOARD_TILES } = await import('../src/game/data.js');
    if (BOARD_TILES[1]) gameState.properties[BOARD_TILES[1].id] = cairoProp;
    gameState.players[0].position = 8;
    gameState.phase = 'ROLL';

    const card = document.getElementById('hud-card-0');
    card.classList.add('in-island-detention');
    let bars = document.createElement('div');
    bars.className = 'island-iron-bars';
    card.appendChild(bars);

    try {
      await executePlayerRoll(1, 2);

      // Freed from island state, debt modal opened
      assert.equal(gameState.players[0].inIsland, false);
      assert.equal(gameState.players[0].islandTurns, 0);
      assert.ok(gameState.pendingRentDebt, 'Pending rent debt should be created for 150K fine');
      assert.equal(gameState.pendingRentDebt.rentOwed, 150000);
      assert.equal(gameState.pendingRentDebt.isTax, true);

      // HUD detention styling removed
      assert.equal(card.classList.contains('in-island-detention'), false);
    } finally {
      globalThis.requestAnimationFrame = prevRAF;
    }
  });

  await t.test('after 3 chances with insufficient money and 0 properties, triggers total bankruptcy', async () => {
    const prevRAF = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now() + 10000), 0);

    const { executePlayerRoll } = await import('../src/game/engine/turnCycle.js');

    // Player 0 detained with $20K and 0 properties
    gameState.currentPlayerIdx = 0;
    gameState.players[0].inIsland = true;
    gameState.players[0].islandTurns = 2;
    gameState.players[0].cash = 20000;
    gameState.players[0].position = 8;
    gameState.phase = 'ROLL';
    gameState.properties = gameState.properties || {};
    Object.keys(gameState.properties).forEach(id => {
      if (gameState.properties[id]) gameState.properties[id].owner = null;
    });

    try {
      await executePlayerRoll(1, 2);

      assert.equal(gameState.players[0].inIsland, false);
      assert.equal(gameState.players[0].bankrupt, true, 'Player should be marked bankrupt when unable to pay fine');
    } finally {
      globalThis.requestAnimationFrame = prevRAF;
    }
  });
});
