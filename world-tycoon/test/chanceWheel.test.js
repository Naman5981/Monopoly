import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { gameState } from '../src/game/state.js';
import { networkState } from '../src/network/p2pState.js';
import { ChanceLandingStrategy } from '../src/game/engine/strategies/ChanceLandingStrategy.js';
import { openChanceWheelModal, spinChanceWheel, drawChanceWheelCanvas, executeRemoteChanceSpin, clearChanceTimers } from '../src/ui/modals/chanceWheel.js';
import { isLobbyScreenActive } from '../src/ui/modals/common.js';

describe('Chance Wheel Opening & Spin Verification (/bug-hunter)', () => {
  beforeEach(() => {
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.players = [
      { id: 'p0', name: 'Naman', cash: 2000000, isAI: false, position: 12 },
      { id: 'p1', name: 'Bot-1', cash: 2000000, isAI: true, position: 0 },
    ];
    networkState.isMultiplayer = false;
    networkState.localPlayerIdx = 0;

    const landingScreen = document.getElementById('landing-setup-screen');
    if (landingScreen) landingScreen.classList.add('hidden');

    const modal = document.getElementById('modal-chance-wheel');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    const card = document.getElementById('modal-chance-wheel-card');
    if (card) {
      card.style.opacity = '';
      card.style.transform = '';
    }
  });

  afterEach(() => {
    clearChanceTimers();
  });

  it('opens chance wheel modal and card with spring transition when player lands on Chance', async () => {
    const strategy = new ChanceLandingStrategy();
    await strategy.execute({
      playerIdx: 0,
      player: gameState.players[0],
      isDoubles: false,
    });

    const modal = document.getElementById('modal-chance-wheel');
    assert.equal(gameState.phase, 'MODAL');
    assert.equal(modal.classList.contains('hidden'), false);
    assert.equal(modal.classList.contains('flex'), true);

    const btn = document.getElementById('btn-spin-wheel');
    assert.equal(btn.disabled, false);
  });

  it('resets canvas angle, activates spin button, and updates status pill on openChanceWheelModal', () => {
    openChanceWheelModal(false);

    assert.equal(gameState.phase, 'MODAL');
    const modal = document.getElementById('modal-chance-wheel');
    assert.equal(modal.classList.contains('hidden'), false);
    assert.equal(modal.classList.contains('flex'), true);

    const pillText = document.getElementById('hud-status-pill-text');
    assert.match(pillText.innerHTML || pillText.textContent, /Spin the wheel to test your luck on Chance/);
  });

  it('handles spinChanceWheel click by disabling button and transitioning to spinning state', () => {
    openChanceWheelModal(false);
    const btn = document.getElementById('btn-spin-wheel');
    assert.equal(btn.disabled, false);

    spinChanceWheel();
    assert.equal(btn.disabled, true);
    assert.match(btn.innerHTML, /SPINNING/);
  });

  it('survives gracefully if canvas context drawing throws without preventing modal display', () => {
    const canvas = document.getElementById('chance-wheel-canvas');
    const origGetContext = canvas.getContext;
    canvas.getContext = () => {
      throw new Error('Canvas 2D context temporarily unavailable');
    };

    try {
      openChanceWheelModal(false);
      const modal = document.getElementById('modal-chance-wheel');
      assert.equal(modal.classList.contains('hidden'), false);
      assert.equal(modal.classList.contains('flex'), true);
      assert.equal(gameState.phase, 'MODAL');
    } finally {
      canvas.getContext = origGetContext;
      clearChanceTimers();
    }
  });

  it('configures modal for multiplayer spectator and disables button with WAITING label', () => {
    networkState.isMultiplayer = true;
    networkState.localPlayerIdx = 0;
    networkState.isHost = false;

    // Remote human player 1 lands on Chance
    gameState.players[1].isAI = false;
    openChanceWheelModal(false, 1);

    const modal = document.getElementById('modal-chance-wheel');
    assert.equal(modal.classList.contains('hidden'), false);

    const btn = document.getElementById('btn-spin-wheel');
    assert.equal(btn.disabled, true);
    assert.match(btn.innerHTML, /WAITING FOR BOT-1/);

    const resText = document.getElementById('chance-result-text');
    assert.match(resText.textContent, /Bot-1 is testing their luck/);
    clearChanceTimers();
  });

  it('configures modal for AI bot with auto-spinning state', () => {
    networkState.isMultiplayer = false;
    // AI Bot 1 lands on Chance
    openChanceWheelModal(false, 1);

    const modal = document.getElementById('modal-chance-wheel');
    assert.equal(modal.classList.contains('hidden'), false);

    const btn = document.getElementById('btn-spin-wheel');
    assert.equal(btn.disabled, true);
    assert.match(btn.innerHTML, /BOT-1 IS SPINNING/);

    const pillText = document.getElementById('hud-status-pill-text');
    assert.match(pillText.innerHTML || pillText.textContent, /Bot-1.*spinning the Chance Wheel/);
    clearChanceTimers();
  });

  it('executeRemoteChanceSpin opens modal and animates wheel rotation for peer observers', () => {
    networkState.isMultiplayer = true;
    networkState.localPlayerIdx = 0;

    executeRemoteChanceSpin(1, 2, 4, false);

    const modal = document.getElementById('modal-chance-wheel');
    assert.equal(modal.classList.contains('hidden'), false);

    const btn = document.getElementById('btn-spin-wheel');
    assert.equal(btn.disabled, true);
    assert.match(btn.innerHTML, /SPINNING/);
    clearChanceTimers();
  });

  it('isLobbyScreenActive defensively cleans up unhidden landing screen during active match', () => {
    const landing = document.getElementById('landing-setup-screen');
    if (landing) landing.classList.remove('hidden');

    gameState.gameStarted = true;
    gameState.phase = 'ROLL';

    const isActive = isLobbyScreenActive();
    assert.equal(isActive, false);
    if (landing) {
      assert.equal(landing.classList.contains('hidden'), true);
    }
  });
});
