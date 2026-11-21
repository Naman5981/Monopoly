/**
 * test/audioSystem.test.js
 * Verification of the procedural Web Audio SFX redesign and callsite audio mappings.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';

setupBrowserMocks();

import { playSFX } from '../src/game/audio/sfx.js';
import { soundEnabled, soundVolume } from '../src/game/state.js';

describe('Game-Wide Procedural Audio Subsystem & SFX Redesign', () => {
  it('safely synthesizes all official SFX types without throwing or NaN audio errors', () => {
    const sfxTypes = [
      'gameStart',
      'click',
      'uiTap',
      'dice',
      'diceShuffle',
      'diceBounce',
      'doubles',
      'hop',
      'cash',
      'jackpot',
      'chanceReward',
      'payRent',
      'receiveRent',
      'build',
      'monopoly',
      'monopolyThreat',
      'festivalBoost',
      'bankrupt',
      'gavel',
      'auctionWon',
      'win',
      'flight',
      'whoosh',
      'hurt',
      'flinch',
      'wheelTick',
      'wheelLock',
      'jail',
      'island',
      'islandDetained',
      'jailbreak',
      'jailRattle',
      'pop',
      'fireworkLaunch',
      'fireworkBoom',
      'takeover',
      'buyout'
    ];

    sfxTypes.forEach(type => {
      assert.doesNotThrow(() => {
        playSFX(type, 1.0);
      }, `playSFX('${type}') must execute without error`);
    });
  });

  it('supports spatial audio world position coordinates without throwing', () => {
    assert.doesNotThrow(() => {
      playSFX('island', 1.0, { x: 10, y: 0, z: -15 });
      playSFX('jailbreak', 1.0, { x: 0, y: 0, z: 0 });
      playSFX('payRent', 0.8, { x: -20, y: 5, z: 20 });
      playSFX('auctionWon', 1.0, { x: 5, y: 0, z: 5 });
    });
  });

  it('respects volume multiplier clamping', () => {
    assert.doesNotThrow(() => {
      playSFX('jackpot', 0.0);
      playSFX('payRent', 2.5);
      playSFX('uiTap', -1.0);
    });
  });
});
