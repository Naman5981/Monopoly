/**
 * test/multiplayer/landingStrategies.test.js
 * Unit tests for Multiplayer landing strategies: AI suppression on Guest and execution on Host.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import { PropertyLandingStrategy } from '../../src/game/engine/strategies/PropertyLandingStrategy.js';
import { AirportLandingStrategy } from '../../src/game/engine/strategies/AirportLandingStrategy.js';
import { FestivalLandingStrategy } from '../../src/game/engine/strategies/FestivalLandingStrategy.js';
import { networkState } from '../../src/network/p2pState.js';
import { gameState, matchSettings } from '../../src/game/state.js';
import { BOARD_TILES } from '../../src/game/data.js';

describe('Multiplayer Landing Strategies AI Execution Guard', () => {
  beforeEach(() => {
    networkState.isMultiplayer = true;
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;

    matchSettings.gameSpeed = 100; // fast-forward timers

    gameState.gameStarted = true;
    gameState.phase = 'TURN_ACTION';
    gameState.currentPlayerIdx = 2; // AI bot
    gameState.festivalPot = 0;
    gameState.players = [
      { id: 0, name: 'HOST', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false },
      { id: 1, name: 'GUEST', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false },
      { id: 2, name: 'BOT', cash: 2000000, position: 1, bankrupt: false, inIsland: false, islandTurns: 0, isAI: true }
    ];

    gameState.properties = {};
    BOARD_TILES.forEach(t => {
      gameState.properties[t.id] = { owner: null, level: 0, festivalBoost: false, festivalMultiplier: 1 };
    });
  });

  describe('PropertyLandingStrategy', () => {
    it('suppresses AI purchase decision on Guest to prevent double-deduction', async () => {
      networkState.isHost = false;
      const strategy = new PropertyLandingStrategy();

      const cityTile = BOARD_TILES.find(t => t.type === 'city');
      const botPlayer = gameState.players[2];
      const initialCash = botPlayer.cash;

      await strategy.execute({
        tile: cityTile,
        playerIdx: 2,
        player: botPlayer,
        isDoubles: false
      });

      // On Guest, the bot should NOT purchase or change owner locally
      assert.equal(botPlayer.cash, initialCash);
      assert.equal(gameState.properties[cityTile.id].owner, null);
    });

    it('executes AI purchase decision on Host and sets owner', async () => {
      networkState.isHost = true;
      networkState.localPlayerIdx = 0;
      const strategy = new PropertyLandingStrategy();

      const cityTile = BOARD_TILES.find(t => t.type === 'city');
      const botPlayer = gameState.players[2];
      const initialCash = botPlayer.cash;

      await strategy.execute({
        tile: cityTile,
        playerIdx: 2,
        player: botPlayer,
        isDoubles: false
      });

      // On Host, the bot purchases the city
      assert.equal(gameState.properties[cityTile.id].owner, 2);
      assert.equal(botPlayer.cash < initialCash, true);
    });
  });

  describe('AirportLandingStrategy', () => {
    it('suppresses AI flight selection on Guest', async () => {
      networkState.isHost = false;
      let flightEvaluatorCalled = false;
      const strategy = new AirportLandingStrategy(() => { flightEvaluatorCalled = true; });

      const botPlayer = gameState.players[2];

      await strategy.execute({
        playerIdx: 2,
        player: botPlayer,
        isDoubles: false
      });

      assert.equal(flightEvaluatorCalled, false);
    });
  });

  describe('FestivalLandingStrategy', () => {
    it('suppresses autonomous AI festival city selection on Guest', async () => {
      networkState.isHost = false;
      const strategy = new FestivalLandingStrategy();

      // Give bot an unboosted city
      const cityTile = BOARD_TILES.find(t => t.type === 'city');
      gameState.properties[cityTile.id].owner = 2;
      gameState.properties[cityTile.id].festivalBoost = false;

      const botPlayer = gameState.players[2];

      await strategy.execute({
        playerIdx: 2,
        player: botPlayer,
        isDoubles: false
      });

      // Guest should NOT boost locally, waiting for Host's action packet
      assert.equal(gameState.properties[cityTile.id].festivalBoost, false);
    });

    it('executes AI festival boost on Host and sets festivalBoost true', async () => {
      networkState.isHost = true;
      networkState.localPlayerIdx = 0;
      const strategy = new FestivalLandingStrategy();

      const cityTile = BOARD_TILES.find(t => t.type === 'city');
      gameState.properties[cityTile.id].owner = 2;
      gameState.properties[cityTile.id].festivalBoost = false;

      const botPlayer = gameState.players[2];

      await strategy.execute({
        playerIdx: 2,
        player: botPlayer,
        isDoubles: false
      });

      // Host chooses and boosts
      assert.equal(gameState.properties[cityTile.id].festivalBoost, true);
    });
  });
});
