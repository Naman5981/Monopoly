/**
 * game/audio/sfx.js
 * Procedural Web Audio sound effects synthesizer.
 */

import { soundEnabled, soundVolume } from '../state.js';
import { getCtx, getAudioDestination, createSpatialPanner } from './context.js';

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
