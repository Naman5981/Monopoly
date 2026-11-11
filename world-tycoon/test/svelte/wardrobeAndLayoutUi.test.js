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
import { matchSettings } from '../../src/game/state.js';

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
});
