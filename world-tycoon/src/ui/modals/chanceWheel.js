/**
 * ui/modals/chanceWheel.js
 * Chance wheel canvas rendering, rotation physics, audio ticks, and award popups.
 */

import { CHANCE_WHEEL_PRIZES } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX } from '../../game/audio.js';
import { setStatusPill } from '../hud.js';
import { engineCallbacks, isLobbyScreenActive } from './common.js';

/* ─────────────────────────────────────────────────────────────────────────────
   CHANCE WHEEL MODAL
───────────────────────────────────────────────────────────────────────────── */
let wheelAngle = 0;

export function drawChanceWheelCanvas() {
  const c = document.getElementById('chance-wheel-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  const cx = 320, cy = 320, outerR = 312;
  const rimWidth = 24;
  const innerR = outerR - rimWidth;
  const N = CHANCE_WHEEL_PRIZES.length;
  const slice = (Math.PI * 2) / N;

  ctx.clearRect(0, 0, 640, 640);

  // 1. Casino Gold Outer Rim
  const rimGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
  rimGrad.addColorStop(0, '#d97706');
  rimGrad.addColorStop(0.25, '#fef08a');
  rimGrad.addColorStop(0.6, '#f59e0b');
  rimGrad.addColorStop(1, '#78350f');
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fillStyle = rimGrad;
  ctx.fill();

  // Draw 24 golden carnival bulbs around the rim
  const bulbCount = 24;
  const bulbR = innerR + rimWidth / 2;
  for (let b = 0; b < bulbCount; b++) {
    const angle = (b * Math.PI * 2) / bulbCount;
    const bx = cx + Math.cos(angle) * bulbR;
    const by = cy + Math.sin(angle) * bulbR;
    ctx.beginPath();
    ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = b % 2 === 0 ? '#ffffff' : '#fef08a';
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  const hubR = 50;

  // 2. Wheel Slices (Centered with Slice 0 at 12 o'clock)
  CHANCE_WHEEL_PRIZES.forEach((p, i) => {
    // Slices arranged clockwise starting with Slice 0 centered at 12 o'clock (-PI/2)
    const midAngle = -Math.PI / 2 + (i * slice);
    const startAngle = midAngle - slice / 2;
    const endAngle = midAngle + slice / 2;

    // Draw wedge
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, innerR, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.fill();

    // Subtle inner depth gradient for 3D wedge feel
    const wedgeGrad = ctx.createRadialGradient(cx, cy, hubR, cx, cy, innerR);
    wedgeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
    wedgeGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0)');
    wedgeGrad.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, innerR, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = wedgeGrad;
    ctx.fill();

    // Spoke divider with metallic chrome highlight
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // 3. Tactile 3D White Badge Card (Tangential Orientation)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(midAngle);
    ctx.translate(165, 0);
    ctx.rotate(Math.PI / 2);

    // Determine slice icon & readable label
    let icon = '🎁';
    let mainLabel = p.label;
    let subLabel = '';
    let themeColor = '#0f172a';

    if (p.type === 'cash') {
      if (p.amount >= 300000) {
        icon = '💰';
        mainLabel = '+400K';
        subLabel = 'GRANT';
        themeColor = '#047857'; // emerald
      } else {
        icon = '💎';
        mainLabel = '+250K';
        subLabel = 'BONUS';
        themeColor = '#b45309'; // amber
      }
    } else if (p.type === 'tax') {
      icon = '⚠️';
      mainLabel = '-200K';
      subLabel = 'FINE';
      themeColor = '#be123c'; // rose red
    } else if (p.type === 'island') {
      icon = '🏝️';
      mainLabel = 'ISLAND';
      subLabel = 'JAIL';
      themeColor = '#c2410c'; // orange
    } else if (p.type === 'move') {
      if (p.target === 0) {
        icon = '🚀';
        mainLabel = 'START';
        subLabel = '+300K';
        themeColor = '#0369a1'; // sky blue
      } else {
        icon = '✈️';
        mainLabel = 'TOUR';
        subLabel = 'AIRPORT';
        themeColor = '#6b21a8'; // purple
      }
    }

    // Draw White Tactile Card Plate
    const cw = 112;
    const ch = 64;
    const cr = 14;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-cw / 2, -ch / 2, cw, ch, cr);
    } else {
      ctx.rect(-cw / 2, -ch / 2, cw, ch);
    }
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.28)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fill();

    // Card border
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top Row: Big Centered Emoji Icon
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '22px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.fillText(icon, 0, -14);

    // Middle Row: Big Bold Colored Main Amount/Action
    ctx.font = '900 16px Inter, sans-serif';
    ctx.fillStyle = themeColor;
    ctx.fillText(mainLabel, 0, 7);

    // Bottom Row: Subtitle pill/text
    ctx.font = '900 10px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(subLabel, 0, 22);

    ctx.restore();
  });

  // 4. Center Golden Casino Jewel / Hub
  const hubGrad = ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, hubR);
  hubGrad.addColorStop(0, '#fef08a');
  hubGrad.addColorStop(0.4, '#f59e0b');
  hubGrad.addColorStop(0.85, '#d97706');
  hubGrad.addColorStop(1, '#92400e');
  ctx.beginPath();
  ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
  ctx.fillStyle = hubGrad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Inner center ruby badge
  ctx.beginPath();
  ctx.arc(cx, cy, hubR - 14, 0, Math.PI * 2);
  ctx.fillStyle = '#b45309';
  ctx.fill();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 20px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⭐', cx, cy);
}

export function openChanceWheelModal(isDoubles) {
  if (isLobbyScreenActive()) return;
  gameState.phase = 'MODAL';
  gameState.pendingDoubles = isDoubles;
  if (engineCallbacks.updateUI) engineCallbacks.updateUI();

  // Reset wheel canvas rotation and button
  wheelAngle = 0;
  const canvas = document.getElementById('chance-wheel-canvas');
  if (canvas) {
    canvas.style.transition = 'none';
    canvas.style.transform = 'rotate(0deg)';
  }

  // Ensure result popup is closed
  const resModal = document.getElementById('modal-chance-result');
  if (resModal) {
    resModal.classList.add('hidden');
    resModal.classList.remove('flex');
  }

  drawChanceWheelCanvas();
  const resText = document.getElementById('chance-result-text');
  if (resText) resText.textContent = 'Click Spin to test your luck!';
  const btn = document.getElementById('btn-spin-wheel');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-arrows-spin mr-2"></i> SPIN WHEEL`;
  }
  setStatusPill(`🎡 Spin the wheel to test your luck on Chance!`, { isThinking: false, playerIdx: gameState.currentPlayerIdx });

  const m = document.getElementById('modal-chance-wheel');
  m.classList.remove('hidden');
  m.classList.add('flex');
}

export function showChanceAwardPopup(prize, onDone) {
  const m = document.getElementById('modal-chance-result');
  if (!m) {
    if (onDone) onDone();
    return;
  }

  let icon = '🎁';
  let title = prize.label.toUpperCase();
  let actionText = 'Applying rewards to your empire...';
  let tag = 'CHANCE REWARD';
  let tagClass = 'bg-amber-100 text-amber-900 border border-amber-300';
  let iconBg = 'bg-amber-50 text-amber-600';
  let actionClass = 'bg-slate-50 border border-slate-200 text-slate-800';

  if (prize.type === 'cash') {
    icon = prize.amount >= 300000 ? '💰' : '💎';
    title = `+${fmtMoney(prize.amount)} CASH!`;
    actionText = 'Cash deposited directly into your treasury!';
    tag = 'CASH GRANT';
    tagClass = 'bg-emerald-100 text-emerald-900 border border-emerald-300';
    iconBg = 'bg-emerald-50 text-emerald-600';
    actionClass = 'bg-emerald-50 border border-emerald-200 text-emerald-900';
  } else if (prize.type === 'tax') {
    icon = '⚠️';
    title = `TAX AUDIT: -${fmtMoney(prize.amount)}`;
    actionText = 'Fine transferred directly into Festival Pool!';
    tag = 'LUXURY TAX AUDIT';
    tagClass = 'bg-rose-100 text-rose-900 border border-rose-300';
    iconBg = 'bg-rose-50 text-rose-600';
    actionClass = 'bg-rose-50 border border-rose-200 text-rose-900';
  } else if (prize.type === 'island') {
    icon = '🏝️';
    title = 'DETAINED ON ISLAND!';
    actionText = 'Flying to Island! Roll doubles or pay bail to escape.';
    tag = 'DETENTION SURPRISE';
    tagClass = 'bg-orange-100 text-orange-900 border border-orange-300';
    iconBg = 'bg-orange-50 text-orange-600';
    actionClass = 'bg-orange-50 border border-orange-200 text-orange-900';
  } else if (prize.type === 'move') {
    if (prize.target === 0) {
      icon = '🚀';
      title = 'EXPRESS JET TO START!';
      actionText = 'Flying to START to collect +$300,000 salary!';
      tag = 'BOARD WARP';
      tagClass = 'bg-sky-100 text-sky-900 border border-sky-300';
      iconBg = 'bg-sky-50 text-sky-600';
      actionClass = 'bg-sky-50 border border-sky-200 text-sky-900';
    } else {
      icon = '✈️';
      title = 'WORLD TOUR FLIGHT!';
      actionText = 'Flying to Airport for VIP world travel!';
      tag = 'BOARD WARP';
      tagClass = 'bg-purple-100 text-purple-900 border border-purple-300';
      iconBg = 'bg-purple-50 text-purple-600';
      actionClass = 'bg-purple-50 border border-purple-200 text-purple-900';
    }
  }

  const iconEl = document.getElementById('chance-result-icon');
  const titleEl = document.getElementById('chance-result-title');
  const descEl = document.getElementById('chance-result-desc');
  const actionEl = document.getElementById('chance-result-action-text');
  const tagEl = document.getElementById('chance-result-tag');
  const actionContainer = document.getElementById('chance-result-action');
  const timerBar = document.getElementById('chance-result-timer-bar');

  if (iconEl) {
    iconEl.textContent = icon;
    iconEl.className = `w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl shadow-md border-2 border-slate-100 ${iconBg}`;
  }
  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = prize.desc;
  if (actionEl) actionEl.textContent = actionText;
  if (tagEl) {
    tagEl.textContent = tag;
    tagEl.className = `inline-block text-xs font-black uppercase px-3.5 py-1 rounded-full ${tagClass}`;
  }
  if (actionContainer) {
    actionContainer.className = `py-2.5 px-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 ${actionClass}`;
  }

  if (timerBar) {
    timerBar.style.transition = 'none';
    timerBar.style.width = '100%';
    void timerBar.offsetWidth;
    timerBar.style.transition = 'width 2000ms linear';
    timerBar.style.width = '0%';
  }

  m.classList.remove('hidden');
  m.classList.add('flex');

  // Exactly 2000ms (2 seconds)
  setTimeout(() => {
    m.classList.add('hidden');
    m.classList.remove('flex');
    if (onDone) onDone();
  }, 2000);
}

export function spinChanceWheel() {
  const btn = document.getElementById('btn-spin-wheel');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> SPINNING...`;
  }

  const prizeIdx = Math.floor(Math.random() * CHANCE_WHEEL_PRIZES.length);
  const prize = CHANCE_WHEEL_PRIZES[prizeIdx];

  // N slices. Slice 0 is centered at 12 o'clock.
  // Slice i is at (i * 60) degrees clockwise from 12 o'clock.
  // To bring slice i to 12 o'clock under the needle, target rotation mod 360 is:
  const N = CHANCE_WHEEL_PRIZES.length;
  const sliceDeg = 360 / N;
  const targetOffset = (360 - (prizeIdx * sliceDeg)) % 360;

  // Add 5-6 full spins
  const fullSpins = 5 + Math.floor(Math.random() * 2);
  const currentMod = wheelAngle % 360;
  let forwardDelta = targetOffset - currentMod;
  if (forwardDelta <= 0) forwardDelta += 360;
  wheelAngle += (fullSpins * 360) + forwardDelta;

  const canvas = document.getElementById('chance-wheel-canvas');
  if (canvas) {
    canvas.style.transition = 'transform 2600ms cubic-bezier(0.12, 0.9, 0.25, 1)';
    canvas.style.transform = `rotate(${wheelAngle}deg)`;
  }

  // Ticking sound simulation as wheel spins and decelerates
  const totalSpinMs = 2600;
  let tickInterval = 60;
  const startSpinTime = Date.now();
  function scheduleNextTick() {
    const elapsed = Date.now() - startSpinTime;
    if (elapsed >= totalSpinMs - 120) return;
    playSFX('wheelTick', 0.7);
    const progress = elapsed / totalSpinMs;
    tickInterval = 55 + Math.pow(progress, 2.5) * 320;
    setTimeout(scheduleNextTick, tickInterval);
  }
  scheduleNextTick();

  setTimeout(async () => {
    if (isLobbyScreenActive()) return;
    playSFX('win');

    // 1. Immediately highlight the result in the box below the wheel
    const resultText = document.getElementById('chance-result-text');
    if (resultText) {
      resultText.innerHTML = `<strong>${prize.label}</strong>: ${prize.desc}`;
    }

    // 2. Wait 0.85s so user can clearly see the wheel resting right on the prize
    await new Promise(r => setTimeout(r, 850));
    if (isLobbyScreenActive()) return;

    // 3. Close the wheel modal
    document.getElementById('modal-chance-wheel').classList.add('hidden');
    document.getElementById('modal-chance-wheel').classList.remove('flex');

    // 4. Show the dedicated, 100% solid, crystal-clear 2-second award popup
    showChanceAwardPopup(prize, async () => {
      // 5. Run the in-game 3D flight/tax/cash animation!
      const activePIdx = (gameState.currentPlayerIdx !== undefined && gameState.currentPlayerIdx !== null)
        ? gameState.currentPlayerIdx
        : 0;
      if (engineCallbacks.applyChancePrize) {
        await engineCallbacks.applyChancePrize(activePIdx, prize, gameState.pendingDoubles);
      }
    });
  }, 2650);
}
