import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { BOARD_TILES } from '../src/game/data.js';
import { gameState } from '../src/game/state.js';
import { calculateTileRent } from '../src/game/rules.js';
import { FestivalLandingStrategy } from '../src/game/engine/strategies/FestivalLandingStrategy.js';
import {
  openFestivalBoostModal,
  chooseFestivalBoostCity,
  closeFestivalBoostModal,
  showFestivalNoPropertiesModal,
  closeFestivalNoPropertiesModal,
} from '../src/ui/modals/festivalBoost.js';
import { networkState } from '../src/network/p2pState.js';

describe('World Festival Boost & 3D Breathing Property Highlights (/better-interface)', () => {
  let concludedActionDoubles = null;

  beforeEach(() => {
    // Setup test game state
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.players = [
      { id: 'p0', name: 'Naman', cash: 2000000, isAI: false },
      { id: 'p1', name: 'Bot-1', cash: 2000000, isAI: true },
    ];
    gameState.properties = {};
    BOARD_TILES.forEach(t => {
      gameState.properties[t.id] = { owner: null, level: 0, festivalBoost: false };
    });
    gameState.festivalPot = 300000;

    networkState.isMultiplayer = false;
    networkState.localPlayerIdx = 0;
    networkState.isHost = true;

    concludedActionDoubles = null;
    window.concludeActionPhase = (isDoubles) => {
      concludedActionDoubles = isDoubles;
      gameState.phase = 'END';
    };

    // Ensure DOM mock elements exist
    document.getElementById('landing-setup-screen').classList.add('hidden');
    document.getElementById('modal-festival-boost').classList.add('hidden');
    document.getElementById('modal-festival-no-properties').classList.add('hidden');
    document.getElementById('festival-select-banner').classList.add('hidden');
  });

  afterEach(() => {
    closeFestivalBoostModal(true);
    closeFestivalNoPropertiesModal();
  });

  describe('When player owns NO properties on Festival landing', () => {
    it('displays the No Properties Owned alert modal and concludes turn on dismissal', async () => {
      const strategy = new FestivalLandingStrategy();

      // No properties owned by player 0
      await strategy.execute({
        playerIdx: 0,
        player: gameState.players[0],
        isDoubles: false,
      });

      const noPropModal = document.getElementById('modal-festival-no-properties');
      assert.equal(noPropModal.classList.contains('hidden'), false);
      assert.equal(gameState.phase, 'MODAL');

      // Dismiss alert modal
      closeFestivalNoPropertiesModal();
      assert.equal(noPropModal.classList.contains('hidden'), true);
      assert.equal(concludedActionDoubles, false);
      assert.equal(gameState.phase, 'END');
    });
  });

  describe('When player DOES own properties on Festival landing', () => {
    beforeEach(() => {
      // Grant player 0 ownership of Madrid (tile 27) and Seoul (tile 25)
      gameState.properties[27].owner = 0;
      gameState.properties[27].level = 1;
      gameState.properties[25].owner = 0;
      gameState.properties[25].level = 0;
    });

    it('sets phase to FESTIVAL_SELECT and reveals banner and selection modal', async () => {
      const strategy = new FestivalLandingStrategy();

      await strategy.execute({
        playerIdx: 0,
        player: gameState.players[0],
        isDoubles: true,
      });

      assert.equal(gameState.phase, 'FESTIVAL_SELECT');

      const modal = document.getElementById('modal-festival-boost');
      const banner = document.getElementById('festival-select-banner');

      assert.equal(modal.classList.contains('hidden'), false);
      assert.equal(banner.classList.contains('hidden'), false);
    });

    it('allows player to close the modal while keeping board selection phase active for 3D clicking', () => {
      const owned = [BOARD_TILES[27], BOARD_TILES[25]];
      openFestivalBoostModal(owned, false, 0);

      assert.equal(gameState.phase, 'FESTIVAL_SELECT');
      const modal = document.getElementById('modal-festival-boost');
      assert.equal(modal.classList.contains('hidden'), false);

      // Player closes modal to pick directly on 3D board
      closeFestivalBoostModal(false);
      assert.equal(modal.classList.contains('hidden'), true);
      assert.equal(gameState.phase, 'FESTIVAL_SELECT'); // Remains active for 3D clicking!
    });

    it('successfully boosts rent 2x and concludes turn when choosing owned city', () => {
      const baseRent = calculateTileRent(27);
      assert.equal(gameState.properties[27].festivalBoost, false);

      const owned = [BOARD_TILES[27], BOARD_TILES[25]];
      openFestivalBoostModal(owned, false, 0);

      // Player selects Madrid (tile 27) either via button or direct 3D board click
      chooseFestivalBoostCity(27);

      assert.equal(gameState.properties[27].festivalBoost, true);
      const boostedRent = calculateTileRent(27);
      assert.equal(boostedRent, baseRent * 2);

      const banner = document.getElementById('festival-select-banner');
      assert.equal(banner.classList.contains('hidden'), true);
      assert.equal(concludedActionDoubles, false);
      assert.equal(gameState.phase, 'END');
    });

    it('ignores boost attempt on properties not owned by the active player', () => {
      // Tile 3 is unowned
      gameState.properties[3].owner = null;

      openFestivalBoostModal([BOARD_TILES[27]], false, 0);

      chooseFestivalBoostCity(3);
      assert.equal(gameState.properties[3].festivalBoost, false);
      assert.equal(gameState.phase, 'FESTIVAL_SELECT'); // Stays active
    });

    it('restores previous boosted city owned by same player when choosing another city', () => {
      // Madrid (tile 27) is already boosted 2x
      gameState.properties[27].festivalBoost = true;
      const baseMadridRent = 50000;
      assert.equal(gameState.properties[27].festivalBoost, true);

      // Player lands on Festival again and chooses Seoul (tile 25)
      const owned = [BOARD_TILES[27], BOARD_TILES[25]];
      openFestivalBoostModal(owned, false, 0);

      chooseFestivalBoostCity(25);

      // Madrid festivalBoost must be restored to false
      assert.equal(gameState.properties[27].festivalBoost, false);
      // Seoul must be boosted 2x
      assert.equal(gameState.properties[25].festivalBoost, true);
    });

    it('restores previous boosted city owned by a different player (no player constraint)', () => {
      // Bot-1 (player 1) owns Tokyo (tile 31) and currently has the 2x festival boost
      gameState.properties[31].owner = 1;
      gameState.properties[31].level = 2;
      gameState.properties[31].festivalBoost = true;

      // Player 0 lands on festival and chooses Madrid (tile 27)
      const owned = [BOARD_TILES[27], BOARD_TILES[25]];
      openFestivalBoostModal(owned, false, 0);

      chooseFestivalBoostCity(27);

      // Player 1's Tokyo festival boost is cleared and restored to normal
      assert.equal(gameState.properties[31].festivalBoost, false);
      // Player 0's Madrid receives the festival boost
      assert.equal(gameState.properties[27].festivalBoost, true);
    });

    it('re-selecting the same city keeps it at 2x doubled rent', () => {
      // Madrid (tile 27) is already boosted 2x
      gameState.properties[27].festivalBoost = true;

      // Player lands on Festival again and chooses Madrid again
      const owned = [BOARD_TILES[27], BOARD_TILES[25]];
      openFestivalBoostModal(owned, false, 0);

      chooseFestivalBoostCity(27);

      assert.equal(gameState.properties[27].festivalBoost, true);
      assert.equal(gameState.properties[25].festivalBoost, false);
      assert.equal(concludedActionDoubles, false);
      assert.equal(gameState.phase, 'END');
    });

    it('AI bot landing on festival clears any previous festival boost across the board', async () => {
      // Player 0 currently owns Madrid with active festival boost
      gameState.properties[27].festivalBoost = true;

      // Bot-1 (player 1) owns Tokyo (tile 31)
      gameState.properties[31].owner = 1;
      gameState.properties[31].level = 2;
      gameState.properties[31].festivalBoost = false;

      const strategy = new FestivalLandingStrategy();
      await strategy.execute({
        playerIdx: 1,
        player: gameState.players[1],
        isDoubles: false,
      });

      // Player 0's Madrid boost should be cleared
      assert.equal(gameState.properties[27].festivalBoost, false);
      // Bot's Tokyo should now hold the festival boost
      assert.equal(gameState.properties[31].festivalBoost, true);
    });
  });
});
