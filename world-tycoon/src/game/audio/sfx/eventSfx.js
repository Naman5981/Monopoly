/**
 * game/audio/sfx/eventSfx.js
 * Economy, monopoly, festival, jail, takeover, bankruptcy, and victory fanfare SFX.
 */

export function playEventSFX(ctx, now, soundOutput, vol, type) {
  if (type === 'gameStart' || type === 'start') {
    const startVol = 0.85 * vol;
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
      const harm = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f, now + note.t);
      harm.type = 'triangle';
      harm.frequency.setValueAtTime(note.f * 2, now + note.t);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(note.f * 2.8, now + note.t);
      filter.Q.value = 0.8;
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
    return true;
  }

  if (type === 'cash') {
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
    return true;
  }

  if (type === 'monopoly') {
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
    return true;
  }

  if (type === 'monopolyThreat' || type === 'threat') {
    const threatVol = 0.9 * vol;
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
    return true;
  }

  if (type === 'festivalBoost' || type === 'festival') {
    const festVol = 0.9 * vol;
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
    return true;
  }

  if (type === 'bankrupt') {
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

    [392.0, 369.99, 349.23, 311.13, 261.63].forEach((f, i) => {
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
    return true;
  }

  if (type === 'win' || type === 'victory') {
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

    [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00].forEach((freq, idx) => {
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
    return true;
  }

  if (type === 'island' || type === 'islandDetained' || type === 'jail' || type === 'jailDoor') {
    const islandVol = 0.95 * vol;
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
    return true;
  }

  if (type === 'takeover' || type === 'buyout') {
    const takeoverVol = 0.95 * vol;
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
    return true;
  }

  if (type === 'jailbreak') {
    const jbVol = 0.9 * vol;
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

    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
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
    return true;
  }

  if (type === 'jailRattle') {
    const rattleVol = 0.85 * vol;
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
    return true;
  }

  if (type === 'jackpot' || type === 'chanceReward') {
    const jpVol = 0.85 * vol;
    [659.25, 830.61, 987.77, 1318.51, 1567.98].forEach((f, i) => {
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
    return true;
  }

  if (type === 'payRent') {
    const rentVol = 0.9 * vol;
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
    return true;
  }

  if (type === 'receiveRent') {
    const recVol = 0.85 * vol;
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
    return true;
  }

  if (type === 'auctionWon') {
    const aucVol = 0.9 * vol;
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
      gGain.gain.linearRampToValueAtTime(0.32 * aucVol, now + tOff + 0.003);
      gGain.gain.exponentialRampToValueAtTime(0.0001, now + tOff + 0.06);
      gOsc.connect(gFilt);
      gFilt.connect(gGain);
      gGain.connect(soundOutput);
      gOsc.start(now + tOff);
      gOsc.stop(now + tOff + 0.06);
    });
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
    return true;
  }

  return false;
}
