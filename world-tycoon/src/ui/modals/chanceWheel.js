/**
 * ui/modals/chanceWheel.js
 * Chance wheel canvas rendering, rotation physics, audio ticks, and award popups.
 */

import { CHANCE_WHEEL_PRIZES, PLAYER_THEMES } from '../../game/data.js';
import { getActiveChancePrizes } from '../../game/engine/chance.js';
import { gameState } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX } from '../../game/audio.js';
import { setStatusPill } from '../hud.js';
import { getTileScreenPosition } from '../../three/scene.js';
import { engineCallbacks, isLobbyScreenActive } from './common.js';
import { animateChanceDeckDraw, animateModalSpringOpen, animateModalSpringClose } from '../anim.js';
import { updateModalSlice, getModalSlice } from '../../svelte/stores/modalStore.js';
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
  isWheelSpinning = false;
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
    hasWon: false,
    wonPrize: null,
    drawingIdx: -1,
    winnerIdx: -1,
    playerName,
    cardText: isLocalUser ? 'Draw a card to test your luck!' : `${playerName} is testing their luck on Chance!`
  });

  const resText = document.getElementById('chance-result-text');
  if (resText) {
    resText.textContent = isLocalUser
      ? 'Draw a card to test your luck!'
      : `${playerName} is testing their luck on the Wheel!`;
  }

  const hasSvelte = typeof document !== 'undefined' && Boolean(document.getElementById('svelte-modals-mount')?.firstElementChild);
  const headlessBtn = (!hasSvelte && typeof document !== 'undefined') ? document.getElementById('btn-spin-wheel') : null;

  if (isAI) {
    if (headlessBtn) {
      headlessBtn.disabled = true;
      headlessBtn.innerHTML = `${playerName.toUpperCase()} IS DRAWING & BOT-${pIdx} IS SPINNING...`;
    }
    setStatusPill(`🃏 <strong>${playerName}</strong> is drawing & spinning the Chance Wheel...`, { isThinking: true, playerIdx: pIdx });
    if (!networkState.isMultiplayer || networkState.isHost) {
      chanceCountdownTimer = setTimeout(() => {
        if (!isWheelSpinning) {
          spinChanceWheel(null, null, pIdx, isDoubles);
        }
      }, 800);
    }
  } else if (isLocalUser) {
    let secondsLeft = 10;
    if (headlessBtn) {
      headlessBtn.disabled = false;
      headlessBtn.innerHTML = `DRAW CHANCE CARD (${secondsLeft}s)`;
    }
    updateModalSlice('chanceWheel', { countdownSeconds: secondsLeft });
    setStatusPill(`🃏 Draw a Chance Card! Spin the wheel to test your luck on Chance!`, { isThinking: false, playerIdx: pIdx });

    chanceCountdownInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        if (!isWheelSpinning) {
          updateModalSlice('chanceWheel', { countdownSeconds: secondsLeft });
          if (headlessBtn) headlessBtn.innerHTML = `DRAW CHANCE CARD (${secondsLeft}s)`;
        }
      } else {
        clearChanceTimers();
        if (!isWheelSpinning) {
          spinChanceWheel(null, null, pIdx, isDoubles);
        }
      }
    }, 1000);
  } else {
    if (headlessBtn) {
      headlessBtn.disabled = true;
      headlessBtn.innerHTML = `WAITING FOR ${playerName.toUpperCase()}...`;
    }
    setStatusPill(`⏳ Waiting for <strong>${playerName}</strong> to draw a Chance Card...`, { isThinking: true, playerIdx: pIdx });

    if (networkState.isHost) {
      chanceCountdownTimer = setTimeout(() => {
        if (!isWheelSpinning) {
          spinChanceWheel(null, null, pIdx, isDoubles);
        }
      }, 14000);
    }
  }

  animateModalSpringOpen('#modal-chance-wheel', '#modal-chance-wheel-card');
  requestAnimationFrame(() => {
    try {
      drawChanceWheelCanvas();
    } catch (e) {
      console.warn('[ChanceWheel] Draw canvas error:', e);
    }
  });
  setTimeout(() => {
    try {
      drawChanceWheelCanvas();
    } catch (e) {}
  }, 60);
}

export function showChanceAwardPopup(prize, onDone, playerIdx = null) {
  clearChanceTimers();
  handleRemoteChancePrize(playerIdx, prize, false);
  if (onDone) onDone();
}

/**
 * Handles incoming ACTION_CHANCE_PRIZE on remote multiplayer peers.
 * If wheel is already spinning or card is already revealed, lets the in-flight
 * animation complete gracefully without killing the modal.
 * If peer missed ACTION_CHANCE_SPIN, displays the revealed won card for 2s.
 */
export function handleRemoteChancePrize(playerIdx, prize, isDoubles = false, forcedPrizeIdx = null) {
  if (!prize) return;
  const pIdx = (playerIdx !== null && playerIdx !== undefined) ? playerIdx : (gameState.currentPlayerIdx ?? 0);

  // If already spinning or card already flipped, in-flight revealChanceWinnerCard will finish cleanly
  if (isWheelSpinning) return;

  const currentSlice = getModalSlice('chanceWheel');
  if (currentSlice?.isSpinning || (currentSlice?.visible && currentSlice?.hasWon)) {
    // If modal is spinning or already showing the won card, let it finish its display timer
    return;
  }

  // Fallback: If spectator missed ACTION_CHANCE_SPIN, open modal directly onto the revealed card
  const prizes = getActiveChancePrizes();
  let prizeIdx = (forcedPrizeIdx !== null && forcedPrizeIdx !== undefined && forcedPrizeIdx >= 0)
    ? forcedPrizeIdx
    : prizes.findIndex(p => p.label === prize.label && p.type === prize.type);
  if (prizeIdx === -1) {
    prizeIdx = prizes.findIndex(p => p.type === prize.type);
  }
  const resolvedIdx = prizeIdx >= 0 ? prizeIdx : 0;
  const resolvedPrize = prizes[resolvedIdx] || prize;

  openChanceWheelModal(isDoubles, pIdx);
  revealChanceWinnerCard(resolvedIdx, resolvedPrize, pIdx, isDoubles, true);
}

export function spinChanceWheel(forcedPrizeIdx = null, forcedSpins = null, pIdx = null, isDoubles = null, isRemote = false) {
  if (isWheelSpinning) return;
  isWheelSpinning = true;
  clearChanceTimers();
  updateModalSlice('chanceWheel', { isSpinning: true, drawingIdx: 0, winnerIdx: -1, wonPrize: null, hasWon: false });

  const activePIdx = (pIdx !== null && pIdx !== undefined)
    ? pIdx
    : ((gameState.currentPlayerIdx !== undefined && gameState.currentPlayerIdx !== null) ? gameState.currentPlayerIdx : 0);
  const isDoub = isDoubles !== null ? isDoubles : Boolean(gameState.pendingDoubles);
  if (typeof document !== 'undefined' && !document.getElementById('svelte-modals-mount')?.firstElementChild) {
    const headlessBtn = document.getElementById('btn-spin-wheel');
    if (headlessBtn) {
      headlessBtn.disabled = true;
      headlessBtn.innerHTML = 'REVEALING CARD (SPINNING)...';
    }
  }

  const prizes = getActiveChancePrizes();
  const prizeIdx = forcedPrizeIdx !== null ? forcedPrizeIdx : Math.floor(Math.random() * prizes.length);
  const prize = prizes[prizeIdx] || prizes[0];

  // N slices for angle calculations (if canvas is inspected)
  const N = prizes.length;
  const sliceDeg = 360 / N;
  const targetOffset = (360 - (prizeIdx * sliceDeg)) % 360;
  const fullSpins = forcedSpins !== null ? forcedSpins : (5 + Math.floor(Math.random() * 2));
  const currentMod = wheelAngle % 360;
  let forwardDelta = targetOffset - currentMod;
  if (forwardDelta <= 0) forwardDelta += 360;
  wheelAngle += (fullSpins * 360) + forwardDelta;

  // Broadcast draw initiation in multiplayer if this is the active local player's action
  if (networkState.isMultiplayer && !isRemote) {
    broadcastAction('ACTION_CHANCE_SPIN', {
      playerIdx: activePIdx,
      prizeIdx,
      fullSpins,
      isDoubles: isDoub
    });
  }

  const canvas = document.getElementById('chance-wheel-canvas') || document.getElementById('canvas-chance-wheel');
  if (canvas) {
    canvas.style.transition = 'transform 2000ms cubic-bezier(0.12, 0.9, 0.25, 1)';
    canvas.style.transform = `rotate(${wheelAngle}deg)`;
  }

  // Animate spotlight sweep across cards in fan deck
  const totalSweepMs = 2000;
  const startTime = Date.now();
  let sweepStep = 0;

  function scheduleNextSweep() {
    const elapsed = Date.now() - startTime;
    if (elapsed >= totalSweepMs - 100) return;

    sweepStep++;
    const curIdx = sweepStep % N;
    updateModalSlice('chanceWheel', { drawingIdx: curIdx });
    playSFX('wheelTick', 0.6);

    const progress = elapsed / totalSweepMs;
    const interval = 65 + Math.pow(progress, 2.2) * 200;
    setTimeout(scheduleNextSweep, interval);
  }
  scheduleNextSweep();

  setTimeout(async () => {
    await revealChanceWinnerCard(prizeIdx, prize, activePIdx, isDoub, isRemote);
  }, 2050);
}

/**
 * Reveals the won Chance card with 3D flip, outcome audio, and status pill.
 * Synchronized across active player and remote multiplayer spectators.
 */
export async function revealChanceWinnerCard(prizeIdx, prize, activePIdx, isDoubles, isRemote = false) {
  isWheelSpinning = false;
  if (isLobbyScreenActive()) return;

  const player = (gameState.players && gameState.players[activePIdx]) || null;
  const playerName = player ? player.name : `Player ${activePIdx + 1}`;

  // Lock in the winner card and trigger 3D Flip in Svelte
  updateModalSlice('chanceWheel', {
    isSpinning: false,
    drawingIdx: -1,
    winnerIdx: prizeIdx
  });

  playSFX('wheelLock');

  // Trigger outcome sound
  if (prize.type === 'island') {
    playSFX('island');
  } else if (prize.type === 'tax') {
    playSFX('payRent');
  } else if (prize.type === 'cash') {
    playSFX('jackpot');
  } else {
    playSFX('jackpot', 0.8);
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

  // Format prize details clearly for the outcome banner
  let icon = prize.icon || '🎁';
  let title = prize.label.toUpperCase();
  let tag = prize.sub || 'CHANCE';
  if (prize.type === 'cash') {
    icon = prize.amount >= 300000 ? '💰' : '💎';
    title = `+${fmtMoney(prize.amount)} CASH!`;
    tag = 'CASH GRANT';
  } else if (prize.type === 'tax') {
    icon = '⚠️';
    title = `TAX AUDIT: -${fmtMoney(prize.amount)}`;
    tag = 'LUXURY TAX AUDIT';
  } else if (prize.type === 'island') {
    icon = '🏝️';
    title = 'DETAINED ON ISLAND!';
    tag = 'DETENTION SURPRISE';
  } else if (prize.type === 'move') {
    icon = prize.target === 0 ? '🚀' : '✈️';
    title = prize.target === 0 ? 'EXPRESS JET TO START!' : 'WORLD TOUR FLIGHT!';
    tag = 'BOARD WARP';
  }

  // Highlight the result in modalStore
  updateModalSlice('chanceWheel', {
    hasWon: true,
    playerName,
    wonPrize: {
      icon,
      tag,
      title,
      desc: prize.desc || prize.label,
      themeColor: prize.themeColor || prize.color || '#f59e0b'
    }
  });

  setStatusPill(`🌈 <strong>${playerName}</strong> drew Chance: <strong>${prize.label}</strong>!`, { isThinking: false, playerIdx: activePIdx });

  const resultText = document.getElementById('chance-result-text');
  if (resultText) {
    resultText.innerHTML = `<strong>${prize.label}</strong>: ${prize.desc}`;
  }

  // Broadcast outcome in multiplayer if this is the active local player's action
  if (networkState.isMultiplayer && !isRemote) {
    broadcastAction('ACTION_CHANCE_PRIZE', {
      playerIdx: activePIdx,
      prize,
      prizeIdx,
      isDoubles
    });
  }

  // Wait 2.0s so all players can comfortably read and appreciate the revealed card
  await new Promise(r => setTimeout(r, 2000));
  if (isLobbyScreenActive()) return;

  // Smoothly close the card deck and transition to gameplay
  animateModalSpringClose('#modal-chance-wheel', '#modal-chance-wheel-card', async () => {
    updateModalSlice('chanceWheel', { visible: false, isSpinning: false, hasWon: false, wonPrize: null, drawingIdx: -1, winnerIdx: -1 });
    if (engineCallbacks.applyChancePrize) {
      await engineCallbacks.applyChancePrize(activePIdx, prize, isDoubles, isRemote, false);
    }
  });
}

export function executeRemoteChanceSpin(playerIdx, prizeIdx, fullSpins, isDoubles) {
  openChanceWheelModal(isDoubles, playerIdx);
  const player = (gameState.players && gameState.players[playerIdx]) || null;
  const playerName = player ? player.name : `Player ${playerIdx + 1}`;
  setStatusPill(`🃏 <strong>${playerName}</strong> is drawing a Chance Card...`, { isThinking: true, playerIdx });
  spinChanceWheel(prizeIdx, fullSpins, playerIdx, isDoubles, true);
}

if (typeof window !== 'undefined') {
  window.openChanceWheelModal = openChanceWheelModal;
  window.spinChanceWheel = spinChanceWheel;
  window.showChanceAwardPopup = showChanceAwardPopup;
  window.handleRemoteChancePrize = handleRemoteChancePrize;
  window.revealChanceWinnerCard = revealChanceWinnerCard;
  window.drawChanceWheelCanvas = drawChanceWheelCanvas;
  window.executeRemoteChanceSpin = executeRemoteChanceSpin;
  window.clearChanceTimers = clearChanceTimers;
}
