/**
 * game/audio.js
 * Web-Audio-API sound-effect synthesizer.
 */

import { soundEnabled } from './state.js';

let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/**
 * Play a synthesized SFX.
 * @param {'dice'|'hop'|'cash'|'build'} type
 */
export function playSFX(type) {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    if (type === 'dice' || type === 'diceShuffle') {
      // Realistic wooden/plastic shaker cup dice rattle
      const rattleOffsets = [0, 0.07, 0.15, 0.24, 0.34, 0.44];
      rattleOffsets.forEach((t, i) => {
        // Shaker friction noise burst
        const bufferSize = Math.floor(ctx.sampleRate * 0.04);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < bufferSize; j++) {
          data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.3));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200 + (i % 3) * 450, now + t);
        filter.Q.value = 3.5;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.18, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.04);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now + t);

        // Resonant wood/acrylic clack
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260 + (i % 2) * 120, now + t);
        osc.frequency.exponentialRampToValueAtTime(90, now + t + 0.035);
        oscGain.gain.setValueAtTime(0.14, now + t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.035);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.035);
      });
    } else if (type === 'diceBounce') {
      // Crisp table bounce impact clack
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.05);
      oscGain.gain.setValueAtTime(0.22, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'hop') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(340, now);
      o.frequency.exponentialRampToValueAtTime(580, now + 0.08);
      g.gain.setValueAtTime(0.08, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      o.connect(g); g.connect(ctx.destination);
      o.start(now); o.stop(now + 0.09);
    } else if (type === 'flight' || type === 'whoosh') {
      // Aerodynamic jet whoosh for tile-by-tile flight
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(520, now);
      o.frequency.exponentialRampToValueAtTime(780, now + 0.06);
      o.frequency.exponentialRampToValueAtTime(440, now + 0.12);
      g.gain.setValueAtTime(0.06, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      o.connect(g); g.connect(ctx.destination);
      o.start(now); o.stop(now + 0.12);
    } else if (type === 'cash') {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f, now + i * 0.055);
        g.gain.setValueAtTime(0.1, now + i * 0.055);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.16);
        o.connect(g); g.connect(ctx.destination);
        o.start(now + i * 0.055); o.stop(now + i * 0.055 + 0.16);
      });
    } else if (type === 'build') {
      [440, 554.37, 659.25].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, now + i * 0.065);
        g.gain.setValueAtTime(0.12, now + i * 0.065);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.065 + 0.14);
        o.connect(g); g.connect(ctx.destination);
        o.start(now + i * 0.065); o.stop(now + i * 0.065 + 0.14);
      });
    } else if (type === 'gavel') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(140, now);
      o.frequency.exponentialRampToValueAtTime(40, now + 0.08);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      o.connect(g); g.connect(ctx.destination);
      o.start(now); o.stop(now + 0.08);
    } else if (type === 'win' || type === 'victory') {
      // 1. Grand Royal Brass Herald Fanfare
      const brassChords = [
        // Chord 1 (Staccato trumpet blast)
        { t: 0.00, dur: 0.14, notes: [261.63, 392.00, 523.25], gain: 0.16 },
        // Chord 2
        { t: 0.16, dur: 0.14, notes: [261.63, 392.00, 523.25], gain: 0.16 },
        // Chord 3
        { t: 0.32, dur: 0.14, notes: [261.63, 392.00, 523.25], gain: 0.18 },
        // Chord 4 (Dominant step)
        { t: 0.48, dur: 0.34, notes: [196.00, 293.66, 392.00, 587.33], gain: 0.20 },
        // Chord 5 (Subdominant rise)
        { t: 0.85, dur: 0.36, notes: [220.00, 329.63, 440.00, 523.25, 659.25], gain: 0.22 },
        // Chord 6 (Grand Majestic Finale)
        { t: 1.25, dur: 2.50, notes: [130.81, 196.00, 261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50], gain: 0.26 }
      ];

      brassChords.forEach(chord => {
        chord.notes.forEach((freq, nIdx) => {
          // Sawtooth for brass brightness
          const oscSaw = ctx.createOscillator();
          oscSaw.type = 'sawtooth';
          oscSaw.frequency.setValueAtTime(freq, now + chord.t);

          // Triangle for warm fundamental body
          const oscTri = ctx.createOscillator();
          oscTri.type = 'triangle';
          oscTri.frequency.setValueAtTime(freq, now + chord.t);

          // Resonant Lowpass Filter for authentic brass acoustic formant
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1400 + freq * 0.8, now + chord.t);
          filter.Q.value = 2.4;

          const gain = ctx.createGain();
          const noteGain = (chord.gain / Math.sqrt(chord.notes.length)) * (nIdx === chord.notes.length - 1 ? 1.2 : 1.0);
          gain.gain.setValueAtTime(0.001, now + chord.t);
          gain.gain.linearRampToValueAtTime(noteGain, now + chord.t + 0.035);
          gain.gain.exponentialRampToValueAtTime(0.001, now + chord.t + chord.dur);

          oscSaw.connect(filter);
          oscTri.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          oscSaw.start(now + chord.t);
          oscSaw.stop(now + chord.t + chord.dur);
          oscTri.start(now + chord.t);
          oscTri.stop(now + chord.t + chord.dur);
        });
      });

      // 2. Crystal Victory Chimes & Glockenspiel Arpeggio
      const chimes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
      chimes.forEach((freq, idx) => {
        const chimeT = 1.35 + idx * 0.07;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + chimeT);
        g.gain.setValueAtTime(0.001, now + chimeT);
        g.gain.linearRampToValueAtTime(0.12, now + chimeT + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, now + chimeT + 0.65);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + chimeT);
        o.stop(now + chimeT + 0.65);
      });

      // 3. Swelling Celebratory Crowd Applause / Cheering Noise
      const cheerDur = 3.2;
      const cheerBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * cheerDur), ctx.sampleRate);
      const cheerData = cheerBuffer.getChannelData(0);
      for (let i = 0; i < cheerData.length; i++) {
        // Pink-like noise + randomized clapping transients
        const clapPulse = Math.sin(i / (ctx.sampleRate * 0.065)) > 0.88 ? (Math.random() * 1.5) : 1.0;
        cheerData[i] = (Math.random() * 2 - 1) * 0.7 * clapPulse;
      }
      const cheerSource = ctx.createBufferSource();
      cheerSource.buffer = cheerBuffer;

      const cheerFilter = ctx.createBiquadFilter();
      cheerFilter.type = 'bandpass';
      cheerFilter.frequency.setValueAtTime(950, now);
      cheerFilter.Q.value = 1.2;

      const cheerGain = ctx.createGain();
      cheerGain.gain.setValueAtTime(0.001, now);
      cheerGain.gain.exponentialRampToValueAtTime(0.14, now + 0.6);
      cheerGain.gain.setValueAtTime(0.14, now + 1.8);
      cheerGain.gain.exponentialRampToValueAtTime(0.001, now + cheerDur);

      cheerSource.connect(cheerFilter);
      cheerFilter.connect(cheerGain);
      cheerGain.connect(ctx.destination);
      cheerSource.start(now + 0.2);

    } else if (type === 'fireworkLaunch') {
      // Rocket ascending whistle whoosh
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(320, now);
      o.frequency.exponentialRampToValueAtTime(1150, now + 0.26);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.07, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now);
      o.stop(now + 0.26);

    } else if (type === 'fireworkBoom') {
      // Deep powerful explosive thump
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.28);
      subGain.gain.setValueAtTime(0.28, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.30);

      // Sparkling / crackling debris sizzle
      const crackleDur = 0.42;
      const bufferSize = Math.floor(ctx.sampleRate * crackleDur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const decay = Math.exp(-i / (bufferSize * 0.28));
        const pop = Math.random() > 0.88 ? 1.8 : 0.6;
        data[i] = (Math.random() * 2 - 1) * decay * pop;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.setValueAtTime(1300, now);
      nFilter.Q.value = 1.8;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.18, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + crackleDur);

      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now);

    } else if (type === 'pop') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(600, now);
      o.frequency.exponentialRampToValueAtTime(120, now + 0.06);
      g.gain.setValueAtTime(0.12, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      o.connect(g); g.connect(ctx.destination);
      o.start(now); o.stop(now + 0.06);
    }
  } catch (_) { /* silently ignore audio errors */ }
}
