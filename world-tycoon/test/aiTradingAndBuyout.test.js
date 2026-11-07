import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { gameState, localPlayerIdx } from '../src/game/state.js';
import { BOARD_TILES } from '../src/game/data.js';
import {
  evaluateTradeDeal,
  generateProactiveBotTrade,
  recordDeclinedTrade,
  resetTradeMemory,
  declinedTradeTargetTurns
} from '../src/game/trading.js';
import {
  shouldAIBuyoutTile,
  resetBuyoutMemory
} from '../src/game/engine/strategies/PropertyLandingStrategy.js';
import { calculateBuyoutCost } from '../src/ui/modals/buyoutCity.js';
import {
  acceptIncomingTrade,
  declineIncomingTrade,
  closeIncomingTradeModal
} from '../src/ui/modals/trade.js';
import { AIPlayerController } from '../src/game/controllers/AIPlayerController.js';

describe('AI Trading & Hostile Buyout Rebalancing (/bug-hunter)', () => {
  let cairoTile, mumbaiTile, monacoTile, istanbulTile;

  beforeEach(() => {
    resetTradeMemory();
    resetBuyoutMemory();
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 1; // Bot 1
    gameState.netWorthHistory = [];

    gameState.players = [
      { id: 0, name: 'HumanTycoon', cash: 2000000, isAI: false, bankrupt: false, inIsland: false },
      { id: 1, name: 'Baron', cash: 2500000, isAI: true, bankrupt: false, inIsland: false },
      { id: 2, name: 'Atlas', cash: 2500000, isAI: true, bankrupt: false, inIsland: false }
    ];

    gameState.properties = {};
    BOARD_TILES.forEach(t => {
      gameState.properties[t.id] = { owner: null, level: 0, mortgaged: false, festivalBoost: false };
    });

    const brownTiles = BOARD_TILES.filter(t => t.type === 'city' && t.group === 'brown');
    const darkblueTiles = BOARD_TILES.filter(t => t.type === 'city' && t.group === 'darkblue');

    cairoTile = brownTiles[0];     // id 1
    mumbaiTile = brownTiles[1];    // id 3
    monacoTile = darkblueTiles[0];  // id 30
    istanbulTile = darkblueTiles[1];// id 31
  });

  afterEach(() => {
    resetTradeMemory();
    resetBuyoutMemory();
    window.resumeBotTurnAfterTrade = null;
  });

  describe('Rejection Memory & Cooldowns', () => {
    it('records declined properties and blocks repeat offers for 20 turns', () => {
      // Simulate Bot 1 owning Cairo and needing Mumbai (owned by Human), offering Monaco in exchange
      gameState.properties[cairoTile.id].owner = 1;
      gameState.properties[mumbaiTile.id].owner = 0;
      gameState.properties[monacoTile.id].owner = 1;

      // Simulate turn 5
      gameState.netWorthHistory = new Array(5).fill({});

      // Human declines trade for Mumbai
      recordDeclinedTrade([mumbaiTile.id]);
      assert.equal(declinedTradeTargetTurns[mumbaiTile.id], 5);

      // Bot 1 attempts to propose on turn 6
      gameState.netWorthHistory = new Array(6).fill({});
      const tradeOnTurn6 = generateProactiveBotTrade(1);
      assert.equal(tradeOnTurn6, null, 'Bot must not propose for Mumbai during rejection cooldown');

      // On turn 26 (21 turns later), rejection cooldown has expired
      gameState.netWorthHistory = new Array(26).fill({});
      const tradeOnTurn26 = generateProactiveBotTrade(1);
      assert.notEqual(tradeOnTurn26, null, 'Bot may propose again once rejection cooldown expires');
      assert.equal(tradeOnTurn26.reqTileIds[0], mumbaiTile.id);
    });

    it('enforces a global 10-turn cooldown between any bot trade offers to the human', () => {
      gameState.properties[cairoTile.id].owner = 1;
      gameState.properties[mumbaiTile.id].owner = 0;
      gameState.properties[5].owner = 1; // Bot 1 spare property (Bangkok, group lightblue)
      gameState.properties[monacoTile.id].owner = 2;
      gameState.properties[istanbulTile.id].owner = 0;
      gameState.properties[6].owner = 2; // Bot 2 spare property (Athens, group pink)

      // Turn 15: Bot 1 proposes a trade
      gameState.netWorthHistory = new Array(15).fill({});
      const trade1 = generateProactiveBotTrade(1);
      assert.notEqual(trade1, null);

      // Turn 18 (only 3 turns later): Bot 2 tries to propose a trade
      gameState.netWorthHistory = new Array(18).fill({});
      const trade2 = generateProactiveBotTrade(2);
      assert.equal(trade2, null, 'Global bot cooldown must suppress trade offers within 10 turns');

      // Turn 26 (11 turns later): Bot 2 is allowed to propose
      gameState.netWorthHistory = new Array(26).fill({});
      const trade3 = generateProactiveBotTrade(2);
      assert.notEqual(trade3, null, 'Bot 2 can propose after global cooldown expires');
    });
  });

  describe('Mutual Monopoly Logic & Set Swapping', () => {
    it('accepts mutual monopoly set swaps with enthusiastic agreement', () => {
      // Human owns Cairo; Bot owns Mumbai (completes Brown for Human)
      // Bot owns Monaco; Human owns Istanbul (completes Darkblue for Bot)
      gameState.properties[cairoTile.id].owner = 0;
      gameState.properties[mumbaiTile.id].owner = 1;

      gameState.properties[monacoTile.id].owner = 1;
      gameState.properties[istanbulTile.id].owner = 0;

      // Human (giver: 0) proposes giving Istanbul to Bot (receiver: 1) in exchange for Mumbai
      const evalResult = evaluateTradeDeal(1, 0, 0, 0, [istanbulTile.id], [mumbaiTile.id]);

      assert.equal(evalResult.status, 'accept');
      assert.match(evalResult.reason, /A set for a set/);
    });

    it('proactively prioritizes mutual monopoly set swaps over raw cash buyouts', () => {
      // Human needs Cairo; Bot owns Cairo
      // Bot needs Monaco; Human owns Monaco
      gameState.properties[mumbaiTile.id].owner = 0; // Human owns Mumbai
      gameState.properties[cairoTile.id].owner = 1;  // Bot owns Cairo

      gameState.properties[istanbulTile.id].owner = 1; // Bot owns Istanbul
      gameState.properties[monacoTile.id].owner = 0;   // Human owns Monaco

      gameState.netWorthHistory = new Array(12).fill({});
      const botTrade = generateProactiveBotTrade(1);

      assert.notEqual(botTrade, null);
      const isMutualOption1 = (botTrade.offerTileIds[0] === cairoTile.id && botTrade.reqTileIds[0] === monacoTile.id);
      const isMutualOption2 = (botTrade.offerTileIds[0] === istanbulTile.id && botTrade.reqTileIds[0] === mumbaiTile.id);
      assert.equal(isMutualOption1 || isMutualOption2, true, 'Bot trade must be a mutual set completion trade');
    });
  });

  describe('AI Hostile Buyout Decision Strategy', () => {
    it('passes buyout on isolated tile with no monopoly synergy', () => {
      // Human owns Cairo, but Mumbai is unowned (so Human does not own the other tile)
      // and Bot owns no tiles in brown group
      gameState.properties[cairoTile.id].owner = 0;
      gameState.properties[cairoTile.id].level = 1;
      gameState.properties[mumbaiTile.id].owner = null;
      const cost = calculateBuyoutCost(cairoTile, gameState.properties[cairoTile.id]);

      const decision = shouldAIBuyoutTile(1, cairoTile, gameState.properties[cairoTile.id], cost);
      assert.equal(decision, false, 'Bot should pass on isolated property without monopoly synergy');
    });

    it('buys out property when it completes a monopoly and bot has healthy cash cushion', () => {
      // Bot owns Cairo, Human owns Mumbai in same group
      gameState.properties[cairoTile.id].owner = 1;
      gameState.properties[mumbaiTile.id].owner = 0;
      gameState.properties[mumbaiTile.id].level = 1;
      const cost = calculateBuyoutCost(mumbaiTile, gameState.properties[mumbaiTile.id]);

      gameState.players[1].cash = cost + 700000; // Above $600k cushion
      const decision = shouldAIBuyoutTile(1, mumbaiTile, gameState.properties[mumbaiTile.id], cost);
      assert.equal(decision, true, 'Bot should buy out to complete monopoly when cushion is met');
    });

    it('refuses buyout when cash cushion is below $600k reserve', () => {
      gameState.properties[cairoTile.id].owner = 1;
      gameState.properties[mumbaiTile.id].owner = 0;
      const cost = calculateBuyoutCost(mumbaiTile, gameState.properties[mumbaiTile.id]);

      gameState.players[1].cash = cost + 300000; // Insufficient cushion (< 600k)
      const decision = shouldAIBuyoutTile(1, mumbaiTile, gameState.properties[mumbaiTile.id], cost);
      assert.equal(decision, false, 'Bot must preserve at least $600k cash reserve');
    });

    it('never buys out level 4 Skyscraper landmark', () => {
      gameState.properties[cairoTile.id].owner = 1;
      gameState.properties[mumbaiTile.id].owner = 0;
      gameState.properties[mumbaiTile.id].level = 4; // Skyscraper
      const cost = calculateBuyoutCost(mumbaiTile, gameState.properties[mumbaiTile.id]);

      assert.equal(cost, 0, 'Skyscraper buyout cost must be 0');
      const decision = shouldAIBuyoutTile(1, mumbaiTile, gameState.properties[mumbaiTile.id], cost);
      assert.equal(decision, false, 'Skyscraper is immune to AI hostile buyout');
    });
  });

  describe('Bot Turn Pausing during Proactive Trade', () => {
    it('pauses bot turn roll when proposing proactive trade and resumes upon decline', async () => {
      gameState.properties[cairoTile.id].owner = 1;
      gameState.properties[mumbaiTile.id].owner = 0;
      gameState.properties[monacoTile.id].owner = 1; // Bot 1 owns Monaco to offer in exchange
      gameState.players[1].cash = 3000000;

      gameState.netWorthHistory = new Array(15).fill({});

      let rollExecuted = false;
      const controller = new AIPlayerController(1, gameState.players[1]);

      await controller.onTurnStart({
        executeRollFn: () => { rollExecuted = true; }
      });

      // Turn is paused waiting for human player!
      assert.equal(rollExecuted, false, 'Bot must not roll while trade modal is open');
      assert.equal(typeof window.resumeBotTurnAfterTrade, 'function');

      // Human declines the incoming trade
      declineIncomingTrade();

      // Bot turn resumed!
      assert.equal(rollExecuted, true, 'Bot must resume roll when trade is declined');
      assert.equal(window.resumeBotTurnAfterTrade, null);
    });
  });
});
