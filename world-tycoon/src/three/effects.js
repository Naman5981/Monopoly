/**
 * three/effects.js
 * Visual & Animated Enhancements:
 * - Fullscreen Confetti Particle Explosions
 * - Floating Animated Emoji System (Tomato, Cash Rain, Fire, Sunglasses, Rocket)
 * - Dynamic Day / Sunset / Cyber Night Scene Lighting Controls
 * - Camera Cinematic Orbit & Fly-In Animator
 */

import * as THREE from 'three';
import { playSFX } from '../game/audio.js';
import { matchSettings } from '../game/state.js';

/* ─────────────────────────────────────────────────────────────────────────────
   1. FULLSCREEN CONFETTI & FIREWORKS CANNON
───────────────────────────────────────────────────────────────────────────── */
let confettiCanvas = null;
let confettiCtx = null;
let confettiParticles = [];
let fireworkRockets = [];
let fireworkSparks = [];
let confettiAnimId = null;
let victoryCelebrationTimer = null;
let celebrationActive = false;
let lastFireworkSoundTime = 0;

// High-performance particle object pools (zero GC allocations)
const confettiPool = [];
const sparkPool = [];
const MAX_CONFETTI_POOL = 300;
const MAX_SPARK_POOL = 600;

function obtainConfetti() {
  return confettiPool.length > 0 ? confettiPool.pop() : {};
}

function releaseConfetti(p) {
  if (confettiPool.length < MAX_CONFETTI_POOL) {
    confettiPool.push(p);
  }
}

function obtainSpark() {
  return sparkPool.length > 0 ? sparkPool.pop() : {};
}

function releaseSpark(s) {
  if (sparkPool.length < MAX_SPARK_POOL) {
    sparkPool.push(s);
  }
}

const FIREWORK_PALETTES = [
  // Imperial Gold & Amber
  ['#fbbf24', '#f59e0b', '#fde047', '#ffffff', '#ea580c', '#fffbeb'],
  // Electric Cyan & Royal Blue
  ['#38bdf8', '#0284c7', '#06b6d4', '#ffffff', '#60a5fa', '#93c5fd'],
  // Neon Magenta & Violet
  ['#ec4899', '#f43f5e', '#d946ef', '#a855f7', '#ffffff', '#fbcfe8'],
  // Emerald & Radiant Lime
  ['#10b981', '#34d399', '#22c55e', '#a3e635', '#ffffff', '#6ee7b7'],
  // Sunset Coral & Ruby
  ['#f43f5e', '#fb7185', '#f97316', '#facc15', '#ffffff', '#e11d48']
];

export function initConfetti() {
  if (confettiCanvas) return;
  confettiCanvas = document.createElement('canvas');
  confettiCanvas.id = 'confetti-canvas';
  confettiCanvas.style.position = 'fixed';
  confettiCanvas.style.inset = '0';
  confettiCanvas.style.pointerEvents = 'none';
  confettiCanvas.style.zIndex = '999';
  document.body.appendChild(confettiCanvas);

  confettiCtx = confettiCanvas.getContext('2d');
  resizeConfetti();
  window.addEventListener('resize', resizeConfetti);
}

function resizeConfetti() {
  if (!confettiCanvas) return;
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

export function fireConfettiBurst(x = window.innerWidth / 2, y = window.innerHeight / 2, count = 75) {
  initConfetti();
  const colors = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#38bdf8', '#f43f5e', '#fde047', '#ffffff'];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 13;
    const p = obtainConfetti();
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - 4;
    p.size = 6 + Math.random() * 8;
    p.color = colors[Math.floor(Math.random() * colors.length)];
    p.rotation = Math.random() * Math.PI * 2;
    p.vRot = (Math.random() - 0.5) * 0.22;
    p.gravity = 0.28;
    p.life = 1;
    p.decay = 0.01 + Math.random() * 0.014;
    p.shape = Math.random() > 0.35 ? 'rect' : 'circle';
    confettiParticles.push(p);
  }

  if (!confettiAnimId) {
    animateConfetti();
  }
}

export function fireDualSideConfettiCannons() {
  initConfetti();
  const w = confettiCanvas.width;
  const h = confettiCanvas.height;
  const colors = ['#fbbf24', '#f59e0b', '#f43f5e', '#10b981', '#38bdf8', '#a855f7', '#ffffff', '#fde047'];

  // Left cannon shooting up-right
  for (let i = 0; i < 55; i++) {
    const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.6;
    const speed = 15 + Math.random() * 16;
    const p = obtainConfetti();
    p.x = 0;
    p.y = h * 0.85;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.size = 7 + Math.random() * 9;
    p.color = colors[Math.floor(Math.random() * colors.length)];
    p.rotation = Math.random() * Math.PI * 2;
    p.vRot = (Math.random() - 0.5) * 0.26;
    p.gravity = 0.32;
    p.life = 1;
    p.decay = 0.007 + Math.random() * 0.011;
    p.shape = Math.random() > 0.4 ? 'rect' : 'circle';
    confettiParticles.push(p);
  }

  // Right cannon shooting up-left
  for (let i = 0; i < 55; i++) {
    const angle = -3 * Math.PI / 4 + (Math.random() - 0.5) * 0.6;
    const speed = 15 + Math.random() * 16;
    const p = obtainConfetti();
    p.x = w;
    p.y = h * 0.85;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.size = 7 + Math.random() * 9;
    p.color = colors[Math.floor(Math.random() * colors.length)];
    p.rotation = Math.random() * Math.PI * 2;
    p.vRot = (Math.random() - 0.5) * 0.26;
    p.gravity = 0.32;
    p.life = 1;
    p.decay = 0.007 + Math.random() * 0.011;
    p.shape = Math.random() > 0.4 ? 'rect' : 'circle';
    confettiParticles.push(p);
  }

  if (!confettiAnimId) animateConfetti();
}

export function launchFireworkRocket(startX, targetY, colors) {
  initConfetti();
  const w = confettiCanvas.width;
  const h = confettiCanvas.height;
  const x = startX !== undefined ? startX : w * (0.15 + Math.random() * 0.7);
  const target = targetY !== undefined ? targetY : h * (0.12 + Math.random() * 0.35);
  const pal = colors || FIREWORK_PALETTES[Math.floor(Math.random() * FIREWORK_PALETTES.length)];
  const vy = -(13 + Math.random() * 5);
  const vx = (Math.random() - 0.5) * 3.2;

  fireworkRockets.push({
    x,
    y: h + 10,
    vx,
    vy,
    targetY: target,
    colors: pal,
    mainColor: pal[0],
    trail: []
  });

  const now = performance.now();
  if (now - lastFireworkSoundTime > 300) {
    playSFX('fireworkLaunch');
  }

  if (!confettiAnimId) {
    animateConfetti();
  }
}

function explodeFireworkRocket(rocket) {
  const sparkCount = 65 + Math.floor(Math.random() * 30);
  const pal = rocket.colors;
  const now = performance.now();
  if (now - lastFireworkSoundTime > 110) {
    lastFireworkSoundTime = now;
    playSFX('fireworkBoom');
  }

  for (let i = 0; i < sparkCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 10.5;
    const col = pal[Math.floor(Math.random() * pal.length)];
    const s = obtainSpark();
    s.x = rocket.x;
    s.y = rocket.y;
    s.vx = Math.cos(angle) * speed;
    s.vy = Math.sin(angle) * speed;
    s.color = col;
    s.alpha = 1;
    s.decay = 0.012 + Math.random() * 0.018;
    s.gravity = 0.12 + Math.random() * 0.06;
    s.drag = 0.965;
    s.size = 2.8 + Math.random() * 3.2;
    s.flicker = Math.random() > 0.35;
    fireworkSparks.push(s);
  }

  // Glittering white crackle center
  for (let j = 0; j < 16; j++) {
    const angle = (j / 16) * Math.PI * 2;
    const speed = 1.2 + Math.random() * 3.5;
    const s = obtainSpark();
    s.x = rocket.x;
    s.y = rocket.y;
    s.vx = Math.cos(angle) * speed;
    s.vy = Math.sin(angle) * speed;
    s.color = '#ffffff';
    s.alpha = 1;
    s.decay = 0.022 + Math.random() * 0.02;
    s.gravity = 0.08;
    s.drag = 0.94;
    s.size = 2.2;
    s.flicker = true;
    fireworkSparks.push(s);
  }
}

export function startVictoryCelebration(winner) {
  initConfetti();
  celebrationActive = true;
  if (victoryCelebrationTimer) clearInterval(victoryCelebrationTimer);

  // 1. Play royal victory fanfare with synthesized crowd cheering
  playSFX('win');

  // 2. Initial grand celebration salvo
  fireDualSideConfettiCannons();
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.35, 120);

  const w = window.innerWidth;
  const h = window.innerHeight;
  launchFireworkRocket(w * 0.25, h * 0.24);
  setTimeout(() => launchFireworkRocket(w * 0.50, h * 0.16), 180);
  setTimeout(() => launchFireworkRocket(w * 0.75, h * 0.22), 360);

  // 3. Continuous festival loop while win screen is displayed
  let tick = 0;
  victoryCelebrationTimer = setInterval(() => {
    if (!celebrationActive) return;
    tick++;

    // Random firework launches across different screen regions
    const launchPositions = [0.18, 0.35, 0.5, 0.65, 0.82];
    const randX = w * launchPositions[Math.floor(Math.random() * launchPositions.length)] + (Math.random() - 0.5) * 80;
    const randY = h * (0.12 + Math.random() * 0.26);
    launchFireworkRocket(randX, randY);

    // Alternating side cannon confetti bursts & top confetti rain
    if (tick % 2 === 0) {
      if (Math.random() > 0.5) {
        fireDualSideConfettiCannons();
      } else {
        fireConfettiBurst(w * (0.2 + Math.random() * 0.6), h * 0.25, 60);
      }
    }
  }, 440);
}

export function stopVictoryCelebration() {
  celebrationActive = false;
  if (victoryCelebrationTimer) {
    clearInterval(victoryCelebrationTimer);
    victoryCelebrationTimer = null;
  }
}

function animateConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  // 1. Update and render Fireworks Rockets
  for (let i = fireworkRockets.length - 1; i >= 0; i--) {
    const r = fireworkRockets[i];
    r.x += r.vx;
    r.y += r.vy;
    r.vy += 0.08; // subtle gravity

    // Trail sparks
    r.trail.push({ x: r.x + (Math.random() - 0.5) * 3, y: r.y + (Math.random() - 0.5) * 3, alpha: 0.85 });
    if (r.trail.length > 10) r.trail.shift();

    // Draw trail
    for (let t = 0; t < r.trail.length; t++) {
      const tr = r.trail[t];
      tr.alpha *= 0.82;
      confettiCtx.save();
      confettiCtx.globalAlpha = tr.alpha;
      confettiCtx.fillStyle = r.mainColor;
      confettiCtx.beginPath();
      confettiCtx.arc(tr.x, tr.y, 2, 0, Math.PI * 2);
      confettiCtx.fill();
      confettiCtx.restore();
    }

    // Draw glowing rocket head
    confettiCtx.save();
    confettiCtx.fillStyle = '#ffffff';
    confettiCtx.shadowColor = r.mainColor;
    confettiCtx.shadowBlur = 10;
    confettiCtx.beginPath();
    confettiCtx.arc(r.x, r.y, 3.5, 0, Math.PI * 2);
    confettiCtx.fill();
    confettiCtx.restore();

    // Detonate condition
    if (r.y <= r.targetY || r.vy >= -0.5) {
      explodeFireworkRocket(r);
      fireworkRockets.splice(i, 1);
    }
  }

  // 2. Update and render Fireworks Sparks
  for (let i = fireworkSparks.length - 1; i >= 0; i--) {
    const s = fireworkSparks[i];
    s.x += s.vx;
    s.y += s.vy;
    s.vx *= s.drag;
    s.vy = s.vy * s.drag + s.gravity;
    s.alpha -= s.decay;

    if (s.alpha <= 0) {
      fireworkSparks[i] = fireworkSparks[fireworkSparks.length - 1];
      fireworkSparks.pop();
      releaseSpark(s);
      continue;
    }

    confettiCtx.save();
    const renderAlpha = s.flicker && Math.random() > 0.4 ? s.alpha * 0.4 : s.alpha;
    confettiCtx.globalAlpha = Math.max(0, renderAlpha);
    confettiCtx.fillStyle = s.color;
    confettiCtx.shadowColor = s.color;
    confettiCtx.shadowBlur = 6;
    confettiCtx.beginPath();
    confettiCtx.arc(s.x, s.y, s.size / 2, 0, Math.PI * 2);
    confettiCtx.fill();
    confettiCtx.restore();
  }

  // 3. Update and render Confetti Particles
  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const p = confettiParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= 0.98;
    p.rotation += p.vRot;
    p.life -= p.decay;

    if (p.life <= 0 || p.y > confettiCanvas.height + 25) {
      confettiParticles[i] = confettiParticles[confettiParticles.length - 1];
      confettiParticles.pop();
      releaseConfetti(p);
      continue;
    }

    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.rotation);
    confettiCtx.fillStyle = p.color;
    confettiCtx.globalAlpha = Math.max(0, p.life);

    if (p.shape === 'rect') {
      confettiCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      confettiCtx.beginPath();
      confettiCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      confettiCtx.fill();
    }
    confettiCtx.restore();
  }

  const hasActiveEffects = confettiParticles.length > 0 || fireworkRockets.length > 0 || fireworkSparks.length > 0;
  if (hasActiveEffects) {
    confettiAnimId = requestAnimationFrame(animateConfetti);
  } else {
    confettiAnimId = null;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. FLOATING ANIMATED EMOJI REACTIONS
───────────────────────────────────────────────────────────────────────────── */
export function spawnAnimatedReaction(type = 'money', startX, startY) {
  const x = startX !== undefined ? startX : window.innerWidth / 2;
  const y = startY !== undefined ? startY : window.innerHeight / 2;

  const count = type === 'money' ? 8 : type === 'fire' ? 12 : (type === 'sweat' || type === 'hurt') ? 4 : 1;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.left = `${x + (Math.random() - 0.5) * 60}px`;
    el.style.top = `${y + (Math.random() - 0.5) * 60}px`;
    el.style.fontSize = type === 'tomato' ? '38px' : '32px';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '130';
    el.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))';
    el.style.willChange = 'transform, opacity';
    el.style.transition = 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.9s ease-out';

    const emojiMap = {
      tomato: '🍅',
      money: '💸',
      cash: '💰',
      fire: '🔥',
      sunglasses: '😎',
      cry: '😭',
      rocket: '🚀',
      star: '⭐',
      sweat: '💦',
      hurt: '💥',
      dizzy: '😵'
    };
    el.textContent = emojiMap[type] || '✨';
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      const offsetX = (Math.random() - 0.5) * 160;
      const offsetY = -(60 + Math.random() * 120);
      el.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${1.1 + Math.random() * 0.4}) rotate(${(Math.random() - 0.5) * 60}deg)`;
      el.style.opacity = '0';
    });

    setTimeout(() => el.remove(), 950);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. HARMONIOUS THEME COMBINATIONS: (BOARD STYLE x ATMOSPHERE)
───────────────────────────────────────────────────────────────────────────── */
export const THEME_COMBINATIONS = {
  // ── 🪵 WOOD BOARD STYLE ───────────────────────────────────────────────────
  'wood:day': {
    bg: 'radial-gradient(circle at 50% 28%, #f0f9ff 0%, #e0f2fe 32%, #bae6fd 65%, #7dd3fc 100%)',
    ambientColor: 0xffffff,
    ambientIntensity: 0.40,
    sunColor: 0xffffff,
    sunIntensity: 0.98,
    sunPos: { x: 22, y: 32, z: 18 }
  },
  'wood:sunset': {
    bg: 'radial-gradient(ellipse 125% 95% at 50% 20%, #fffbeb 0%, #fde68a 12%, #fbbf24 24%, #f97316 44%, #ea580c 60%, #c2410c 76%, #7c2d12 90%, #291008 100%)',
    ambientColor: 0xffedd5,
    ambientIntensity: 0.52,
    sunColor: 0xffaa5e,
    sunIntensity: 0.88,
    sunPos: { x: 28, y: 14, z: 18 }
  },
  'wood:night': {
    bg: 'radial-gradient(circle at 50% 40%, #0f172a 0%, #080d1a 55%, #020617 100%)',
    ambientColor: 0x475569,
    ambientIntensity: 0.24,
    sunColor: 0xa5b4fc,
    sunIntensity: 0.28,
    sunPos: { x: 14, y: 32, z: 18 }
  },

  // ── ⚡ CYBERPUNK BOARD STYLE (Day Only) ───────────────────────────────────
  'cyberpunk:day': {
    // High-tech neo-city daylight: sleek overcast slate with subtle cool ambient
    bg: 'radial-gradient(ellipse 130% 90% at 50% 25%, #182232 0%, #0d1522 42%, #080d16 75%, #030710 100%)',
    ambientColor: 0x64748b,
    ambientIntensity: 0.32,
    sunColor: 0xe2e8f0,
    sunIntensity: 0.95,
    sunPos: { x: 22, y: 32, z: 18 }
  },

  // ── ✨ ELEGANT BOARD STYLE ────────────────────────────────────────────────
  'elegant:day': {
    // Pristine French palace morning: luminous warm pearl champagne
    bg: 'radial-gradient(circle at 50% 30%, #ffffff 0%, #fbfaf8 35%, #f4ede4 70%, #e8decb 100%)',
    ambientColor: 0xfffaed,
    ambientIntensity: 0.45,
    sunColor: 0xffffff,
    sunIntensity: 0.96,
    sunPos: { x: 22, y: 32, z: 18 }
  },
  'elegant:sunset': {
    // Golden hour in Paris: warm 24K gold, honey and champagne dusk
    bg: 'radial-gradient(ellipse 120% 90% at 50% 22%, #fffbeb 0%, #fef3c7 15%, #fde68a 32%, #f59e0b 55%, #b45309 76%, #451a03 100%)',
    ambientColor: 0xfef3c7,
    ambientIntensity: 0.55,
    sunColor: 0xfde047,
    sunIntensity: 0.92,
    sunPos: { x: 28, y: 14, z: 18 }
  },
  'elegant:night': {
    // Royal gala starlight: velvet midnight sapphire and sparkling 24K gold
    bg: 'radial-gradient(circle at 50% 35%, #1e1b4b 0%, #0f172a 50%, #030712 100%)',
    ambientColor: 0x1e1b4b,
    ambientIntensity: 0.28,
    sunColor: 0xe0e7ff,
    sunIntensity: 0.32,
    sunPos: { x: 14, y: 32, z: 18 }
  }
};

export const LIGHTING_MODES = {
  day: THEME_COMBINATIONS['wood:day'],
  sunset: THEME_COMBINATIONS['wood:sunset'],
  night: THEME_COMBINATIONS['wood:night']
};

export const LOBBY_THEMES = {
  // 🪵 WOOD / DEFAULT
  'wood:day': {
    bg: 'linear-gradient(180deg, #38b6ff 0%, #2fa5f5 35%, #60a5fa 70%, #93c5fd 100%)',
    skyIcons: ['☁️', '☁️', '☁️'],
    skyStyle: 'opacity: 0.45; filter: drop-shadow(0 4px 12px rgba(2,132,199,0.3));'
  },
  'wood:sunset': {
    bg: 'linear-gradient(180deg, #fb923c 0%, #ea580c 25%, #be185d 55%, #581c87 80%, #1e1b4b 100%)',
    skyIcons: ['⛅', '🌤️', '⛅'],
    skyStyle: 'opacity: 0.55; filter: drop-shadow(0 4px 14px rgba(234,88,12,0.45)) hue-rotate(325deg);'
  },
  'wood:night': {
    bg: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 32%, #080d1a 65%, #020617 100%)',
    skyIcons: ['✨', '🌙', '⭐'],
    skyStyle: 'opacity: 0.75; filter: drop-shadow(0 0 16px rgba(255,255,255,0.4));'
  },

  // ⚡ CYBERPUNK (Day Only)
  'cyberpunk:day': {
    bg: 'linear-gradient(180deg, #0f172a 0%, #1e293b 35%, #0f172a 70%, #020617 100%)',
    skyIcons: ['☁️', '⚡', '☁️'],
    skyStyle: 'opacity: 0.35; filter: drop-shadow(0 0 10px rgba(56,189,248,0.3));'
  },

  // ✨ ELEGANT
  'elegant:day': {
    bg: 'linear-gradient(180deg, #38bdf8 0%, #818cf8 35%, #c084fc 70%, #fbcfe8 100%)',
    skyIcons: ['☁️', '✨', '☁️'],
    skyStyle: 'opacity: 0.45; filter: drop-shadow(0 4px 12px rgba(129,140,248,0.4));'
  },
  'elegant:sunset': {
    bg: 'linear-gradient(180deg, #fbbf24 0%, #f97316 28%, #9a3412 60%, #451a03 85%, #1c0a02 100%)',
    skyIcons: ['⛅', '👑', '⛅'],
    skyStyle: 'opacity: 0.55; filter: drop-shadow(0 4px 16px rgba(251,191,36,0.5));'
  },
  'elegant:night': {
    bg: 'linear-gradient(180deg, #1e1b4b 0%, #111827 40%, #030712 75%, #000000 100%)',
    skyIcons: ['✨', '💎', '⭐'],
    skyStyle: 'opacity: 0.75; filter: drop-shadow(0 0 16px rgba(245,158,11,0.5));'
  }
};

let currentLightingKey = 'day';

export function applyLightingMode(key, threeSceneObjects) {
  if (key === 'morning') key = 'day';
  if (!['day', 'sunset', 'night'].includes(key)) key = 'day';

  const boardStyle = matchSettings?.boardStyle || 'wood';
  if (boardStyle === 'cyberpunk') {
    key = 'day'; // Cyberpunk board style is dedicated to Day mode only
  }

  currentLightingKey = key;
  if (matchSettings) matchSettings.lightingTheme = key;

  const comboKey = `${boardStyle}:${key}`;
  const cfg = THEME_COMBINATIONS[comboKey] || THEME_COMBINATIONS[`wood:${key}`] || THEME_COMBINATIONS['wood:day'];

  // Update HTML body background with composite gradient
  if (typeof document !== 'undefined' && document.body) {
    document.body.style.background = cfg.bg;
  }

  // Update Main Menu (Lobby) full-screen background & sky elements
  if (typeof document !== 'undefined') {
    const lobbyEl = document.getElementById('landing-setup-screen');
    const lobbyTheme = LOBBY_THEMES[comboKey] || LOBBY_THEMES[`wood:${key}`] || LOBBY_THEMES['wood:day'];
    if (lobbyEl && lobbyTheme) {
      lobbyEl.style.background = lobbyTheme.bg;
    }
    const skyEl = document.getElementById('setup-atmosphere-sky-elements');
    if (skyEl && lobbyTheme && lobbyTheme.skyIcons) {
      skyEl.innerHTML = `
        <div class="text-9xl cloud-float-1 transform -translate-y-6 select-none pointer-events-none">${lobbyTheme.skyIcons[0]}</div>
        <div class="text-8xl cloud-float-2 transform -translate-y-3 select-none pointer-events-none">${lobbyTheme.skyIcons[1]}</div>
        <div class="text-9xl cloud-float-1 transform -translate-y-8 select-none pointer-events-none">${lobbyTheme.skyIcons[2]}</div>
      `;
      if (lobbyTheme.skyStyle) {
        skyEl.style.cssText = lobbyTheme.skyStyle;
      }
    }
    const diamonds = document.querySelectorAll('.diamond-watermark');
    diamonds.forEach(d => {
      if (key === 'night') {
        d.style.borderColor = 'rgba(165, 180, 252, 0.22)';
      } else if (key === 'sunset') {
        d.style.borderColor = 'rgba(254, 215, 170, 0.28)';
      } else {
        d.style.borderColor = 'rgba(255, 255, 255, 0.22)';
      }
    });
  }

  if (threeSceneObjects) {
    const { ambientLight, dirLight, setBulbLightingTheme } = threeSceneObjects;
    if (ambientLight) {
      ambientLight.color.setHex(cfg.ambientColor);
      ambientLight.intensity = cfg.ambientIntensity;
    }
    if (dirLight) {
      dirLight.color.setHex(cfg.sunColor);
      dirLight.intensity = cfg.sunIntensity;
      dirLight.position.set(cfg.sunPos.x, cfg.sunPos.y, cfg.sunPos.z);
    }
    if (typeof setBulbLightingTheme === 'function') {
      setBulbLightingTheme(key, boardStyle);
    }
  }

  // Update theme button icon
  const btn = document.getElementById('btn-lighting-mode');
  if (btn) {
    if (boardStyle === 'cyberpunk') {
      btn.innerHTML = '<i class="fa-solid fa-sun text-cyan-400"></i><span class="hidden xl:inline text-xs">Day</span>';
      btn.title = 'Day Mode (Cyber Board)';
      btn.classList.add('opacity-70', 'cursor-default');
    } else {
      btn.classList.remove('opacity-70', 'cursor-default');
      btn.title = 'Toggle Lighting Theme (Morning, Sunset, Night)';
      const icons = {
        day: '<i class="fa-solid fa-sun text-amber-500"></i><span>Morning</span>',
        sunset: '<i class="fa-solid fa-cloud-sun text-orange-500"></i><span>Sunset</span>',
        night: '<i class="fa-solid fa-moon text-indigo-400"></i><span>Night</span>'
      };
      btn.innerHTML = icons[key] || icons.day;
    }
  }

  // Update lobby atmosphere text
  const atmoTextEl = document.getElementById('setup-atmosphere-text') || document.getElementById('setup-match-length-text');
  if (atmoTextEl) {
    atmoTextEl.textContent = boardStyle === 'cyberpunk' ? 'Day' : (key === 'night' ? 'Night' : (key === 'sunset' ? 'Sunset' : 'Morning'));
  }
}

export function cycleLightingMode(threeSceneObjects) {
  const boardStyle = matchSettings?.boardStyle || 'wood';
  if (boardStyle === 'cyberpunk') return; // Cyberpunk style only supports Day mode
  const modes = ['day', 'sunset', 'night'];
  const cur = matchSettings?.lightingTheme || currentLightingKey || 'day';
  const nextIdx = (modes.indexOf(cur) + 1) % modes.length;
  applyLightingMode(modes[nextIdx], threeSceneObjects);
}
