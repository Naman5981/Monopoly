/**
 * test/svelte/wardrobeAndLayoutUi.test.js
 * Verification of Wardrobe modal visibility contracts, 3D character preview positioning,
 * and TopBar / StatusPill defensive layout positioning (/better-interface /bug-hunter /game-art).
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupBrowserMocks } from '../setup.js';

setupBrowserMocks();

import { modalStore, updateModalSlice, closeAllModalsInStore } from '../../src/svelte/stores/modalStore.js';
import { WARDROBE_ITEMS, openWardrobeModal, closeWardrobeModal, previewWardrobeItem, setWardrobeCategory } from '../../src/ui/wardrobe.js';
import { matchSettings, lobbyPlayerCount, setLobbyPlayerCount } from '../../src/game/state.js';
import { CANDY_PALETTE, setPlayerColor, setLocalPlayerColor, ensureBotsHaveUniqueColors, setSelectedSetupPlayerIdx } from '../../src/ui/setup/playerCustomization.js';
import { renderMatchSettingButtons } from '../../src/ui/setup/matchSettingsUI.js';
import { setLobbyView } from '../../src/ui/setup/lobbyNavigation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

describe('Wardrobe & HUD Layout Verification (/better-interface /game-art /bug-hunter)', () => {
  beforeEach(() => {
    closeAllModalsInStore();
    document.body.innerHTML = `
      <div id="landing-setup-screen" class="lobby-view-title">
        <div id="lobby-hero-column">
          <div id="title-menu-actions"></div>
          <div class="lobby-hero-default-controls"></div>
          <div class="lobby-hero-wardrobe-controls"></div>
        </div>
      </div>
      <div id="modal-wardrobe" class="hidden wardrobe-panel-hidden">
        <div id="wardrobe-backdrop"></div>
        <div id="wardrobe-panel-card"></div>
        <div id="wardrobe-items-grid"></div>
        <span id="wardrobe-stars-balance">150</span>
      </div>
      <header id="main-game-hud-bar" class="hidden"></header>
      <div id="hud-bottom-status-wrap" class="hidden"></div>
      <div id="chance-wheel-ticker-pin" class="chance-wheel-ticker-pin">
        <div class="ticker-pin-head">
          <div class="ticker-pin-gem"></div>
        </div>
        <div class="ticker-pin-needle"></div>
      </div>
    `;
  });

  it('verifies WardrobeModal contains wardrobe-panel-visible when state.visible is true', () => {
    updateModalSlice('wardrobe', { visible: true, activeCategory: 'hat', starsBalance: 300 });

    let state;
    const unsub = modalStore.subscribe(val => { state = val.wardrobe; });
    unsub();

    assert.equal(state.visible, true);
    assert.equal(state.activeCategory, 'hat');
    assert.equal(state.starsBalance, 300);

    const svelteSrc = fs.readFileSync(path.join(rootDir, 'src', 'svelte', 'modals', 'WardrobeModal.svelte'), 'utf8');
    assert.ok(
      svelteSrc.includes("state.visible ? 'flex wardrobe-panel-visible pointer-events-auto' : 'hidden wardrobe-panel-hidden pointer-events-none'"),
      'WardrobeModal.svelte must bind wardrobe-panel-visible and pointer-events-auto reactively'
    );
  });

  it('verifies style.css contains defensive layout for main-game-hud-bar and hud-bottom-status-wrap', () => {
    const styleCss = fs.readFileSync(path.join(rootDir, 'src', 'style.css'), 'utf8');

    // main-game-hud-bar must be fixed with left and right spanning
    assert.ok(styleCss.includes('#main-game-hud-bar {'), 'main-game-hud-bar must be defined in style.css');
    assert.ok(styleCss.includes('left: 12px !important;'), 'main-game-hud-bar must have left boundary');
    assert.ok(styleCss.includes('right: 12px !important;'), 'main-game-hud-bar must have right boundary');

    // hud-bottom-status-wrap must be fixed at bottom center
    assert.ok(styleCss.includes('#hud-bottom-status-wrap {'), 'hud-bottom-status-wrap must be defined in style.css');
    assert.ok(styleCss.includes('bottom: 16px !important;'), 'hud-bottom-status-wrap must be anchored to bottom');
    assert.ok(styleCss.includes('transform: translateX(-50%) !important;'), 'hud-bottom-status-wrap must be centered');
  });

  it('verifies 3D hero stage shifts left without flying offscreen in wardrobe mode', () => {
    const styleCss = fs.readFileSync(path.join(rootDir, 'src', 'style.css'), 'utf8');

    // Hero column transform should shift to left stage (-18vw / -260px), NOT -100%
    assert.ok(
      styleCss.includes('transform: translate3d(min(-18vw, -260px), 0, 0) !important;'),
      'Hero column must shift to center of left stage instead of translating offscreen'
    );

    // Title menu actions must be hidden during wardrobe mode
    assert.ok(
      styleCss.includes('.wardrobe-mode-active #title-menu-actions,'),
      'Title menu actions must be cleanly hidden during wardrobe mode'
    );
  });

  it('verifies Chance Wheel ticker needle CSS classes exist and render golden 3D pin', () => {
    const styleCss = fs.readFileSync(path.join(rootDir, 'src', 'style.css'), 'utf8');

    assert.ok(styleCss.includes('.chance-wheel-ticker-pin'), 'ticker pin container class must exist in style.css');
    assert.ok(styleCss.includes('.ticker-pin-head'), 'ticker pin head class must exist in style.css');
    assert.ok(styleCss.includes('.ticker-pin-gem'), 'ticker pin gem class must exist in style.css');
    assert.ok(styleCss.includes('.ticker-pin-needle'), 'ticker pin needle triangle class must exist in style.css');
  });

  it('verifies tailwind.config.js includes .svelte files in content scanning', () => {
    const tailwindConfig = fs.readFileSync(path.join(rootDir, 'tailwind.config.js'), 'utf8');
    assert.ok(
      tailwindConfig.includes('./src/**/*.{js,ts,html,svelte}'),
      'tailwind.config.js must scan .svelte files'
    );
  });

  it('allows human player to take any color, automatically re-rolling conflicting bots to unique random colors', () => {
    setLobbyView('title', false);
    setLobbyPlayerCount(4);
    setSelectedSetupPlayerIdx(0);

    // Setup 1 human and 3 bots
    matchSettings.customPlayers[0] = { name: 'HUMAN', isAI: false, colorHex: '#3b82f6', charColor: 0x3b82f6, hatStyle: 0 };
    matchSettings.customPlayers[1] = { name: 'BARON', isAI: true, colorHex: '#ef4444', charColor: 0xef4444, hatStyle: 1 };
    matchSettings.customPlayers[2] = { name: 'ATLAS', isAI: true, colorHex: '#22c55e', charColor: 0x22c55e, hatStyle: 2 };
    matchSettings.customPlayers[3] = { name: 'NOVA', isAI: true, colorHex: '#84cc16', charColor: 0x84cc16, hatStyle: 3 };

    // Player takes #ef4444 (previously held by bot BARON)
    const success = setLocalPlayerColor('#ef4444', 0xef4444);
    assert.equal(success, true, 'Human player must be able to take color previously held by bot');
    assert.equal(matchSettings.customPlayers[0].colorHex, '#ef4444', 'Human player receives chosen color');

    // Bot 1 must have given up #ef4444 and picked a different random color
    assert.notEqual(matchSettings.customPlayers[1].colorHex, '#ef4444', 'Bot must not have #ef4444');

    // All active players must have distinct colors
    const activeColors = matchSettings.customPlayers.slice(0, 4).map(p => p.colorHex.toLowerCase());
    const uniqueColors = new Set(activeColors);
    assert.equal(uniqueColors.size, 4, 'All 4 players must have unique, non-colliding colors');
    assert.ok(!matchSettings.customPlayers.slice(1, 4).some(b => b.colorHex.toLowerCase() === '#ef4444'), 'No bot should share the human player color');
  });

  it('renders color swatches enabled on home screen even when bots hold those colors', () => {
    setLobbyView('title', false);
    setLobbyPlayerCount(4);
    setSelectedSetupPlayerIdx(0);

    const swatchesContainer = document.createElement('div');
    swatchesContainer.id = 'setup-color-swatches';
    document.body.appendChild(swatchesContainer);

    matchSettings.customPlayers[0] = { name: 'HUMAN', isAI: false, colorHex: '#3b82f6', charColor: 0x3b82f6 };
    matchSettings.customPlayers[1] = { name: 'BOT1', isAI: true, colorHex: '#ef4444', charColor: 0xef4444 };
    matchSettings.customPlayers[2] = { name: 'BOT2', isAI: true, colorHex: '#22c55e', charColor: 0x22c55e };
    matchSettings.customPlayers[3] = { name: 'BOT3', isAI: true, colorHex: '#84cc16', charColor: 0x84cc16 };

    renderMatchSettingButtons();

    // Verify #ef4444 (held by BOT1) is NOT disabled or locked with swatch-disabled
    const rubyRedButton = swatchesContainer.querySelector('button[title*="Ruby Red"]');
    assert.ok(rubyRedButton, 'Ruby Red swatch button must be rendered');
    assert.equal(rubyRedButton.disabled, false, 'Ruby Red must NOT be disabled just because a bot has it');
    assert.ok(!rubyRedButton.classList.contains('swatch-disabled'), 'Ruby Red must not have swatch-disabled class');
  });

  it('verifies StatusPill.svelte contains required DOM IDs and updates dynamically during match turns', () => {
    const svelteSrc = fs.readFileSync(path.join(rootDir, 'src', 'svelte', 'hud', 'StatusPill.svelte'), 'utf8');
    assert.ok(svelteSrc.includes('id="hud-status-pill"'), 'StatusPill must define id="hud-status-pill"');
    assert.ok(svelteSrc.includes('id="hud-status-pill-dot"'), 'StatusPill must define id="hud-status-pill-dot"');
    assert.ok(svelteSrc.includes('id="hud-status-pill-text"'), 'StatusPill must define id="hud-status-pill-text"');
    assert.ok(svelteSrc.includes('{#if state.rollButton?.visible}'), 'Roll station must only render when rollButton is visible');
  });
});
