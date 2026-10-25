/**
 * ui/hud/cards.js
 * Corner player HUD cards rendering, cash displays, asset property badges, and rent transfer placards.
 */

import { PLAYER_THEMES, GROUP_META } from '../../game/data.js';
import { gameState, displayedCash, matchSettings } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { ownsFullColorGroup } from '../../game/rules.js';
import { triggerTokenHurtAnimation } from '../../three/scene.js';
import { networkState } from '../../network/p2p.js';
import { playSFX } from '../../game/audio.js';
import { animateNumberCounter, animateHUDCardSpringAbsorb } from '../anim.js';
import { setPlayerPortraitMood, drawPortraitFrame, initPortraitRenderLoop } from '../portraitRenderer.js';
import { setStatusPill } from './statusPill.js';

export { setPlayerPortraitMood, drawPortraitFrame } from '../portraitRenderer.js';

function syncIslandBarsOnCard(card, isDetained) {
  if (!card) return;
  card.classList.toggle('in-island-detention', isDetained);
  let bars = card.querySelector('.island-iron-bars');
  if (isDetained) {
    if (!bars) {
      bars = document.createElement('div');
      bars.className = 'island-iron-bars';
      for (let i = 0; i < 4; i++) {
        const rod = document.createElement('div');
        rod.className = 'island-bar-rod';
        bars.appendChild(rod);
      }
      card.appendChild(bars);
    }
  } else if (bars) {
    bars.remove();
  }
}

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

    const isDetained = Boolean(p.inIsland);
    const islandTurns = p.islandTurns || 0;
    const islandBadgeHtml = isDetained
      ? `<span class="hud-detention-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/50 text-amber-900 font-black text-[9px] tracking-wider shadow-2xs" title="In Island Detention (Turn ${islandTurns}/3)"><i class="fa-solid fa-lock text-[8px] text-amber-700"></i> JAIL ${islandTurns}/3</span>`
      : '';

    if (needsRebuild) {
      const wrapper = document.createElement('div');
      wrapper.className = `player-hud-wrapper flex items-center ${p.bankrupt ? 'opacity-35 grayscale' : (isTurn ? 'opacity-100' : 'opacity-90 hover:opacity-100')} transition-opacity duration-150`;

      const card = document.createElement('div');
      card.id = `hud-card-${idx}`;
      card.className = `player-hud-card ${isTurn ? 'active-turn-hud' : ''} ${isDetained ? 'in-island-detention' : ''}`;

      if (isLeft) {
        card.innerHTML = `
          <div class="avatar-circle" style="box-shadow: 0 0 0 2.5px ${theme.colorHex}, 0 4px 10px rgba(0,0,0,0.12);">
            <canvas id="hud-avatar-canvas-${idx}" width="104" height="104" class="w-full h-full block"></canvas>
          </div>
          <div class="hud-info-col">
            <div class="hud-header-row">
              <span class="hud-player-name">${p.name}</span>
              <span class="hud-island-icon">${islandBadgeHtml}</span>
              <span class="hud-turn-badge">${turnBadgeHtml}</span>
            </div>
            <div class="hud-cash-row">
              <span id="hud-cash-val-${idx}" class="hud-cash-amount">${p.bankrupt ? 'OUT' : fmtMoney(shownMoney)}</span>
              <span class="hud-cash-icon" title="Cash">💵</span>
            </div>
          </div>
        `;
        wrapper.appendChild(card);
        leftContainer.appendChild(wrapper);
      } else {
        card.innerHTML = `
          <div class="hud-info-col items-end text-right">
            <div class="hud-header-row justify-end">
              <span class="hud-turn-badge">${turnBadgeHtml}</span>
              <span class="hud-island-icon">${islandBadgeHtml}</span>
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
        `;
        wrapper.appendChild(card);
        rightContainer.appendChild(wrapper);
      }

      syncIslandBarsOnCard(card, isDetained);

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
        syncIslandBarsOnCard(card, isDetained);

        const wrapper = card.closest('.player-hud-wrapper') || card.parentElement;
        if (wrapper) {
          wrapper.className = `player-hud-wrapper flex items-center ${p.bankrupt ? 'opacity-35 grayscale' : (isTurn ? 'opacity-100' : 'opacity-90 hover:opacity-100')} transition-opacity duration-150`;
        }
        const nameEl = card.querySelector('.hud-player-name');
        if (nameEl && nameEl.textContent !== p.name) nameEl.textContent = p.name;

        const islandEl = card.querySelector('.hud-island-icon');
        if (islandEl) islandEl.innerHTML = islandBadgeHtml;

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
