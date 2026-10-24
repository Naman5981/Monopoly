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
  canCurrentPlayerChangeColor,
  cycleAvatarPrev,
  cycleAvatarNext,
  setLocalPlayerColor,
  setPlayerColor,
  setPlayerArchetype,
  generateRandomBotAppearance,
  addBotOrSlot,
  removePlayerAt,
  ARCHETYPES,
  CANDY_PALETTE,
  setSelectedSetupPlayerIdx
} from '../../src/ui/setup/playerCustomization.js';
import { togglePlayerRole, buildPlayerCardActionControls } from '../../src/ui/setup/playerCards.js';
import { currentLobbyView, setLobbyView } from '../../src/ui/setup/lobbyNavigation.js';
import { matchSettings, setupPlayers, setLobbyPlayerCount, resetGameStateForNewMatch, gameState } from '../../src/game/state.js';
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

    it('allows player to change their own color in Local Play lobby, while blocking bot color and archetypes', () => {
      setLobbyView('local', false);
      assert.equal(currentLobbyView, 'local');
      assert.equal(canCurrentPlayerEditSlot(0), false, 'Archetype/wardrobe slot editing is locked');
      assert.equal(canCurrentPlayerChangeColor(0), true, 'Human player can change color in lobby');
      assert.equal(canCurrentPlayerChangeColor(1), false, 'Bot color cannot be edited by player');

      const initialHat = matchSettings.customPlayers[0].hatStyle;
      cycleAvatarNext();
      assert.equal(matchSettings.customPlayers[0].hatStyle, initialHat, 'Hat style should not change in local lobby');

      cycleAvatarPrev();
      assert.equal(matchSettings.customPlayers[0].hatStyle, initialHat, 'Hat style should not change in local lobby');

      // Player changes color to an available color
      const success = setLocalPlayerColor('#22c55e', 0x22c55e);
      assert.equal(success, true, 'Color update to available color should succeed in lobby');
      assert.equal(matchSettings.customPlayers[0].colorHex, '#22c55e', 'Player color should update');

      // Player cannot take an already taken color (#ef4444 is used by slot 1)
      const failCollision = setLocalPlayerColor('#ef4444', 0xef4444);
      assert.equal(failCollision, false, 'Taken color should be rejected');
      assert.equal(matchSettings.customPlayers[0].colorHex, '#22c55e', 'Player color remains previous color');

      // Player cannot edit bot's color
      const botColorAttempt = setPlayerColor(1, '#8b5cf6', 0x8b5cf6);
      assert.equal(botColorAttempt, false, 'Player cannot modify bot color');
      assert.equal(matchSettings.customPlayers[1].colorHex, '#ef4444', 'Bot color should remain unchanged');
    });

    it('allows real players to change their own color in Multiplayer Room, but blocks other players and archetypes', () => {
      networkState.isMultiplayer = true;
      networkState.isHost = false;
      networkState.localPlayerIdx = 1;
      matchSettings.customPlayers[1].isAI = false; // guest is real player
      matchSettings.customPlayers[1].colorHex = '#84cc16';

      setLobbyView('multiplayer-room', false);
      assert.equal(currentLobbyView, 'multiplayer-room');
      assert.equal(canCurrentPlayerEditSlot(1), false, 'Archetype/wardrobe remains locked');
      assert.equal(canCurrentPlayerChangeColor(1), true, 'Guest can change their own color in room');
      assert.equal(canCurrentPlayerChangeColor(0), false, 'Guest cannot change host color');

      // Archetype remains locked
      setPlayerArchetype(1, 4);
      assert.equal(matchSettings.customPlayers[1].hatStyle, 2, 'Archetype must remain locked in multiplayer room');

      // Guest changes their own color to available color (#8b5cf6)
      const colorResult = setPlayerColor(1, '#8b5cf6', 0x8b5cf6);
      assert.equal(colorResult, true, 'Guest can change own color in multiplayer room');
      assert.equal(matchSettings.customPlayers[1].colorHex, '#8b5cf6', 'Guest color updated');

      // Guest cannot change host's color
      const hostColorAttempt = setPlayerColor(0, '#06b6d4', 0x06b6d4);
      assert.equal(hostColorAttempt, false, 'Guest cannot change host color');
    });

    it('blocks all slot archetype customization in Multiplayer Portal view', () => {
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

  describe('Online Peer Role & Slot Protection', () => {
    beforeEach(() => {
      networkState.isMultiplayer = true;
      networkState.isHost = true;
      networkState.localPlayerIdx = 0;
      setLobbyPlayerCount(2);

      matchSettings.customPlayers[0] = {
        name: 'HOST',
        isAI: false,
        colorHex: '#3b82f6',
        charColor: 0x3b82f6
      };
      matchSettings.customPlayers[1] = {
        name: 'LAPTOP',
        isAI: false,
        isOnlinePeer: true,
        peerId: 'peer-laptop-123',
        colorHex: '#10b981',
        charColor: 0x10b981
      };

      setupPlayers[0] = { ...matchSettings.customPlayers[0] };
      setupPlayers[1] = { ...matchSettings.customPlayers[1] };
    });

    it('renders ONLINE badge instead of Bot toggle or delete button for connected peers', () => {
      const controls = buildPlayerCardActionControls(1, false, true, true, true, false);
      assert.ok(controls.includes('ONLINE'), 'Must display ONLINE badge');
      assert.ok(!controls.includes('togglePlayerRole'), 'Must NOT contain toggle button');
      assert.ok(!controls.includes('removePlayerAt'), 'Must NOT contain delete button');
    });

    it('prevents toggling connected online peer to bot', () => {
      togglePlayerRole(1);
      assert.equal(matchSettings.customPlayers[1].isAI, false, 'Connected online peer must remain human');
    });

    it('prevents removing connected online peer slot', () => {
      setLobbyPlayerCount(3);
      removePlayerAt(1);
      assert.equal(matchSettings.customPlayers[1].name, 'LAPTOP', 'Connected online peer must not be removed');
    });

    it('initializes match state correctly with connected peer as human and remote peerId', () => {
      resetGameStateForNewMatch(2);
      assert.equal(gameState.players.length, 2);
      assert.equal(gameState.players[0].isAI, false, 'Host must be human');
      assert.equal(gameState.players[1].isAI, false, 'Connected peer must be human');
      assert.equal(gameState.players[1].isOnlinePeer, true);
      assert.equal(gameState.players[1].peerId, 'peer-laptop-123');
    });
  });
});
