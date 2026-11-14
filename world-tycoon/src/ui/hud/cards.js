/**
 * ui/hud/cards.js
 * Corner player HUD cards rendering, cash displays, asset property badges, and rent transfer placards.
 */

import { PLAYER_THEMES, GROUP_META, TEAM_META } from '../../game/data.js';
import { gameState, displayedCash, matchSettings } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { ownsFullColorGroup, calculateTeamNetWorth, isTeammate } from '../../game/rules.js';
import { triggerTokenHurtAnimation } from '../../three/scene.js';
import { networkState } from '../../network/p2p.js';
import { playSFX } from '../../game/audio.js';
import { animateNumberCounter, animateHUDCardSpringAbsorb } from '../anim.js';
import { setPlayerPortraitMood, drawPortraitFrame, initPortraitRenderLoop } from '../portraitRenderer.js';
import { setStatusPill } from './statusPill.js';
import { updateHudState } from '../../svelte/stores/hudStore.js';

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

function syncFallbackCard(id, player, shownMoney, isLeft, leftContainer, rightContainer) {
  let card = document.getElementById(`hud-card-${id}`);
  const isDetained = Boolean(player.inIsland);
  const islandTurns = player.islandTurns || 1;
  const islandBadgeHtml = isDetained
    ? `<span class="hud-detention-badge">JAIL ${islandTurns}/3</span>`
    : '';

  if (!card && (leftContainer || rightContainer)) {
    card = document.createElement('div');
    card.id = `hud-card-${id}`;
    card.className = 'player-hud-card';
    card.innerHTML = `
      <span class="hud-player-name">${player.name}</span>
      <span class="hud-island-icon">${islandBadgeHtml}</span>
      <span id="hud-cash-val-${id}">${player.bankrupt ? 'OUT' : fmtMoney(shownMoney)}</span>
    `;
    if (isLeft && leftContainer) leftContainer.appendChild(card);
    else if (rightContainer) rightContainer.appendChild(card);
  } else if (card) {
    card.innerHTML = `
      <span class="hud-player-name">${player.name}</span>
      <span class="hud-island-icon">${islandBadgeHtml}</span>
      <span id="hud-cash-val-${id}">${player.bankrupt ? 'OUT' : fmtMoney(shownMoney)}</span>
    `;
  }
  syncIslandBarsOnCard(card, isDetained);
}

/** Render player HUD data for the Svelte card components. */
export function renderCornerHUDs() {
  initPortraitRenderLoop();
  const isSvelteMounted = typeof document !== 'undefined' && Boolean(document.getElementById('svelte-hud-mount')?.firstElementChild);
  const leftContainer = typeof document !== 'undefined' ? document.getElementById('hud-left-players') : null;
  const rightContainer = typeof document !== 'undefined' ? document.getElementById('hud-right-players') : null;
  const leftPlayers = [];
  const rightPlayers = [];

  const isTeamMode = Boolean(matchSettings.teamMode);
  const localPlayerIdx = networkState.isMultiplayer ? (networkState.localPlayerIdx || 0) : 0;
  const localPlayer = gameState.players[localPlayerIdx];
  const localTeamId = localPlayer?.teamId ?? 0;
  const enemyTeamId = (localTeamId === 0) ? 1 : 0;

  gameState.players.forEach((player, id) => {
    const theme = PLAYER_THEMES[id] || { colorHex: '#3b82f6' };
    const shownMoney = displayedCash[id] ?? player.cash;
    const playerTeam = player.teamId !== undefined ? player.teamId : (id % 2);
    const isLeft = isTeamMode ? (playerTeam === localTeamId) : (id % 2 === 0);
    const isPartner = isTeamMode && (playerTeam === localTeamId) && (id !== localPlayerIdx);

    const playerRecord = {
      id,
      name: player.name,
      isAI: Boolean(player.isAI),
      isSelf: id === localPlayerIdx,
      isHost: networkState.isMultiplayer && id === 0,
      isCurrent: id === gameState.currentPlayerIdx,
      colorHex: theme.colorHex,
      cashFormatted: player.bankrupt ? 'OUT' : fmtMoney(shownMoney),
      inIsland: Boolean(player.inIsland),
      islandTurns: player.islandTurns || 0,
      bankrupt: Boolean(player.bankrupt),
      teamId: playerTeam,
      isPartner,
      isTeamMode
    };

    (isLeft ? leftPlayers : rightPlayers).push(playerRecord);

    if (!isSvelteMounted) {
      syncFallbackCard(id, player, shownMoney, isLeft, leftContainer, rightContainer);
    }
  });

  const aliveCount = gameState.players.filter(player => !player.bankrupt).length;
  const mySets = Object.keys(GROUP_META).filter(group => ownsFullColorGroup(0, group)).length;
  const targetSets = matchSettings.monopolySetsToWin || (isTeamMode ? 4 : 3);

  let leftTeamNetWorth = '$0';
  let rightTeamNetWorth = '$0';
  let leftTeamLabel = 'TEAM RED';
  let rightTeamLabel = 'TEAM BLUE';
  let leftTeamColor = '#ef4444';
  let rightTeamColor = '#3b82f6';

  if (isTeamMode) {
    const leftNw = calculateTeamNetWorth(localTeamId);
    const rightNw = calculateTeamNetWorth(enemyTeamId);
    leftTeamNetWorth = fmtMoney(leftNw);
    rightTeamNetWorth = fmtMoney(rightNw);
    const leftMeta = TEAM_META[localTeamId] || { name: 'TEAM RED', colorHex: '#ef4444' };
    const rightMeta = TEAM_META[enemyTeamId] || { name: 'TEAM BLUE', colorHex: '#3b82f6' };
    leftTeamLabel = leftMeta.name;
    rightTeamLabel = rightMeta.name;
    leftTeamColor = leftMeta.colorHex;
    rightTeamColor = rightMeta.colorHex;
  }

  updateHudState({
    playerCount: `${aliveCount}/${gameState.players.length}`,
    monopolySets: `${mySets}/${targetSets} Sets`,
    isTeamMode,
    leftPlayers,
    rightPlayers,
    leftTeamNetWorth,
    rightTeamNetWorth,
    leftTeamLabel,
    rightTeamLabel,
    leftTeamColor,
    rightTeamColor
  });

  const leaderboard = document.getElementById('modal-leaderboard');
  if (leaderboard && !leaderboard.classList.contains('hidden') && window.renderLeaderboardModal) {
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
    <!-- Top Header Ribbon with Warm Amber Gradient -->
    <div class="bg-gradient-to-r from-amber-500 to-amber-700 py-3 px-4 text-white text-center font-rounded font-black text-xs sm:text-sm tracking-widest uppercase flex items-center justify-center gap-2 border-b-2 border-amber-300 shadow-xs">
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
