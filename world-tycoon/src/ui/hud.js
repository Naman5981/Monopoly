/**
 * ui/hud.js
 * Renders corner player HUD cards, event log, toasts, and floating cash pop-ups.
 */

import { PLAYER_THEMES, GROUP_META } from '../game/data.js';
import { gameState, displayedCash, matchSettings } from '../game/state.js';
import { fmtMoney } from '../game/utils.js';
import { ownsFullColorGroup } from '../game/rules.js';
import { showSpeechBubble } from '../three/scene.js';
import { networkState } from '../network/p2p.js';
import { playSFX } from '../game/audio.js';

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
}

function getIsometricCashPileSVG() {
  return `
    <svg width="108" height="78" viewBox="0 0 110 80" class="drop-shadow-md hidden sm:block">
      <ellipse cx="56" cy="62" rx="44" ry="14" fill="rgba(148, 163, 184, 0.35)"/>
      <g transform="translate(18, 12)">
        <polygon points="28,0 56,14 28,28 0,14" fill="#86efac" stroke="#22c55e" stroke-width="1"/>
        <polygon points="0,14 28,28 28,44 0,30" fill="#4ade80"/>
        <polygon points="28,28 56,14 56,30 28,44" fill="#16a34a"/>
        <polygon points="18,6 26,10 12,24 4,20" fill="#facc15"/>
      </g>
      <g transform="translate(36, 36)">
        <polygon points="18,0 38,10 18,20 0,10" fill="#e2e8f0"/>
        <polygon points="0,10 18,20 18,28 0,18" fill="#cbd5e1"/>
        <polygon points="18,20 38,10 38,18 18,28" fill="#94a3b8"/>
      </g>
      <g transform="translate(52, 42)">
        <polygon points="16,0 32,8 16,16 0,8" fill="#fde047"/>
        <polygon points="0,8 16,16 16,24 0,16" fill="#facc15"/>
        <polygon points="16,16 32,8 32,16 16,24" fill="#ca8a04"/>
      </g>
      <ellipse cx="36" cy="64" rx="6" ry="4" fill="#facc15" stroke="#ca8a04" stroke-width="1"/>
      <ellipse cx="52" cy="68" rx="6" ry="4" fill="#fde047" stroke="#ca8a04" stroke-width="1"/>
    </svg>
  `;
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

    // 1. Shake payer card and pop deduction text
    fromCard.classList.add('hud-card-deduct');
    spawnFloatingCashOnHUD(fromIdx, `-${fmtMoney(amount)} Rent`, false);
    playSFX('hop');

    // 2. Display rent payment game placard at center
    showRentTransferBanner(fromPlayer.name, toPlayer.name, amount, fromIdx, toIdx);

    // 3. Staggered flying cash bills / coins from payer card to owner card
    const billCount = 12;
    const duration = 650;

    for (let i = 0; i < billCount; i++) {
      setTimeout(() => {
        const bill = document.createElement('div');
        bill.className = 'flying-cash-bill';
        bill.innerHTML = i % 2 === 0 ? '💵' : (i % 3 === 0 ? '🪙' : '💸');
        document.body.appendChild(bill);

        const startTime = performance.now();
        const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 120;
        const midY = Math.min(startY, endY) - 90 - Math.random() * 80;

        function stepBill(now) {
          const t = Math.min(1, (now - startTime) / duration);
          const bx = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
          const by = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;
          const scale = 1 + Math.sin(t * Math.PI) * 0.6;
          const rot = (now - startTime) * 0.75;

          bill.style.left = `${bx}px`;
          bill.style.top = `${by}px`;
          bill.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${rot}deg)`;
          bill.style.opacity = t < 0.88 ? '1' : `${(1 - t) * 8}`;

          if (t < 1) {
            requestAnimationFrame(stepBill);
          } else {
            bill.remove();
          }
        }
        requestAnimationFrame(stepBill);
      }, i * 46);
    }

    // 4. When bills stream into the receiver card
    setTimeout(() => {
      fromCard.classList.remove('hud-card-deduct');
      toCard.classList.add('hud-card-receive');
      playSFX('cash');
      spawnFloatingCashOnHUD(toIdx, `+${fmtMoney(amount)} Rent`, true);

      // Smooth count numbers
      const fromEl = document.getElementById(`hud-cash-val-${fromIdx}`);
      const toEl = document.getElementById(`hud-cash-val-${toIdx}`);
      if (fromEl) {
        fromEl.classList.add('text-rose-600');
        fromEl.textContent = fmtMoney(Math.max(0, fromPlayer.cash - amount));
      }
      if (toEl) {
        toEl.classList.add('text-emerald-600');
        toEl.textContent = fmtMoney(toPlayer.cash + amount);
      }

      setTimeout(() => {
        toCard.classList.remove('hud-card-receive');
        if (fromEl) fromEl.classList.remove('text-rose-600');
        if (toEl) toEl.classList.remove('text-emerald-600');
        resolve();
      }, 550);
    }, billCount * 46 + duration * 0.65);
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
  }, 2700);

  banner._hideTimer = setTimeout(() => {
    banner.classList.remove('active', 'exit');
  }, 3050);
}
window.showRentTransferBanner = showRentTransferBanner;


/** Show the turn-lock warning toast. */
export function showTurnLockToast(msg = 'Wait for your turn to manage cities!') {
  const toast = document.getElementById('turn-lock-toast');
  const textEl = document.getElementById('turn-lock-toast-text');
  if (!toast || !textEl) return;
  textEl.textContent = msg;
  toast.classList.remove('hidden');
  showSpeechBubble(msg, 2000);
  if (toast._timer) clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), 2200);
}

/** Log an event to the event log drawer. */
export function logEvent(html) {
  const log = document.getElementById('activity-log');
  const div = document.createElement('div');
  div.className = 'border-l-2 border-indigo-400 pl-2 py-0.5';
  div.innerHTML = html;
  log.prepend(div);
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
