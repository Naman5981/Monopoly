/**
 * test/aiBalanceAndMultiplayer.test.js
 * Unit tests for rich-bot auction bidding, opponent monopoly blocking,
 * strategic Airport flight targeting, smart Island bail, and Team Mode trade cooperation.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { BOARD_TILES } from '../src/game/data.js';
import { gameState, matchSettings } from '../src/game/state.js';
import { evaluateBotAuctionBid } from '../src/game/engine/auction.js';
import { chooseStrategicFlightDestination } from '../src/game/engine/strategies/AirportLandingStrategy.js';
import { shouldAIPayIslandBail } from '../src/game/engine/turnCycle.js';
import { evaluateTradeDeal } from '../src/game/trading.js';

describe('AI & Multiplayer Balance Fixes', () => {
  beforeEach(() => {
    matchSettings.teamMode = false;
    matchSettings.monopolySetsToWin = 3;
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.players = [
      { id: 0, name: 'Human', cash: 2000000, isAI: false, bankrupt: false, inIsland: false, teamId: 0 },
      { id: 1, name: 'RichBot', cash: 4500000, isAI: true, bankrupt: false, inIsland: false, teamId: 1 }
    ];
    gameState.properties = {};
    BOARD_TILES.forEach(t => {
      gameState.properties[t.id] = { owner: null, level: 0, mortgaged: false, festivalBoost: false };
    });
  });

  it('rich bot bids above 1.0x base price on auction instead of hoarding millions', () => {
    const city = BOARD_TILES.find(t => t.type === 'city' && t.price <= 200000);
    gameState.auction = {
      active: true,
      tile: city,
      sellerIdx: -1,
      currentBid: city.price, // Already at 1.0x base price
      highBidderIdx: 0,
      hasBids: true,
      increments: [20000, 50000, 100000],
      passedPlayerIndices: new Set()
    };

    const bid = evaluateBotAuctionBid(gameState.players[1], 1);
    assert.ok(bid !== null && bid > city.price, 'Rich bot with $4.5M cash should bid above 1.0x base price');
  });

  it('bot bids aggressively to block an opponent one city away from a monopoly', () => {
    const brown = BOARD_TILES.filter(t => t.type === 'city' && t.group === 'brown');
    gameState.properties[brown[0].id].owner = 0; // Human owns 1 of 2 brown cities
    gameState.players[1].cash = 1000000; // Moderate cash, no surplus bonus
    gameState.auction = {
      active: true,
      tile: brown[1],
      sellerIdx: -1,
      currentBid: Math.round(brown[1].price * 1.15), // Above 1.0x, below 1.45x block ceiling
      highBidderIdx: 0,
      hasBids: true,
      increments: [10000, 20000, 50000],
      passedPlayerIndices: new Set()
    };

    const bid = evaluateBotAuctionBid(gameState.players[1], 1);
    assert.ok(bid !== null && bid > gameState.auction.currentBid, 'Bot should bid to block opponent monopoly');
  });

  it('chooses monopoly-completing destination on World Tour Airport instead of random tile', () => {
    const brown = BOARD_TILES.filter(t => t.type === 'city' && t.group === 'brown');
    gameState.properties[brown[0].id].owner = 1;
    const dest = chooseStrategicFlightDestination(1, gameState.players[1].cash);
    assert.equal(dest, brown[1].id, 'Bot should fly to complete its Brown monopoly');
  });

  it('pays Island bail automatically when rich and unowned properties remain', () => {
    const bot = gameState.players[1];
    bot.inIsland = true;
    bot.cash = 1200000;
    assert.equal(shouldAIPayIslandBail(bot), true);

    bot.cash = 300000;
    assert.equal(shouldAIPayIslandBail(bot), false);
  });

  it('cooperates on Team Mode trades between AI and human teammates', () => {
    matchSettings.teamMode = true;
    gameState.players[1].teamId = 0; // Same team as Human
    const brown = BOARD_TILES.filter(t => t.type === 'city' && t.group === 'brown');
    const darkblue = BOARD_TILES.filter(t => t.type === 'city' && t.group === 'darkblue');
    gameState.properties[brown[0].id].owner = 0;
    gameState.properties[darkblue[0].id].owner = 1;

    const res = evaluateTradeDeal(1, 0, 0, 0, [brown[0].id], [darkblue[0].id]);
    assert.equal(res.status, 'accept');
  });
});
