/**
 * ui/modals/chanceWheel.js
 * Chance wheel canvas rendering, rotation physics, audio ticks, and award popups.
 */

import { CHANCE_WHEEL_PRIZES, PLAYER_THEMES } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX } from '../../game/audio.js';
import { setStatusPill } from '../hud.js';
import { getTileScreenPosition } from '../../three/scene.js';
import { engineCallbacks, isLobbyScreenActive } from './common.js';
import { animateChanceDeckDraw, animateModalSpringOpen, animateModalSpringClose } from '../anim.js';
import { setPlayerPortraitMood } from '../portraitRenderer.js';
import { networkState, broadcastAction } from '../../network/p2p.js';

const WHEEL_VECTOR_ICONS = {
  money: new Path2D('M2 6h20v12H2V6zm2 2v8h16V8H4zm8 1a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm-6 2h1v2H6v-2zm11 0h1v2h-1v-2z'),
  gem: new Path2D('M6 2 2 8l10 14L22 8l-4-6H6zm1.8 2h8.4l2.7 4H5.1l2.7-4z'),
  warning: new Path2D('M12 2 1 21h22L12 2zm0 4.5 7.5 13h-15L12 6.5zM11 11h2v4h-2v-4zm0 5h2v2h-2v-2z'),
  palm: new Path2D('M13 13c1.5-2.5 4.5-4 8-4-1 2.5-2.5 4.5-5 5.5l5 2.5c-3 .5-5.5-.5-7.5-2 1.5 2.5 2 5.5 1 8.5-1.5-2.5-2.5-5-2.5-8-1 3-3 5.5-6 6.5 1-3 2.5-5 4.5-6.5-2.5 1-5.5 1-8-0.5 3-1 5.5-1 7.5 0.5-2-1.5-3.5-3.5-4.5-6 3.5 0 6.5 1.5 8 4l-1 9h2l-1-9z'),
  start: new Path2D('M12 2 15 9l7 3-7 3-3 7-3-7-7-3 7-3 3-7zm0 4.8L10.3 10.3 6.8 12l3.5 1.7L12 17.2l1.7-3.5 3.5-1.7-3.5-1.7L12 6.8z'),
  plane: new Path2D('M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z'),
  gift: new Path2D('M20 6h-2.18c.11-.31.18-.65.18-1a3 3 0 0 0-3-3c-1.4 0-2.56.96-2.88 2.27L12 4.57l-.12-.3C11.56 2.96 10.4 2 9 2a3 3 0 0 0-3 3c0 .35.07.69.18 1H4a2 2 0 0 0-2 2v3h2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V11h2V8a2 2 0 0 0-2-2zM9 4a1 1 0 0 1 1 1c0 .55-.45 1-1 1s-1-.45-1-1a1 1 0 0 1 1-1zm6 0a1 1 0 0 1 1 1c0 .55-.45 1-1 1s-1-.45-1-1a1 1 0 0 1 1-1z'),
  star: new Path2D('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z')
};

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

    // Determine slice vector icon & readable label
    let iconPath = WHEEL_VECTOR_ICONS.gift;
    let mainLabel = p.label;
    let subLabel = '';
    let themeColor = '#0f172a';

    if (p.type === 'cash') {
      if (p.amount >= 300000) {
        iconPath = WHEEL_VECTOR_ICONS.money;
        mainLabel = '+400K';
        subLabel = 'GRANT';
        themeColor = '#047857'; // emerald
      } else {
        iconPath = WHEEL_VECTOR_ICONS.gem;
        mainLabel = '+250K';
        subLabel = 'BONUS';
        themeColor = '#b45309'; // amber
      }
    } else if (p.type === 'tax') {
      iconPath = WHEEL_VECTOR_ICONS.warning;
      mainLabel = '-200K';
      subLabel = 'FINE';
      themeColor = '#be123c'; // rose red
    } else if (p.type === 'island') {
      iconPath = WHEEL_VECTOR_ICONS.palm;
      mainLabel = 'ISLAND';
      subLabel = 'JAIL';
      themeColor = '#c2410c'; // orange
    } else if (p.type === 'move') {
      if (p.target === 0) {
        iconPath = WHEEL_VECTOR_ICONS.start;
        mainLabel = 'START';
        subLabel = '+300K';
        themeColor = '#0369a1'; // sky blue
      } else {
        iconPath = WHEEL_VECTOR_ICONS.plane;
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

    // Top Row: Big Centered Vector Icon
    ctx.save();
    ctx.translate(0, -16);
    ctx.scale(0.85, 0.85);
    ctx.translate(-12, -12);
    ctx.fillStyle = themeColor;
    ctx.fill(iconPath);
    ctx.restore();

    // Middle Row: Big Bold Colored Main Amount/Action
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
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

  // Center vector star
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1.2, 1.2);
  ctx.translate(-12, -12);
  ctx.fillStyle = '#ffffff';
  ctx.fill(WHEEL_VECTOR_ICONS.star);
  ctx.restore();
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
  animateModalSpringOpen(m);
}

export function showChanceAwardPopup(prize, onDone, playerIdx = null) {
  const m = document.getElementById('modal-chance-result');
  if (!m) {
    if (onDone) onDone();
    return;
  }

  // Dismiss any overlapping informational drawers
  const portfolioModal = document.getElementById('modal-portfolio');
  if (portfolioModal && !portfolioModal.classList.contains('hidden')) {
    if (window.closePortfolioModal) window.closePortfolioModal();
  }
  const rulesModal = document.getElementById('modal-rules');
  if (rulesModal && !rulesModal.classList.contains('hidden')) {
    if (window.closeRulesModal) window.closeRulesModal();
  }
  const inspModal = document.getElementById('modal-tile-inspector');
  if (inspModal && !inspModal.classList.contains('hidden')) {
    if (window.closeInspectorModal) window.closeInspectorModal();
  }

  const pIdx = (playerIdx !== null && playerIdx !== undefined) ? playerIdx : gameState.currentPlayerIdx;
  const player = (gameState.players && gameState.players[pIdx]) || null;
  const isLocalUser = !networkState.isMultiplayer || pIdx === networkState.localPlayerIdx;
  const playerName = player ? player.name : `Player ${pIdx + 1}`;
  const playerColor = (player && player.colorHex) || (PLAYER_THEMES[pIdx] && PLAYER_THEMES[pIdx].colorHex) || '#f59e0b';

  // Update Player Context Strip
  const playerRow = document.getElementById('chance-result-player-row');
  const playerDot = document.getElementById('chance-result-player-dot');
  const playerNameEl = document.getElementById('chance-result-player-name');
  const playerBadgeEl = document.getElementById('chance-result-player-badge');

  if (playerRow) {
    if (playerDot) playerDot.style.backgroundColor = playerColor;
    if (playerNameEl) playerNameEl.textContent = isLocalUser ? `${playerName} (YOU)` : playerName;
    if (playerBadgeEl) {
      if (player?.isAI) {
        playerBadgeEl.textContent = 'AI BOT';
        playerBadgeEl.className = 'px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200';
      } else if (isLocalUser) {
        playerBadgeEl.textContent = 'YOUR CARD';
        playerBadgeEl.className = 'px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200';
      } else {
        playerBadgeEl.textContent = 'CHANCE CARD';
        playerBadgeEl.className = 'px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200';
      }
    }
  }

  let icon = '🎁';
  let title = prize.label.toUpperCase();
  let actionText = isLocalUser ? 'Applying rewards to your empire...' : `Applying rewards to ${playerName}...`;
  let tag = 'CHANCE REWARD';
  let tagClass = 'bg-amber-100 text-amber-900 border border-amber-300';
  let iconBg = 'bg-amber-50 text-amber-600';
  let actionClass = 'bg-slate-50 border border-slate-200 text-slate-800';

  if (prize.type === 'cash') {
    icon = prize.amount >= 300000 ? '💰' : '💎';
    title = `+${fmtMoney(prize.amount)} CASH!`;
    actionText = isLocalUser ? 'Cash deposited directly into your treasury!' : `Cash deposited into ${playerName}'s treasury!`;
    tag = 'CASH GRANT';
    tagClass = 'bg-emerald-100 text-emerald-900 border border-emerald-300';
    iconBg = 'bg-emerald-50 text-emerald-600';
    actionClass = 'bg-emerald-50 border border-emerald-200 text-emerald-900';
  } else if (prize.type === 'tax') {
    icon = '⚠️';
    title = `TAX AUDIT: -${fmtMoney(prize.amount)}`;
    actionText = isLocalUser ? 'Fine transferred directly into Festival Pool!' : `Fine transferred from ${playerName} to Festival Pool!`;
    tag = 'LUXURY TAX AUDIT';
    tagClass = 'bg-rose-100 text-rose-900 border border-rose-300';
    iconBg = 'bg-rose-50 text-rose-600';
    actionClass = 'bg-rose-50 border border-rose-200 text-rose-900';
  } else if (prize.type === 'island') {
    icon = '🏝️';
    title = 'DETAINED ON ISLAND!';
    actionText = isLocalUser ? 'Flying to Island! Roll doubles or pay bail to escape.' : `${playerName} detained! Roll doubles or pay bail to escape.`;
    tag = 'DETENTION SURPRISE';
    tagClass = 'bg-orange-100 text-orange-900 border border-orange-300';
    iconBg = 'bg-orange-50 text-orange-600';
    actionClass = 'bg-orange-50 border border-orange-200 text-orange-900';
  } else if (prize.type === 'move') {
    if (prize.target === 0) {
      icon = '🚀';
      title = 'EXPRESS JET TO START!';
      actionText = isLocalUser ? 'Flying to START to collect +$300,000 salary!' : `${playerName} flying to START for +$300,000 salary!`;
      tag = 'BOARD WARP';
      tagClass = 'bg-sky-100 text-sky-900 border border-sky-300';
      iconBg = 'bg-sky-50 text-sky-600';
      actionClass = 'bg-sky-50 border border-sky-200 text-sky-900';
    } else {
      icon = '✈️';
      title = 'WORLD TOUR FLIGHT!';
      actionText = isLocalUser ? 'Flying to Airport for VIP world travel!' : `${playerName} flying to Airport for VIP world travel!`;
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

  // Synchronized status pill and sound effect
  setStatusPill(`🌈 <strong>${playerName}</strong> drew Chance: <strong>${prize.label}</strong>!`, { isThinking: false, playerIdx: pIdx });
  playSFX('win', 0.8);

  // Synchronized emotional portrait mood
  if (prize.type === 'tax') {
    setPlayerPortraitMood(pIdx, 'crying', 3500);
  } else if (prize.type === 'island') {
    setPlayerPortraitMood(pIdx, 'shocked', 3500);
  } else if (prize.type === 'cash' && prize.amount >= 300000) {
    setPlayerPortraitMood(pIdx, 'smug', 3500);
  } else {
    setPlayerPortraitMood(pIdx, 'cheering', 3500);
  }

  const popupDuration = 2200;
  if (timerBar) {
    timerBar.style.transition = 'none';
    timerBar.style.width = '100%';
    void timerBar.offsetWidth;
    timerBar.style.transition = `width ${popupDuration}ms linear`;
    timerBar.style.width = '0%';
  }

  const currentTileId = player?.position ?? 2;
  const origin = getTileScreenPosition(currentTileId);
  animateModalSpringOpen(m, '#modal-chance-result .game-modal-shell', origin);
  animateChanceDeckDraw('#modal-chance-result .game-modal-shell', origin);

  // Exactly 2200ms
  setTimeout(() => {
    animateModalSpringClose(m, '#modal-chance-result .game-modal-shell', onDone);
  }, popupDuration);
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

  // Dynamic ticker needle deflection and synchronized audio ticks
  const totalSpinMs = 2600;
  let tickInterval = 60;
  const startSpinTime = Date.now();
  const tickerPin = document.getElementById('chance-wheel-ticker-pin');

  function scheduleNextTick() {
    const elapsed = Date.now() - startSpinTime;
    if (elapsed >= totalSpinMs - 120) {
      if (tickerPin) tickerPin.style.transform = 'translate(-50%, 0) rotate(0deg)';
      return;
    }
    playSFX('wheelTick', 0.7);

    // Spring deflection simulating sector peg collisions
    if (tickerPin) {
      const deflectDeg = -(12 + Math.random() * 8);
      tickerPin.style.transform = `translate(-50%, 0) rotate(${deflectDeg}deg)`;
      setTimeout(() => {
        if (tickerPin) tickerPin.style.transform = 'translate(-50%, 0) rotate(0deg)';
      }, Math.min(55, tickInterval * 0.45));
    }

    const progress = elapsed / totalSpinMs;
    tickInterval = 55 + Math.pow(progress, 2.5) * 320;
    setTimeout(scheduleNextTick, tickInterval);
  }
  scheduleNextTick();

  setTimeout(async () => {
    if (isLobbyScreenActive()) return;
    playSFX('win');

    // Spring landing micro-bounce on wheel canvas
    if (canvas) {
      canvas.style.transform = `rotate(${wheelAngle}deg) scale(1.035)`;
      setTimeout(() => {
        if (canvas) canvas.style.transform = `rotate(${wheelAngle}deg) scale(1)`;
      }, 160);
    }

    // Trigger emotional reaction on active player's portrait
    const activePIdx = (gameState.currentPlayerIdx !== undefined && gameState.currentPlayerIdx !== null)
      ? gameState.currentPlayerIdx
      : 0;

    if (prize.type === 'tax') {
      setPlayerPortraitMood(activePIdx, 'crying', 3500);
    } else if (prize.type === 'island') {
      setPlayerPortraitMood(activePIdx, 'shocked', 3500);
    } else if (prize.type === 'cash' && prize.amount >= 300000) {
      setPlayerPortraitMood(activePIdx, 'smug', 3500);
    } else {
      setPlayerPortraitMood(activePIdx, 'cheering', 3500);
    }

    // 1. Immediately highlight the result in the box below the wheel
    const resultText = document.getElementById('chance-result-text');
    if (resultText) {
      resultText.innerHTML = `<strong>${prize.label}</strong>: ${prize.desc}`;
    }

    // 2. Wait 0.85s so user can clearly see the wheel resting right on the prize
    await new Promise(r => setTimeout(r, 850));
    if (isLobbyScreenActive()) return;

    // 3. Close the wheel modal
    animateModalSpringClose('#modal-chance-wheel');

    // Broadcast immediately so ALL peers in multiplayer open the card popup together!
    if (networkState.isMultiplayer) {
      broadcastAction('ACTION_CHANCE_PRIZE', {
        playerIdx: activePIdx,
        prize,
        isDoubles: Boolean(gameState.pendingDoubles)
      });
    }

    // 4. Show the dedicated, 100% solid, crystal-clear 2.2-second award popup
    showChanceAwardPopup(prize, async () => {
      // 5. Run the in-game 3D flight/tax/cash animation!
      if (engineCallbacks.applyChancePrize) {
        await engineCallbacks.applyChancePrize(activePIdx, prize, gameState.pendingDoubles, false, false);
      }
    }, activePIdx);
  }, 2650);
}
