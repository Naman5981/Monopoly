/**
 * game/audio/sfx/uiSfx.js
 * UI, wheel, doubles, and comic hurt sound effects.
 */

export function playUiSFX(ctx, now, soundOutput, vol, type) {
  if (type === 'click') {
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
    return true;
  }

  if (type === 'uiTap') {
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
    return true;
  }

  if (type === 'pop') {
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
    return true;
  }

  if (type === 'hurt' || type === 'flinch') {
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
    return true;
  }

  if (type === 'wheelTick') {
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
    return true;
  }

  if (type === 'wheelLock') {
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
    return true;
  }

  if (type === 'doubles' || type === 'doublesRoll') {
    const dblVol = 0.85 * vol;
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
    return true;
  }

  return false;
}
