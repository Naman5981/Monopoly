/**
 * game/audio.js
 * Professional Web-Audio-API sound-effect synthesizer.
 * Calibrated for warm, pleasant, and non-fatiguing acoustic listening.
 */

import { soundEnabled, soundVolume, gameState } from './state.js';

let audioCtx = null;
let masterGainNode = null;
let masterCompressorNode = null;

function getCtx() {
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
function normalizeWorldPosition(worldPos) {
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
function createSpatialPanner(ctx, worldPos, dest) {
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

/**
 * Play a synthesized SFX.
 * @param {'gameStart'|'click'|'dice'|'diceShuffle'|'diceBounce'|'hop'|'cash'|'build'|'monopoly'|'bankrupt'|'gavel'|'win'|'victory'|'flight'|'whoosh'|'hurt'|'flinch'|'wheelTick'|'jail'|'jailDoor'|'pop'|'fireworkLaunch'|'fireworkBoom'} type
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

    // ═══ 1. GAME START: LUSH, PLEASANT & UPLIFTING STARTUP CHIME ═══
    if (type === 'gameStart' || type === 'start') {
      const startVol = 0.85 * vol;

      // Ascending Cmaj9 / Fmaj9 arpeggio: C4, G4, C5, E5, G5, B5, D6
      const startNotes = [
        { f: 261.63, t: 0.00, dur: 0.80, g: 0.12 },
        { f: 392.00, t: 0.07, dur: 0.85, g: 0.12 },
        { f: 523.25, t: 0.14, dur: 0.90, g: 0.14 },
        { f: 659.25, t: 0.21, dur: 0.95, g: 0.14 },
        { f: 783.99, t: 0.28, dur: 1.05, g: 0.15 },
        { f: 987.77, t: 0.35, dur: 1.15, g: 0.14 },
        { f: 1174.66, t: 0.42, dur: 1.30, g: 0.13 }
      ];

      startNotes.forEach(note => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.f, now + note.t);

        const harm = ctx.createOscillator();
        harm.type = 'triangle';
        harm.frequency.setValueAtTime(note.f * 2, now + note.t);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(note.f * 2.8, now + note.t);
        filter.Q.value = 0.8;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now + note.t);
        g.gain.linearRampToValueAtTime(note.g * startVol, now + note.t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, now + note.t + note.dur);

        osc.connect(filter);
        harm.connect(filter);
        filter.connect(g);
        g.connect(soundOutput);

        osc.start(now + note.t);
        osc.stop(now + note.t + note.dur);
        harm.start(now + note.t);
        harm.stop(now + note.t + note.dur);
      });

      // Warm sub-bass body (85Hz -> 50Hz)
      const sub = ctx.createOscillator();
      const subG = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(85, now);
      sub.frequency.exponentialRampToValueAtTime(50, now + 0.5);
      subG.gain.setValueAtTime(0.0001, now);
      subG.gain.linearRampToValueAtTime(0.14 * startVol, now + 0.025);
      subG.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
      sub.connect(subG);
      subG.connect(soundOutput);
      sub.start(now);
      sub.stop(now + 0.65);

      // Crystalline shimmer sparkle (C6 & E6)
      [1046.50, 1318.51].forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + 0.46 + idx * 0.09);
        g.gain.setValueAtTime(0.0001, now + 0.46 + idx * 0.09);
        g.gain.linearRampToValueAtTime(0.07 * startVol, now + 0.48 + idx * 0.09);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2 + idx * 0.09);
        o.connect(g);
        g.connect(soundOutput);
        o.start(now + 0.46 + idx * 0.09);
        o.stop(now + 1.2 + idx * 0.09);
      });

    // ═══ 2. TACTILE UI CLICK / TAP ═══
    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.025);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1500, now);
      filter.Q.value = 1.8;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.10 * vol, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(soundOutput);
      osc.start(now);
      osc.stop(now + 0.028);

    // ═══ 3. WOODEN DICE SHAKER & TUMBLE ═══
    } else if (type === 'dice' || type === 'diceShuffle') {
      const rattleOffsets = [0, 0.065, 0.14, 0.22, 0.31, 0.40];
      rattleOffsets.forEach((t, i) => {
        const bufferSize = Math.floor(ctx.sampleRate * 0.035);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < bufferSize; j++) {
          data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.35));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1100 + (i % 3) * 380, now + t);
        filter.Q.value = 3.0;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now + t);
        gain.gain.linearRampToValueAtTime(0.14 * vol, now + t + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.035);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(soundOutput);
        noise.start(now + t);

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280 + (i % 2) * 110, now + t);
        osc.frequency.exponentialRampToValueAtTime(100, now + t + 0.03);
        oscGain.gain.setValueAtTime(0.0001, now + t);
        oscGain.gain.linearRampToValueAtTime(0.11 * vol, now + t + 0.003);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.03);
        osc.connect(oscGain);
        oscGain.connect(soundOutput);
        osc.start(now + t);
        osc.stop(now + t + 0.03);
      });

    // ═══ 4. DICE BOUNCE IMPACT ═══
    } else if (type === 'diceBounce') {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(390, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.045);
      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.linearRampToValueAtTime(0.18 * vol, now + 0.003);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
      osc.connect(oscGain);
      oscGain.connect(soundOutput);
      osc.start(now);
      osc.stop(now + 0.045);

    // ═══ 5. SMOOTH ROUND TOKEN HOP ═══
    } else if (type === 'hop') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(320, now);
      o.frequency.exponentialRampToValueAtTime(540, now + 0.07);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.075 * vol, now + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
      o.connect(g);
      g.connect(soundOutput);
      o.start(now);
      o.stop(now + 0.085);

    // ═══ 6. SPARKLE CASH COLLECTION ═══
    } else if (type === 'cash') {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        o.type = 'sine';
        o.frequency.setValueAtTime(f, now + i * 0.052);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2600, now + i * 0.052);
        g.gain.setValueAtTime(0.0001, now + i * 0.052);
        g.gain.linearRampToValueAtTime(0.085 * vol, now + i * 0.052 + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.052 + 0.15);
        o.connect(filter);
        filter.connect(g);
        g.connect(soundOutput);
        o.start(now + i * 0.052);
        o.stop(now + i * 0.052 + 0.15);
      });

    // ═══ 7. WARM CONSTRUCTION CHIME ═══
    } else if (type === 'build') {
      [440, 554.37, 659.25, 880].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, now + i * 0.06);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now + i * 0.06);
        g.gain.setValueAtTime(0.0001, now + i * 0.06);
        g.gain.linearRampToValueAtTime(0.10 * vol, now + i * 0.06 + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.14);
        o.connect(filter);
        filter.connect(g);
        g.connect(soundOutput);
        o.start(now + i * 0.06);
        o.stop(now + i * 0.06 + 0.14);
      });

    // ═══ 8. MONOPOLY CELEBRATION CHIME ═══
    } else if (type === 'monopoly') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const t = now + idx * 0.11;
        const osc = ctx.createOscillator();
        const harm = ctx.createOscillator();
        const g = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        harm.type = 'triangle';
        harm.frequency.setValueAtTime(freq * 2, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2400, t);

        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.13 * vol, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);

        osc.connect(filter);
        harm.connect(filter);
        filter.connect(g);
        g.connect(soundOutput);

        osc.start(t);
        osc.stop(t + 0.85);
        harm.start(t);
        harm.stop(t + 0.85);
      });

    // ═══ 9. BANKRUPT / DOWNTURN MOTIF ═══
    } else if (type === 'bankrupt') {
      const pitches = [392.0, 369.99, 349.23, 311.13];
      pitches.forEach((f, i) => {
        const t = now + i * 0.16;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(750, t);
        filter.frequency.linearRampToValueAtTime(300, t + 0.15);
        filter.Q.value = 2.5;

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.09 * vol, t + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(soundOutput);

        osc.start(t);
        osc.stop(t + 0.20);
      });

    // ═══ 10. WOODEN AUCTION GAVEL KNOCK ═══
    } else if (type === 'gavel') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.07);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, now);
      filter.Q.value = 1.5;

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.20 * vol, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(soundOutput);
      osc.start(now);
      osc.stop(now + 0.07);

    // ═══ 11. AERODYNAMIC FLIGHT / WHOOSH ═══
    } else if (type === 'flight' || type === 'whoosh') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      o.type = 'sine';
      o.frequency.setValueAtTime(460, now);
      o.frequency.exponentialRampToValueAtTime(720, now + 0.06);
      o.frequency.exponentialRampToValueAtTime(380, now + 0.14);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.06 * vol, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      o.connect(filter);
      filter.connect(g);
      g.connect(soundOutput);
      o.start(now);
      o.stop(now + 0.14);

    // ═══ 12. GRAND VICTORY HERALD FANFARE ═══
    } else if (type === 'win' || type === 'victory') {
      const brassGainScale = 0.70 * vol;
      const brassChords = [
        { t: 0.00, dur: 0.13, notes: [261.63, 392.00, 523.25], gain: 0.11 * brassGainScale },
        { t: 0.15, dur: 0.13, notes: [261.63, 392.00, 523.25], gain: 0.11 * brassGainScale },
        { t: 0.30, dur: 0.13, notes: [261.63, 392.00, 523.25], gain: 0.12 * brassGainScale },
        { t: 0.45, dur: 0.32, notes: [196.00, 293.66, 392.00, 587.33], gain: 0.13 * brassGainScale },
        { t: 0.82, dur: 0.34, notes: [220.00, 329.63, 440.00, 523.25, 659.25], gain: 0.14 * brassGainScale },
        { t: 1.20, dur: 2.20, notes: [130.81, 196.00, 261.63, 329.63, 392.00, 523.25, 659.25, 783.99], gain: 0.16 * brassGainScale }
      ];

      brassChords.forEach(chord => {
        chord.notes.forEach((freq, nIdx) => {
          const oscSaw = ctx.createOscillator();
          oscSaw.type = 'sawtooth';
          oscSaw.frequency.setValueAtTime(freq, now + chord.t);

          const oscTri = ctx.createOscillator();
          oscTri.type = 'triangle';
          oscTri.frequency.setValueAtTime(freq, now + chord.t);

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1100 + freq * 0.7, now + chord.t);
          filter.Q.value = 1.8;

          const gain = ctx.createGain();
          const noteGain = (chord.gain / Math.sqrt(chord.notes.length)) * (nIdx === chord.notes.length - 1 ? 1.15 : 1.0);
          gain.gain.setValueAtTime(0.0001, now + chord.t);
          gain.gain.linearRampToValueAtTime(noteGain, now + chord.t + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + chord.t + chord.dur);

          oscSaw.connect(filter);
          oscTri.connect(filter);
          filter.connect(gain);
          gain.connect(soundOutput);

          oscSaw.start(now + chord.t);
          oscSaw.stop(now + chord.t + chord.dur);
          oscTri.start(now + chord.t);
          oscTri.stop(now + chord.t + chord.dur);
        });
      });

      // Crystal chimes
      const chimes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
      chimes.forEach((freq, idx) => {
        const chimeT = 1.30 + idx * 0.065;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + chimeT);
        g.gain.setValueAtTime(0.0001, now + chimeT);
        g.gain.linearRampToValueAtTime(0.08 * vol, now + chimeT + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, now + chimeT + 0.60);
        o.connect(g);
        g.connect(soundOutput);
        o.start(now + chimeT);
        o.stop(now + chimeT + 0.60);
      });

      // Warm crowd applause (bandpass filtered)
      const cheerDur = 2.8;
      const cheerBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * cheerDur), ctx.sampleRate);
      const cheerData = cheerBuffer.getChannelData(0);
      for (let i = 0; i < cheerData.length; i++) {
        const clapPulse = Math.sin(i / (ctx.sampleRate * 0.07)) > 0.88 ? (Math.random() * 1.3) : 1.0;
        cheerData[i] = (Math.random() * 2 - 1) * 0.5 * clapPulse;
      }
      const cheerSource = ctx.createBufferSource();
      cheerSource.buffer = cheerBuffer;
      const cheerFilter = ctx.createBiquadFilter();
      cheerFilter.type = 'bandpass';
      cheerFilter.frequency.setValueAtTime(800, now);
      cheerFilter.Q.value = 1.0;

      const cheerGain = ctx.createGain();
      cheerGain.gain.setValueAtTime(0.0001, now);
      cheerGain.gain.exponentialRampToValueAtTime(0.08 * vol, now + 0.5);
      cheerGain.gain.setValueAtTime(0.08 * vol, now + 1.5);
      cheerGain.gain.exponentialRampToValueAtTime(0.0001, now + cheerDur);

      cheerSource.connect(cheerFilter);
      cheerFilter.connect(cheerGain);
      cheerGain.connect(soundOutput);
      cheerSource.start(now + 0.2);

    // ═══ 13. FIREWORK LAUNCH & EXPLOSION ═══
    } else if (type === 'fireworkLaunch') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(300, now);
      o.frequency.exponentialRampToValueAtTime(1050, now + 0.24);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.06 * vol, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      o.connect(g);
      g.connect(soundOutput);
      o.start(now);
      o.stop(now + 0.24);

    } else if (type === 'fireworkBoom') {
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(130, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.26);
      subGain.gain.setValueAtTime(0.0001, now);
      subGain.gain.linearRampToValueAtTime(0.24 * vol, now + 0.005);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      subOsc.connect(subGain);
      subGain.connect(soundOutput);
      subOsc.start(now);
      subOsc.stop(now + 0.28);

    // ═══ 14. BUBBLE POP ═══
    } else if (type === 'pop') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(560, now);
      o.frequency.exponentialRampToValueAtTime(110, now + 0.055);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.10 * vol, now + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
      o.connect(g);
      g.connect(soundOutput);
      o.start(now);
      o.stop(now + 0.055);

    // ═══ 15. COMIC HURT / FLINCH ═══
    } else if (type === 'hurt' || type === 'flinch') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.16);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 0.16);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.13 * vol, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(soundOutput);
      osc.start(now);
      osc.stop(now + 0.18);

    // ═══ 16. CHANCE WHEEL TICK ═══
    } else if (type === 'wheelTick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.022);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.065 * vol, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);
      osc.connect(gain);
      gain.connect(soundOutput);
      osc.start(now);
      osc.stop(now + 0.022);

    // ═══ 17. JAIL DOOR / DETENTION ═══
    } else if (type === 'jail' || type === 'jailDoor') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.30);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(480, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.18 * vol, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.30);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(soundOutput);
      osc.start(now);
      osc.stop(now + 0.30);
    }
  } catch (_) { /* silently ignore audio errors */ }
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADAPTIVE SOUNDTRACK ENGINE
   Dual-stem procedural Web Audio synthesizer:
   - Early game / safe liquidity: warm neo-classical / lo-fi tycoon ambient groove
   - Late game / danger: high-tempo, driving suspenseful orchestral strings & pulse
   - Dynamic real-time equal-power crossfading based on match tension
───────────────────────────────────────────────────────────────────────────── */

class AdaptiveMusicEngine {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.ambientGain = null;
    this.suspenseGain = null;
    this.isRunning = false;
    this.timerId = null;
    this.nextNoteTime = 0;
    this.currentStep = 0;
    this.tension = 0.0;
    this.targetTension = 0.0;
    this.tempo = 98; // BPM
    this.stepDuration = (60 / 98) / 4; // 16th note (~0.153s)
    this.baseVolume = 0.32; // pleasant mix underneath SFX
  }

  init(ctx, masterGain) {
    if (this.ctx) return;
    this.ctx = ctx;

    this.musicGain = ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.baseVolume, ctx.currentTime);
    this.musicGain.connect(masterGain);

    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.ambientGain.connect(this.musicGain);

    this.suspenseGain = ctx.createGain();
    this.suspenseGain.gain.setValueAtTime(0.0, ctx.currentTime);
    this.suspenseGain.connect(this.musicGain);
  }

  start() {
    if (this.isRunning) return;
    if (!soundEnabled || soundVolume <= 0) return;
    const ctx = getCtx();
    if (!masterGainNode) getAudioDestination();
    this.init(ctx, masterGainNode);

    this.isRunning = true;
    this.currentStep = 0;
    this.nextNoteTime = ctx.currentTime + 0.1;
    this.scheduleLoop();
  }

  stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4);
    }
    if (this.suspenseGain && this.ctx) {
      this.suspenseGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4);
    }
  }

  setTension(factor) {
    this.targetTension = Math.max(0.0, Math.min(1.0, factor));
    if (!this.ctx || !this.ambientGain || !this.suspenseGain) return;

    // Smooth equal-power crossfade between ambient and suspense stems
    const t = this.targetTension;
    const ambTarget = Math.cos(t * Math.PI * 0.5);
    const suspTarget = Math.sin(t * Math.PI * 0.5);
    const now = this.ctx.currentTime;

    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.setTargetAtTime(ambTarget, now, 1.6);

    this.suspenseGain.gain.cancelScheduledValues(now);
    this.suspenseGain.gain.setTargetAtTime(suspTarget, now, 1.6);
  }

  setVolume(vol) {
    this.baseVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.baseVolume, this.ctx.currentTime, 0.1);
    }
  }

  scheduleLoop() {
    if (!this.isRunning) return;
    const scheduleAheadTime = 0.18;
    const now = this.ctx.currentTime;

    while (this.nextNoteTime < now + scheduleAheadTime) {
      this.playStep(this.currentStep, this.nextNoteTime);
      this.nextNoteTime += this.stepDuration;
      this.currentStep = (this.currentStep + 1) % 64; // 4-bar phrase (16 beats = 64 16th-note steps)
    }

    this.timerId = setTimeout(() => this.scheduleLoop(), 35);
  }

  playStep(step, time) {
    // ═════════════════════════════════════════════════════════════
    // 1. AMBIENT STEM (Warm Rhodes / Marimba / Jazz Bass / Shaker)
    // ═════════════════════════════════════════════════════════════
    // 4-Bar Chord Progression in F Major / D Minor Pentatonic:
    // Bar 0 (steps 0..15):  Fmaj9 (F3, A3, C4, E4, G4)
    // Bar 1 (steps 16..31): Am9   (A2, C3, E3, G3, B3)
    // Bar 2 (steps 32..47): Bbmaj7(Bb2, D3, F3, A3, C4)
    // Bar 3 (steps 48..63): C9sus (C3, G3, Bb3, D4, E4)

    // A. Ambient Chord Chimes (Electric Rhodes / Marimba bells)
    const chordPattern = [
      { step: 0,  notes: [174.61, 261.63, 329.63, 392.00] }, // F3, C4, E4, G4
      { step: 6,  notes: [261.63, 392.00] },
      { step: 10, notes: [220.00, 329.63] },
      { step: 16, notes: [110.00, 220.00, 261.63, 329.63] }, // A2, A3, C4, E4
      { step: 22, notes: [196.00, 329.63] },
      { step: 26, notes: [246.94, 392.00] },
      { step: 32, notes: [116.54, 233.08, 293.66, 349.23] }, // Bb2, Bb3, D4, F4
      { step: 38, notes: [261.63, 349.23] },
      { step: 42, notes: [220.00, 293.66] },
      { step: 48, notes: [130.81, 196.00, 233.08, 293.66] }, // C3, G3, Bb3, D4
      { step: 54, notes: [261.63, 329.63] },
      { step: 58, notes: [196.00, 293.66] }
    ];

    const matchChord = chordPattern.find(p => p.step === step);
    if (matchChord) {
      matchChord.notes.forEach((freq, idx) => {
        this.synthWarmBell(freq, time + idx * 0.015, 0.45, this.ambientGain);
      });
    }

    // B. Ambient Walking Bass (Plucked Upright / Warm Sub)
    const bassSteps = {
      0: 87.31,   // F2
      8: 130.81,  // C3
      14: 98.00,  // G2
      16: 55.00,  // A1
      24: 82.41,  // E2
      30: 73.42,  // D2
      32: 58.27,  // Bb1
      40: 87.31,  // F2
      46: 77.78,  // Eb2
      48: 65.41,  // C2
      56: 98.00,  // G2
      62: 110.00  // A2
    };
    if (bassSteps[step] !== undefined) {
      this.synthWarmBass(bassSteps[step], time, 0.35, this.ambientGain);
    }

    // C. Soft Brushed Shaker (Every 8th note, swing pulse)
    if (step % 2 === 0) {
      const isAccent = (step % 4 === 0);
      this.synthBrushedHat(time, isAccent ? 0.045 : 0.025, this.ambientGain);
    }

    // ═════════════════════════════════════════════════════════════
    // 2. SUSPENSE STEM (High-Tempo Dramatic Orchestral Ostinato)
    // ═════════════════════════════════════════════════════════════
    // Dramatic D Harmonic Minor:
    // Bar 0: Dm ostinato (D3, F3, A3)
    // Bar 1: Bb5 ostinato (Bb2, D3, F3)
    // Bar 2: Gm6 / C#dim (G2, Bb2, E3, C#3)
    // Bar 3: A7b9 crisis build (A2, C#3, G3, Bb3)

    // A. Driving 16th-Note Staccato Strings Ostinato
    const ostinatoFreqs = [
      // Bar 0 (Dm)
      146.83, 146.83, 174.61, 146.83, 220.00, 146.83, 174.61, 146.83,
      146.83, 174.61, 220.00, 174.61, 293.66, 220.00, 174.61, 220.00,
      // Bar 1 (Bb)
      116.54, 116.54, 146.83, 116.54, 174.61, 116.54, 146.83, 116.54,
      116.54, 146.83, 174.61, 146.83, 233.08, 174.61, 146.83, 174.61,
      // Bar 2 (Gm6 / C#dim)
      98.00,  98.00,  116.54, 98.00,  164.81, 98.00,  138.59, 98.00,
      116.54, 138.59, 164.81, 138.59, 233.08, 164.81, 138.59, 164.81,
      // Bar 3 (A7b9 crisis build)
      110.00, 110.00, 138.59, 110.00, 196.00, 110.00, 233.08, 110.00,
      138.59, 196.00, 233.08, 277.18, 329.63, 277.18, 233.08, 196.00
    ];
    const stringFreq = ostinatoFreqs[step];
    if (stringFreq) {
      const isDownbeat = (step % 4 === 0);
      this.synthStaccatoString(stringFreq, time, isDownbeat ? 0.08 : 0.05, this.suspenseGain);
    }

    // B. Cinematic Timpani / Dramatic Sub Hits
    const timpaniAccents = [0, 8, 16, 24, 32, 40, 48, 56, 60, 62];
    if (timpaniAccents.includes(step)) {
      const isMajorHit = (step === 0 || step === 16 || step === 32 || step === 48);
      this.synthCinematicTimpani(time, isMajorHit ? 0.22 : 0.12, this.suspenseGain);
    }

    // C. Urgent Metallic Countdown Ticks
    if (step % 2 === 0) {
      const isTick = (step % 4 === 2);
      this.synthCountdownTick(time, isTick ? 0.05 : 0.025, this.suspenseGain);
    }

    // D. Low Suspense Sub Drone
    if (step === 0 || step === 32) {
      this.synthSubDrone(36.71, time, 4.8, this.suspenseGain); // D1
    }
  }

  // Synthesizer voice helpers
  synthWarmBell(freq, time, dur, targetDest) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, time);
    filter.Q.value = 0.8;

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.07, time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(g);
    g.connect(targetDest);

    osc.start(time);
    osc.stop(time + dur);
    osc2.start(time);
    osc2.stop(time + dur);
  }

  synthWarmBass(freq, time, dur, targetDest) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    sub.type = 'sine';
    sub.frequency.setValueAtTime(freq * 0.5, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, time);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.12, time + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(g);
    g.connect(targetDest);

    osc.start(time);
    osc.stop(time + dur);
    sub.start(time);
    sub.stop(time + dur);
  }

  synthBrushedHat(time, vol, targetDest) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const dur = 0.038;
    const bufSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(8000, time);
    filter.Q.value = 2.5;

    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    noise.connect(filter);
    filter.connect(g);
    g.connect(targetDest);

    noise.start(time);
    noise.stop(time + dur);
  }

  synthStaccatoString(freq, time, vol, targetDest) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const dur = 0.085;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(freq * 1.004, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1150, time);
    filter.Q.value = 1.8;

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(g);
    g.connect(targetDest);

    osc1.start(time);
    osc1.stop(time + dur);
    osc2.start(time);
    osc2.stop(time + dur);
  }

  synthCinematicTimpani(time, vol, targetDest) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const dur = 0.26;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.22);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(g);
    g.connect(targetDest);

    osc.start(time);
    osc.stop(time + dur);
  }

  synthCountdownTick(time, vol, targetDest) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const dur = 0.022;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2200, time);
    osc.frequency.exponentialRampToValueAtTime(1200, time + dur);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1500, time);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(filter);
    filter.connect(g);
    g.connect(targetDest);

    osc.start(time);
    osc.stop(time + dur);
  }

  synthSubDrone(freq, time, dur, targetDest) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.09, time + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(g);
    g.connect(targetDest);

    osc.start(time);
    osc.stop(time + dur);
  }
}

export const adaptiveMusic = new AdaptiveMusicEngine();

export function startAdaptiveMusic() {
  adaptiveMusic.start();
}

export function stopAdaptiveMusic() {
  adaptiveMusic.stop();
}

export function updateAdaptiveMusicTension(factor) {
  adaptiveMusic.setTension(factor);
}

export function setMusicVolume(vol) {
  adaptiveMusic.setVolume(vol);
}

/**
 * Evaluates the live dynamic tension of the current match.
 * Transitions between 0.0 (Chill Tycoon Ambient) to 1.0 (Suspenseful Orchestral).
 * Tension rises when multiple players are low on liquid capital and facing bankruptcy.
 * @returns {number} 0.0 to 1.0
 */
export function evaluateMatchTension() {
  if (!gameState || !gameState.gameStarted || !gameState.players || gameState.players.length === 0) {
    return 0.0;
  }
  const players = gameState.players;
  const activePlayers = players.filter(p => !p.bankrupt);
  if (activePlayers.length <= 1) return 1.0;

  let lowCashCount = 0;
  let criticalCashCount = 0;
  const DANGER_THRESHOLD = 450000;
  const CRITICAL_THRESHOLD = 220000;

  for (const p of activePlayers) {
    if (p.cash <= CRITICAL_THRESHOLD) {
      criticalCashCount++;
      lowCashCount++;
    } else if (p.cash <= DANGER_THRESHOLD) {
      lowCashCount++;
    }
  }

  const monopoliesCount = Object.keys(gameState.achievedMonopolies || {}).length;
  const monopolyFactor = Math.min(0.35, monopoliesCount * 0.12);

  const deadCount = players.length - activePlayers.length;
  const deadFactor = deadCount * 0.20;

  let liquidityTension = 0;
  if (criticalCashCount >= 2) {
    liquidityTension = 0.85;
  } else if (criticalCashCount === 1 && lowCashCount >= 2) {
    liquidityTension = 0.70;
  } else if (lowCashCount >= 2) {
    liquidityTension = 0.55;
  } else if (criticalCashCount === 1) {
    liquidityTension = 0.40;
  } else if (lowCashCount === 1) {
    liquidityTension = 0.25;
  }

  const rawTension = Math.max(liquidityTension, monopolyFactor + deadFactor);
  return Math.max(0.0, Math.min(1.0, rawTension));
}
