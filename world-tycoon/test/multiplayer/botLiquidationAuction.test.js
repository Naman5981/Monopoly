/**
 * test/multiplayer/botLiquidationAuction.test.js
 * Comprehensive unit tests verifying:
 * 1. AI bot property liquidation triggers public auctions when paying rent to players.
 * 2. ACTION_SELL_CITY_FOR_RENT and ACTION_SETTLE_RENT packets are broadcasted in multiplayer.
 * 3. Sold properties are queued and ACTION_AUCTION_START is broadcasted to peers.
 * 4. Bot bankruptcy with prior liquidated properties queues those properties for public auction.
 * 5. Single-player matches also trigger public auction when bot liquidates property.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import { PropertyLandingStrategy } from '../../src/game/engine/strategies/PropertyLandingStrategy.js';
import { TaxLandingStrategy } from '../../src/game/engine/strategies/TaxLandingStrategy.js';
import { gameState, matchSettings } from '../../src/game/state.js';
import { BOARD_TILES } from '../../src/game/data.js';
import { calculateTileRent } from '../../src/game/rules.js';
import { networkState } from '../../src/network/p2pState.js';
import { clearAuctionTimers } from '../../src/game/engine/auction.js';
import { engineCallbacks } from '../../src/ui/modals/common.js';

describe('Bot Property Liquidation Public Auction Suite (/bug-hunter /multiplayer)', () => {
  let strategy;
  let broadcastedActions;
  let cairoTile;
  let tokyoTile;
  let madridTile;

  beforeEach(() => {
    globalThis.__WT_TEST__ = true;
    strategy = new PropertyLandingStrategy();
    broadcastedActions = [];

    // Capture broadcastAction calls via networkState.connections
    networkState.isMultiplayer = true;
    networkState.isHost = true;
    networkState.localPlayerIdx = 0;
    networkState.connections = new Map();
    networkState.connections.set('peer-guest1', {
      open: true,
      send: (msg) => broadcastedActions.push(msg)
    });

    matchSettings.gameSpeed = 100;
    gameState.gameStarted = true;
    gameState.phase = 'MOVING';
    gameState.festivalPot = 0;
    gameState.pendingRentDebt = null;
    gameState.pendingAuctions = [];
    gameState.auction = null;
    gameState.auctionQueueMeta = null;

    // Player 0: Human Host (Creditor)
    // Player 1: Human Guest
    // Player 2: Bot Debtor
    gameState.players = [
      { id: 0, name: 'HostHuman', cash: 1000000, position: 0, bankrupt: false, isAI: false },
      { id: 1, name: 'GuestHuman', cash: 1000000, position: 0, bankrupt: false, isAI: false },
      { id: 2, name: 'BotDebtor', cash: 50000, position: 0, bankrupt: false, isAI: true }
    ];
    gameState.currentPlayerIdx = 2;

    gameState.properties = {};
    BOARD_TILES.forEach(t => {
      gameState.properties[t.id] = { owner: null, level: 0, mortgaged: false, festivalBoost: false };
    });

    cairoTile = BOARD_TILES.find(t => t.id === 1);   // Price: 120,000, Rent level 0: ~12,000, level 2: 180,000
    madridTile = BOARD_TILES.find(t => t.id === 6);  // Price: 250,000
    tokyoTile = BOARD_TILES.find(t => t.id === 28) || BOARD_TILES[28]; // High-end property

    engineCallbacks.concludeActionPhase = () => {};
    engineCallbacks.spawnFloatingCash = () => {};
  });

  afterEach(() => {
    clearAuctionTimers();
    globalThis.__WT_TEST__ = false;
    networkState.isMultiplayer = false;
    networkState.isHost = false;
    delete networkState.broadcastAction;
  });

  it('triggers public auction sequence when a bot sells property to pay rent to a player', async () => {
    // Tokyo owned by Host (Player 0) with high rent
    gameState.properties[tokyoTile.id] = { owner: 0, level: 1, mortgaged: false, festivalBoost: false };
    const rent = calculateTileRent(tokyoTile.id);

    // Bot (Player 2) has $50,000 cash and owns Cairo (Tile 1, sale value $120,000) and Madrid (Tile 6, sale value $250,000)
    // Rent is $360,000 > $50,000 cash
    gameState.properties[cairoTile.id] = { owner: 2, level: 0, mortgaged: false, festivalBoost: false };
    gameState.properties[madridTile.id] = { owner: 2, level: 0, mortgaged: false, festivalBoost: false };

    // Bot lands on Tokyo
    await strategy.execute({
      tile: tokyoTile,
      playerIdx: 2,
      player: gameState.players[2],
      isDoubles: false
    });

    // 1. Bot sold Cairo first ($120k + $50k = $170k < $360k), then sold Athens ($200k -> $370k >= $360k)
    // Both properties were liquidated
    assert.equal(gameState.properties[cairoTile.id].owner, null);
    assert.equal(gameState.properties[madridTile.id].owner, null);

    // 2. Rent transferred: Bot paid rent to Host
    assert.equal(gameState.players[0].cash, 1000000 + rent);
    assert.equal(gameState.players[2].cash, (50000 + 120000 + 200000) - rent);

    // 3. Phase transitioned to AUCTION!
    assert.equal(gameState.phase, 'AUCTION');
    assert.ok(gameState.auction, 'Active auction should be created');
    assert.equal(gameState.auction.active, true);
    assert.equal(gameState.auction.sellerIdx, 2, 'Seller should be the bot debtor');

    // 4. First auction is for Cairo, Madrid is queued in pendingAuctions
    assert.equal(gameState.auction.tile.id, cairoTile.id);
    assert.equal(gameState.pendingAuctions.length, 1);
    assert.equal(gameState.pendingAuctions[0].id, madridTile.id);
  });

  it('broadcasts ACTION_SELL_CITY_FOR_RENT, ACTION_SETTLE_RENT and ACTION_AUCTION_START over P2P', async () => {
    // Madrid owned by Host (Player 0) with level 1 (rent > $50,000)
    gameState.properties[madridTile.id] = { owner: 0, level: 1, mortgaged: false, festivalBoost: false };
    const rent = calculateTileRent(madridTile.id);

    // Bot has $15,000 cash and owns Cairo ($120,000 sale value) -> $135,000 >= $130,000 rent
    gameState.players[2].cash = 15000;
    gameState.properties[cairoTile.id] = { owner: 2, level: 0, mortgaged: false, festivalBoost: false };

    await strategy.execute({
      tile: madridTile,
      playerIdx: 2,
      player: gameState.players[2],
      isDoubles: false
    });

    // Verify broadcasted packet types
    const sellCityPacket = broadcastedActions.find(a => a.type === 'ACTION_SELL_CITY_FOR_RENT');
    assert.ok(sellCityPacket, 'ACTION_SELL_CITY_FOR_RENT must be broadcasted');
    assert.equal(sellCityPacket.playerIdx, 2);
    assert.equal(sellCityPacket.tileId, cairoTile.id);

    const settleRentPacket = broadcastedActions.find(a => a.type === 'ACTION_SETTLE_RENT');
    assert.ok(settleRentPacket, 'ACTION_SETTLE_RENT must be broadcasted');
    assert.equal(settleRentPacket.debtorIdx, 2);
    assert.equal(settleRentPacket.creditorIdx, 0);
    assert.deepEqual(settleRentPacket.soldTileIds, [cairoTile.id]);

    const auctionStartPacket = broadcastedActions.find(a => a.type === 'ACTION_AUCTION_START');
    assert.ok(auctionStartPacket, 'ACTION_AUCTION_START must be broadcasted');
    assert.equal(auctionStartPacket.tileId, cairoTile.id);
    assert.equal(auctionStartPacket.sellerIdx, 2);
  });

  it('queues auction when bot sells property but goes bankrupt due to remaining deficit', async () => {
    // Madrid owned by Host, level 3 (rent $500,000+)
    gameState.properties[madridTile.id] = { owner: 0, level: 3, mortgaged: false, festivalBoost: false };

    // Bot has $10,000 cash and only owns Cairo ($120,000) -> Total $130,000 < rent
    gameState.players[2].cash = 10000;
    gameState.properties[cairoTile.id] = { owner: 2, level: 0, mortgaged: false, festivalBoost: false };

    await strategy.execute({
      tile: madridTile,
      playerIdx: 2,
      player: gameState.players[2],
      isDoubles: false
    });

    // Bot is bankrupt
    assert.equal(gameState.players[2].bankrupt, true);
    assert.equal(gameState.players[2].cash, 0);

    // Host received all available cash ($10k + $120k = $130k)
    assert.equal(gameState.players[0].cash, 1000000 + 130000);

    // Cairo was sold before bankruptcy -> queued for public auction!
    assert.equal(gameState.phase, 'AUCTION');
    assert.ok(gameState.auction);
    assert.equal(gameState.auction.tile.id, cairoTile.id);

    const bankruptPacket = broadcastedActions.find(a => a.type === 'ACTION_BANKRUPTCY');
    assert.ok(bankruptPacket);
    assert.deepEqual(bankruptPacket.soldTileIds, [cairoTile.id]);
  });

  it('also initiates public auction in single-player match when bot sells property', async () => {
    networkState.isMultiplayer = false;
    networkState.isHost = false;

    // Host (Player 0) owns Madrid
    gameState.properties[madridTile.id] = { owner: 0, level: 0, mortgaged: false, festivalBoost: false };

    // Bot owns Cairo
    gameState.properties[cairoTile.id] = { owner: 2, level: 0, mortgaged: false, festivalBoost: false };
    gameState.players[2].cash = 20000;

    await strategy.execute({
      tile: madridTile,
      playerIdx: 2,
      player: gameState.players[2],
      isDoubles: false
    });

    assert.equal(gameState.phase, 'AUCTION');
    assert.ok(gameState.auction);
    assert.equal(gameState.auction.tile.id, cairoTile.id);
  });

  it('initiates public auction when bot sells property to pay Luxury Tax', async () => {
    const taxStrategy = new TaxLandingStrategy();
    const taxTile = { id: 4, name: 'TAX', amount: 200000, type: 'tax' };

    // Bot has $50,000 cash and owns Cairo ($120,000) and Madrid ($250,000)
    gameState.properties[cairoTile.id] = { owner: 2, level: 0, mortgaged: false, festivalBoost: false };
    gameState.properties[madridTile.id] = { owner: 2, level: 0, mortgaged: false, festivalBoost: false };

    await taxStrategy.execute({
      tile: taxTile,
      playerIdx: 2,
      player: gameState.players[2],
      isDoubles: false
    });

    // Bot paid tax
    assert.equal(gameState.festivalPot, 200000);

    // Sold properties queued for auction
    assert.equal(gameState.phase, 'AUCTION');
    assert.ok(gameState.auction);
    assert.equal(gameState.auction.tile.id, cairoTile.id);
  });
});
