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
import { cashPileSvg } from '../assets/graphics/cash-pile.js';
import { animateNumberCounter, animateToastAccordionPush } from './anim.js';

/** Render / re-render the 4-corner HUD player cards. */
export function renderCornerHUDs() {
  const leftContainer = document.getElementById('hud-left-players');
  const rightContainer = document.getElementById('hud-right-players');
  leftContainer.innerHTML = '';
  rightContainer.innerHTML = '';

  gameState.players.forEach((p, idx) => {
    const isTurn = (idx === gameState.currentPlayerIdx);
    const isLeft = (idx % 2 === 0);
    const shownMoney = displayedCash[idx] !== undefined ? displayedCash[idx] : p.cash;

    const wrapper = document.createElement('div');
    wrapper.className = `flex items-center gap-4 ${p.bankrupt ? 'opacity-35 grayscale' : (isTurn ? 'opacity-100' : 'opacity-85 hover:opacity-100')}`;

    if (isLeft) {
      wrapper.innerHTML = `
        <div id="hud-card-${idx}" class="player-hud-card ${isTurn ? 'active-turn-hud' : ''}">
          ${isTurn ? '<div class="active-turn-pill"><span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> ACTIVE TURN</div>' : ''}
          <div class="avatar-circle">
            <canvas id="hud-avatar-canvas-${idx}" width="136" height="136" class="w-full h-full block"></canvas>
          </div>
          <div class="hud-banner-left" style="border-color:${PLAYER_THEMES[idx].colorHex}">
            <div class="name-strip" style="background:${PLAYER_THEMES[idx].colorHex}">
              ${p.name} ${p.inIsland ? '🏝️' : ''}
            </div>
            <div class="cash-strip">
              <span id="hud-cash-val-${idx}">${p.bankrupt ? 'OUT' : fmtMoney(shownMoney)}</span>
              <span class="inline-flex items-center justify-center w-5 h-4 rounded bg-emerald-600 text-white text-xs font-black shadow-xs">💵</span>
            </div>
          </div>
        </div>
        ${getIsometricCashPileSVG()}
      `;
      leftContainer.appendChild(wrapper);
    } else {
      wrapper.innerHTML = `
        ${getIsometricCashPileSVG()}
        <div id="hud-card-${idx}" class="player-hud-card ${isTurn ? 'active-turn-hud' : ''}">
          ${isTurn ? '<div class="active-turn-pill"><span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> ACTIVE TURN</div>' : ''}
          <div class="hud-banner-right" style="border-color:${PLAYER_THEMES[idx].colorHex}">
            <div class="name-strip" style="background:${PLAYER_THEMES[idx].colorHex}">
              ${p.name} ${p.inIsland ? '🏝️' : ''}
            </div>
            <div class="cash-strip">
              <span id="hud-cash-val-${idx}">${p.bankrupt ? 'OUT' : fmtMoney(shownMoney)}</span>
              <span class="inline-flex items-center justify-center w-5 h-4 rounded bg-emerald-600 text-white text-xs font-black shadow-xs">💵</span>
            </div>
          </div>
          <div class="avatar-circle">
            <canvas id="hud-avatar-canvas-${idx}" width="136" height="136" class="w-full h-full block"></canvas>
          </div>
        </div>
      `;
      rightContainer.appendChild(wrapper);
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

/** Returns the isometric cash stack SVG asset. */
function getIsometricCashPileSVG() {
  return cashPileSvg;
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

    // 1. Shake payer card, trigger 3D token hurt recoil, and pop deduction text
    fromCard.classList.add('hud-card-deduct');
    spawnFloatingCashOnHUD(fromIdx, `-${fmtMoney(amount)} Rent`, false);
    triggerTokenHurtAnimation(fromIdx);

    // Update bottom-center status pill in real-time
    setStatusPill(`💸 <strong>${fromPlayer.name}</strong> transferred <strong>${fmtMoney(amount)}</strong> rent to <strong>${toPlayer.name}</strong>`, { isThinking: false, durationMs: 4500 });

    // 2. Display rent payment game placard at center
    showRentTransferBanner(fromPlayer.name, toPlayer.name, amount, fromIdx, toIdx);

    // 3. Staggered flying cash bills & coins from payer card to owner card
    // Slower, graceful transfer duration (~1.45s per note) so bills are clearly tracked across screen
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

        function stepBill(now) {
          const t = Math.min(1, (now - startTime) / duration);
          const bx = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
          const by = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;
          const scale = 0.85 + Math.sin(t * Math.PI) * 0.42;
          const rot = (now - startTime) * 0.16 + Math.sin(t * Math.PI * 4) * 16;

          // Pure compositor translate3d avoids layout recalcs and paint thrash
          bill.style.transform = `translate3d(${bx}px, ${by}px, 0) translate(-50%, -50%) scale(${scale}) rotate(${rot}deg)`;
          // Fully visible across the board, fades out only on final contact with card
          bill.style.opacity = t < 0.94 ? '1' : `${Math.max(0, (1 - t) * 16)}`;

          if (t < 1) {
            requestAnimationFrame(stepBill);
          } else {
            bill.remove();
            landedCount++;

            if (landedCount === 1) {
              toCard.classList.add('hud-card-receive');
              playSFX('cash');
            }
            if (landedCount % 3 === 0) {
              playSFX('hop', 0.25);
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
window.showRentTransferBanner = showRentTransferBanner;


/** Show the turn-lock warning toast. */
export function showTurnLockToast(msg = 'Wait for your turn to manage cities!') {
  const toast = document.getElementById('turn-lock-toast');
  const textEl = document.getElementById('turn-lock-toast-text');
  if (!toast || !textEl) return;
  textEl.textContent = msg;
  toast.classList.remove('hidden');
  animateToastAccordionPush(toast);
  showSpeechBubble(msg, 2000);
  if (toast._timer) clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), 2200);
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
      setStatusPill(`🎲 <strong>Your Turn</strong> — Roll the dice or press Space!`, { isThinking: false, playerIdx: curIdx, durationMs: 0 });
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
    setStatusPill(`⏳ Waiting for <strong>${p.name}</strong>'s move...`, { isThinking: true, playerIdx: curIdx });
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
  const p = gameState.players[gameState.currentPlayerIdx];
  if (!p) return;

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

  // In online multiplayer: If this is NOT our turn, completely hide the roll buttons!
  const isOnlineOtherTurn = networkState.isMultiplayer && (gameState.currentPlayerIdx !== networkState.localPlayerIdx);

  if (p.isAI || isOnlineOtherTurn) {
    btnCenter.classList.add('hidden');
    btnBottom.classList.add('hidden');
    btnBail.classList.add('hidden');
    return;
  }

  if (gameState.phase === 'ROLL') {
    btnCenter.classList.remove('hidden');
    btnBottom.classList.remove('hidden');
    btnCenter.disabled = false; btnBottom.disabled = false;
    lblCenter.textContent = 'Roll'; lblBottom.textContent = 'Roll';
    btnBail.classList.toggle('hidden', !(p.inIsland && p.cash >= 150000));
    btnBail.classList.toggle('inline-flex', !!(p.inIsland && p.cash >= 150000));
  } else if (gameState.phase === 'END') {
    btnCenter.classList.remove('hidden');
    btnBottom.classList.remove('hidden');
    btnCenter.disabled = false; btnBottom.disabled = false;
    lblCenter.textContent = 'End Turn'; lblBottom.textContent = 'End Turn';
    btnBail.classList.add('hidden');
  } else {
    btnCenter.classList.add('hidden');
    btnBottom.classList.add('hidden');
    btnBail.classList.add('hidden');
  }
}
