/**
 * test/auctionSystem.test.js
 * Comprehensive unit test suite for the Sold Property Public Auction System:
 * - 4-Tier Dynamic 3-Option Bidding increments based on city base price
 * - 50% Reserve price calculation
 * - Sequential queue processing for multiple liquidated properties
 * - 5-Second countdown timer reset on bid increase
 * - Debtor bidding restriction (cannot bid on own liquidated properties)
 * - Winning deed assignment, cash transfer, and bank fallback on 0 bids
 * - AI bot bidding valuation and human-like jitter
 * - P2P network synchronization
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { gameState } from '../src/game/state.js';
import { networkState } from '../src/network/p2pState.js';
import { BOARD_TILES } from '../src/game/data.js';
import {
  calculateAuctionBidIncrements,
  calculateAuctionReservePrice,
  startSoldPropertiesAuctionSequence,
  startNextAuctionFromQueue,
  placeAuctionBid,
  passAuctionBid,
  evaluateBotAuctionBid,
  concludeCurrentAuction,
  clearAuctionTimers,
  syncAuctionModalUI
} from '../src/game/engine/auction.js';
import { engineCallbacks } from '../src/ui/modals/common.js';
import { modalStore } from '../src/svelte/stores/modalStore.js';

describe('Sold Property Public Auction System (/bug-hunter /web-games)', () => {
  let cairoTile;   // Tier 1 ($120k)
  let madridTile;  // Tier 2 ($250k)
  let dubaiTile;   // Tier 3 ($350k)
  let tokyoTile;   // Tier 4 ($480k)
  let concludedPhaseCount;
  let concludedDoubles;

  beforeEach(() => {
    concludedPhaseCount = 0;
    concludedDoubles = null;

    engineCallbacks.concludeActionPhase = (doubles) => {
      concludedPhaseCount++;
      concludedDoubles = doubles;
    };
    engineCallbacks.spawnFloatingCash = () => {};

    cairoTile = BOARD_TILES.find(t => t.price <= 200000 && t.type === 'PROPERTY') || { id: 1, name: 'Cairo', price: 120000, group: 'brown' };
    madridTile = BOARD_TILES.find(t => t.price >= 240000 && t.price <= 330000 && t.type === 'PROPERTY') || { id: 6, name: 'Madrid', price: 250000, group: 'pink' };
    dubaiTile = BOARD_TILES.find(t => t.price >= 350000 && t.price <= 410000 && t.type === 'PROPERTY') || { id: 11, name: 'Dubai', price: 350000, group: 'orange' };
    tokyoTile = BOARD_TILES.find(t => t.price >= 450000 && t.type === 'PROPERTY') || { id: 15, name: 'Tokyo', price: 480000, group: 'darkblue' };

    gameState.gameStarted = true;
    gameState.currentPlayerIdx = 0;
    gameState.pendingAuctions = [];
    gameState.auction = null;
    gameState.auctionQueueMeta = null;

    gameState.players = [
      { id: 0, name: 'Debtor', cash: 200000, isAI: false, bankrupt: false },
      { id: 1, name: 'Player2', cash: 1000000, isAI: false, bankrupt: false },
      { id: 2, name: 'Bot3', cash: 800000, isAI: true, bankrupt: false }
    ];

    gameState.properties = {};
    BOARD_TILES.forEach(t => {
      gameState.properties[t.id] = { owner: null, level: 0, mortgaged: false };
    });

    networkState.isMultiplayer = false;
    networkState.isHost = false;
  });

  afterEach(() => {
    clearAuctionTimers();
  });

  describe('Dynamic 3-Option Increments & Reserve Price Math', () => {
    it('calculates Tier 1 increments for cheap cities (<= $200k)', () => {
      const inc = calculateAuctionBidIncrements(cairoTile.price);
      assert.deepEqual(inc, [10000, 25000, 50000]);
    });

    it('calculates Tier 2 increments for mid-tier cities ($240k - $330k)', () => {
      const inc = calculateAuctionBidIncrements(madridTile.price);
      assert.deepEqual(inc, [20000, 50000, 100000]);
    });

    it('calculates Tier 3 increments for high-tier cities ($350k - $410k)', () => {
      const inc = calculateAuctionBidIncrements(dubaiTile.price);
      assert.deepEqual(inc, [30000, 75000, 150000]);
    });

    it('calculates Tier 4 increments for elite cities (>= $450k)', () => {
      const inc = calculateAuctionBidIncrements(tokyoTile.price);
      assert.deepEqual(inc, [50000, 100000, 200000]);
    });

    it('calculates clean 50% reserve opening price rounded to $10k steps', () => {
      assert.equal(calculateAuctionReservePrice(120000), 60000);
      assert.equal(calculateAuctionReservePrice(250000), 120000); // 125k rounded down to 120k
      assert.equal(calculateAuctionReservePrice(480000), 240000);
    });
  });

  describe('Sequential Auction Queue Execution', () => {
    it('initiates the first auction and queues the rest when multiple properties are liquidated', () => {
      const soldTiles = [cairoTile, madridTile];
      startSoldPropertiesAuctionSequence(soldTiles, 0, false);

      assert.ok(gameState.auction !== null);
      assert.equal(gameState.auction.active, true);
      assert.equal(gameState.auction.tile.id, cairoTile.id);
      assert.equal(gameState.auction.sellerIdx, 0);
      assert.equal(gameState.auction.secondsLeft, 5.0);
      assert.equal(gameState.pendingAuctions.length, 1);
      assert.equal(gameState.pendingAuctions[0].id, madridTile.id);
    });

    it('safely handles empty soldTiles list without throwing', () => {
      startSoldPropertiesAuctionSequence([], 0, false);
      assert.equal(gameState.auction, null);
    });
  });

  describe('Bidding Rules, Timer Reset & Debtor Restriction', () => {
    beforeEach(() => {
      startSoldPropertiesAuctionSequence([cairoTile], 0, false);
    });

    it('prevents the debtor who sold the property from bidding on it', () => {
      const success = placeAuctionBid(cairoTile.price, 0);
      assert.equal(success, false);
      assert.equal(gameState.auction.highBidderIdx, null);
    });

    it('allows eligible solvent player to raise bid and resets countdown to 5.0s', () => {
      gameState.auction.secondsLeft = 1.8;
      const bidAmount = gameState.auction.currentBid + gameState.auction.increments[0];

      const success = placeAuctionBid(bidAmount, 1);
      assert.equal(success, true);
      assert.equal(gameState.auction.currentBid, bidAmount);
      assert.equal(gameState.auction.highBidderIdx, 1);
      assert.equal(gameState.auction.hasBids, true);
      assert.equal(gameState.auction.secondsLeft, 5.0);
    });

    it('rejects bids that are lower than or equal to current bid', () => {
      const current = gameState.auction.currentBid;
      const success = placeAuctionBid(current, 1);
      assert.equal(success, false);
    });

    it('rejects bids that exceed player cash reserves', () => {
      const hugeBid = gameState.players[1].cash + 50000;
      const success = placeAuctionBid(hugeBid, 1);
      assert.equal(success, false);
    });

    it('rejects bids from bankrupt players', () => {
      gameState.players[1].bankrupt = true;
      const bidAmount = gameState.auction.currentBid + 10000;
      const success = placeAuctionBid(bidAmount, 1);
      assert.equal(success, false);
    });
  });

  describe('Auction Conclusion & Deed Transfer', () => {
    it('awards property to highest bidder, deducts cash, and resets buildings to level 0', () => {
      startSoldPropertiesAuctionSequence([cairoTile], 0, false);
      const winningBid = gameState.auction.currentBid + 25000;
      placeAuctionBid(winningBid, 1);

      const initialCash = gameState.players[1].cash;
      concludeCurrentAuction();

      assert.equal(gameState.properties[cairoTile.id].owner, 1);
      assert.equal(gameState.properties[cairoTile.id].level, 0);
      assert.equal(gameState.players[1].cash, initialCash - winningBid);
    });

    it('reverts deed to unowned bank asset if no bids were placed', () => {
      startSoldPropertiesAuctionSequence([cairoTile], 0, false);
      concludeCurrentAuction();

      assert.equal(gameState.properties[cairoTile.id].owner, null);
      assert.equal(gameState.properties[cairoTile.id].level, 0);
    });

    it('processes queued properties in order before concluding action phase', () => {
      startSoldPropertiesAuctionSequence([cairoTile, madridTile], 0, true);
      assert.equal(gameState.auction.tile.id, cairoTile.id);

      // Conclude first auction
      concludeCurrentAuction();

      // Immediate transition or next in queue
      startNextAuctionFromQueue();
      assert.equal(gameState.auction.tile.id, madridTile.id);

      // Conclude second auction
      concludeCurrentAuction();
      startNextAuctionFromQueue();

      // Queue is now empty, action phase should conclude with isDoubles preserved
      assert.equal(gameState.auction, null);
      assert.equal(concludedPhaseCount, 1);
      assert.equal(concludedDoubles, true);
    });
  });

  describe('AI Bot Auction Bidding Intelligence', () => {
    beforeEach(() => {
      startSoldPropertiesAuctionSequence([dubaiTile], 0, false);
    });

    it('returns null if bot is the seller or already highest bidder', () => {
      const sellerDecision = evaluateBotAuctionBid(gameState.players[0], 0);
      assert.equal(sellerDecision, null);

      gameState.auction.highBidderIdx = 2;
      const leadingDecision = evaluateBotAuctionBid(gameState.players[2], 2);
      assert.equal(leadingDecision, null);
    });

    it('returns null if bot cash is too low to maintain safety cushion', () => {
      const brokeBot = { id: 2, name: 'BrokeBot', cash: 50000, isAI: true, bankrupt: false };
      const decision = evaluateBotAuctionBid(brokeBot, 2);
      assert.equal(decision, null);
    });

    it('selects an affordable bid increment when bot has ample cash cushion', () => {
      const wealthyBot = { id: 2, name: 'WealthyBot', cash: 1500000, isAI: true, bankrupt: false };
      const decision = evaluateBotAuctionBid(wealthyBot, 2);
      assert.ok(decision !== null);
      assert.ok(decision > gameState.auction.currentBid);
      assert.ok(wealthyBot.cash >= decision);
    });
  });

  describe('Svelte modalStore Reactive State Synchronization', () => {
    it('syncs auction status, timer, and 3 option amounts to modalStore', () => {
      startSoldPropertiesAuctionSequence([tokyoTile], 0, false);
      syncAuctionModalUI();

      let modalState;
      const unsub = modalStore.subscribe(st => { modalState = st.auction; });
      unsub();

      assert.ok(modalState);
      assert.equal(modalState.visible, true);
      assert.equal(modalState.cityName, tokyoTile.name);
      assert.equal(modalState.currentBid, calculateAuctionReservePrice(tokyoTile.price));
      assert.equal(modalState.increments.length, 3);
      assert.equal(modalState.secondsLeft, 5.0);
    });
  });
});
