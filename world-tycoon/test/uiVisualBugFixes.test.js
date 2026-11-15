import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { gameState } from '../src/game/state.js';
import { BOARD_TILES, GROUP_META } from '../src/game/data.js';
import { openBuyoutCityModal } from '../src/ui/modals/buyoutCity.js';
import { openBuyCityModal } from '../src/ui/modals/buyCity.js';
import { openTradeModal } from '../src/ui/modals/trade.js';
import { drawChanceWheelCanvas } from '../src/ui/modals/chanceCanvas.js';
import { modalStore } from '../src/svelte/stores/modalStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('UI Visual Fixes: Contrast, Dots, Canvas & Trade (/better-interface /bug-hunter)', () => {
  beforeEach(() => {
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.players = [
      { id: 'p0', name: 'TYCOON', cash: 2000000, bankrupt: false, isAI: false },
      { id: 'p1', name: 'BARON', cash: 2000000, bankrupt: false, isAI: true }
    ];
    gameState.properties = {};
  });

  it('openBuyoutCityModal sets cityName and group colorHex in modalStore', () => {
    const tile = BOARD_TILES[1]; // CAIRO (brown)
    gameState.properties[tile.id] = { owner: 1, level: 0 };

    openBuyoutCityModal(tile, false);

    let currentSlice = {};
    modalStore.subscribe(val => { currentSlice = val.buyout || {}; })();

    assert.equal(currentSlice.cityName, 'CAIRO');
    assert.equal(currentSlice.colorHex, GROUP_META.brown.hex);
  });

  it('openTradeModal populates property colors from GROUP_META instead of fallback blue', () => {
    // Player 0 owns Cairo (brown) and Athens (lightblue)
    gameState.properties[1] = { owner: 0, level: 0 };
    gameState.properties[6] = { owner: 0, level: 0 };
    // Player 1 owns Madrid (pink)
    gameState.properties[10] = { owner: 1, level: 0 };

    openTradeModal();

    let tradeSlice = {};
    modalStore.subscribe(val => { tradeSlice = val.trade || {}; })();

    const cairoProp = (tradeSlice.myProperties || []).find(p => p.id === 1);
    const athensProp = (tradeSlice.myProperties || []).find(p => p.id === 6);
    const madridProp = (tradeSlice.partnerProperties || []).find(p => p.id === 10);

    assert.ok(cairoProp, 'Cairo property must be in myProperties');
    assert.equal(cairoProp.color, GROUP_META.brown.hex, 'Cairo dot must match brown hex');

    assert.ok(athensProp, 'Athens property must be in myProperties');
    assert.equal(athensProp.color, GROUP_META.lightblue.hex, 'Athens dot must match lightblue hex');

    assert.ok(madridProp, 'Madrid property must be in partnerProperties');
    assert.equal(madridProp.color, GROUP_META.pink.hex, 'Madrid dot must match pink hex');
  });

  it('drawChanceWheelCanvas renders without throwing and returns true when canvas context exists', () => {
    const mockCtx = {
      clearRect() {},
      createRadialGradient() {
        return { addColorStop() {} };
      },
      beginPath() {},
      arc() {},
      fill() {},
      stroke() {},
      moveTo() {},
      closePath() {},
      save() {},
      restore() {},
      translate() {},
      scale() {},
      fillText() {},
      rect() {},
      roundRect() {},
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetY: 0,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1
    };

    const mockCanvas = {
      getContext: () => mockCtx
    };

    const result = drawChanceWheelCanvas(mockCanvas);
    assert.equal(result, true, 'drawChanceWheelCanvas must return true on valid canvas');
  });

  it('verifies Svelte modals have proper templates and overflow containment', () => {
    const tradePath = path.resolve(__dirname, '../src/svelte/modals/TradeModal.svelte');
    const tradeContent = fs.readFileSync(tradePath, 'utf8');

    // Both property columns must have bottom clearance to prevent bottom clipping
    assert.ok(tradeContent.includes('pb-6'), 'TradeModal property columns must have pb-6 padding');

    const buyoutPath = path.resolve(__dirname, '../src/svelte/modals/BuyoutModal.svelte');
    const buyoutContent = fs.readFileSync(buyoutPath, 'utf8');
    assert.ok(buyoutContent.includes('buyout-modal-name'), 'BuyoutModal must have buyout-modal-name');
    assert.ok(buyoutContent.includes('state.colorHex'), 'BuyoutModal must reference state.colorHex');

    const chancePath = path.resolve(__dirname, '../src/svelte/modals/ChanceWheelModal.svelte');
    const chanceContent = fs.readFileSync(chancePath, 'utf8');
    assert.ok(chanceContent.includes('bind:this={canvasEl}'), 'ChanceWheelModal must bind canvas element');
  });
});
