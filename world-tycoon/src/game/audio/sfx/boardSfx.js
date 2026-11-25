/**
 * game/audio/sfx/boardSfx.js
 * Dice, token movement, building, flight, gavel, and firework sound effects.
 */

export function playBoardSFX(ctx, now, soundOutput, vol, type) {
  if (type === 'dice' || type === 'diceShuffle') {
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
    return true;
  }

  if (type === 'diceBounce') {
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
    return true;
  }

  if (type === 'hop') {
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
    return true;
  }

  if (type === 'build') {
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
    return true;
  }

  if (type === 'gavel') {
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
    return true;
  }

  if (type === 'flight' || type === 'whoosh') {
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
    return true;
  }

  if (type === 'fireworkLaunch') {
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
    return true;
  }

  if (type === 'fireworkBoom') {
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
    return true;
  }

  return false;
}
