/**
 * test/multiplayer/protocol.test.js
 * Unit tests for P2P multiplayer protocol validation and sanitization.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import {
  isValidPacket,
  sanitizeProfileUpdate,
  createSafeLobbyStatePacket
} from '../../src/network/protocol.js';

describe('P2P Protocol Validation & Sanitization', () => {
  describe('isValidPacket', () => {
    it('accepts all official packet types', () => {
      const validTypes = [
        'GUEST_JOIN',
        'JOIN_ACCEPTED',
        'JOIN_REJECTED',
        'CLIENT_UPDATE_PROFILE',
        'LOBBY_STATE',
        'FULL_STATE_SYNC',
        'START_MATCH',
        'RETURN_TO_LOBBY',
        'ACTION_ROLL',
        'ACTION_BUY_CITY',
        'ACTION_BUYOUT_CITY',
        'ACTION_UPGRADE_CITY',
        'ACTION_PAY_BAIL',
        'ACTION_SELL_CITY_FOR_RENT',
        'ACTION_SETTLE_RENT',
        'ACTION_BANKRUPTCY',
        'ACTION_FESTIVAL_BOOST',
        'ACTION_AUCTION_BID',
        'ACTION_AUCTION_PASS',
        'ACTION_TRADE_OFFER',
        'ACTION_TRADE_RESPONSE',
        'ACTION_WORLD_TOUR',
        'ACTION_CHANCE_PRIZE',
        'ACTION_MONOPOLY',
        'ACTION_SYNC_BOARD_EDITION',
        'ACTION_END_TURN',
        'ACTION_REACTION',
        'ACTION_REQUEST_PLAY_AGAIN',
        'ACTION_GUEST_LOBBY',
        'PLAYER_DISCONNECTED',
        'MATCH_DISCONNECTED_TO_LOBBY'
      ];

      validTypes.forEach(type => {
        assert.equal(isValidPacket({ type }), true, `Expected ${type} to be valid`);
      });
    });

    it('rejects null, non-objects, and missing type field', () => {
      assert.equal(isValidPacket(null), false);
      assert.equal(isValidPacket(undefined), false);
      assert.equal(isValidPacket(''), false);
      assert.equal(isValidPacket(123), false);
      assert.equal(isValidPacket([]), false);
      assert.equal(isValidPacket({}), false);
      assert.equal(isValidPacket({ notType: 'foo' }), false);
      assert.equal(isValidPacket({ type: 123 }), false);
    });

    it('rejects unapproved or malicious packet types', () => {
      assert.equal(isValidPacket({ type: 'HACK_GIVE_MILLION' }), false);
      assert.equal(isValidPacket({ type: '__proto__' }), false);
      assert.equal(isValidPacket({ type: 'DROP TABLE players' }), false);
      assert.equal(isValidPacket({ type: 'eval("alert(1)")' }), false);
    });
  });

  describe('sanitizeProfileUpdate', () => {
    it('sanitizes and bounds player names', () => {
      assert.deepEqual(sanitizeProfileUpdate(null), {});
      assert.deepEqual(sanitizeProfileUpdate({}), {});

      const res1 = sanitizeProfileUpdate({ name: '   alexander the great   ' });
      assert.equal(res1.name, 'ALEXANDER THE '); // truncated to 14 chars, upper-cased
      assert.equal(res1.name.length <= 14, true);

      // Replaces 'YOU' with fallback 'PLAYER'
      const res2 = sanitizeProfileUpdate({ name: 'you' });
      assert.equal(res2.name, 'PLAYER');

      const res3 = sanitizeProfileUpdate({ name: '   ' });
      assert.equal(res3.name, 'PLAYER');
    });

    it('normalizes hex strings and numbers for colors', () => {
      const resHex = sanitizeProfileUpdate({ colorHex: '#3B82F6' });
      assert.equal(resHex.colorHex, '#3b82f6');
      assert.equal(resHex.charColor, 0x3b82f6);

      const resNum = sanitizeProfileUpdate({ charColor: 0xff00aa });
      assert.equal(resNum.charColor, 0xff00aa);
      assert.equal(resNum.colorHex, '#ff00aa');

      // Clamps out of range colors
      const resClamp = sanitizeProfileUpdate({ charColor: 0x9999999 });
      assert.equal(resClamp.charColor, 0xffffff);
    });

    it('clamps hatStyle between 0 and 6', () => {
      assert.equal(sanitizeProfileUpdate({ hatStyle: 3 }).hatStyle, 3);
      assert.equal(sanitizeProfileUpdate({ hatStyle: -2 }).hatStyle, 0);
      assert.equal(sanitizeProfileUpdate({ hatStyle: 99 }).hatStyle, 6);
      assert.equal(sanitizeProfileUpdate({ hatStyle: 2.7 }).hatStyle, 2);
    });

    it('sanitizes hatColor and pedestal strings', () => {
      const res = sanitizeProfileUpdate({
        hatColor: 0x123456,
        pedestal: 'a_very_long_pedestal_name_that_should_be_truncated_properly'
      });
      assert.equal(res.hatColor, 0x123456);
      assert.equal(res.pedestal.length, 32);
    });
  });

  describe('createSafeLobbyStatePacket', () => {
    it('clamps lobby player count between 2 and 6', () => {
      const p1 = createSafeLobbyStatePacket({}, [], 1);
      assert.equal(p1.lobbyPlayerCount, 2);

      const p2 = createSafeLobbyStatePacket({}, [], 8);
      assert.equal(p2.lobbyPlayerCount, 6);

      const p3 = createSafeLobbyStatePacket({}, [], 4);
      assert.equal(p3.lobbyPlayerCount, 4);
    });

    it('provides safe default matchSettings', () => {
      const packet = createSafeLobbyStatePacket({}, [], 4);
      assert.equal(packet.type, 'LOBBY_STATE');
      assert.equal(packet.matchSettings.startingCash, 2000000);
      assert.equal(packet.matchSettings.turnDuration, 15);
      assert.equal(packet.matchSettings.lightingTheme, 'day');
      assert.equal(packet.matchSettings.boardStyle, 'wood');
      assert.equal(packet.matchSettings.boardEdition, 'world');
      assert.equal(packet.matchSettings.monopolySetsToWin, 3);
    });

    it('sanitizes and slices setupPlayers array to exact lobby count', () => {
      const rawPlayers = [
        { name: 'Alice', isAI: false, isOnlinePeer: true, charColor: 0xff0000, colorHex: '#ff0000' },
        { name: 'Bob', isAI: true, isOnlinePeer: false, hatStyle: 2 },
        { name: 'Charlie', isAI: true },
        { name: 'Extra1', isAI: true },
        { name: 'Extra2', isAI: true }
      ];

      const packet = createSafeLobbyStatePacket({}, rawPlayers, 3);
      assert.equal(packet.setupPlayers.length, 3);
      assert.equal(packet.setupPlayers[0].name, 'ALICE');
      assert.equal(packet.setupPlayers[0].isAI, false);
      assert.equal(packet.setupPlayers[0].isOnlinePeer, true);
      assert.equal(packet.setupPlayers[1].name, 'BOB');
      assert.equal(packet.setupPlayers[1].isAI, true);
      assert.equal(packet.setupPlayers[1].hatStyle, 2);
      assert.equal(packet.setupPlayers[2].name, 'CHARLIE');
    });
  });
});
