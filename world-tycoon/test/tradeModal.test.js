import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { gameState, localPlayerIdx } from '../src/game/state.js';
import { networkState } from '../src/network/p2pState.js';
import { BOARD_TILES } from '../src/game/data.js';
import {
  openTradeModal,
  closeTradeModal,
  executeTradeOffer,
  handleTradeDeclined,
  completeTradeTransfer
} from '../src/ui/modals/trade.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Diplomatic Trade Modal & Property-Only Rules (/bug-hunter)', () => {
  let cairoTile, mumbaiTile;

  beforeEach(() => {
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.players = [
      { id: 0, name: 'Naman', cash: 2000000, isAI: false, bankrupt: false },
      { id: 1, name: 'Baron', cash: 2000000, isAI: false, bankrupt: false }
    ];

    gameState.properties = {};
    BOARD_TILES.forEach(t => {
      gameState.properties[t.id] = { owner: null, level: 0, mortgaged: false, festivalBoost: false };
    });

    cairoTile = BOARD_TILES.find(t => t.name === 'CAIRO') || BOARD_TILES[1];
    mumbaiTile = BOARD_TILES.find(t => t.name === 'MUMBAI') || BOARD_TILES[3];

    gameState.properties[cairoTile.id].owner = 0; // Owned by Naman
    gameState.properties[mumbaiTile.id].owner = 1; // Owned by Baron

    networkState.isMultiplayer = true;
    networkState.localPlayerIdx = 0;
    networkState.isHost = true;

    // Reset modal elements
    const tradeModal = document.getElementById('modal-trade');
    if (tradeModal) {
      tradeModal.classList.add('hidden');
      tradeModal.classList.remove('flex');
    }
    const partnerSelect = document.getElementById('trade-partner-select');
    if (partnerSelect) {
      partnerSelect.value = '1';
    }
    const sendBtn = document.getElementById('btn-send-trade-offer');
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    const statusMsg = document.getElementById('trade-status-msg');
    if (statusMsg) {
      statusMsg.classList.add('hidden');
      statusMsg.textContent = '';
      statusMsg.innerHTML = '';
    }
    const offerContainer = document.getElementById('trade-offer-props');
    if (offerContainer) offerContainer.innerHTML = '';
    const reqContainer = document.getElementById('trade-req-props');
    if (reqContainer) reqContainer.innerHTML = '';
  });

  it('verifies trade modal contains property containers and wallet badges, with cash inputs removed', () => {
    const templatePath = path.resolve(__dirname, '../src/svelte/modals/TradeModal.svelte');
    const content = fs.readFileSync(templatePath, 'utf8');

    assert.equal(content.includes('id="trade-offer-cash"'), false, 'trade-offer-cash input must be removed');
    assert.equal(content.includes('id="trade-req-cash"'), false, 'trade-req-cash input must be removed');
    assert.equal(content.includes('id="trade-my-wallet"'), true, 'trade-my-wallet badge must exist');
    assert.equal(content.includes('id="trade-partner-wallet"'), true, 'trade-partner-wallet badge must exist');
    assert.equal(content.includes('id="trade-offer-props"'), true, 'trade-offer-props container must exist');
    assert.equal(content.includes('id="trade-req-props"'), true, 'trade-req-props container must exist');
  });

  it('rejects sending a trade if no properties are selected', () => {
    openTradeModal();
    const partnerSelect = document.getElementById('trade-partner-select');
    partnerSelect.value = '1';

    executeTradeOffer();

    const statusMsg = document.getElementById('trade-status-msg');
    assert.match(statusMsg.textContent, /select at least one city to trade/i);
  });

  it('disables send button and displays waiting message when trade is sent in multiplayer', () => {
    openTradeModal();
    const partnerSelect = document.getElementById('trade-partner-select');
    partnerSelect.value = '1';

    // Mock checked properties
    const offerContainer = document.getElementById('trade-offer-props');
    const reqContainer = document.getElementById('trade-req-props');
    offerContainer.innerHTML = `<input type="checkbox" class="trade-my-prop" value="${cairoTile.id}" checked>`;
    reqContainer.innerHTML = `<input type="checkbox" class="trade-their-prop" value="${mumbaiTile.id}" checked>`;

    // Mock querySelectorAll for trade properties
    const origQSA = document.querySelectorAll;
    document.querySelectorAll = (sel) => {
      if (sel === '.trade-my-prop:checked') return [{ value: String(cairoTile.id) }];
      if (sel === '.trade-their-prop:checked') return [{ value: String(mumbaiTile.id) }];
      return origQSA ? origQSA(sel) : [];
    };

    try {
      executeTradeOffer();

      const statusMsg = document.getElementById('trade-status-msg');
      assert.match(statusMsg.innerHTML, /Trade proposal sent to/);
      assert.match(statusMsg.innerHTML, /Waiting for their decision/);

      const sendBtn = document.getElementById('btn-send-trade-offer');
      assert.equal(sendBtn.disabled, true);
      assert.equal(sendBtn.classList.contains('cursor-not-allowed'), true);
    } finally {
      document.querySelectorAll = origQSA;
    }
  });

  it('closes trade modal upon receiving affirmative trade response', () => {
    openTradeModal();
    assert.equal(document.getElementById('modal-trade').classList.contains('hidden'), false);

    closeTradeModal();
    assert.equal(document.getElementById('modal-trade').classList.contains('hidden'), true);
  });

  it('updates status message and re-enables send button upon receiving decline response', () => {
    openTradeModal();
    const sendBtn = document.getElementById('btn-send-trade-offer');
    sendBtn.disabled = true;

    handleTradeDeclined('Baron');

    const statusMsg = document.getElementById('trade-status-msg');
    assert.match(statusMsg.innerHTML, /Baron.*declined the trade offer/);
    assert.equal(sendBtn.disabled, false);
    assert.equal(sendBtn.classList.contains('cursor-not-allowed'), false);
  });

  it('completes property and cash transfer correctly when trade includes cash compensation', () => {
    const initialNamanCash = gameState.players[0].cash;
    const initialBaronCash = gameState.players[1].cash;

    // Naman offers 100K cash, Baron pays 50K cash (net: Naman -50K, Baron +50K)
    completeTradeTransfer(0, 1, 100000, 50000, [cairoTile.id], [mumbaiTile.id]);

    assert.equal(gameState.properties[cairoTile.id].owner, 1);
    assert.equal(gameState.properties[mumbaiTile.id].owner, 0);
    assert.equal(gameState.players[0].cash, initialNamanCash - 50000);
    assert.equal(gameState.players[1].cash, initialBaronCash + 50000);
  });
});
