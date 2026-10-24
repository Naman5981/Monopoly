/**
 * test/multiplayer/p2pActions.test.js
 * Unit tests for P2P action broadcasting and execution.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import {
  broadcastAction,
  executeIncomingNetworkAction
} from '../../src/network/p2pActions.js';
import { networkState, networkCallbacks, registerNetworkCallbacks } from '../../src/network/p2pState.js';
import { gameState, setupPlayers } from '../../src/game/state.js';

describe('P2P Action Dispatcher & Executor', () => {
  beforeEach(() => {
    networkState.isMultiplayer = true;
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;
    networkState.hostConn = null;
    networkState.connections.clear();

    // Reset gameState mock structure
    gameState.currentPlayerIdx = 0;
    gameState.phase = 'TURN_START';
    gameState.festivalPot = 0;
    gameState.players = [
      { id: 0, name: 'HOST', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false },
      { id: 1, name: 'GUEST', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false },
      { id: 2, name: 'BOT', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: true }
    ];
    gameState.properties = {
      1: { owner: null, level: 0, festivalBoost: false, festivalMultiplier: 1 },
      2: { owner: 0, level: 1, festivalBoost: false, festivalMultiplier: 1 }
    };
  });

  describe('broadcastAction', () => {
    it('does nothing when offline', () => {
      networkState.isMultiplayer = false;
      let sent = false;
      networkState.hostConn = {
        open: true,
        send: () => { sent = true; }
      };

      broadcastAction('ACTION_ROLL', { d1: 3, d2: 4 });
      assert.equal(sent, false);
    });

    it('sends action via hostConn when player is guest', () => {
      networkState.isMultiplayer = true;
      networkState.isHost = false;
      networkState.localPlayerIdx = 1;

      let sentMsg = null;
      networkState.hostConn = {
        open: true,
        send: (payload) => { sentMsg = payload; }
      };

      broadcastAction('ACTION_BUY_CITY', { tileId: 1, cost: 50000 });
      assert.notEqual(sentMsg, null);
      assert.equal(sentMsg.type, 'ACTION_BUY_CITY');
      assert.equal(sentMsg.senderIdx, 1);
      assert.equal(sentMsg.tileId, 1);
      assert.equal(sentMsg.cost, 50000);
      assert.equal(typeof sentMsg.timestamp, 'number');
    });

    it('broadcasts action to all connected peers when player is host', () => {
      networkState.isMultiplayer = true;
      networkState.isHost = true;
      networkState.localPlayerIdx = 0;

      const received1 = [];
      const received2 = [];
      networkState.connections.set('peer-guest1', {
        open: true,
        send: (msg) => received1.push(msg)
      });
      networkState.connections.set('peer-guest2', {
        open: true,
        send: (msg) => received2.push(msg)
      });

      broadcastAction('ACTION_ROLL', { d1: 5, d2: 6 });
      assert.equal(received1.length, 1);
      assert.equal(received2.length, 1);
      assert.equal(received1[0].type, 'ACTION_ROLL');
      assert.equal(received1[0].d1, 5);
      assert.equal(received1[0].d2, 6);
      assert.equal(received1[0].senderIdx, 0);
    });
  });

  describe('executeIncomingNetworkAction', () => {
    it('discards echoes if senderIdx equals localPlayerIdx', () => {
      networkState.localPlayerIdx = 1;
      let rollCalled = false;
      registerNetworkCallbacks({
        onDiceRoll: () => { rollCalled = true; }
      });

      executeIncomingNetworkAction({
        type: 'ACTION_ROLL',
        senderIdx: 1,
        playerIdx: 1,
        d1: 4,
        d2: 4
      });

      assert.equal(rollCalled, false, 'Should have discarded packet from self');
    });

    it('handles ACTION_ROLL by delegating to networkCallbacks.onDiceRoll', () => {
      networkState.localPlayerIdx = 1;
      let rollData = null;
      registerNetworkCallbacks({
        onDiceRoll: (playerIdx, d1, d2, total, isDoubles) => {
          rollData = { playerIdx, d1, d2, total, isDoubles };
        }
      });

      executeIncomingNetworkAction({
        type: 'ACTION_ROLL',
        senderIdx: 0,
        playerIdx: 0,
        d1: 3,
        d2: 5,
        total: 8,
        isDoubles: false
      });

      assert.deepEqual(rollData, {
        playerIdx: 0,
        d1: 3,
        d2: 5,
        total: 8,
        isDoubles: false
      });
    });

    it('handles ACTION_BUY_CITY', () => {
      let buyData = null;
      registerNetworkCallbacks({
        onBuyCity: (playerIdx, tileId) => {
          buyData = { playerIdx, tileId };
        }
      });

      executeIncomingNetworkAction({
        type: 'ACTION_BUY_CITY',
        senderIdx: 0,
        playerIdx: 0,
        tileId: 1
      });

      assert.deepEqual(buyData, {
        playerIdx: 0,
        tileId: 1
      });
    });

    it('handles ACTION_BUYOUT_CITY with both prevOwnerIdx and previousOwnerIdx', () => {
      let buyoutData = null;
      registerNetworkCallbacks({
        onBuyoutCity: (playerIdx, tileId, prevOwnerIdx, buyoutCost) => {
          buyoutData = { playerIdx, tileId, prevOwnerIdx, buyoutCost };
        }
      });

      // Test with prevOwnerIdx
      executeIncomingNetworkAction({
        type: 'ACTION_BUYOUT_CITY',
        senderIdx: 0,
        playerIdx: 0,
        tileId: 2,
        prevOwnerIdx: 2,
        buyoutCost: 200000
      });

      assert.deepEqual(buyoutData, {
        playerIdx: 0,
        tileId: 2,
        prevOwnerIdx: 2,
        buyoutCost: 200000
      });

      // Test fallback to previousOwnerIdx
      executeIncomingNetworkAction({
        type: 'ACTION_BUYOUT_CITY',
        senderIdx: 0,
        playerIdx: 0,
        tileId: 2,
        previousOwnerIdx: 1,
        buyoutCost: 250000
      });

      assert.deepEqual(buyoutData, {
        playerIdx: 0,
        tileId: 2,
        prevOwnerIdx: 1,
        buyoutCost: 250000
      });
    });

    it('handles ACTION_UPGRADE_CITY with count and levelsToAdd', () => {
      let upgradeData = null;
      registerNetworkCallbacks({
        onUpgradeCity: (playerIdx, tileId, count) => {
          upgradeData = { playerIdx, tileId, count };
        }
      });

      // With count
      executeIncomingNetworkAction({
        type: 'ACTION_UPGRADE_CITY',
        senderIdx: 0,
        playerIdx: 0,
        tileId: 2,
        count: 2
      });
      assert.deepEqual(upgradeData, { playerIdx: 0, tileId: 2, count: 2 });

      // With levelsToAdd fallback
      executeIncomingNetworkAction({
        type: 'ACTION_UPGRADE_CITY',
        senderIdx: 0,
        playerIdx: 0,
        tileId: 2,
        levelsToAdd: 1
      });
      assert.deepEqual(upgradeData, { playerIdx: 0, tileId: 2, count: 1 });
    });

    it('handles ACTION_PAY_BAIL by clearing island status and deducting cash', () => {
      const p = gameState.players[0];
      p.inIsland = true;
      p.islandTurns = 2;
      p.cash = 1000000;
      gameState.festivalPot = 0;

      executeIncomingNetworkAction({
        type: 'ACTION_PAY_BAIL',
        senderIdx: 0,
        playerIdx: 0
      });

      assert.equal(p.inIsland, false);
      assert.equal(p.islandTurns, 0);
      assert.equal(p.cash, 850000);
      assert.equal(gameState.festivalPot, 150000);
    });

    it('handles ACTION_SELL_CITY_FOR_RENT', () => {
      const seller = gameState.players[0];
      seller.cash = 100000;
      gameState.properties[2].owner = 0;
      gameState.properties[2].level = 2;

      executeIncomingNetworkAction({
        type: 'ACTION_SELL_CITY_FOR_RENT',
        senderIdx: 0,
        playerIdx: 0,
        tileId: 2,
        saleVal: 80000
      });

      assert.equal(seller.cash, 180000);
      assert.equal(gameState.properties[2].owner, null);
      assert.equal(gameState.properties[2].level, 0);
    });

    it('handles ACTION_SETTLE_RENT transfer between players', () => {
      const debtor = gameState.players[1];
      const owner = gameState.players[0];
      debtor.cash = 500000;
      owner.cash = 1000000;

      executeIncomingNetworkAction({
        type: 'ACTION_SETTLE_RENT',
        senderIdx: 0,
        debtorIdx: 1,
        creditorIdx: 0,
        rentOwed: 200000
      });

      assert.equal(debtor.cash, 300000);
      assert.equal(owner.cash, 1200000);
    });

    it('handles ACTION_BANKRUPTCY', () => {
      const bankruptP = gameState.players[1];
      const creditorP = gameState.players[0];
      bankruptP.cash = 50000;
      creditorP.cash = 1000000;
      gameState.properties[1].owner = 1;

      // Ensure sender is different from localPlayerIdx (which is 1 in beforeEach)
      executeIncomingNetworkAction({
        type: 'ACTION_BANKRUPTCY',
        senderIdx: 0,
        bankruptIdx: 1,
        creditorIdx: 0,
        paidCash: 50000
      });

      assert.equal(bankruptP.bankrupt, true);
      assert.equal(bankruptP.cash, 0);
      assert.equal(creditorP.cash, 1050000);
      assert.equal(gameState.properties[1].owner, null);
    });

    it('handles ACTION_FESTIVAL_BOOST', () => {
      gameState.properties[1].festivalBoost = false;

      executeIncomingNetworkAction({
        type: 'ACTION_FESTIVAL_BOOST',
        senderIdx: 0,
        playerIdx: 0,
        tileId: 1
      });

      assert.equal(gameState.properties[1].festivalBoost, true);
    });

    it('routes auctions, trades, and world tours properly', () => {
      let auctionMsg = null;
      let tradeMsg = null;
      let tourData = null;

      registerNetworkCallbacks({
        onAuctionAction: (msg) => { auctionMsg = msg; },
        onTradeAction: (msg) => { tradeMsg = msg; },
        onWorldTour: (playerIdx, destTileId) => { tourData = { playerIdx, destTileId }; }
      });

      executeIncomingNetworkAction({ type: 'ACTION_AUCTION_BID', senderIdx: 0, bidAmount: 150000 });
      assert.equal(auctionMsg.bidAmount, 150000);

      executeIncomingNetworkAction({ type: 'ACTION_TRADE_OFFER', senderIdx: 0, targetIdx: 1 });
      assert.equal(tradeMsg.targetIdx, 1);

      executeIncomingNetworkAction({ type: 'ACTION_WORLD_TOUR', senderIdx: 0, playerIdx: 0, destTileId: 15 });
      assert.deepEqual(tourData, { playerIdx: 0, destTileId: 15 });
    });
  });
});
