/**
 * test/multiplayer/p2pState.test.js
 * Unit tests for P2P state, room codes, and callback registrations.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import {
  networkState,
  networkCallbacks,
  generateRoomCode,
  formatPeerRoomId,
  registerNetworkCallbacks
} from '../../src/network/p2pState.js';

describe('P2P State & Room Management', () => {
  beforeEach(() => {
    networkState.isMultiplayer = false;
    networkState.isHost = false;
    networkState.localPlayerIdx = 0;
    networkState.roomCode = '';
    networkState.status = 'offline';
  });

  describe('generateRoomCode', () => {
    it('generates 4-character uppercase alphanumeric strings', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateRoomCode();
        assert.equal(typeof code, 'string');
        assert.equal(code.length, 4);
        assert.match(code, /^[A-Z0-9]{4}$/);
        // Should avoid confusing characters 'I', 'O', '1', '0'
        assert.equal(/[IO10]/.test(code), false, `Code ${code} contained ambiguous characters`);
      }
    });

    it('generates pseudorandom diverse codes', () => {
      const set = new Set();
      for (let i = 0; i < 20; i++) {
        set.add(generateRoomCode());
      }
      assert.equal(set.size > 15, true, 'Expected mostly unique room codes');
    });
  });

  describe('formatPeerRoomId', () => {
    it('prepends worldtycoon-v1- prefix and normalizes to uppercase', () => {
      assert.equal(formatPeerRoomId('ABCD'), 'worldtycoon-v1-ABCD');
      assert.equal(formatPeerRoomId('k9x2'), 'worldtycoon-v1-K9X2');
      assert.equal(formatPeerRoomId('  w3t8  '), 'worldtycoon-v1-W3T8');
    });
  });

  describe('registerNetworkCallbacks', () => {
    it('registers event handler callbacks into the networkCallbacks registry', () => {
      let rollCalled = false;
      let buyCalled = false;

      registerNetworkCallbacks({
        onDiceRoll: () => { rollCalled = true; },
        onBuyCity: () => { buyCalled = true; }
      });

      assert.equal(typeof networkCallbacks.onDiceRoll, 'function');
      assert.equal(typeof networkCallbacks.onBuyCity, 'function');

      networkCallbacks.onDiceRoll();
      networkCallbacks.onBuyCity();

      assert.equal(rollCalled, true);
      assert.equal(buyCalled, true);
    });
  });
});
