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
import { updateModalSlice } from '../../svelte/stores/modalStore.js';
import { setPlayerPortraitMood } from '../portraitRenderer.js';
import { networkState, broadcastAction } from '../../network/p2p.js';

import { drawChanceWheelCanvas, WHEEL_VECTOR_ICONS } from './chanceCanvas.js';
export { drawChanceWheelCanvas };

/* ─────────────────────────────────────────────────────────────────────────────
   CHANCE WHEEL MODAL
───────────────────────────────────────────────────────────────────────────── */
let wheelAngle = 0;
let chanceCountdownTimer = null;
let chanceCountdownInterval = null;
let isWheelSpinning = false;

export function clearChanceTimers() {
  if (chanceCountdownTimer) {
    clearTimeout(chanceCountdownTimer);
    chanceCountdownTimer = null;
  }
  if (chanceCountdownInterval) {
    clearInterval(chanceCountdownInterval);
    chanceCountdownInterval = null;
  }
}

export function openChanceWheelModal(isDoubles, targetPlayerIdx = null) {
  if (isLobbyScreenActive()) return;
  clearChanceTimers();
  isWheelSpinning = false;

  const pIdx = (targetPlayerIdx !== null && targetPlayerIdx !== undefined)
    ? targetPlayerIdx
    : (gameState.currentPlayerIdx ?? 0);

  gameState.phase = 'MODAL';
  gameState.pendingDoubles = isDoubles;
  if (engineCallbacks.updateUI) engineCallbacks.updateUI();

  // Reset wheel canvas rotation and button
  wheelAngle = 0;
  const canvas = document.getElementById('chance-wheel-canvas') || document.getElementById('canvas-chance-wheel');
  if (canvas) {
    canvas.style.transition = 'none';
    canvas.style.transform = 'rotate(0deg)';
  }

  // Ensure result popup is closed
  const resModal = document.getElementById('modal-chance-result');
  if (resModal) {
    resModal.classList.add('hidden');
    resModal.classList.remove('flex');
    resModal.style.setProperty('display', 'none', 'important');
  }

  try {
    drawChanceWheelCanvas();
  } catch (err) {
    console.error('[ChanceWheel] Error drawing canvas:', err);
  }

  const player = (gameState.players && gameState.players[pIdx]) || null;
  const playerName = player ? player.name : `Player ${pIdx + 1}`;
  const isAI = Boolean(player && player.isAI);
  const isLocalUser = !networkState.isMultiplayer || (pIdx === networkState.localPlayerIdx);

  updateModalSlice('chanceWheel', {
    visible: true,
    isSpinning: false,
    isSpectator: !isLocalUser,
    isAI,
    cardText: isLocalUser ? 'Click Spin to test your luck!' : `${playerName} is testing their luck on the Wheel!`
  });

  const resText = document.getElementById('chance-result-text');
  if (resText) {
    resText.textContent = isLocalUser
      ? 'Click Spin to test your luck!'
      : `${playerName} is testing their luck on the Wheel!`;
  }

  const btn = document.getElementById('btn-spin-wheel');
  if (btn) {
    if (isAI) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-robot mr-2"></i> ${playerName.toUpperCase()} IS SPINNING...`;
      setStatusPill(`🎡 <strong>${playerName}</strong> is spinning the Chance Wheel...`, { isThinking: true, playerIdx: pIdx });
      // If offline or Host, auto-trigger spin after 800ms pause so players see the wheel
      if (!networkState.isMultiplayer || networkState.isHost) {
        chanceCountdownTimer = setTimeout(() => {
          if (!isWheelSpinning) {
            spinChanceWheel(null, null, pIdx, isDoubles);
          }
        }, 800);
      }
    } else if (isLocalUser) {
      btn.disabled = false;
      let secondsLeft = 10;
      btn.innerHTML = `<i class="fa-solid fa-arrows-spin mr-2"></i> SPIN WHEEL (${secondsLeft}s)`;
      setStatusPill(`🎡 Spin the wheel to test your luck on Chance!`, { isThinking: false, playerIdx: pIdx });

      chanceCountdownInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft > 0) {
          if (btn && !isWheelSpinning) {
            btn.innerHTML = `<i class="fa-solid fa-arrows-spin mr-2"></i> SPIN WHEEL (${secondsLeft}s)`;
          }
        } else {
          clearChanceTimers();
          if (!isWheelSpinning) {
            spinChanceWheel(null, null, pIdx, isDoubles);
          }
        }
      }, 1000);
    } else {
      // Remote player in multiplayer
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-hourglass-half mr-2"></i> WAITING FOR ${playerName.toUpperCase()}...`;
      setStatusPill(`⏳ Waiting for <strong>${playerName}</strong> to spin the Chance Wheel...`, { isThinking: true, playerIdx: pIdx });

      // Safety timeout: If remote peer does not spin within 14 seconds, Host resolves
      if (networkState.isHost) {
        chanceCountdownTimer = setTimeout(() => {
          if (!isWheelSpinning) {
            spinChanceWheel(null, null, pIdx, isDoubles);
          }
        }, 14000);
      }
    }
  }

  animateModalSpringOpen('#modal-chance-wheel', '#modal-chance-wheel-card');
}

export function showChanceAwardPopup(prize, onDone, playerIdx = null) {
  clearChanceTimers();
  updateModalSlice('chanceWheel', { visible: false, isSpinning: false });
  const wheelModal = document.getElementById('modal-chance-wheel');
  if (wheelModal && !wheelModal.classList.contains('hidden')) {
    animateModalSpringClose('#modal-chance-wheel', '#modal-chance-wheel-card');
  }

  const m = document.getElementById('modal-chance-result');
  if (!m) {
    if (onDone) onDone();
    return;
  }

  // Dismiss any overlapping tile inspector drawer
  const inspModal = document.getElementById('modal-tile-inspector');
  if (inspModal && !inspModal.classList.contains('hidden')) {
    if (window.closeInspectorModal) window.closeInspectorModal();
  }

  const pIdx = (playerIdx !== null && playerIdx !== undefined) ? playerIdx : gameState.currentPlayerIdx;
  const player = (gameState.players && gameState.players[pIdx]) || null;
  const isLocalUser = !networkState.isMultiplayer || pIdx === networkState.localPlayerIdx;
  const playerName = player ? player.name : `Player ${pIdx + 1}`;
  const playerColor = (player && player.colorHex) || (PLAYER_THEMES[pIdx] && PLAYER_THEMES[pIdx].colorHex) || '#f59e0b';

  let badgeText = 'CHANCE CARD';
  let badgeClass = 'bg-amber-100 text-amber-800 border border-amber-200';
  if (player?.isAI) {
    badgeText = 'AI BOT';
    badgeClass = 'bg-indigo-100 text-indigo-800 border border-indigo-200';
  } else if (isLocalUser) {
    badgeText = 'YOUR CARD';
    badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
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

  const rawDesc = prize.desc || '';
  const flavorText = rawDesc
    .replace(/! Collect.*$/i, '')
    .replace(/! Pay.*$/i, '')
    .replace(/! Detained.*$/i, '')
    .trim()
    .replace(/!$/, '');

  updateModalSlice('chanceWheel', {
    resultVisible: true,
    result: {
      playerName: isLocalUser ? `${playerName} (YOU)` : playerName,
      playerColor,
      badgeText,
      badgeClass,
      icon,
      iconBg,
      title,
      flavorText,
      desc: flavorText || prize.desc,
      actionText,
      tag,
      tagClass,
      actionClass
    }
  });

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
  const timerBar = document.getElementById('chance-result-timer-bar');
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

export function spinChanceWheel(forcedPrizeIdx = null, forcedSpins = null, pIdx = null, isDoubles = null) {
  if (isWheelSpinning) return;
  isWheelSpinning = true;
  clearChanceTimers();
  updateModalSlice('chanceWheel', { isSpinning: true });

  const activePIdx = (pIdx !== null && pIdx !== undefined)
    ? pIdx
    : ((gameState.currentPlayerIdx !== undefined && gameState.currentPlayerIdx !== null) ? gameState.currentPlayerIdx : 0);
  const isDoub = isDoubles !== null ? isDoubles : Boolean(gameState.pendingDoubles);

  const btn = document.getElementById('btn-spin-wheel');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> SPINNING...`;
  }

  const prizeIdx = forcedPrizeIdx !== null ? forcedPrizeIdx : Math.floor(Math.random() * CHANCE_WHEEL_PRIZES.length);
  const prize = CHANCE_WHEEL_PRIZES[prizeIdx];

  // N slices. Slice 0 is centered at 12 o'clock.
  // Slice i is at (i * 60) degrees clockwise from 12 o'clock.
  // To bring slice i to 12 o'clock under the needle, target rotation mod 360 is:
  const N = CHANCE_WHEEL_PRIZES.length;
  const sliceDeg = 360 / N;
  const targetOffset = (360 - (prizeIdx * sliceDeg)) % 360;

  // Add 5-6 full spins
  const fullSpins = forcedSpins !== null ? forcedSpins : (5 + Math.floor(Math.random() * 2));
  const currentMod = wheelAngle % 360;
  let forwardDelta = targetOffset - currentMod;
  if (forwardDelta <= 0) forwardDelta += 360;
  wheelAngle += (fullSpins * 360) + forwardDelta;

  // Broadcast spin initiation in multiplayer so all peers see the exact same rotation!
  if (networkState.isMultiplayer && forcedPrizeIdx === null) {
    broadcastAction('ACTION_CHANCE_SPIN', {
      playerIdx: activePIdx,
      prizeIdx,
      fullSpins,
      isDoubles: isDoub
    });
  }

  const canvas = document.getElementById('chance-wheel-canvas') || document.getElementById('canvas-chance-wheel');
  if (canvas) {
    canvas.style.transition = 'transform 2600ms cubic-bezier(0.12, 0.9, 0.25, 1)';
    canvas.style.transform = `rotate(${wheelAngle}deg)`;
  }

  // Dynamic ticker needle deflection and synchronized audio ticks
  const totalSpinMs = 2600;
  let tickInterval = 60;
  const startSpinTime = Date.now();
  const tickerPin = document.getElementById('chance-wheel-ticker-pin') || document.getElementById('chance-wheel-ticker');

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
    isWheelSpinning = false;
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
    animateModalSpringClose('#modal-chance-wheel', '#modal-chance-wheel-card');

    // In multiplayer spectator mode (forcedPrizeIdx !== null), the incoming ACTION_CHANCE_PRIZE
    // packet is the authoritative trigger for showChanceAwardPopup. Returning early here prevents
    // executing the prize animation and cash/tax modifications twice on remote peers.
    if (networkState.isMultiplayer && forcedPrizeIdx !== null) {
      return;
    }

    // Broadcast immediately so ALL peers in multiplayer open the card popup together!
    if (networkState.isMultiplayer && forcedPrizeIdx === null) {
      broadcastAction('ACTION_CHANCE_PRIZE', {
        playerIdx: activePIdx,
        prize,
        isDoubles: isDoub
      });
    }

    // 4. Show the dedicated, 100% solid, crystal-clear 2.2-second award popup
    showChanceAwardPopup(prize, async () => {
      // 5. Run the in-game 3D flight/tax/cash animation!
      if (engineCallbacks.applyChancePrize) {
        await engineCallbacks.applyChancePrize(activePIdx, prize, isDoub, false, false);
      }
    }, activePIdx);
  }, 2650);
}

export function executeRemoteChanceSpin(playerIdx, prizeIdx, fullSpins, isDoubles) {
  const modal = document.getElementById('modal-chance-wheel');
  if (!modal || modal.classList.contains('hidden') || modal.style.display === 'none') {
    openChanceWheelModal(isDoubles, playerIdx);
  }
  spinChanceWheel(prizeIdx, fullSpins, playerIdx, isDoubles);
}

if (typeof window !== 'undefined') {
  window.openChanceWheelModal = openChanceWheelModal;
  window.spinChanceWheel = spinChanceWheel;
  window.showChanceAwardPopup = showChanceAwardPopup;
  window.drawChanceWheelCanvas = drawChanceWheelCanvas;
  window.executeRemoteChanceSpin = executeRemoteChanceSpin;
  window.clearChanceTimers = clearChanceTimers;
}
