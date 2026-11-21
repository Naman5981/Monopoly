/**
 * game/audio/sfx.js
 * Procedural Web Audio sound effects synthesizer.
 */

import { soundEnabled, soundVolume } from '../state.js';
import { getCtx, getAudioDestination, createSpatialPanner } from './context.js';

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

    // ═══ 8B. MONOPOLY THREAT ALERT (DRAMATIC TENSION SWELL & CHIME) ═══
    } else if (type === 'monopolyThreat' || type === 'threat') {
      const threatVol = 0.9 * vol;
      // 1. Tension low brass swell (dramatic chord: A2, E3, A3)
      [110.0, 164.81, 220.0].forEach((freq) => {
        const osc = ctx.createOscillator();
        const harm = ctx.createOscillator();
        const g = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        harm.type = 'sine';
        harm.frequency.setValueAtTime(freq * 0.5, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, now);
        filter.frequency.exponentialRampToValueAtTime(1400, now + 0.35);
        filter.frequency.exponentialRampToValueAtTime(350, now + 1.4);
        filter.Q.value = 2.0;

        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.12 * threatVol, now + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

        osc.connect(filter);
        harm.connect(filter);
        filter.connect(g);
        g.connect(soundOutput);

        osc.start(now);
        osc.stop(now + 1.5);
        harm.start(now);
        harm.stop(now + 1.5);
      });

      // 2. High urgent chime bells (E5 -> A5 staccato ping)
      [659.25, 880.0].forEach((f, idx) => {
        const t = now + 0.14 + idx * 0.14;
        const chime = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(f, t);

        chimeGain.gain.setValueAtTime(0.0001, t);
        chimeGain.gain.linearRampToValueAtTime(0.16 * threatVol, t + 0.01);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);

        chime.connect(chimeGain);
        chimeGain.connect(soundOutput);
        chime.start(t);
        chime.stop(t + 0.85);
      });

    // ═══ 8C. WORLD FESTIVAL 2X RENT BOOST (OPTION 3: GRAND HERALDIC TRUMPET) ═══
    } else if (type === 'festivalBoost' || type === 'festival') {
      const festVol = 0.9 * vol;

      // Heraldic Fanfare Notes (G4 - G4 - G4 -> Sustained Triumphant C5)
      const trumpetNotes = [
        { f: 392.00, t: 0.00, dur: 0.16, g: 0.28 },
        { f: 392.00, t: 0.16, dur: 0.16, g: 0.28 },
        { f: 392.00, t: 0.32, dur: 0.16, g: 0.30 },
        { f: 523.25, t: 0.48, dur: 0.95, g: 0.38 }
      ];

      trumpetNotes.forEach((n) => {
        const t = now + n.t;
        const osc = ctx.createOscillator();
        const harm = ctx.createOscillator();
        const g = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.f, t);
        harm.type = 'triangle';
        harm.frequency.setValueAtTime(n.f * 2, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(n.f * 3.4, t);
        filter.Q.value = 1.2;

        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(n.g * festVol, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + n.dur);

        osc.connect(filter);
        harm.connect(filter);
        filter.connect(g);
        g.connect(soundOutput);

        osc.start(t);
        osc.stop(t + n.dur);
        harm.start(t);
        harm.stop(t + n.dur);
      });

      // Warm resonance on resolution (C5 impact)
      const sub = ctx.createOscillator();
      const subG = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(110, now + 0.48);
      sub.frequency.exponentialRampToValueAtTime(45, now + 0.85);
      subG.gain.setValueAtTime(0.0001, now + 0.48);
      subG.gain.linearRampToValueAtTime(0.22 * festVol, now + 0.50);
      subG.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
      sub.connect(subG);
      subG.connect(soundOutput);
      sub.start(now + 0.48);
      sub.stop(now + 0.95);
      sub.stop(now + 0.45);

    // ═══ 9. BANKRUPT / ELIMINATION MOTIF ═══
    } else if (type === 'bankrupt') {
      // 1. Deep cinematic sub-bass impact gong
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      const subFilter = ctx.createBiquadFilter();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(130, now);
      subOsc.frequency.exponentialRampToValueAtTime(38, now + 1.2);

      subFilter.type = 'lowpass';
      subFilter.frequency.setValueAtTime(260, now);
      subFilter.frequency.linearRampToValueAtTime(60, now + 1.2);

      subGain.gain.setValueAtTime(0.0001, now);
      subGain.gain.linearRampToValueAtTime(0.38 * vol, now + 0.03);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);

      subOsc.connect(subFilter);
      subFilter.connect(subGain);
      subGain.connect(soundOutput);

      subOsc.start(now);
      subOsc.stop(now + 1.25);

      // 2. Shatter transient noise burst
      try {
        const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.18), ctx.sampleRate);
        const noiseData = noiseBuf.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
          noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
        }
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(500, now);
        noiseFilter.Q.value = 1.8;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.22 * vol, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(soundOutput);
        noiseSrc.start(now);
      } catch (_) {}

      // 3. Descending doom chord arpeggio
      const pitches = [392.0, 369.99, 349.23, 311.13, 261.63];
      pitches.forEach((f, i) => {
        const t = now + 0.08 + i * 0.18;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.linearRampToValueAtTime(260, t + 0.22);
        filter.Q.value = 3.0;

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.22 * vol, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(soundOutput);

        osc.start(t);
        osc.stop(t + 0.28);
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
      subGain.linearRampToValueAtTime(0.24 * vol, now + 0.005);
      subGain.exponentialRampToValueAtTime(0.0001, now + 0.28);
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

    // ═══ 17. TROPICAL ISLAND DETENTION / IRON CELL SLAM ═══
    } else if (type === 'island' || type === 'islandDetained' || type === 'jail' || type === 'jailDoor') {
      const islandVol = 0.95 * vol;

      // 1. Heavy iron prison door slam (low resonant impact)
      const barOsc = ctx.createOscillator();
      const barGain = ctx.createGain();
      const barFilter = ctx.createBiquadFilter();
      barOsc.type = 'sawtooth';
      barOsc.frequency.setValueAtTime(140, now);
      barOsc.frequency.exponentialRampToValueAtTime(32, now + 0.40);
      barFilter.type = 'lowpass';
      barFilter.frequency.setValueAtTime(420, now);
      barGain.gain.setValueAtTime(0.0001, now);
      barGain.gain.linearRampToValueAtTime(0.38 * islandVol, now + 0.015);
      barGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      barOsc.connect(barFilter);
      barFilter.connect(barGain);
      barGain.connect(soundOutput);
      barOsc.start(now);
      barOsc.stop(now + 0.45);

      // 2. High metal ring dissonance (880Hz & 1180Hz)
      [880, 1180].forEach(f => {
        const m = ctx.createOscillator();
        const mg = ctx.createGain();
        m.type = 'triangle';
        m.frequency.setValueAtTime(f, now);
        m.frequency.exponentialRampToValueAtTime(f * 0.6, now + 0.22);
        mg.gain.setValueAtTime(0.0001, now);
        mg.gain.linearRampToValueAtTime(0.16 * islandVol, now + 0.005);
        mg.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        m.connect(mg);
        mg.connect(soundOutput);
        m.start(now);
        m.stop(now + 0.25);
      });

      // 3. Comical tropical marimba downward slide whistle (detained on island!)
      const slide = ctx.createOscillator();
      const sg = ctx.createGain();
      slide.type = 'sine';
      slide.frequency.setValueAtTime(380, now + 0.12);
      slide.frequency.exponentialRampToValueAtTime(95, now + 0.55);
      sg.gain.setValueAtTime(0.0001, now + 0.12);
      sg.gain.linearRampToValueAtTime(0.22 * islandVol, now + 0.16);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
      slide.connect(sg);
      sg.connect(soundOutput);
      slide.start(now + 0.12);
      slide.stop(now + 0.58);

    // ═══ 18. HOSTILE TAKEOVER / BUYOUT: DRAMATIC IMPACT & BRASS POWER STING ═══
    } else if (type === 'takeover' || type === 'buyout') {
      const takeoverVol = 0.95 * vol;

      // 1. Heavy sub-bass impact slam (140Hz -> 36Hz)
      const sub = ctx.createOscillator();
      const subG = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(140, now);
      sub.frequency.exponentialRampToValueAtTime(36, now + 0.45);
      subG.gain.setValueAtTime(0.0001, now);
      subG.gain.linearRampToValueAtTime(0.25 * takeoverVol, now + 0.012);
      subG.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      sub.connect(subG);
      subG.connect(soundOutput);
      sub.start(now);
      sub.stop(now + 0.55);

      // 2. Metallic clash / sharp strike (dual dissonant high ring: 920Hz & 1480Hz)
      [920, 1480].forEach((freq) => {
        const metal = ctx.createOscillator();
        const metalG = ctx.createGain();
        metal.type = 'triangle';
        metal.frequency.setValueAtTime(freq, now);
        metal.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.18);
        metalG.gain.setValueAtTime(0.0001, now);
        metalG.gain.linearRampToValueAtTime(0.12 * takeoverVol, now + 0.004);
        metalG.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        metal.connect(metalG);
        metalG.connect(soundOutput);
        metal.start(now);
        metal.stop(now + 0.22);
      });

      // 3. Ruthless power brass sting (Sawtooth drop with bandpass filter: 320Hz -> 180Hz)
      const brass = ctx.createOscillator();
      const brassFilter = ctx.createBiquadFilter();
      const brassG = ctx.createGain();
      brass.type = 'sawtooth';
      brass.frequency.setValueAtTime(320, now + 0.02);
      brass.frequency.exponentialRampToValueAtTime(160, now + 0.38);

      brassFilter.type = 'bandpass';
      brassFilter.frequency.setValueAtTime(540, now + 0.02);
      brassFilter.Q.value = 2.2;

      brassG.gain.setValueAtTime(0.0001, now + 0.02);
      brassG.gain.linearRampToValueAtTime(0.18 * takeoverVol, now + 0.04);
      brassG.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

      brass.connect(brassFilter);
      brassFilter.connect(brassG);
      brassG.connect(soundOutput);
      brass.start(now + 0.02);
      brass.stop(now + 0.42);

      // 4. Seized cash coins rattle (3 fast clicks at 0.15s, 0.22s, 0.30s)
      [0.15, 0.22, 0.30].forEach((delay, idx) => {
        const coin = ctx.createOscillator();
        const coinG = ctx.createGain();
        coin.type = 'sine';
        coin.frequency.setValueAtTime(1200 + idx * 250, now + delay);
        coin.frequency.exponentialRampToValueAtTime(600, now + delay + 0.06);
        coinG.gain.setValueAtTime(0.0001, now + delay);
        coinG.gain.linearRampToValueAtTime(0.08 * takeoverVol, now + delay + 0.003);
        coinG.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.06);
        coin.connect(coinG);
        coinG.connect(soundOutput);
        coin.start(now + delay);
        coin.stop(now + delay + 0.06);
      });

    // ═══ 19. JAILBREAK (ESCAPING ISLAND ON DOUBLES) ═══
    } else if (type === 'jailbreak') {
      const jbVol = 0.9 * vol;

      // Lock tumbler release click
      const click = ctx.createOscillator();
      const cg = ctx.createGain();
      click.type = 'triangle';
      click.frequency.setValueAtTime(1600, now);
      click.frequency.exponentialRampToValueAtTime(450, now + 0.035);
      cg.gain.setValueAtTime(0.0001, now);
      cg.gain.linearRampToValueAtTime(0.25 * jbVol, now + 0.004);
      cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
      click.connect(cg);
      cg.connect(soundOutput);
      click.start(now);
      click.stop(now + 0.035);

      // Triumphant breakout brass arpeggio (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((f, i) => {
        const t = now + 0.04 + i * 0.07;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const filt = ctx.createBiquadFilter();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f, t);
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(f * 2.8, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.20 * jbVol, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        o.connect(filt);
        filt.connect(g);
        g.connect(soundOutput);
        o.start(t);
        o.stop(t + 0.28);
      });

    // ═══ 20. FAILED ISLAND ESCAPE (BAR RATTLE) ═══
    } else if (type === 'jailRattle') {
      const rattleVol = 0.85 * vol;
      // Low disappointed thud
      const thud = ctx.createOscillator();
      const tg = ctx.createGain();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(130, now);
      thud.frequency.exponentialRampToValueAtTime(45, now + 0.22);
      tg.gain.setValueAtTime(0.0001, now);
      tg.gain.linearRampToValueAtTime(0.22 * rattleVol, now + 0.01);
      tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      thud.connect(tg);
      tg.connect(soundOutput);
      thud.start(now);
      thud.stop(now + 0.22);

      // Rattle noise
      try {
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.16), ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.setValueAtTime(750, now);
        filt.Q.value = 2.4;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.18 * rattleVol, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        src.connect(filt);
        filt.connect(g);
        g.connect(soundOutput);
        src.start(now);
      } catch (_) {}

    // ═══ 21. CHANCE JACKPOT / REWARD ═══
    } else if (type === 'jackpot' || type === 'chanceReward') {
      const jpVol = 0.85 * vol;
      const starNotes = [659.25, 830.61, 987.77, 1318.51, 1567.98];
      starNotes.forEach((f, i) => {
        const t = now + i * 0.07;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.22 * jpVol, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        o.connect(g);
        g.connect(soundOutput);
        o.start(t);
        o.stop(t + 0.55);
      });

    // ═══ 22. PAY RENT (RELUCTANT LOSS / EXPENSE) ═══
    } else if (type === 'payRent') {
      const rentVol = 0.9 * vol;

      // Reluctant sub-bass drop thud
      const thud = ctx.createOscillator();
      const tg = ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(95, now);
      thud.frequency.exponentialRampToValueAtTime(42, now + 0.35);
      tg.gain.setValueAtTime(0.0001, now);
      tg.gain.linearRampToValueAtTime(0.32 * rentVol, now + 0.015);
      tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.40);
      thud.connect(tg);
      tg.connect(soundOutput);
      thud.start(now);
      thud.stop(now + 0.40);

      // Downward coin slip
      [880, 659.25, 493.88].forEach((f, idx) => {
        const c = ctx.createOscillator();
        const cg = ctx.createGain();
        c.type = 'triangle';
        c.frequency.setValueAtTime(f, now + 0.05 + idx * 0.06);
        c.frequency.exponentialRampToValueAtTime(f * 0.75, now + 0.05 + idx * 0.06 + 0.08);
        cg.gain.setValueAtTime(0.0001, now + 0.05 + idx * 0.06);
        cg.gain.linearRampToValueAtTime(0.14 * rentVol, now + 0.05 + idx * 0.06 + 0.005);
        cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.05 + idx * 0.06 + 0.10);
        c.connect(cg);
        cg.connect(soundOutput);
        c.start(now + 0.05 + idx * 0.06);
        c.stop(now + 0.05 + idx * 0.06 + 0.10);
      });

    // ═══ 23. RECEIVE RENT (LANDLORD INCOME) ═══
    } else if (type === 'receiveRent') {
      const recVol = 0.85 * vol;

      // Crisp cash register double-ring (B5 -> E6)
      [987.77, 1318.51].forEach((f, idx) => {
        const bell = ctx.createOscillator();
        const bg = ctx.createGain();
        bell.type = 'sine';
        bell.frequency.setValueAtTime(f, now + idx * 0.08);
        bg.gain.setValueAtTime(0.0001, now + idx * 0.08);
        bg.gain.linearRampToValueAtTime(0.22 * recVol, now + idx * 0.08 + 0.01);
        bg.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.45);
        bell.connect(bg);
        bg.connect(soundOutput);
        bell.start(now + idx * 0.08);
        bell.stop(now + idx * 0.08 + 0.45);
      });

      // Coins settle
      [1400, 1750].forEach((f, idx) => {
        const coin = ctx.createOscillator();
        const cg = ctx.createGain();
        coin.type = 'triangle';
        coin.frequency.setValueAtTime(f, now + 0.16 + idx * 0.05);
        cg.gain.setValueAtTime(0.0001, now + 0.16 + idx * 0.05);
        cg.gain.linearRampToValueAtTime(0.12 * recVol, now + 0.16 + idx * 0.05 + 0.005);
        cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.16 + idx * 0.05 + 0.08);
        coin.connect(cg);
        cg.connect(soundOutput);
        coin.start(now + 0.16 + idx * 0.05);
        coin.stop(now + 0.16 + idx * 0.05 + 0.08);
      });

    // ═══ 24. AUCTION PROPERTY WON ═══
    } else if (type === 'auctionWon') {
      const aucVol = 0.9 * vol;

      // Double gavel strike ("knock-knock")
      [0, 0.13].forEach((tOff) => {
        const gOsc = ctx.createOscillator();
        const gGain = ctx.createGain();
        const gFilt = ctx.createBiquadFilter();
        gOsc.type = 'triangle';
        gOsc.frequency.setValueAtTime(260, now + tOff);
        gOsc.frequency.exponentialRampToValueAtTime(75, now + tOff + 0.06);
        gFilt.type = 'lowpass';
        gFilt.frequency.setValueAtTime(700, now + tOff);
        gGain.gain.setValueAtTime(0.0001, now + tOff);
        gGain.linearRampToValueAtTime(0.32 * aucVol, now + tOff + 0.003);
        gGain.exponentialRampToValueAtTime(0.0001, now + tOff + 0.06);
        gOsc.connect(gFilt);
        gFilt.connect(gGain);
        gGain.connect(soundOutput);
        gOsc.start(now + tOff);
        gOsc.stop(now + tOff + 0.06);
      });

      // Triumphant quick brass triad (0.28s)
      [392.00, 523.25, 659.25].forEach((f) => {
        const b = ctx.createOscillator();
        const bg = ctx.createGain();
        b.type = 'sawtooth';
        b.frequency.setValueAtTime(f, now + 0.28);
        bg.gain.setValueAtTime(0.0001, now + 0.28);
        bg.gain.linearRampToValueAtTime(0.18 * aucVol, now + 0.30);
        bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.70);
        b.connect(bg);
        bg.connect(soundOutput);
        b.start(now + 0.28);
        b.stop(now + 0.70);
      });

    // ═══ 25. ROLLING DOUBLES (EXTRA TURN CELEBRATION) ═══
    } else if (type === 'doubles' || type === 'doublesRoll') {
      const dblVol = 0.85 * vol;

      // Twin star chime (A5 -> D6)
      [880.00, 1174.66].forEach((f, idx) => {
        const ch = ctx.createOscillator();
        const chG = ctx.createGain();
        ch.type = 'sine';
        ch.frequency.setValueAtTime(f, now + idx * 0.09);
        chG.gain.setValueAtTime(0.0001, now + idx * 0.09);
        chG.gain.linearRampToValueAtTime(0.22 * dblVol, now + idx * 0.09 + 0.01);
        chG.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.40);
        ch.connect(chG);
        chG.connect(soundOutput);
        ch.start(now + idx * 0.09);
        ch.stop(now + idx * 0.09 + 0.40);
      });

    // ═══ 26. MODERN UI GLASS TAP ═══
    } else if (type === 'uiTap') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(1400, now);
      o.frequency.exponentialRampToValueAtTime(650, now + 0.024);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.18 * vol, now + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.024);
      o.connect(g);
      g.connect(soundOutput);
      o.start(now);
      o.stop(now + 0.024);

    // ═══ 27. CHANCE WHEEL NEEDLE LOCK / STOP ═══
    } else if (type === 'wheelLock') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(1800, now);
      o.frequency.exponentialRampToValueAtTime(320, now + 0.035);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.24 * vol, now + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
      o.connect(g);
      g.connect(soundOutput);
      o.start(now);
      o.stop(now + 0.035);

      // Resonant ting
      const bell = ctx.createOscillator();
      const bg = ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(1244.51, now + 0.01);
      bg.gain.setValueAtTime(0.0001, now + 0.01);
      bg.gain.linearRampToValueAtTime(0.16 * vol, now + 0.02);
      bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      bell.connect(bg);
      bg.connect(soundOutput);
      bell.start(now + 0.01);
      bell.stop(now + 0.35);
    }
  } catch (_) { /* silently ignore audio errors */ }
}
