import test from 'node:test';
import assert from 'node:assert/strict';

test.beforeEach(() => {
  if (typeof globalThis.requestAnimationFrame === 'undefined') {
    globalThis.requestAnimationFrame = () => 1;
  }
  if (typeof globalThis.cancelAnimationFrame === 'undefined') {
    globalThis.cancelAnimationFrame = () => {};
  }
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = {
      innerWidth: 1024,
      innerHeight: 768,
      addEventListener: () => {},
      removeEventListener: () => {},
      requestAnimationFrame: () => 1,
      cancelAnimationFrame: () => {}
    };
  }
  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      getElementById: (id) => {
        if (id === 'svelte-hud-mount') return { firstElementChild: {} };
        return null;
      },
      createElement: () => ({
        style: {},
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        appendChild() {},
        remove() {}
      }),
      body: { appendChild() {} }
    };
  }
});

test('Instant Cash Reflection & Synchronization Suite (/bug-hunter)', async (t) => {
  const { gameState, displayedCash, matchSettings } = await import('../src/game/state.js');
  const { renderCornerHUDs } = await import('../src/ui/hud/cards.js');
  const { hudStore } = await import('../src/svelte/stores/hudStore.js');
  const { StartLandingStrategy } = await import('../src/game/engine/strategies/StartLandingStrategy.js');
  const { applyChancePrize } = await import('../src/game/engine/chance.js');
  const { FestivalLandingStrategy } = await import('../src/game/engine/strategies/FestivalLandingStrategy.js');
  const { cancelAllGameTimers } = await import('../src/game/engine/turnCycle.js');

  t.afterEach(() => {
    cancelAllGameTimers();
  });

  await t.test('renderCornerHUDs reflects updated player.cash immediately without stale displayedCash lag', () => {
    gameState.players = [
      { id: 0, name: 'Alice', cash: 2000000, position: 0, isAI: false, bankrupt: false },
      { id: 1, name: 'Bob', cash: 2000000, position: 0, isAI: true, bankrupt: false }
    ];
    matchSettings.teamMode = false;

    // Simulate salary addition
    gameState.players[0].cash += 400000;
    renderCornerHUDs();

    let hudSnapshot = null;
    const unsub = hudStore.subscribe(val => { hudSnapshot = val; });
    unsub();

    const p0Card = hudSnapshot.leftPlayers.find(p => p.id === 0);
    assert.ok(p0Card, 'Player 0 card exists');
    assert.equal(p0Card.cashFormatted, '2.4M', 'Player 0 cash reflects +400k addition immediately');
    assert.equal(displayedCash[0], 2400000, 'displayedCash is synchronized with player.cash');
  });

  await t.test('StartLandingStrategy updates cash and immediately syncs HUD to +350K', async () => {
    gameState.players = [
      { id: 0, name: 'Alice', cash: 1000000, position: 0, isAI: false, bankrupt: false },
      { id: 1, name: 'Bob', cash: 1500000, position: 0, isAI: true, bankrupt: false }
    ];
    matchSettings.teamMode = false;

    const strategy = new StartLandingStrategy();
    await strategy.execute({
      playerIdx: 0,
      player: gameState.players[0],
      isDoubles: false
    });

    let hudSnapshot = null;
    const unsub = hudStore.subscribe(val => { hudSnapshot = val; });
    unsub();

    const p0Card = hudSnapshot.leftPlayers.find(p => p.id === 0);
    assert.equal(gameState.players[0].cash, 1350000);
    assert.equal(p0Card.cashFormatted, '1.35M');
    assert.equal(displayedCash[0], 1350000);
  });

  await t.test('applyChancePrize immediately reflects cash grant on HUD', async () => {
    gameState.players = [
      { id: 0, name: 'Alice', cash: 500000, position: 2, isAI: false, bankrupt: false },
      { id: 1, name: 'Bob', cash: 1000000, position: 2, isAI: true, bankrupt: false }
    ];
    matchSettings.teamMode = false;

    await applyChancePrize(0, {
      type: 'cash',
      amount: 400000,
      label: '+400K Grant',
      desc: 'World Bank Development Grant!'
    }, false, true, false);

    let hudSnapshot = null;
    const unsub = hudStore.subscribe(val => { hudSnapshot = val; });
    unsub();

    const p0Card = hudSnapshot.leftPlayers.find(p => p.id === 0);
    assert.equal(gameState.players[0].cash, 900000);
    assert.equal(p0Card.cashFormatted, '900K');
    assert.equal(displayedCash[0], 900000);
  });

  await t.test('applyChancePrize immediately reflects tax deduction on HUD', async () => {
    gameState.players = [
      { id: 0, name: 'Alice', cash: 800000, position: 2, isAI: false, bankrupt: false },
      { id: 1, name: 'Bob', cash: 1000000, position: 2, isAI: true, bankrupt: false }
    ];
    matchSettings.teamMode = false;

    await applyChancePrize(0, {
      type: 'tax',
      amount: 250000,
      label: 'Tax Audit',
      desc: 'Luxury Tax Audit fine'
    }, false, true, false);

    let hudSnapshot = null;
    const unsub = hudStore.subscribe(val => { hudSnapshot = val; });
    unsub();

    const p0Card = hudSnapshot.leftPlayers.find(p => p.id === 0);
    assert.equal(gameState.players[0].cash, 550000);
    assert.equal(p0Card.cashFormatted, '550K');
    assert.equal(displayedCash[0], 550000);
  });

  await t.test('FestivalLandingStrategy immediately reflects jackpot collection on HUD', async () => {
    gameState.players = [
      { id: 0, name: 'Alice', cash: 1200000, position: 16, isAI: false, bankrupt: false },
      { id: 1, name: 'Bob', cash: 1000000, position: 16, isAI: true, bankrupt: false }
    ];
    gameState.festivalPot = 350000;
    matchSettings.teamMode = false;

    const strategy = new FestivalLandingStrategy();
    await strategy.execute({
      playerIdx: 0,
      player: gameState.players[0],
      isDoubles: false
    });

    let hudSnapshot = null;
    const unsub = hudStore.subscribe(val => { hudSnapshot = val; });
    unsub();

    const p0Card = hudSnapshot.leftPlayers.find(p => p.id === 0);
    assert.equal(gameState.players[0].cash, 1550000);
    assert.equal(p0Card.cashFormatted, '1.55M');
    assert.equal(displayedCash[0], 1550000);
    assert.equal(gameState.festivalPot, 0);
  });
});
