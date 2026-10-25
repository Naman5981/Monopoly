/**
 * game/audio/context.js
 * Web Audio API context management, master gain & compressor, 3D spatial listener, and unlocking.
 */

import { soundEnabled, soundVolume, gameState } from '../state.js';
import { startAdaptiveMusic } from './music.js';

let audioCtx = null;
let masterGainNode = null;
let masterCompressorNode = null;

export function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!audioCtx) return;
        if (document.hidden) {
          if (audioCtx.state === 'running') audioCtx.suspend();
        } else {
          if (audioCtx.state === 'suspended') audioCtx.resume();
        }
      });
    }
  }
  if (audioCtx.state === 'suspended' && !document.hidden) audioCtx.resume();
  return audioCtx;
}

export function getMasterGainNode() {
  if (!masterGainNode) getAudioDestination();
  return masterGainNode;
}

/**
 * Ensures AudioContext is safely unlocked and warmed up on first user gesture.
 * Includes WebKit/Safari/iOS silent buffer unlock.
 */
export function initAudioUnlock() {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    try {
      const ctx = getCtx();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        // iOS WebKit audio unlock requirement: play 1-sample silent buffer
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);

        if (gameState && gameState.gameStarted && gameState.phase !== 'VICTORY') {
          startAdaptiveMusic();
        }
      }
    } catch (_) {}
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true, passive: true });
  window.addEventListener('touchstart', unlock, { once: true, passive: true });
}

export function getAudioDestination() {
  const ctx = getCtx();
  if (!masterGainNode) {
    // Master dynamics compressor to eliminate any clipping or harsh transients
    masterCompressorNode = ctx.createDynamicsCompressor();
    masterCompressorNode.threshold.setValueAtTime(-14, ctx.currentTime);
    masterCompressorNode.knee.setValueAtTime(10, ctx.currentTime);
    masterCompressorNode.ratio.setValueAtTime(4, ctx.currentTime);
    masterCompressorNode.attack.setValueAtTime(0.005, ctx.currentTime);
    masterCompressorNode.release.setValueAtTime(0.12, ctx.currentTime);

    masterGainNode = ctx.createGain();
    const effectiveVol = soundEnabled ? soundVolume : 0;
    masterGainNode.gain.setValueAtTime(effectiveVol, ctx.currentTime);

    masterCompressorNode.connect(masterGainNode);
    masterGainNode.connect(ctx.destination);
  }
  return masterCompressorNode;
}

export function updateMasterVolume(vol) {
  try {
    const ctx = getCtx();
    if (!masterGainNode) getAudioDestination();
    const target = soundEnabled ? Math.max(0, Math.min(1, parseFloat(vol))) : 0;
    masterGainNode.gain.cancelScheduledValues(ctx.currentTime);
    masterGainNode.gain.setValueAtTime(target, ctx.currentTime);
  } catch (_) {}
}

/**
 * Normalizes Cartesian coordinates from {x, z} or Vector3 into {x, y, z}.
 */
export function normalizeWorldPosition(worldPos) {
  if (!worldPos) return null;
  const x = typeof worldPos.x === 'number' ? worldPos.x : 0;
  const y = typeof worldPos.y === 'number' ? worldPos.y : 0.4;
  const z = typeof worldPos.z === 'number' ? worldPos.z : 0;
  return { x, y, z };
}

/**
 * Updates the 3D Web Audio listener orientation and position to match the orbit camera.
 * @param {{x: number, y: number, z: number}} cameraPos
 * @param {{x: number, y: number, z: number}} lookAtTarget
 * @param {{x: number, y: number, z: number}} [upVector]
 */
export function updateAudioListener(cameraPos, lookAtTarget, upVector) {
  try {
    const ctx = getCtx();
    if (!ctx || !ctx.listener) return;
    const l = ctx.listener;
    const now = ctx.currentTime;

    const cx = cameraPos?.x ?? 0;
    const cy = cameraPos?.y ?? 30;
    const cz = cameraPos?.z ?? 30;

    if (l.positionX) {
      l.positionX.setValueAtTime(cx, now);
      l.positionY.setValueAtTime(cy, now);
      l.positionZ.setValueAtTime(cz, now);
    } else if (l.setPosition) {
      l.setPosition(cx, cy, cz);
    }

    const tx = lookAtTarget?.x ?? 0;
    const ty = lookAtTarget?.y ?? 0;
    const tz = lookAtTarget?.z ?? 0;

    const fx = tx - cx;
    const fy = ty - cy;
    const fz = tz - cz;
    const dist = Math.hypot(fx, fy, fz) || 1;
    const fwdX = fx / dist;
    const fwdY = fy / dist;
    const fwdZ = fz / dist;

    const ux = upVector?.x ?? 0;
    const uy = upVector?.y ?? 1;
    const uz = upVector?.z ?? 0;

    if (l.forwardX) {
      l.forwardX.setValueAtTime(fwdX, now);
      l.forwardY.setValueAtTime(fwdY, now);
      l.forwardZ.setValueAtTime(fwdZ, now);
      l.upX.setValueAtTime(ux, now);
      l.upY.setValueAtTime(uy, now);
      l.upZ.setValueAtTime(uz, now);
    } else if (l.setOrientation) {
      l.setOrientation(fwdX, fwdY, fwdZ, ux, uy, uz);
    }
  } catch (_) {}
}

/**
 * Creates an HRTF 3D spatial panner for an emitting coordinate in world space.
 * @param {AudioContext} ctx
 * @param {{x: number, y?: number, z: number}} worldPos
 * @param {AudioNode} dest
 * @returns {AudioNode}
 */
export function createSpatialPanner(ctx, worldPos, dest) {
  try {
    const pos = normalizeWorldPosition(worldPos);
    if (!pos) return dest;

    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 22;
    panner.maxDistance = 150;
    panner.rolloffFactor = 0.55;
    panner.coneInnerAngle = 360;

    const now = ctx.currentTime;
    if (panner.positionX) {
      panner.positionX.setValueAtTime(pos.x, now);
      panner.positionY.setValueAtTime(pos.y, now);
      panner.positionZ.setValueAtTime(pos.z, now);
    } else if (panner.setPosition) {
      panner.setPosition(pos.x, pos.y, pos.z);
    }

    panner.connect(dest);

    // Auto-disconnect panner after sound duration to preserve Web Audio memory
    setTimeout(() => {
      try { panner.disconnect(); } catch (_) {}
    }, 2800);

    return panner;
  } catch (_) {
    return dest;
  }
}
