import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { gameState } from '../src/game/state.js';
import { networkState } from '../src/network/p2pState.js';
import { BOARD_TILES } from '../src/game/data.js';
import {
  openBuyoutCityModal,
  confirmBuyoutCity,
  passBuyoutCity,
  calculateBuyoutCost,
  clearBuyoutTimers
} from '../src/ui/modals/buyoutCity.js';
import { animateBuyoutHostileStamp } from '../src/ui/anim.js';
import { playBuyoutCinematicFocus } from '../src/three/scene.js';
import { cameraState } from '../src/three/core/camera.js';
import { context } from '../src/three/core/context.js';

describe('Hostile Buyout Lifecycle & P2P Synchronization (/bug-hunter)', () => {
  let bangkokTile;

  beforeEach(() => {
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.festivalPot = 0;
    gameState.players = [
      { id: 0, name: 'Naman', cash: 2000000, isAI: false, position: 5 },
      { id: 1, name: 'Baron', cash: 2000000, isAI: false, position: 5 }
    ];

    gameState.properties = {};
    BOARD_TILES.forEach(t => {
      gameState.properties[t.id] = { owner: null, level: 0, mortgaged: false, festivalBoost: false };
    });

    bangkokTile = BOARD_TILES.find(t => t.name === 'BANGKOK') || BOARD_TILES[5];
    gameState.properties[bangkokTile.id].owner = 1; // owned by Baron

    networkState.isMultiplayer = false;
    networkState.localPlayerIdx = 0;

    const modal = document.getElementById('modal-buyout-city');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  });

  afterEach(() => {
    clearBuyoutTimers();
  });

  it('calculates buyout cost correctly (2x base price + houses)', () => {
    const cost = calculateBuyoutCost(bangkokTile, { level: 1 });
    // basePrice = 190,000 * 2 = 380,000; houseCost = 100,000; total = 480,000
    assert.equal(cost, 480000);
  });

  it('protects level 4 Skyscraper landmark from hostile buyout (returns 0 cost)', () => {
    const cost = calculateBuyoutCost(bangkokTile, { level: 4 });
    assert.equal(cost, 0);
  });

  it('opens buyout modal and configures pass countdown timer', () => {
    openBuyoutCityModal(bangkokTile, false);

    assert.equal(gameState.phase, 'MODAL');
    const modal = document.getElementById('modal-buyout-city');
    assert.equal(modal.classList.contains('hidden'), false);
    assert.equal(modal.classList.contains('flex'), true);

    const passBtn = document.getElementById('btn-pass-buyout');
    assert.match(passBtn.innerHTML, /PASS \(12s\)/);

    const statusPill = document.getElementById('hud-status-pill-text');
    assert.match(statusPill.innerHTML || statusPill.textContent, /Hostile buyout option for/);
  });

  it('confirms buyout: transfers cash, updates ownership, and concludes turn', () => {
    let concluded = false;
    window.concludeActionPhase = () => { concluded = true; };

    openBuyoutCityModal(bangkokTile, false);
    const buyerInitialCash = gameState.players[0].cash;
    const sellerInitialCash = gameState.players[1].cash;
    const cost = calculateBuyoutCost(bangkokTile, gameState.properties[bangkokTile.id]);

    confirmBuyoutCity();

    assert.equal(gameState.properties[bangkokTile.id].owner, 0);
    assert.equal(gameState.players[0].cash, buyerInitialCash - cost);
    assert.equal(gameState.players[1].cash, sellerInitialCash + cost);
    assert.equal(concluded, true);
  });

  it('passes buyout: logs pass, closes modal, and concludes turn', () => {
    let concluded = false;
    window.concludeActionPhase = () => { concluded = true; };

    openBuyoutCityModal(bangkokTile, false);
    passBuyoutCity();

    assert.equal(gameState.properties[bangkokTile.id].owner, 1); // still owned by seller
    assert.equal(concluded, true);
    const modal = document.getElementById('modal-buyout-city');
    assert.equal(modal.classList.contains('hidden'), true);
  });

  it('broadcasts ACTION_PASS_BUYOUT in multiplayer when passing', () => {
    networkState.isMultiplayer = true;
    networkState.localPlayerIdx = 0;
    networkState.isHost = true;

    openBuyoutCityModal(bangkokTile, false);
    passBuyoutCity();

    assert.equal(gameState.properties[bangkokTile.id].owner, 1);
  });

  describe('Hostile Takeover Banner, Sound & 1.5s Panning Zoom (/web-games)', () => {
    it('renders hostile takeover stamp banner with buyer and victim names', () => {
      animateBuyoutHostileStamp('BANGKOK', 'Naman', 'Baron');

      const stamp = document.getElementById('buyout-hostile-stamp');
      assert.ok(stamp !== null);
      assert.equal(stamp.style.display, 'flex');
      assert.match(stamp.innerHTML, /HOSTILE TAKEOVER!/);
      assert.match(stamp.innerHTML, /Naman/);
      assert.match(stamp.innerHTML, /BANGKOK/);
      assert.match(stamp.innerHTML, /Baron/);
    });

    it('smoothly glides camera to tile for 1.5s and restores previous framing', async () => {
      // Setup mock camera context
      context.camera = { position: { set: () => {} }, lookAt: () => {}, updateProjectionMatrix: () => {} };
      cameraState.targetCameraTarget.set(0, 0, 0);
      cameraState.targetCameraZoom = 1.0;
      cameraState.targetCameraAzimuth = Math.PI / 4;

      const promise = playBuyoutCinematicFocus(bangkokTile.id, 50);

      // Verify camera immediately focuses on the property with close-up zoom
      assert.notEqual(cameraState.targetCameraZoom, 1.0);
      assert.equal(cameraState.targetCameraZoom, 2.15);

      await promise;

      // Verify camera framing restored after cutscene completion
      assert.equal(cameraState.targetCameraZoom, 1.0);
      assert.equal(cameraState.targetCameraTarget.x, 0);
      assert.equal(cameraState.targetCameraTarget.z, 0);

      context.camera = null;
    });
  });
});
