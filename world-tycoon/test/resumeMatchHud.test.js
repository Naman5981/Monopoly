/**
 * test/resumeMatchHud.test.js
 * Verification for HUD restoration upon match resume and 3D visual polish fixes.
 * (/bug-hunter /better-interface /game-art)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import './setup.js';

import { gameState, matchSettings } from '../src/game/state.js';
import { revealGameHud, hideGameHud } from '../src/ui/hud/controls.js';
import { resumeSavedMatch, getSavedMatchData } from '../src/game/persistence.js';
import { createTileEmissiveTexture } from '../src/three/board/tileCanvas.js';
import { BOARD_TILES } from '../src/game/data.js';

describe('Resume Match HUD Restoration & Visual Polish Suite (/bug-hunter)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <div id="landing-setup-screen" class="flex"></div>
      <header id="main-game-hud-bar" class="hidden"></header>
      <div id="hud-match-status-capsule" class="hidden"></div>
      <div id="hud-left-players" class="hidden"></div>
      <div id="hud-right-players" class="hidden"></div>
      <div id="hud-bottom-status-wrap" class="hidden"></div>
      <div id="token-speech-bubble" class="hidden"></div>
      <div id="screen-dice-overlay" class="hidden"></div>
    `;
  });

  describe('revealGameHud & hideGameHud lifecycle', () => {
    it('removes hidden class and display none from all in-game HUD layers', () => {
      revealGameHud();

      const hudBar = document.getElementById('main-game-hud-bar');
      const capsule = document.getElementById('hud-match-status-capsule');
      const hudLeft = document.getElementById('hud-left-players');
      const hudRight = document.getElementById('hud-right-players');
      const statusWrap = document.getElementById('hud-bottom-status-wrap');

      assert.equal(hudBar.classList.contains('hidden'), false);
      assert.equal(capsule.classList.contains('hidden'), false);
      assert.equal(hudLeft.classList.contains('hidden'), false);
      assert.equal(hudRight.classList.contains('hidden'), false);
      assert.equal(statusWrap.classList.contains('hidden'), false);
    });

    it('hides all HUD layers when returning to setup/lobby', () => {
      revealGameHud();
      hideGameHud();

      const hudBar = document.getElementById('main-game-hud-bar');
      const hudLeft = document.getElementById('hud-left-players');
      const hudRight = document.getElementById('hud-right-players');
      const statusWrap = document.getElementById('hud-bottom-status-wrap');

      assert.equal(hudBar.classList.contains('hidden'), true);
      assert.equal(hudLeft.classList.contains('hidden'), true);
      assert.equal(hudRight.classList.contains('hidden'), true);
      assert.equal(statusWrap.classList.contains('hidden'), true);
    });
  });

  describe('resumeSavedMatch HUD restoration', () => {
    it('restores HUD visibility immediately when resuming a saved game', () => {
      const mockSavedMatch = {
        timestamp: Date.now(),
        matchSeconds: 120,
        displayedCash: [1500000, 1500000],
        matchSettings: {
          startingCash: 1500000,
          turnDuration: 15,
          lightingTheme: 'night',
          boardStyle: 'wood'
        },
        gameState: {
          gameStarted: true,
          currentPlayerIdx: 0,
          phase: 'ROLL',
          turnTimeLeft: 12,
          players: [
            { name: 'Naman', cash: 1500000, position: 0, isAI: false, bankrupt: false },
            { name: 'Baron', cash: 1400000, position: 5, isAI: true, bankrupt: false }
          ],
          properties: {
            5: { owner: 1, level: 0, mortgaged: false }
          }
        }
      };

      localStorage.setItem('WORLD_TYCOON_SAVED_MATCH_V1', JSON.stringify(mockSavedMatch));

      const resumed = resumeSavedMatch();
      assert.equal(resumed, true);

      // Verify landing screen is hidden
      const landing = document.getElementById('landing-setup-screen');
      assert.equal(landing.classList.contains('hidden'), true);

      // Verify all HUD layers are visible and unhidden
      const hudBar = document.getElementById('main-game-hud-bar');
      const hudLeft = document.getElementById('hud-left-players');
      const hudRight = document.getElementById('hud-right-players');
      const statusWrap = document.getElementById('hud-bottom-status-wrap');

      assert.equal(hudBar.classList.contains('hidden'), false);
      assert.equal(hudLeft.classList.contains('hidden'), false);
      assert.equal(hudRight.classList.contains('hidden'), false);
      assert.equal(statusWrap.classList.contains('hidden'), false);
    });
  });

  describe('3D typography & visual glitch prevention', () => {
    it('ensures createTileEmissiveTexture returns null to eliminate dual-map kerning offsets and text ghosting', () => {
      const cityTile = BOARD_TILES.find(t => t.name === 'BANGKOK') || BOARD_TILES[5];
      const propState = { owner: 0, level: 0 };
      const emissiveTex = createTileEmissiveTexture(cityTile, propState);
      assert.equal(emissiveTex, null);
    });
  });
});
