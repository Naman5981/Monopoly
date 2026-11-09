/**
 * test/sellRentModal.test.js
 * Unit tests verifying property liquidation to pay rent debt:
 * - Specific city selection / click-to-sell functionality
 * - Modal rendering with clickable city cards & keyboard accessibility
 * - Sale value calculations
 * - Multi-stage liquidation, rent settlement, and bankruptcy escalation
 * - Multiplayer P2P synchronization
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { gameState } from '../src/game/state.js';
import { networkState } from '../src/network/p2pState.js';
import { BOARD_TILES } from '../src/game/data.js';
import {
  calculatePropertySaleValue,
  openSellCitiesModal,
  renderSellCitiesModal,
  sellPropertyForRent,
  autoSellCheapestForRent
} from '../src/ui/modals/sellRent.js';
import { engineCallbacks } from '../src/ui/modals/common.js';

describe('Liquidate Properties to Pay Rent (/bug-hunter /clean-code)', () => {
  let cairoTile;
  let mumbaiTile;
  let tokyoTile;
  let broadcastedActions;
  let concludedPhase;

  beforeEach(() => {
    broadcastedActions = [];
    concludedPhase = null;

    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.pendingRentDebt = null;

    gameState.players = [
      { id: 0, name: 'Debtor', cash: 50000, isAI: false, position: 1, bankrupt: false },
      { id: 1, name: 'Creditor', cash: 500000, isAI: false, position: 1, bankrupt: false }
    ];

    gameState.properties = {};
    BOARD_TILES.forEach(t => {
      gameState.properties[t.id] = { owner: null, level: 0, mortgaged: false };
    });

    cairoTile = BOARD_TILES.find(t => t.name === 'CAIRO') || BOARD_TILES[1];
    mumbaiTile = BOARD_TILES.find(t => t.name === 'MUMBAI') || BOARD_TILES[3];
    tokyoTile = BOARD_TILES.find(t => t.name === 'TOKYO') || BOARD_TILES[20];

    // Assign Cairo and Mumbai to Debtor (Player 0)
    gameState.properties[cairoTile.id].owner = 0;
    gameState.properties[cairoTile.id].level = 0; // base price: 120k

    gameState.properties[mumbaiTile.id].owner = 0;
    gameState.properties[mumbaiTile.id].level = 2; // price: 140k + 2 * (80k / 2) = 220k

    networkState.isMultiplayer = false;
    networkState.isHost = false;
    networkState.localPlayerIdx = 0;

    engineCallbacks.concludeActionPhase = (isDoubles) => {
      concludedPhase = { isDoubles };
    };

    // Ensure DOM modal exists
    let modal = document.getElementById('modal-sell-cities');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-sell-cities';
      document.body.appendChild(modal);
    }
    modal.className = 'fixed inset-0 hidden';

    let card = document.getElementById('modal-sell-cities-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'modal-sell-cities-card';
      modal.appendChild(card);
    }

    let subtitle = document.getElementById('sell-cities-creditor-subtitle');
    if (!subtitle) {
      subtitle = document.createElement('div');
      subtitle.id = 'sell-cities-creditor-subtitle';
      card.appendChild(subtitle);
    }

    let rentDue = document.getElementById('sell-cities-rent-due');
    if (!rentDue) {
      rentDue = document.createElement('div');
      rentDue.id = 'sell-cities-rent-due';
      card.appendChild(rentDue);
    }

    let curCash = document.getElementById('sell-cities-current-cash');
    if (!curCash) {
      curCash = document.createElement('div');
      curCash.id = 'sell-cities-current-cash';
      card.appendChild(curCash);
    }

    let deficit = document.getElementById('sell-cities-deficit');
    if (!deficit) {
      deficit = document.createElement('div');
      deficit.id = 'sell-cities-deficit';
      card.appendChild(deficit);
    }

    let grid = document.getElementById('sell-cities-card-grid');
    if (!grid) {
      grid = document.createElement('div');
      grid.id = 'sell-cities-card-grid';
      card.appendChild(grid);
    }
    grid.innerHTML = '';
  });

  describe('Property Sale Value Calculation', () => {
    it('calculates base property sale value accurately with 0 houses', () => {
      const val = calculatePropertySaleValue(cairoTile, { level: 0 });
      assert.equal(val, cairoTile.price);
    });

    it('calculates upgraded property sale value including 50% house refunds', () => {
      const val = calculatePropertySaleValue(mumbaiTile, { level: 2 });
      const expected = mumbaiTile.price + (2 * (mumbaiTile.houseCost / 2));
      assert.equal(val, expected);
    });

    it('returns 0 safely if tile is null or undefined', () => {
      assert.equal(calculatePropertySaleValue(null, { level: 2 }), 0);
    });
  });

  describe('Modal Rendering & Interactive City Selection', () => {
    it('renders clickable city cards with direct onclick, role="button", and tabindex="0"', () => {
      openSellCitiesModal(tokyoTile, 150000, 1, false, 0);

      const grid = document.getElementById('sell-cities-card-grid');
      assert.ok(grid.innerHTML.includes(`onclick="window.sellPropertyForRent(${cairoTile.id})"`));
      assert.ok(grid.innerHTML.includes(`onclick="window.sellPropertyForRent(${mumbaiTile.id})"`));
      assert.ok(grid.innerHTML.includes('role="button"'));
      assert.ok(grid.innerHTML.includes('tabindex="0"'));
      assert.ok(grid.innerHTML.includes('cursor-pointer'));
      assert.ok(grid.innerHTML.includes('data-tile-id'));
    });

    it('provides stopPropagation on inner SELL button to prevent duplicate triggers', () => {
      openSellCitiesModal(tokyoTile, 150000, 1, false, 0);

      const grid = document.getElementById('sell-cities-card-grid');
      assert.ok(grid.innerHTML.includes('event.stopPropagation()'));
    });

    it('displays financial summary (rent due, current cash, deficit) correctly', () => {
      openSellCitiesModal(tokyoTile, 200000, 1, false, 0);

      const rentDue = document.getElementById('sell-cities-rent-due');
      const curCash = document.getElementById('sell-cities-current-cash');
      const deficit = document.getElementById('sell-cities-deficit');

      assert.ok(rentDue.textContent.includes('200'));
      assert.ok(curCash.textContent.includes('50'));
      assert.ok(deficit.textContent.includes('150'));
    });
  });

  describe('Specific City Liquidation via sellPropertyForRent', () => {
    it('sells specific selected city, resets ownership, credits cash, and re-renders if deficit persists', () => {
      // Debtor owes 300k, has 50k cash. Cairo gives 120k -> cash 170k, still owes 300k (deficit 130k).
      openSellCitiesModal(tokyoTile, 300000, 1, false, 0);

      sellPropertyForRent(cairoTile.id);

      assert.equal(gameState.properties[cairoTile.id].owner, null);
      assert.equal(gameState.properties[cairoTile.id].level, 0);
      assert.equal(gameState.players[0].cash, 170000);

      // Modal should still be open with remaining property (Mumbai)
      const grid = document.getElementById('sell-cities-card-grid');
      assert.ok(!grid.innerHTML.includes(cairoTile.name));
      assert.ok(grid.innerHTML.includes(mumbaiTile.name));
    });

    it('settles rent debt and closes modal once cumulative cash covers debt', () => {
      // Debtor owes 150k, has 50k cash. Selling Cairo (+120k) gives 170k >= 150k.
      openSellCitiesModal(tokyoTile, 150000, 1, false, 0);

      sellPropertyForRent(cairoTile.id);

      // Debtor cash after paying 150k rent: 170k - 150k = 20k
      assert.equal(gameState.players[0].cash, 20000);
      // Creditor received 150k: 500k + 150k = 650k
      assert.equal(gameState.players[1].cash, 650000);
      // Debt resolved, pendingRentDebt cleared
      assert.equal(gameState.pendingRentDebt, null);
      // Action phase concluded
      assert.notEqual(concludedPhase, null);
    });

    it('safely handles string tileId passed from dataset or DOM attributes', () => {
      openSellCitiesModal(tokyoTile, 300000, 1, false, 0);

      sellPropertyForRent(String(cairoTile.id));

      assert.equal(gameState.properties[cairoTile.id].owner, null);
      assert.equal(gameState.players[0].cash, 170000);
    });

    it('rejects selling a property that the debtor does not own', () => {
      // Tokyo is not owned by debtor
      openSellCitiesModal(tokyoTile, 300000, 1, false, 0);

      sellPropertyForRent(tokyoTile.id);

      assert.equal(gameState.players[0].cash, 50000);
      assert.ok(gameState.pendingRentDebt !== null);
    });
  });

  describe('Auto-Sell Cheapest Liquidation', () => {
    it('sells lowest-value property first to satisfy rent debt', () => {
      // Debtor owes 160k, cash 50k. Needs 110k.
      // Cairo saleVal = 120k, Mumbai saleVal = 220k.
      // Auto-sell should sell Cairo only.
      openSellCitiesModal(tokyoTile, 160000, 1, false, 0);

      autoSellCheapestForRent();

      assert.equal(gameState.properties[cairoTile.id].owner, null);
      assert.equal(gameState.properties[mumbaiTile.id].owner, 0); // Mumbai retained!
      assert.equal(gameState.pendingRentDebt, null);
    });
  });
});
