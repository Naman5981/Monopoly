/**
 * ui/portraitRenderer.js
 * Interactive 2D Animated Character Portrait Engine (Rive / Spine State-Machine Architecture).
 *
 * Provides real-time reactive facial animations on HUD player cards:
 * - Idle: Natural eye blinks & gentle breathing cycle
 * - Smug: Smug grin with golden dollar-sign eyes ($$) when collecting salary/rent
 * - Crying: Flowing tear streams & trembling mouth when paying rent or tax
 * - Shocked: Wide startled pupils & bouncing sweat drop when sent to Island
 * - Cheering: Joyful open-mouth smile & star eyes upon completing a monopoly
 * - Bankrupt: Dizzy spiral eyes and desaturated slump
 */

import { gameState, matchSettings } from '../game/state.js';
import { PLAYER_THEMES } from '../game/data.js';

// Mood states: 'idle' | 'smug' | 'crying' | 'shocked' | 'cheering' | 'bankrupt'
const playerMoods = new Map();
let animationFrameId = null;
let lastRenderTime = 0;

export function getPlayerMood(playerIdx) {
  const entry = playerMoods.get(playerIdx);
  if (!entry) return 'idle';
  if (Date.now() > entry.until && entry.current !== 'bankrupt') {
    entry.current = 'idle';
  }
  return entry.current;
}

/**
 * Transitions a player portrait to an animated emotional reaction.
 * @param {number} playerIdx
 * @param {'idle' | 'smug' | 'crying' | 'shocked' | 'cheering' | 'bankrupt'} mood
 * @param {number} durationMs Duration of reaction before returning to idle
 */
export function setPlayerPortraitMood(playerIdx, mood, durationMs = 3500) {
  const p = gameState.players && gameState.players[playerIdx];
  if (p && p.bankrupt) {
    mood = 'bankrupt';
    durationMs = 999999999;
  }
  playerMoods.set(playerIdx, {
    current: mood,
    until: Date.now() + durationMs,
    startTime: Date.now()
  });
}

/**
 * Initializes and starts the portrait RAF render loop.
 */
export function initPortraitRenderLoop() {
  if (animationFrameId) return;

  function loop(timestamp) {
    animationFrameId = requestAnimationFrame(loop);
    if (timestamp - lastRenderTime < 33) return; // Cap at ~30 FPS for optimal battery and performance
    lastRenderTime = timestamp;

    if (!gameState || !gameState.players || gameState.players.length === 0) return;

    // Game Art & Performance: If 3D interactive portraits are actively rendering in Three.js,
    // do not fight or overwrite the HUD canvases, only render the 2D buyer modal canvas
    const has3DPortraits = (typeof window !== 'undefined' && window.__has3DPortraitsActive);
    if (!has3DPortraits) {
      for (let idx = 0; idx < gameState.players.length; idx++) {
        const canvas = document.getElementById(`hud-avatar-canvas-${idx}`);
        if (!canvas) continue;
        drawPortraitFrame(canvas, idx, timestamp);
      }
    }

    // Continuously animate buyer portrait in buy city modal if visible
    const buyerCanvas = document.getElementById('buy-modal-buyer-avatar-canvas');
    if (buyerCanvas && typeof gameState.currentPlayerIdx === 'number') {
      const buyModal = document.getElementById('modal-buy-city');
      if (buyModal && !buyModal.classList.contains('hidden')) {
        drawPortraitFrame(buyerCanvas, gameState.currentPlayerIdx, timestamp);
      }
    }
  }

  animationFrameId = requestAnimationFrame(loop);
}

export function stopPortraitRenderLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

/**
 * Draws a single frame of the animated character portrait onto the player's HUD canvas.
 */
export function drawPortraitFrame(canvas, playerIdx, time) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const p = gameState.players && gameState.players[playerIdx];
  if (!p) return;

  const theme = PLAYER_THEMES[playerIdx] || { colorHex: '#3b82f6', charColor: 0x3b82f6 };
  const custom = (matchSettings.customPlayers && matchSettings.customPlayers[playerIdx]) || {};
  const hatStyle = custom.hatStyle !== undefined ? custom.hatStyle : (theme.hatStyle || 0);
  const colorHex = custom.colorHex || theme.colorHex || '#3b82f6';

  let mood = getPlayerMood(playerIdx);
  if (p.bankrupt) mood = 'bankrupt';

  // In idle/bankrupt mode, keep coordinates strictly stable to eliminate subpixel shimmering/jitter.
  // Only apply gentle integer-rounded breath during active celebration or reactions.
  const breath = (mood === 'idle' || mood === 'bankrupt') ? 0 : Math.round(Math.sin(time * 0.006 + playerIdx) * 1.5);

  // Eye blinking logic (clean 180ms blink every ~3.6 seconds for idle)
  const blinkCycle = (time + playerIdx * 1200) % 3600;
  const isBlinking = (blinkCycle < 180) && (mood === 'idle');

  ctx.save();

  // Hardware circular clip ensures nothing ever bleeds outside the avatar ring
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.5, w * 0.49, 0, Math.PI * 2);
  ctx.clip();

  // 1. Background radial gradient disc
  const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.4, w * 0.1, w * 0.5, h * 0.5, w * 0.5);
  bgGrad.addColorStop(0, '#f8fafc');
  bgGrad.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.5, w * 0.49, 0, Math.PI * 2);
  ctx.fill();

  // 2. Character Body / Torso & Collar
  ctx.fillStyle = colorHex;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, Math.round(h * 0.95 + breath), Math.round(w * 0.38), Math.round(h * 0.28), 0, 0, Math.PI * 2);
  ctx.fill();

  // White shirt collar
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(Math.round(w * 0.40), Math.round(h * 0.78 + breath));
  ctx.lineTo(Math.round(w * 0.50), Math.round(h * 0.88 + breath));
  ctx.lineTo(Math.round(w * 0.60), Math.round(h * 0.78 + breath));
  ctx.closePath();
  ctx.fill();

  // 3. Head / Face (Warm stylized skin tone)
  const skinTone = '#ffdfc4';
  const headY = Math.round(h * 0.52 + breath);
  ctx.fillStyle = skinTone;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, headY, Math.round(w * 0.26), Math.round(h * 0.28), 0, 0, Math.PI * 2);
  ctx.fill();

  // Blush on cheeks for cute arcade style
  ctx.fillStyle = 'rgba(244, 114, 182, 0.28)';
  ctx.beginPath();
  ctx.arc(Math.round(w * 0.34), headY + 8, 7, 0, Math.PI * 2);
  ctx.arc(Math.round(w * 0.66), headY + 8, 7, 0, Math.PI * 2);
  ctx.fill();

  // 4. Facial Expressions based on current mood state
  drawFaceFeatures(ctx, w, headY, mood, isBlinking, time);

  // 5. Headgear / Archetype Hat
  drawArchetypeHeadgear(ctx, w, headY, hatStyle, colorHex, time);

  ctx.restore();
}

/**
 * Draws expressive eyes, eyebrows, mouth, and reaction particles.
 */
function drawFaceFeatures(ctx, w, headY, mood, isBlinking, time) {
  const eyeY = Math.round(headY - 2);
  const leftEyeX = Math.round(w * 0.40);
  const rightEyeX = Math.round(w * 0.60);

  switch (mood) {
    case 'smug': {
      // Golden Dollar-sign eyes & sly cocky grin
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', leftEyeX, eyeY);
      ctx.fillText('$', rightEyeX, eyeY);

      // Eyebrows tilted smugly
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(leftEyeX - 9, eyeY - 11);
      ctx.lineTo(leftEyeX + 9, eyeY - 8);
      ctx.moveTo(rightEyeX - 9, eyeY - 8);
      ctx.lineTo(rightEyeX + 9, eyeY - 13);
      ctx.stroke();

      // Smug upward smirk
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(w * 0.52, headY + 12, 10, 0.1 * Math.PI, 0.75 * Math.PI, false);
      ctx.stroke();

      // Gleam sparkle
      const sparkAlpha = (Math.sin(time * 0.01) + 1) * 0.5;
      drawSparkle(ctx, w * 0.64, headY + 10, sparkAlpha);
      break;
    }

    case 'crying': {
      // Trembling closed arched sad eyes (><)
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';

      // Left eye closed tight
      ctx.beginPath();
      ctx.moveTo(leftEyeX - 7, eyeY - 3);
      ctx.lineTo(leftEyeX, eyeY + 2);
      ctx.lineTo(leftEyeX + 7, eyeY - 3);
      ctx.stroke();

      // Right eye closed tight
      ctx.beginPath();
      ctx.moveTo(rightEyeX - 7, eyeY - 3);
      ctx.lineTo(rightEyeX, eyeY + 2);
      ctx.lineTo(rightEyeX + 7, eyeY - 3);
      ctx.stroke();

      // Flowing animated tears
      ctx.fillStyle = '#38bdf8';
      const tearPhase = (time * 0.008) % 1;
      const tearY = eyeY + 6 + tearPhase * 20;
      ctx.beginPath();
      ctx.ellipse(leftEyeX - 2, tearY, 3, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(rightEyeX + 2, tearY, 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sad wavy mouth
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(w * 0.5, headY + 18, 9, 1.15 * Math.PI, 1.85 * Math.PI, false);
      ctx.stroke();
      break;
    }

    case 'shocked': {
      // Wide startled round eyes with pinpoint pupils
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY, 8, 0, Math.PI * 2);
      ctx.arc(rightEyeX, eyeY, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY, 3, 0, Math.PI * 2);
      ctx.arc(rightEyeX, eyeY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Raised high eyebrows
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY - 9, 9, 1.1 * Math.PI, 1.9 * Math.PI);
      ctx.arc(rightEyeX, eyeY - 9, 9, 1.1 * Math.PI, 1.9 * Math.PI);
      ctx.stroke();

      // Open small "O" mouth
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, headY + 14, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Giant animated blue sweat drop
      ctx.fillStyle = '#38bdf8';
      const sweatY = headY - 14 + Math.sin(time * 0.01) * 2;
      ctx.beginPath();
      ctx.ellipse(w * 0.72, sweatY, 4, 6, 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'cheering': {
      // Happy curved closed smiling eyes (^^)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY + 1, 7, 1.1 * Math.PI, 1.9 * Math.PI);
      ctx.arc(rightEyeX, eyeY + 1, 7, 1.1 * Math.PI, 1.9 * Math.PI);
      ctx.stroke();

      // Big joyful open mouth (D shape)
      ctx.fillStyle = '#be123c';
      ctx.beginPath();
      ctx.arc(w * 0.5, headY + 11, 10, 0, Math.PI, false);
      ctx.closePath();
      ctx.fill();

      // Tongue
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(w * 0.5, headY + 18, 6, 1.1 * Math.PI, 1.9 * Math.PI, true);
      ctx.fill();
      break;
    }

    case 'bankrupt': {
      // Dizzy X eyes
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      // Left X
      ctx.beginPath();
      ctx.moveTo(leftEyeX - 5, eyeY - 5);
      ctx.lineTo(leftEyeX + 5, eyeY + 5);
      ctx.moveTo(leftEyeX + 5, eyeY - 5);
      ctx.lineTo(leftEyeX - 5, eyeY + 5);
      ctx.stroke();

      // Right X
      ctx.beginPath();
      ctx.moveTo(rightEyeX - 5, eyeY - 5);
      ctx.lineTo(rightEyeX + 5, eyeY + 5);
      ctx.moveTo(rightEyeX + 5, eyeY - 5);
      ctx.lineTo(rightEyeX - 5, eyeY + 5);
      ctx.stroke();

      // Slanted flat mouth
      ctx.beginPath();
      ctx.moveTo(w * 0.44, headY + 14);
      ctx.lineTo(w * 0.56, headY + 16);
      ctx.stroke();
      break;
    }

    case 'idle':
    default: {
      if (isBlinking) {
        // Closed horizontal eyelid line
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(leftEyeX - 6, eyeY);
        ctx.lineTo(leftEyeX + 6, eyeY);
        ctx.moveTo(rightEyeX - 6, eyeY);
        ctx.lineTo(rightEyeX + 6, eyeY);
        ctx.stroke();
      } else {
        // Normal lively arcade eyes with catchlights
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(leftEyeX, eyeY, 5, 7, 0, 0, Math.PI * 2);
        ctx.ellipse(rightEyeX, eyeY, 5, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // White twinkle catchlights
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(leftEyeX - 1.5, eyeY - 2.5, 2, 0, Math.PI * 2);
        ctx.arc(rightEyeX - 1.5, eyeY - 2.5, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Neutral pleasant smile
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(w * 0.5, headY + 11, 7, 0.15 * Math.PI, 0.85 * Math.PI, false);
      ctx.stroke();
      break;
    }
  }
}

/**
 * Draws stylized 2D headgear matching the 3D archetypes.
 */
function drawArchetypeHeadgear(ctx, w, headY, hatStyle, colorHex, time) {
  switch (hatStyle) {
    case 0: {
      // 0: Aviator Cap & Goggles
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(w * 0.5, headY - 12, w * 0.28, Math.PI, 0, false);
      ctx.fill();

      // Goggles strap & lenses
      ctx.fillStyle = '#0ea5e9';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(w * 0.40, headY - 10, 8, 0, Math.PI * 2);
      ctx.arc(w * 0.60, headY - 10, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 1: {
      // 1: Banker Top Hat & Golden Monocle
      ctx.fillStyle = '#0f172a';
      // Brim
      ctx.fillRect(w * 0.22, headY - 20, w * 0.56, 5);
      // Crown
      ctx.fillRect(w * 0.32, headY - 44, w * 0.36, 25);
      // Gold band
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(w * 0.32, headY - 24, w * 0.36, 5);

      // Monocle on right eye
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w * 0.60, headY - 2, 9, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 2: {
      // 2: Explorer Safari Pith Helmet
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(w * 0.5, headY - 14, w * 0.30, Math.PI, 0, false);
      ctx.fill();
      ctx.fillStyle = '#92400e';
      ctx.fillRect(w * 0.20, headY - 15, w * 0.60, 4);
      break;
    }

    case 3: {
      // 3: Cyber Nova Visor
      ctx.save();
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 6;
      ctx.fillRect(Math.round(w * 0.28), Math.round(headY - 7), Math.round(w * 0.44), 9);
      ctx.restore();
      break;
    }

    case 4: {
      // 4: Imperator 24K Crown
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(w * 0.26, headY - 16);
      ctx.lineTo(w * 0.32, headY - 32);
      ctx.lineTo(w * 0.41, headY - 22);
      ctx.lineTo(w * 0.50, headY - 35);
      ctx.lineTo(w * 0.59, headY - 22);
      ctx.lineTo(w * 0.68, headY - 32);
      ctx.lineTo(w * 0.74, headY - 16);
      ctx.closePath();
      ctx.fill();

      // Crown jewels
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(w * 0.50, headY - 22, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 5: {
      // 5: High Roller Fedora
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, headY - 16, w * 0.35, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(w * 0.33, headY - 33, w * 0.34, 18);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(w * 0.33, headY - 20, w * 0.34, 4);
      break;
    }

    case 6: {
      // 6: Admiral Navy Bicorn
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(w * 0.20, headY - 15);
      ctx.quadraticCurveTo(w * 0.5, headY - 38, w * 0.80, headY - 15);
      ctx.lineTo(w * 0.5, headY - 19);
      ctx.closePath();
      ctx.fill();
      // Gold Cockade
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(w * 0.5, headY - 22, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

function drawSparkle(ctx, x, y, alpha) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x + 2, y - 2);
  ctx.lineTo(x + 6, y);
  ctx.lineTo(x + 2, y + 2);
  ctx.lineTo(x, y + 6);
  ctx.lineTo(x - 2, y + 2);
  ctx.lineTo(x - 6, y);
  ctx.lineTo(x - 2, y - 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

if (typeof window !== 'undefined') {
  window.setPlayerPortraitMood = setPlayerPortraitMood;
}
