/**
 * game/audio/sfx.js
 * Procedural Web Audio sound effects synthesizer facade.
 * Delegates synthesis to focused submodules: ./sfx/uiSfx.js, ./sfx/boardSfx.js, ./sfx/eventSfx.js.
 */

import { soundEnabled, soundVolume } from '../state.js';
import { getCtx, getAudioDestination, createSpatialPanner } from './context.js';
import { playUiSFX } from './sfx/uiSfx.js';
import { playBoardSFX } from './sfx/boardSfx.js';
import { playEventSFX } from './sfx/eventSfx.js';

/**
 * Play a synthesized SFX.
 * @param {'gameStart'|'click'|'dice'|'diceShuffle'|'diceBounce'|'hop'|'cash'|'build'|'monopoly'|'monopolyThreat'|'festivalBoost'|'festival'|'bankrupt'|'gavel'|'win'|'victory'|'flight'|'whoosh'|'hurt'|'flinch'|'wheelTick'|'wheelLock'|'jail'|'jailDoor'|'island'|'islandDetained'|'jailbreak'|'jailRattle'|'jackpot'|'chanceReward'|'payRent'|'receiveRent'|'auctionWon'|'doubles'|'uiTap'|'pop'|'fireworkLaunch'|'fireworkBoom'|'takeover'|'buyout'} type
 * @param {number} [volumeMultiplier=1.0]
 * @param {{x: number, y?: number, z: number}|null} [worldPos=null] Optional 3D emitter coordinates for spatial audio
 */
export function playSFX(type, volumeMultiplier = 1.0, worldPos = null) {
  if (!soundEnabled || soundVolume <= 0) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const dest = getAudioDestination();
    const soundOutput = (worldPos && ctx.createPanner) ? createSpatialPanner(ctx, worldPos, dest) : dest;
    const vol = Math.max(0.01, volumeMultiplier);

    if (playUiSFX(ctx, now, soundOutput, vol, type)) return;
    if (playBoardSFX(ctx, now, soundOutput, vol, type)) return;
    playEventSFX(ctx, now, soundOutput, vol, type);
  } catch (_) { /* silently ignore audio errors */ }
}
