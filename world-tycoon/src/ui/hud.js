/**
 * ui/hud.js
 * Renders corner player HUD cards, event log, toasts, and floating cash pop-ups.
 */

import { PLAYER_THEMES, GROUP_META } from '../game/data.js';
import { gameState, displayedCash, matchSettings } from '../game/state.js';
import { fmtMoney } from '../game/utils.js';
import { ownsFullColorGroup } from '../game/rules.js';
import { showSpeechBubble, triggerTokenHurtAnimation } from '../three/scene.js';
import { networkState } from '../network/p2p.js';
import { playSFX } from '../game/audio.js';
import { animateNumberCounter, animateToastAccordionPush, animateHUDCardSpringAbsorb } from './anim.js';
import { setPlayerPortraitMood, drawPortraitFrame, initPortraitRenderLoop } from './portraitRenderer.js';
export { setPlayerPortraitMood, drawPortraitFrame } from './portraitRenderer.js';

/** Render / re-render the 4-corner HUD player cards. */
export function renderCornerHUDs() {
  initPortraitRenderLoop();
  const leftContainer = document.getElementById('hud-left-players');
  const rightContainer = document.getElementById('hud-right-players');
  if (!leftContainer || !rightContainer) return;

  const totalCards = leftContainer.querySelectorAll('.player-hud-card').length + rightContainer.querySelectorAll('.player-hud-card').length;
  const needsRebuild = (totalCards !== gameState.players.length);

  if (needsRebuild) {
    leftContainer.innerHTML = '';
    rightContainer.innerHTML = '';
  }

  gameState.players.forEach((p, idx) => {
    const isTurn = (idx === gameState.currentPlayerIdx);
    const isLeft = (idx % 2 === 0);
    const shownMoney = displayedCash[idx] !== undefined ? displayedCash[idx] : p.cash;
    const theme = PLAYER_THEMES[idx] || { colorHex: '#3b82f6', charColor: 0x3b82f6 };

    const turnBadgeHtml = isTurn
      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-[10px] tracking-wider shadow-2xs border border-amber-300 animate-pulse"><span class="w-1.5 h-1.5 rounded-full bg-slate-950"></span> TURN</span>`
      : (p.isAI
          ? `<span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">BOT</span>`
          : (idx === (networkState.isMultiplayer ? networkState.localPlayerIdx : 0)
              ? `<span class="text-[9px] font-black uppercase tracking-wider text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-md border border-sky-200">YOU</span>`
              : (networkState.isMultiplayer && idx === 0
                  ? `<span class="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">HOST</span>`
                  : `<span class="text-[9px] font-black uppercase tracking-wider text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200">P${idx + 1}</span>`
                )
            )
        );

    const islandIcon = p.inIsland ? '<span class="text-xs" title="In Island">🏝️</span>' : '';

    if (needsRebuild) {
      const wrapper = document.createElement('div');
      wrapper.className = `player-hud-wrapper flex items-center ${p.bankrupt ? 'opacity-35 grayscale' : (isTurn ? 'opacity-100' : 'opacity-90 hover:opacity-100')} transition-opacity duration-150`;

      if (isLeft) {
        wrapper.innerHTML = `
          <div id="hud-card-${idx}" class="player-hud-card ${isTurn ? 'active-turn-hud' : ''}">
            <div class="avatar-circle" style="box-shadow: 0 0 0 2.5px ${theme.colorHex}, 0 4px 10px rgba(0,0,0,0.12);">
              <canvas id="hud-avatar-canvas-${idx}" width="104" height="104" class="w-full h-full block"></canvas>
            </div>
            <div class="hud-info-col">
              <div class="hud-header-row">
                <span class="hud-player-name">${p.name}</span>
                <span class="hud-island-icon">${islandIcon}</span>
                <span class="hud-turn-badge">${turnBadgeHtml}</span>
              </div>
              <div class="hud-cash-row">
                <span id="hud-cash-val-${idx}" class="hud-cash-amount">${p.bankrupt ? 'OUT' : fmtMoney(shownMoney)}</span>
                <span class="hud-cash-icon" title="Cash">💵</span>
              </div>
            </div>
          </div>
        `;
        leftContainer.appendChild(wrapper);
      } else {
        wrapper.innerHTML = `
          <div id="hud-card-${idx}" class="player-hud-card ${isTurn ? 'active-turn-hud' : ''}">
            <div class="hud-info-col items-end text-right">
              <div class="hud-header-row justify-end">
                <span class="hud-turn-badge">${turnBadgeHtml}</span>
                <span class="hud-island-icon">${islandIcon}</span>
                <span class="hud-player-name">${p.name}</span>
              </div>
              <div class="hud-cash-row justify-end">
                <span class="hud-cash-icon" title="Cash">💵</span>
                <span id="hud-cash-val-${idx}" class="hud-cash-amount">${p.bankrupt ? 'OUT' : fmtMoney(shownMoney)}</span>
              </div>
            </div>
            <div class="avatar-circle" style="box-shadow: 0 0 0 2.5px ${theme.colorHex}, 0 4px 10px rgba(0,0,0,0.12);">
              <canvas id="hud-avatar-canvas-${idx}" width="104" height="104" class="w-full h-full block"></canvas>
            </div>
          </div>
        `;
        rightContainer.appendChild(wrapper);
      }

      // Draw initial frame immediately onto newly mounted canvas
      const canvas = document.getElementById(`hud-avatar-canvas-${idx}`);
      if (canvas) {
        drawPortraitFrame(canvas, idx, performance.now());
      }
    } else {
      // In-place update preserving DOM & canvas context
      const card = document.getElementById(`hud-card-${idx}`);
      if (card) {
        card.classList.toggle('active-turn-hud', isTurn);
        const wrapper = card.closest('.player-hud-wrapper') || card.parentElement;
        if (wrapper) {
          wrapper.className = `player-hud-wrapper flex items-center ${p.bankrupt ? 'opacity-35 grayscale' : (isTurn ? 'opacity-100' : 'opacity-90 hover:opacity-100')} transition-opacity duration-150`;
        }
        const nameEl = card.querySelector('.hud-player-name');
        if (nameEl && nameEl.textContent !== p.name) nameEl.textContent = p.name;

        const islandEl = card.querySelector('.hud-island-icon');
        if (islandEl) islandEl.innerHTML = islandIcon;

        const badgeEl = card.querySelector('.hud-turn-badge');
        if (badgeEl) badgeEl.innerHTML = turnBadgeHtml;

        const cashVal = document.getElementById(`hud-cash-val-${idx}`);
        if (cashVal && !cashVal.classList.contains('text-rose-600') && !cashVal.classList.contains('text-emerald-600')) {
          cashVal.textContent = p.bankrupt ? 'OUT' : fmtMoney(shownMoney);
        }
      }
    }
  });

  const aliveCount = gameState.players.filter(p => !p.bankrupt).length;
  document.getElementById('hud-player-count').textContent = `${aliveCount}/${gameState.players.length}`;

  const mySets = Object.keys(GROUP_META).filter(g => ownsFullColorGroup(0, g)).length;
  const targetSets = matchSettings.monopolySetsToWin || 3;
  const bonusEl = document.getElementById('hud-bonus-counter');
  if (bonusEl) bonusEl.textContent = `${mySets}/${targetSets} Sets`;

  // Auto-refresh leaderboard modal if open
  const lbModal = document.getElementById('modal-leaderboard');
  if (lbModal && !lbModal.classList.contains('hidden') && window.renderLeaderboardModal) {
    window.renderLeaderboardModal();
  }
}

export function updateGameSpeedUI() {
  const speed = matchSettings.gameSpeed || 1;
  const label = document.getElementById('game-speed-label');
  const btn = document.getElementById('btn-game-speed');
  if (label) {
    if (speed === 4) {
      label.textContent = '🚀 4× Turbo';
      if (btn) btn.className = 'hud-capsule-btn px-2 py-0.5 rounded-full text-rose-600 bg-rose-50 hover:bg-rose-100 font-black cursor-pointer animate-pulse transition';
    } else if (speed === 2) {
      label.textContent = '⚡ 2× Fast';
      if (btn) btn.className = 'hud-capsule-btn px-2 py-0.5 rounded-full text-amber-600 bg-amber-50 hover:bg-amber-100 font-black cursor-pointer transition';
    } else {
      label.textContent = '⚡ 1×';
      if (btn) btn.className = 'hud-capsule-btn px-2 py-0.5 rounded-full text-slate-700 hover:text-sky-600 hover:bg-slate-100 font-black cursor-pointer transition';
    }
  }
}



/** Show a floating cash label next to a player's HUD card. */
export function spawnFloatingCashOnHUD(playerIdx, text, isGain = true) {
  const card = document.getElementById(`hud-card-${playerIdx}`);
  const rect = card
    ? card.getBoundingClientRect()
    : { left: window.innerWidth / 2, top: 100, width: 120 };

  const el = document.createElement('div');
  el.className = `floating-cash-pop ${isGain ? 'text-emerald-600' : 'text-rose-600'}`;
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top + 10}px`;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

/**
 * Animate cash deduction on payer HUD card, streaming flying bills across screen,
 * and cash receipt pulse on receiver HUD card.
 */
export function animateRentTransferOnHUD(fromIdx, toIdx, amount) {
  return new Promise(resolve => {
    const fromCard = document.getElementById(`hud-card-${fromIdx}`);
    const toCard = document.getElementById(`hud-card-${toIdx}`);
    const fromPlayer = gameState.players[fromIdx];
    const toPlayer = gameState.players[toIdx];

    if (!fromCard || !toCard || !fromPlayer || !toPlayer) {
      spawnFloatingCashOnHUD(fromIdx, `-${fmtMoney(amount)}`, false);
      spawnFloatingCashOnHUD(toIdx, `+${fmtMoney(amount)}`, true);
      resolve();
      return;
    }

    const fromRect = fromCard.getBoundingClientRect();
    const toRect = toCard.getBoundingClientRect();

    const startX = fromRect.left + fromRect.width / 2;
    const startY = fromRect.top + fromRect.height / 2;
    const endX = toRect.left + toRect.width / 2;
    const endY = toRect.top + toRect.height / 2;

    // 1. Shake payer card, trigger 3D token hurt recoil, set mood reactions, and pop deduction text
    fromCard.classList.add('hud-card-deduct');
    setPlayerPortraitMood(fromIdx, 'crying', 3500);
    setPlayerPortraitMood(toIdx, 'smug', 3500);
    spawnFloatingCashOnHUD(fromIdx, `-${fmtMoney(amount)} Rent`, false);
    triggerTokenHurtAnimation(fromIdx);

    // Update bottom-center status pill in real-time
    setStatusPill(`💸 <strong>${fromPlayer.name}</strong> transferred <strong>${fmtMoney(amount)}</strong> rent to <strong>${toPlayer.name}</strong>`, { isThinking: false, durationMs: 4500 });

    // 2. Display rent payment game placard at center
    showRentTransferBanner(fromPlayer.name, toPlayer.name, amount, fromIdx, toIdx);

    // 3. Staggered flying cash bills & coins with multi-particle ballistic spring physics
    const billCount = 16;
    const duration = 1450;
    let landedCount = 0;

    for (let i = 0; i < billCount; i++) {
      setTimeout(() => {
        const bill = document.createElement('div');
        bill.className = 'flying-cash-bill';
        if (i % 4 === 0) {
          bill.innerHTML = `<div class="flying-cash-coin">🪙</div>`;
        } else {
          bill.innerHTML = `
            <div class="flying-cash-note">
              <span class="cash-note-icon">💵</span>
              <span class="cash-note-curr">$</span>
            </div>
          `;
        }
        bill.style.left = '0px';
        bill.style.top = '0px';
        document.body.appendChild(bill);

        const startTime = performance.now();
        const arcDistance = Math.abs(endX - startX);
        const arcPeak = Math.max(140, arcDistance * 0.28) + (Math.random() - 0.5) * 60;
        const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 90;
        const midY = Math.min(startY, endY) - arcPeak;
        // Fanning initial launch impulse spread
        const fanSpreadX = (Math.random() - 0.5) * 70;
        const fanSpreadY = (Math.random() - 0.5) * 45;

        function stepBill(now) {
          const rawT = Math.min(1, (now - startTime) / duration);
          // Cubic ease-in-out spring progression
          const t = rawT < 0.5
            ? 4 * rawT * rawT * rawT
            : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

          // Ballistic curve with initial launch impulse fanning out and converging to destination
          const fanInfluence = Math.sin(rawT * Math.PI) * 0.85;
          const bx = ((1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX) + fanSpreadX * fanInfluence;
          const by = ((1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY) + fanSpreadY * fanInfluence;
          const scale = 0.85 + Math.sin(rawT * Math.PI) * 0.45;

          // 3D paper aerodynamic flutter
          const flutterX = Math.sin(rawT * Math.PI * 5 + i) * 32;
          const flutterY = Math.cos(rawT * Math.PI * 4 + i) * 26;
          const rotZ = (now - startTime) * 0.18 + Math.sin(rawT * Math.PI * 3) * 18;

          bill.style.transform = `translate3d(${bx}px, ${by}px, 0) translate(-50%, -50%) perspective(500px) rotateX(${flutterX}deg) rotateY(${flutterY}deg) rotateZ(${rotZ}deg) scale(${scale})`;
          bill.style.opacity = rawT < 0.92 ? '1' : `${Math.max(0, (1 - rawT) * 12.5)}`;

          if (rawT < 1) {
            requestAnimationFrame(stepBill);
          } else {
            bill.remove();
            landedCount++;

            if (landedCount === 1) {
              toCard.classList.add('hud-card-receive');
              playSFX('cash');
              animateHUDCardSpringAbsorb(toIdx);
            } else if (landedCount % 4 === 0) {
              playSFX('hop', 0.25);
              animateHUDCardSpringAbsorb(toIdx);
            } else if (landedCount === billCount) {
              animateHUDCardSpringAbsorb(toIdx);
            }
          }
        }
        requestAnimationFrame(stepBill);
      }, i * 75);
    }

    // 4. When bills stream into receiver card
    const totalFlightTime = billCount * 75 + duration;

    setTimeout(() => {
      fromCard.classList.remove('hud-card-deduct');
      spawnFloatingCashOnHUD(toIdx, `+${fmtMoney(amount)} Rent`, true);

      // Smooth count numbers with Anime.js odometer
      const fromEl = document.getElementById(`hud-cash-val-${fromIdx}`);
      const toEl = document.getElementById(`hud-cash-val-${toIdx}`);
      if (fromEl) {
        fromEl.classList.add('text-rose-600');
        animateNumberCounter(fromEl, fromPlayer.cash, Math.max(0, fromPlayer.cash - amount), '$', '', 450);
      }
      if (toEl) {
        toEl.classList.add('text-emerald-600');
        animateNumberCounter(toEl, toPlayer.cash, toPlayer.cash + amount, '$', '', 450);
      }

      setTimeout(() => {
        toCard.classList.remove('hud-card-receive');
        if (fromEl) fromEl.classList.remove('text-rose-600');
        if (toEl) toEl.classList.remove('text-emerald-600');
        resolve();
      }, 650);
    }, totalFlightTime - 80);
  });
}

export function showRentTransferBanner(fromName, toName, amount, fromIdx = null, toIdx = null) {
  let banner = document.getElementById('rent-transfer-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'rent-transfer-banner';
    banner.className = 'rent-transfer-banner';
    document.body.appendChild(banner);
  }

  const fromTheme = (fromIdx !== null && PLAYER_THEMES[fromIdx]) ? PLAYER_THEMES[fromIdx] : { colorHex: '#f43f5e' };
  const toTheme = (toIdx !== null && PLAYER_THEMES[toIdx]) ? PLAYER_THEMES[toIdx] : { colorHex: '#10b981' };

  banner.innerHTML = `
    <!-- Top Header Ribbon with Amber/Orange Gradient -->
    <div class="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 py-3 px-4 text-white text-center font-rounded font-black text-xs sm:text-sm tracking-widest uppercase flex items-center justify-center gap-2 border-b-2 border-amber-300 shadow-xs">
      <i class="fa-solid fa-coins text-amber-200"></i>
      <span>RENT SETTLEMENT</span>
      <i class="fa-solid fa-coins text-amber-200"></i>
    </div>

    <!-- Body Container -->
    <div class="p-5 flex flex-col items-center gap-3.5 bg-white">
      <!-- Big Hero Amount Display -->
      <div class="flex flex-col items-center">
        <div class="font-rounded font-black text-4xl sm:text-5xl text-emerald-600 tracking-tight drop-shadow-xs">
          ${fmtMoney(amount)}
        </div>
        <div class="mt-1 px-3 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
          <i class="fa-solid fa-receipt text-slate-400"></i> Rent Paid
        </div>
      </div>

      <!-- Player Transfer Matchup Bar -->
      <div class="flex items-center justify-between w-full gap-2.5 mt-1">
        <!-- Payer Card -->
        <div class="bg-rose-50 border-2 border-rose-200 rounded-2xl p-2.5 flex-1 text-center shadow-xs">
          <div class="text-xs font-black uppercase tracking-wider text-rose-600 mb-0.5 flex items-center justify-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full inline-block border border-black/10 shrink-0" style="background-color: ${fromTheme.colorHex};"></span>
            PAYER
          </div>
          <div class="font-rounded font-black text-sm text-slate-900 truncate" title="${fromName}">
            ${fromName}
          </div>
          <div class="font-rounded font-black text-xs text-rose-600 mt-0.5">
            -${fmtMoney(amount)}
          </div>
        </div>

        <!-- Center Transfer Arrow -->
        <div class="w-9 h-9 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-md border-2 border-white text-xs font-black shrink-0">
          <i class="fa-solid fa-arrow-right"></i>
        </div>

        <!-- Collector Card -->
        <div class="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-2.5 flex-1 text-center shadow-xs">
          <div class="text-xs font-black uppercase tracking-wider text-emerald-700 mb-0.5 flex items-center justify-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full inline-block border border-black/10 shrink-0" style="background-color: ${toTheme.colorHex};"></span>
            COLLECTOR
          </div>
          <div class="font-rounded font-black text-sm text-slate-900 truncate" title="${toName}">
            ${toName}
          </div>
          <div class="font-rounded font-black text-xs text-emerald-600 mt-0.5">
            +${fmtMoney(amount)}
          </div>
        </div>
      </div>
    </div>
  `;

  banner.classList.remove('exit');
  banner.classList.add('active');

  if (banner._hideTimer) clearTimeout(banner._hideTimer);
  if (banner._exitTimer) clearTimeout(banner._exitTimer);

  banner._exitTimer = setTimeout(() => {
    banner.classList.add('exit');
  }, 3100);

  banner._hideTimer = setTimeout(() => {
    banner.classList.remove('active', 'exit');
  }, 3450);
}
if (typeof window !== 'undefined') {
  window.showRentTransferBanner = showRentTransferBanner;
}


/** Show the turn-lock warning toast. */
export function showTurnLockToast(msg = 'Wait for your turn to manage cities!') {
  const toast = document.getElementById('turn-lock-toast');
  const textEl = document.getElementById('turn-lock-toast-text');
  if (!toast || !textEl) return;
  textEl.textContent = msg;
  toast.classList.remove('hidden');
  toast.style.display = 'flex';
  animateToastAccordionPush(toast);
  showSpeechBubble(msg, 2000);
  if (toast._timer) clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.add('hidden');
    toast.style.display = 'none';
  }, 2200);
}

let diceSumTimer = null;

/**
 * Display ephemeral roll sum badge in center park area with auto-dismiss.
 * @param {string} resultStr - E.g. "🎲 5 + 4 = 9"
 * @param {number} durationMs - Auto-dismiss timeout (defaults to 1800ms)
 */
export function showDiceSumBadge(resultStr, durationMs = 1800) {
  const sumBadge = document.getElementById('dice-sum-badge');
  if (!sumBadge) return;
  if (diceSumTimer) {
    clearTimeout(diceSumTimer);
    diceSumTimer = null;
  }
  sumBadge.textContent = resultStr;
  sumBadge.classList.remove('hidden');
  sumBadge.style.display = 'inline-flex';
  sumBadge.style.opacity = '0';
  sumBadge.style.transform = 'scale(0.85)';

  requestAnimationFrame(() => {
    sumBadge.style.opacity = '1';
    sumBadge.style.transform = 'scale(1)';
  });

  const speed = matchSettings?.gameSpeed || 1;
  const timeoutMs = Math.max(600, Math.round(durationMs / speed));

  diceSumTimer = setTimeout(() => {
    hideDiceSumBadge();
  }, timeoutMs);
}

/**
 * Immediately dismiss and hide the dice sum badge.
 */
export function hideDiceSumBadge() {
  if (diceSumTimer) {
    clearTimeout(diceSumTimer);
    diceSumTimer = null;
  }
  const sumBadge = document.getElementById('dice-sum-badge');
  if (!sumBadge) return;
  sumBadge.style.opacity = '0';
  sumBadge.style.transform = 'scale(0.85)';
  setTimeout(() => {
    if (!diceSumTimer) {
      sumBadge.classList.add('hidden');
      sumBadge.style.display = 'none';
    }
  }, 220);
}

if (typeof window !== 'undefined') {
  window.showDiceSumBadge = showDiceSumBadge;
  window.hideDiceSumBadge = hideDiceSumBadge;
}

let statusPillResetTimer = null;
let currentThinkingState = null;

/** Clears any active thinking state and pending reset timers. */
export function clearThinkingState() {
  currentThinkingState = null;
  if (statusPillResetTimer) {
    clearTimeout(statusPillResetTimer);
    statusPillResetTimer = null;
  }
}

/**
 * Updates the bottom-center pill shape status bar.
 * Acts as a single source of truth for player thinking states and realtime event logs.
 * @param {string} htmlContent
 * @param {{ isThinking?: boolean, playerIdx?: number, icon?: string, durationMs?: number }} options
 */
export function setStatusPill(htmlContent, options = {}) {
  const wrap = document.getElementById('hud-bottom-status-wrap');
  const pill = document.getElementById('hud-status-pill');
  const textEl = document.getElementById('hud-status-pill-text');
  const dotEl = document.getElementById('hud-status-pill-dot');
  const iconEl = document.getElementById('hud-status-pill-icon');
  if (!pill || !textEl) return;

  if (wrap) wrap.classList.remove('hidden');

  const { isThinking = false, playerIdx = null, icon = null, durationMs = 3800 } = options;

  if (isThinking) {
    currentThinkingState = { htmlContent, options: { ...options, playerIdx } };
  }

  textEl.innerHTML = htmlContent;

  if (playerIdx !== null && playerIdx !== undefined && PLAYER_THEMES[playerIdx]) {
    if (dotEl) {
      dotEl.style.backgroundColor = PLAYER_THEMES[playerIdx].colorHex;
      dotEl.className = isThinking ? 'w-2.5 h-2.5 rounded-full animate-ping' : 'w-2.5 h-2.5 rounded-full';
    }
  } else if (dotEl) {
    dotEl.style.backgroundColor = isThinking ? '#38bdf8' : '#fbbf24';
    dotEl.className = isThinking ? 'w-2.5 h-2.5 rounded-full animate-pulse' : 'w-2.5 h-2.5 rounded-full';
  }

  if (iconEl) {
    if (icon) {
      iconEl.innerHTML = icon;
      iconEl.classList.remove('hidden');
    } else if (isThinking) {
      iconEl.innerHTML = '<span class="inline-block animate-spin text-sky-400 text-xs">⚡</span>';
      iconEl.classList.remove('hidden');
    } else {
      iconEl.classList.add('hidden');
    }
  }

  pill.classList.toggle('pill-thinking', isThinking);
  pill.classList.remove('pill-event-pop');
  void pill.offsetWidth;
  pill.classList.add('pill-event-pop');

  if (statusPillResetTimer) {
    clearTimeout(statusPillResetTimer);
    statusPillResetTimer = null;
  }

  if (!isThinking && durationMs > 0) {
    statusPillResetTimer = setTimeout(() => {
      statusPillResetTimer = null;
      // Only restore thinking state if it belongs to the CURRENT active player
      if (currentThinkingState && currentThinkingState.options?.playerIdx === gameState.currentPlayerIdx) {
        setStatusPill(currentThinkingState.htmlContent, currentThinkingState.options);
      } else {
        currentThinkingState = null;
        refreshActivePlayerTurnStatus();
      }
    }, durationMs);
  }
}

/**
 * Refreshes the active player's thinking / actionable state on the status pill.
 */
export function refreshActivePlayerTurnStatus() {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') {
    setStatusPill('Welcome to World Tycoon! Roll to start.', { isThinking: false, durationMs: 0 });
    return;
  }
  const curIdx = gameState.currentPlayerIdx;
  const p = gameState.players[curIdx];
  if (!p) return;

  const isLocalHuman = (curIdx === (networkState.isMultiplayer ? networkState.localPlayerIdx : 0)) && !p.isAI;

  if (isLocalHuman) {
    currentThinkingState = null;
    if (p.inIsland) {
      setStatusPill(`🏝️ <strong>Your Turn</strong> — Roll doubles to escape or pay bail!`, { isThinking: false, playerIdx: curIdx, durationMs: 0 });
    } else if (gameState.phase === 'ROLL') {
      const isDoublesReRoll = (gameState.doublesCount || 0) > 0;
      const rollPrompt = isDoublesReRoll
        ? `🎲 <strong>Doubles Re-Roll!</strong> — Roll the dice or press Space!`
        : `🎲 <strong>Your Turn</strong> — Roll the dice or press Space!`;
      setStatusPill(rollPrompt, { isThinking: false, playerIdx: curIdx, durationMs: 0 });
    } else if (gameState.phase === 'END') {
      setStatusPill(`✨ <strong>Turn ending</strong>...`, { isThinking: false, playerIdx: curIdx, durationMs: 0 });
    }
  } else if (p.isAI) {
    if (p.inIsland) {
      setStatusPill(`🤔 <strong>${p.name}</strong> is rolling for doubles to leave the Island...`, { isThinking: true, playerIdx: curIdx });
    } else {
      setStatusPill(`🤔 <strong>${p.name}</strong> is thinking...`, { isThinking: true, playerIdx: curIdx });
    }
  } else {
    if ((gameState.doublesCount || 0) > 0 && gameState.phase === 'ROLL') {
      setStatusPill(`🎲 <strong>${p.name}</strong> rolled doubles! Waiting for their extra roll...`, { isThinking: true, playerIdx: curIdx });
    } else {
      setStatusPill(`⏳ Waiting for <strong>${p.name}</strong>'s move...`, { isThinking: true, playerIdx: curIdx });
    }
  }
}

/** Log an event to the event log drawer and display on real-time bottom-center pill. */
export function logEvent(html) {
  const log = document.getElementById('activity-log');
  if (log) {
    const div = document.createElement('div');
    div.className = 'border-l-2 border-indigo-400 pl-2 py-0.5';
    div.innerHTML = html;
    log.prepend(div);
    animateToastAccordionPush(div);
  }
  setStatusPill(html, { isThinking: false, durationMs: 4200 });
}

/** Update the roll / end-turn buttons and manage-cities / trade pill locks. */
export function updateRollButtonsUI(isHumanTurnActionable) {
  const btnCenter = document.getElementById('btn-center-roll');
  const btnBottom = document.getElementById('btn-bottom-roll');
  const lblCenter = document.getElementById('center-roll-label');
  const lblBottom = document.getElementById('bottom-roll-label');
  const btnBail = document.getElementById('btn-escape-island');

  const btnManage = document.getElementById('btn-manage-cities');
  const iconManage = document.getElementById('icon-manage-cities');
  const btnTrade = document.getElementById('btn-trade');
  const iconTrade = document.getElementById('icon-trade');
  const canManage = isHumanTurnActionable;

  if (btnManage && btnTrade) {
    btnManage.classList.toggle('pill-locked', !canManage);
    btnTrade.classList.toggle('pill-locked', !canManage);
    btnManage.setAttribute('aria-disabled', String(!canManage));
    btnTrade.setAttribute('aria-disabled', String(!canManage));
    if (iconManage) iconManage.className = canManage ? 'fa-solid fa-city text-indigo-600' : 'fa-solid fa-lock text-slate-400';
    if (iconTrade) iconTrade.className = canManage ? 'fa-solid fa-handshake text-emerald-600' : 'fa-solid fa-lock text-slate-400';
  }

  const rollStation = document.getElementById('hud-roll-station');
  const p = gameState.players ? gameState.players[gameState.currentPlayerIdx] : null;

  if (!p || !gameState.gameStarted || gameState.phase === 'SETUP' || gameState.phase === 'VICTORY') {
    hideDiceSumBadge();
    if (rollStation) rollStation.classList.add('hidden');
    if (btnCenter) {
      btnCenter.classList.add('hidden');
      btnCenter.style.display = 'none';
    }
    if (btnBottom) {
      btnBottom.classList.add('hidden');
      btnBottom.style.display = 'none';
    }
    if (btnBail) {
      btnBail.classList.add('hidden');
      btnBail.style.display = 'none';
    }
    return;
  }

  if (rollStation) rollStation.classList.remove('hidden');

  // In online multiplayer: If this is NOT our turn, completely hide the roll buttons!
  const isOnlineOtherTurn = networkState.isMultiplayer && (gameState.currentPlayerIdx !== networkState.localPlayerIdx);

  if (p.isAI || isOnlineOtherTurn) {
    if (btnCenter) {
      btnCenter.classList.add('hidden');
      btnCenter.style.display = 'none';
    }
    if (btnBottom) {
      btnBottom.classList.add('hidden');
      btnBottom.style.display = 'none';
    }
    if (btnBail) {
      btnBail.classList.add('hidden');
      btnBail.style.display = 'none';
    }
    return;
  }

  if (gameState.phase === 'ROLL') {
    hideDiceSumBadge();
    if (btnCenter) {
      btnCenter.classList.remove('hidden');
      btnCenter.style.display = 'inline-flex';
      btnCenter.disabled = false;
    }
    if (btnBottom) {
      btnBottom.classList.remove('hidden');
      btnBottom.style.display = 'inline-flex';
      btnBottom.disabled = false;
    }
    if (lblCenter) lblCenter.textContent = 'Roll';
    if (lblBottom) lblBottom.textContent = 'Roll';
    if (btnBail) {
      const showBail = !!(p.inIsland && p.cash >= 150000);
      btnBail.classList.toggle('hidden', !showBail);
      btnBail.classList.toggle('inline-flex', showBail);
      btnBail.style.display = showBail ? 'inline-flex' : 'none';
    }
  } else if (gameState.phase === 'END') {
    if (btnCenter) {
      btnCenter.classList.remove('hidden');
      btnCenter.style.display = 'inline-flex';
      btnCenter.disabled = false;
    }
    if (btnBottom) {
      btnBottom.classList.remove('hidden');
      btnBottom.style.display = 'inline-flex';
      btnBottom.disabled = false;
    }
    if (lblCenter) lblCenter.textContent = 'End Turn';
    if (lblBottom) lblBottom.textContent = 'End Turn';
    if (btnBail) {
      btnBail.classList.add('hidden');
      btnBail.style.display = 'none';
    }
  } else {
    // MOVING, MODAL, CHANCE, FLIGHT, etc.
    if (btnCenter) {
      btnCenter.classList.add('hidden');
      btnCenter.style.display = 'none';
    }
    if (btnBottom) {
      btnBottom.classList.add('hidden');
      btnBottom.style.display = 'none';
    }
    if (btnBail) {
      btnBail.classList.add('hidden');
      btnBail.style.display = 'none';
    }
  }
}

/** Handles clicks onto the bottom-center status pill: rolls dice if actionable turn, or opens event drawer. */
export function handleStatusPillClick() {
  const p = gameState.players ? gameState.players[gameState.currentPlayerIdx] : null;
  const isLocalHuman = p && !p.isAI && (gameState.currentPlayerIdx === (networkState.isMultiplayer ? networkState.localPlayerIdx : 0));
  if (gameState.gameStarted && (gameState.phase === 'ROLL' || gameState.phase === 'END') && isLocalHuman) {
    if (typeof window.handleRollButtonClick === 'function') {
      window.handleRollButtonClick();
      return;
    }
  }
  if (typeof window.toggleEventLogDrawer === 'function') {
    window.toggleEventLogDrawer();
  }
}

if (typeof window !== 'undefined') {
  window.handleStatusPillClick = handleStatusPillClick;
  window.updateRollButtonsUI = updateRollButtonsUI;
}
