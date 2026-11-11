/**
 * test/multiplayer/rentDebtMultiplayer.test.js
 * Unit tests verifying:
 * 1. Client peer property selling & rent debt synchronization in multiplayer.
 * 2. Property liquidation on luxury tax deficit rather than immediate bankruptcy.
 * 3. Player elimination announcement banner & audio trigger upon bankruptcy.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import { PropertyLandingStrategy } from '../../src/game/engine/strategies/PropertyLandingStrategy.js';
import { TaxLandingStrategy } from '../../src/game/engine/strategies/TaxLandingStrategy.js';
import { networkState, networkCallbacks } from '../../src/network/p2pState.js';
import { executeIncomingNetworkAction } from '../../src/network/p2pActions.js';
import { gameState, matchSettings } from '../../src/game/state.js';
import { BOARD_TILES } from '../../src/game/data.js';
import { animatePlayerEliminatedBanner } from '../../src/ui/anim/banners.js';

describe('Multiplayer Rent Debt & Bankruptcy Elimination Suite (/bug-hunter /game-art /fixing-motion-performance)', () => {
  beforeEach(() => {
    networkState.isMultiplayer = true;
    networkState.isHost = true;
    networkState.localPlayerIdx = 0;

    matchSettings.gameSpeed = 100;

    gameState.gameStarted = true;
    gameState.phase = 'MOVING';
    gameState.currentPlayerIdx = 1; // Guest
    gameState.festivalPot = 0;
    gameState.pendingRentDebt = null;
    gameState.players = [
      { id: 0, name: 'HOST', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false },
      { id: 1, name: 'GUEST', cash: 10000, position: 1, bankrupt: false, inIsland: false, islandTurns: 0, isAI: false },
      { id: 2, name: 'BOT', cash: 2000000, position: 0, bankrupt: false, inIsland: false, islandTurns: 0, isAI: true }
    ];

    gameState.properties = {};
    BOARD_TILES.forEach(t => {
      gameState.properties[t.id] = { owner: null, level: 0, festivalBoost: false };
    });
  });

  describe('Multiplayer Rent Debt Liquidation on Host & Guest', () => {
    it('sets host into MODAL phase and establishes pendingRentDebt when guest debtor lands on host property', async () => {
      const strategy = new PropertyLandingStrategy();
      const cityTile = BOARD_TILES.find(t => t.id === 1); // Cairo
      gameState.properties[1] = { owner: 0, level: 2, festivalBoost: false }; // Owned by host

      // Guest has only $10,000 cash, rent is much higher ($180,000)
      // Guest owns property 3 (Mumbai)
      gameState.properties[3] = { owner: 1, level: 0, festivalBoost: false };

      await strategy.execute({
        tile: cityTile,
        playerIdx: 1,
        player: gameState.players[1],
        isDoubles: false
      });

      // Host must enter MODAL phase and set pendingRentDebt context
      assert.equal(gameState.phase, 'MODAL');
      assert.ok(gameState.pendingRentDebt);
      assert.equal(gameState.pendingRentDebt.debtorIdx, 1);
      assert.equal(gameState.pendingRentDebt.creditorIdx, 0);
    });

    it('delegates ACTION_RENT_DEBT to networkCallbacks.onRentDebt', () => {
      let receivedPacket = null;
      networkCallbacks.onRentDebt = (msg) => {
        receivedPacket = msg;
      };

      executeIncomingNetworkAction({
        type: 'ACTION_RENT_DEBT',
        senderIdx: 1, // Sent by remote peer (guest 1) to host (0)
        debtorIdx: 1,
        creditorIdx: 0,
        rentOwed: 180000,
        tileId: 1,
        isDoubles: false
      });

      assert.ok(receivedPacket);
      assert.equal(receivedPacket.debtorIdx, 1);
      assert.equal(receivedPacket.rentOwed, 180000);
    });
  });

  describe('Tax Landing Deficit Property Selling', () => {
    it('opens sell cities modal or enters debt when player owes tax but owns properties', async () => {
      const taxTile = BOARD_TILES.find(t => t.type === 'tax') || { id: 28, name: 'LUXURY TAX', amount: 250000, type: 'tax' };
      const strategy = new TaxLandingStrategy();

      const player = gameState.players[0]; // Host human player
      player.cash = 50000; // Less than $250,000 tax
      gameState.properties[1] = { owner: 0, level: 1, festivalBoost: false }; // Owns Cairo

      await strategy.execute({
        tile: taxTile,
        playerIdx: 0,
        player,
        isDoubles: false
      });

      // Player must NOT be immediately declared bankrupt
      assert.equal(player.bankrupt, false);
      assert.equal(gameState.phase, 'MODAL');
      assert.ok(gameState.pendingRentDebt);
      assert.equal(gameState.pendingRentDebt.isTax, true);
    });
  });

  describe('Player Elimination Announcement Banner & Effects', () => {
    it('creates and renders the player eliminated banner in DOM with player and creditor details', () => {
      const bankruptPlayer = { id: 1, name: 'GUEST' };
      const creditorPlayer = { id: 0, name: 'HOST' };

      animatePlayerEliminatedBanner(bankruptPlayer, creditorPlayer);

      const banner = document.getElementById('player-eliminated-banner');
      assert.ok(banner);
      assert.equal(banner.style.display, 'flex');
      assert.match(banner.innerHTML, /PLAYER ELIMINATED/i);
      assert.match(banner.innerHTML, /GUEST/);
      assert.match(banner.innerHTML, /HOST/);
    });

    it('renders the player eliminated banner showing Bank when creditor is null', () => {
      const bankruptPlayer = { id: 1, name: 'GUEST' };

      animatePlayerEliminatedBanner(bankruptPlayer, null);

      const banner = document.getElementById('player-eliminated-banner');
      assert.ok(banner);
      assert.match(banner.innerHTML, /Bank/);
    });

    it('triggers elimination effects and marks player bankrupt on ACTION_BANKRUPTCY', () => {
      const bankruptPlayer = gameState.players[1];
      gameState.properties[3] = { owner: 1, level: 1, festivalBoost: false };

      executeIncomingNetworkAction({
        type: 'ACTION_BANKRUPTCY',
        senderIdx: 1,
        bankruptIdx: 1,
        creditorIdx: 0,
        paidCash: 10000
      });

      assert.equal(bankruptPlayer.bankrupt, true);
      assert.equal(bankruptPlayer.cash, 0);
      assert.equal(gameState.properties[3].owner, 0); // Transferred to creditor 0

      // Banner should be active in DOM
      const banner = document.getElementById('player-eliminated-banner');
      assert.ok(banner);
      assert.match(banner.innerHTML, /GUEST/);
    });
  });
});
