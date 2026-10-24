/**
 * test/multiplayer/lobbyAppearanceLock.test.js
 * Unit tests verifying appearance lock in all lobbies, dynamic random bot appearances,
 * and multiplayer pre-selected player appearance preservation.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import {
  canCurrentPlayerEditSlot,
  cycleAvatarPrev,
  cycleAvatarNext,
  setLocalPlayerColor,
  setPlayerColor,
  setPlayerArchetype,
  generateRandomBotAppearance,
  addBotOrSlot,
  ARCHETYPES,
  CANDY_PALETTE,
  setSelectedSetupPlayerIdx
} from '../../src/ui/setup/playerCustomization.js';
import { togglePlayerRole } from '../../src/ui/setup/playerCards.js';
import { currentLobbyView, setLobbyView } from '../../src/ui/setup/lobbyNavigation.js';
import { matchSettings, setupPlayers, setLobbyPlayerCount } from '../../src/game/state.js';
import { networkState } from '../../src/network/p2pState.js';
import { PLAYER_THEMES } from '../../src/game/data.js';

describe('Lobby Appearance Lock & Dynamic Bot Appearances', () => {
  beforeEach(() => {
    networkState.isMultiplayer = false;
    networkState.isHost = false;
    networkState.localPlayerIdx = 0;

    setLobbyPlayerCount(2);
    setSelectedSetupPlayerIdx(0);

    matchSettings.customPlayers[0] = {
      name: 'TYCOON',
      isAI: false,
      hatStyle: 1,
      hatColor: 0xfde047,
      colorHex: '#3b82f6',
      charColor: 0x3b82f6
    };
    matchSettings.customPlayers[1] = {
      name: 'BARON',
      isAI: true,
      hatStyle: 2,
      hatColor: 0x1e293b,
      colorHex: '#ef4444',
      charColor: 0xef4444
    };

    PLAYER_THEMES[0] = { ...matchSettings.customPlayers[0] };
    PLAYER_THEMES[1] = { ...matchSettings.customPlayers[1] };
  });

  describe('Appearance Lock in Lobbies', () => {
    it('allows slot 0 customization strictly on Home/Title Screen', () => {
      setLobbyView('title', false);
      assert.equal(currentLobbyView, 'title');
      assert.equal(canCurrentPlayerEditSlot(0), true);
      assert.equal(canCurrentPlayerEditSlot(1), false);
    });

    it('blocks all slot customization in Local Play lobby', () => {
      setLobbyView('local', false);
      assert.equal(currentLobbyView, 'local');
      assert.equal(canCurrentPlayerEditSlot(0), false);
      assert.equal(canCurrentPlayerEditSlot(1), false);

      const initialHat = matchSettings.customPlayers[0].hatStyle;
      cycleAvatarNext();
      assert.equal(matchSettings.customPlayers[0].hatStyle, initialHat, 'Hat style should not change in local lobby');

      cycleAvatarPrev();
      assert.equal(matchSettings.customPlayers[0].hatStyle, initialHat, 'Hat style should not change in local lobby');

      const success = setLocalPlayerColor('#22c55e', 0x22c55e);
      assert.equal(success, false, 'Color update should be rejected in local lobby');
      assert.equal(matchSettings.customPlayers[0].colorHex, '#3b82f6', 'Player color should remain unchanged');
    });

    it('blocks all slot customization in Multiplayer Room lobby', () => {
      setLobbyView('multiplayer-room', false);
      assert.equal(currentLobbyView, 'multiplayer-room');
      assert.equal(canCurrentPlayerEditSlot(0), false);
      assert.equal(canCurrentPlayerEditSlot(1), false);

      setPlayerArchetype(0, 4);
      assert.equal(matchSettings.customPlayers[0].hatStyle, 1, 'Archetype must remain locked in multiplayer room');

      const colorResult = setPlayerColor(0, '#8b5cf6', 0x8b5cf6);
      assert.equal(colorResult, false, 'setPlayerColor must return false in multiplayer room');
    });

    it('blocks all slot customization in Multiplayer Portal view', () => {
      setLobbyView('multiplayer-portal', false);
      assert.equal(currentLobbyView, 'multiplayer-portal');
      assert.equal(canCurrentPlayerEditSlot(0), false);
      assert.equal(canCurrentPlayerEditSlot(1), false);
    });
  });

  describe('Dynamic AI Bot Random Appearances', () => {
    it('generates a valid random bot appearance with non-colliding colors', () => {
      const excluded = ['#3b82f6', '#ef4444'];
      const appearance = generateRandomBotAppearance(excluded);

      assert.ok(appearance.hatStyle >= 0 && appearance.hatStyle < ARCHETYPES.length, 'Valid hatStyle');
      assert.ok(typeof appearance.hatColor === 'number', 'Valid hatColor');
      assert.ok(typeof appearance.colorHex === 'string', 'Valid colorHex');
      assert.ok(!excluded.includes(appearance.colorHex.toLowerCase()), 'Color must not collide with excluded');
    });

    it('randomizes appearance when a new bot slot is added', () => {
      setLobbyView('local', false);
      const countBefore = matchSettings.customPlayers.length;
      addBotOrSlot();

      const newIdx = 2;
      const newBot = matchSettings.customPlayers[newIdx];
      assert.ok(newBot, 'New bot player exists');
      assert.equal(newBot.isAI, true);
      assert.ok(newBot.hatStyle >= 0 && newBot.hatStyle < ARCHETYPES.length, 'New bot has random hatStyle');
      assert.ok(newBot.colorHex, 'New bot has assigned colorHex');
    });

    it('randomizes appearance when toggling a human slot to bot', () => {
      setLobbyView('local', false);
      // Slot 1 starts as AI, toggle to Human then back to AI
      togglePlayerRole(1);
      assert.equal(matchSettings.customPlayers[1].isAI, false);

      togglePlayerRole(1);
      assert.equal(matchSettings.customPlayers[1].isAI, true);
      assert.ok(matchSettings.customPlayers[1].hatStyle >= 0, 'Bot was given randomized hatStyle');
      assert.ok(matchSettings.customPlayers[1].colorHex, 'Bot was given non-empty colorHex');
    });
  });
});
