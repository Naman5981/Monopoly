/**
 * game/audio/music.js
 * Adaptive multi-stem procedural soundtrack engine and match tension evaluation.
 */

import { soundEnabled, soundVolume, gameState } from '../state.js';
import { getCtx, getMasterGainNode } from './context.js';

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
    const masterGain = getMasterGainNode();
    this.init(ctx, masterGain);

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
