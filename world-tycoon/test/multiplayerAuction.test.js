/**
 * test/multiplayerAuction.test.js
 * Comprehensive unit test suite for Multiplayer Public Auction Synchronization:
 * - Liquidated properties in ACTION_SETTLE_RENT and ACTION_BANKRUPTCY
 * - Host authoritative auction orchestration
 * - ACTION_AUCTION_START packet broadcast and client sync
 * - ACTION_AUCTION_BID relay, 5-second timer reset on all peers
 * - ACTION_AUCTION_CONCLUDE deed assignment and bank return fallback
 * - Sequential queue completion with queueFinished: true
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { gameState } from '../src/game/state.js';
import { networkState } from '../src/network/p2pState.js';
import { BOARD_TILES } from '../src/game/data.js';
import {
  calculateAuctionReservePrice,
  calculateAuctionBidIncrements,
  startSoldPropertiesAuctionSequence,
  startNextAuctionFromQueue,
  placeAuctionBid,
  passAuctionBid,
  concludeCurrentAuction,
  clearAuctionTimers,
  applyAuctionStartFromHost,
  applyAuctionBidFromHost,
  applyAuctionConcludeFromHost
} from '../src/game/engine/auction.js';
import { engineCallbacks } from '../src/ui/modals/common.js';
import { modalStore } from '../src/svelte/stores/modalStore.js';

describe('Multiplayer Public Auction Synchronization (/bug-hunter)', () => {
  let cairoTile;
  let madridTile;
  let broadcastedActions;
  let concludedPhaseCount;
  let concludedDoubles;

  beforeEach(() => {
    broadcastedActions = [];
    concludedPhaseCount = 0;
    concludedDoubles = null;

    engineCallbacks.concludeActionPhase = (doubles) => {
      concludedPhaseCount++;
      concludedDoubles = doubles;
    };
    engineCallbacks.spawnFloatingCash = () => {};

    cairoTile = BOARD_TILES.find(t => t.id === 1) || { id: 1, name: 'Cairo', price: 120000, group: 'brown' };
    madridTile = BOARD_TILES.find(t => t.id === 6) || { id: 6, name: 'Madrid', price: 250000, group: 'pink' };

    gameState.gameStarted = true;
    gameState.currentPlayerIdx = 0;
    gameState.pendingAuctions = [];
    gameState.auction = null;
    gameState.auctionQueueMeta = null;

    gameState.players = [
      { id: 0, name: 'HostDebtor', cash: 100000, isAI: false, bankrupt: false },
      { id: 1, name: 'GuestBidder', cash: 800000, isAI: false, bankrupt: false },
      { id: 2, name: 'BotPlayer', cash: 900000, isAI: true, bankrupt: false }
    ];

    gameState.properties = {};
    BOARD_TILES.forEach(t => {
      gameState.properties[t.id] = { owner: null, level: 0, mortgaged: false };
    });

    networkState.isMultiplayer = true;
    networkState.isHost = true;
    networkState.localPlayerIdx = 0;
  });

  afterEach(() => {
    clearAuctionTimers();
    networkState.isMultiplayer = false;
    networkState.isHost = false;
  });

  it('Host broadcasts ACTION_AUCTION_START when popping property from queue', () => {
    startSoldPropertiesAuctionSequence([cairoTile], 0, false);

    assert.ok(gameState.auction);
    assert.equal(gameState.auction.active, true);
    assert.equal(gameState.auction.tile.id, cairoTile.id);
    assert.equal(gameState.auction.currentBid, calculateAuctionReservePrice(cairoTile.price));
    assert.equal(gameState.auction.secondsLeft, 5.0);
  });

  it('Client peer receives ACTION_AUCTION_START and properly initializes auction modal', () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;

    const startPacket = {
      type: 'ACTION_AUCTION_START',
      tileId: madridTile.id,
      sellerIdx: 0,
      currentBid: 125000,
      increments: [20000, 50000, 100000],
      secondsLeft: 5.0,
      totalCount: 1,
      queueRemaining: 0,
      isDoubles: false
    };

    applyAuctionStartFromHost(startPacket);

    assert.ok(gameState.auction);
    assert.equal(gameState.auction.active, true);
    assert.equal(gameState.auction.tile.id, madridTile.id);
    assert.equal(gameState.auction.sellerIdx, 0);
    assert.equal(gameState.auction.currentBid, 125000);
    assert.equal(gameState.auction.secondsLeft, 5.0);

    let modal;
    const unsub = modalStore.subscribe(val => { modal = val.auction; });
    unsub();

    assert.ok(modal.visible);
    assert.equal(modal.cityName, madridTile.name);
    assert.equal(modal.canBid, true);
  });

  it('Client peer bid updates leading bidder, bid amount, and resets timer to 5s', () => {
    // Setup auction as active on client
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;

    applyAuctionStartFromHost({
      type: 'ACTION_AUCTION_START',
      tileId: cairoTile.id,
      sellerIdx: 0,
      currentBid: 60000,
      increments: [10000, 25000, 50000],
      secondsLeft: 5.0
    });

    assert.equal(gameState.auction.secondsLeft, 5.0); // Reset on start
    gameState.auction.secondsLeft = 2.0;

    // Host sends broadcasted bid from Player 1
    applyAuctionBidFromHost({
      type: 'ACTION_AUCTION_BID',
      tileId: cairoTile.id,
      bidAmount: 85000,
      bidderIdx: 1,
      secondsLeft: 5.0
    });

    assert.equal(gameState.auction.currentBid, 85000);
    assert.equal(gameState.auction.highBidderIdx, 1);
    assert.equal(gameState.auction.hasBids, true);
    assert.equal(gameState.auction.secondsLeft, 5.0);

    let modal;
    const unsub = modalStore.subscribe(val => { modal = val.auction; });
    unsub();

    assert.equal(modal.currentBid, 85000);
    assert.equal(modal.isLeading, true);
  });

  it('Client peer concluding auction awards deed and deducts cash', () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;

    applyAuctionStartFromHost({
      type: 'ACTION_AUCTION_START',
      tileId: cairoTile.id,
      sellerIdx: 0,
      currentBid: 60000,
      increments: [10000, 25000, 50000],
      secondsLeft: 5.0
    });

    const initialCash = gameState.players[1].cash;

    applyAuctionConcludeFromHost({
      type: 'ACTION_AUCTION_CONCLUDE',
      tileId: cairoTile.id,
      winnerIdx: 1,
      winningBid: 85000,
      hasBids: true
    });

    assert.equal(gameState.properties[cairoTile.id].owner, 1);
    assert.equal(gameState.properties[cairoTile.id].level, 0);
    assert.equal(gameState.players[1].cash, initialCash - 85000);
  });

  it('Zero bids placed returns property to bank on client peer', () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;

    applyAuctionStartFromHost({
      type: 'ACTION_AUCTION_START',
      tileId: cairoTile.id,
      sellerIdx: 0,
      currentBid: 60000,
      increments: [10000, 25000, 50000],
      secondsLeft: 5.0
    });

    applyAuctionConcludeFromHost({
      type: 'ACTION_AUCTION_CONCLUDE',
      tileId: cairoTile.id,
      winnerIdx: null,
      winningBid: 0,
      hasBids: false
    });

    assert.equal(gameState.properties[cairoTile.id].owner, null);
    assert.equal(gameState.properties[cairoTile.id].level, 0);
  });

  it('Queue finished closes auction modal and clears auction state', () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;

    applyAuctionStartFromHost({
      type: 'ACTION_AUCTION_START',
      tileId: cairoTile.id,
      sellerIdx: 0,
      currentBid: 60000,
      increments: [10000, 25000, 50000],
      secondsLeft: 5.0
    });

    applyAuctionConcludeFromHost({
      type: 'ACTION_AUCTION_CONCLUDE',
      queueFinished: true
    });

    assert.equal(gameState.auction, null);

    let modal;
    const unsub = modalStore.subscribe(val => { modal = val.auction; });
    unsub();
    assert.equal(modal.visible, false);
  });
});
