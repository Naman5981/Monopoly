/**
 * ui/hud/cards.js
 * Corner player HUD cards rendering, cash displays, asset property badges, and rent transfer placards.
 */

import { PLAYER_THEMES, GROUP_META, TEAM_META, BOARD_TILES } from '../../game/data.js';
import { triggerBanner } from '../../svelte/stores/bannerStore.js';
import { gameState, displayedCash, matchSettings } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { ownsFullColorGroup, calculateTeamNetWorth, calculatePlayerNetWorth, isTeammate } from '../../game/rules.js';
import { triggerTokenHurtAnimation } from '../../three/scene.js';
import { networkState } from '../../network/p2p.js';
import { playSFX } from '../../game/audio.js';
import { animateHUDCardSpringAbsorb } from '../anim.js';
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
    displayedCash[id] = player.cash;
    const shownMoney = player.cash;
    const playerTeam = player.teamId !== undefined ? player.teamId : (id % 2);
    const isLeft = isTeamMode ? (playerTeam === localTeamId) : (id % 2 === 0);
    const isPartner = isTeamMode && (playerTeam === localTeamId) && (id !== localPlayerIdx);
    const teamHex = TEAM_META[playerTeam]?.colorHex || (playerTeam === 0 ? '#ef4444' : '#3b82f6');
    const colorHex = isTeamMode
      ? teamHex
      : (player.colorHex || matchSettings.customPlayers?.[id]?.colorHex || theme.colorHex);

    const playerRecord = {
      id,
      name: player.name,
      isAI: Boolean(player.isAI),
      isSelf: id === localPlayerIdx,
      isHost: networkState.isMultiplayer && id === 0,
      isCurrent: id === gameState.currentPlayerIdx,
      colorHex,
      cashFormatted: player.bankrupt ? 'OUT' : fmtMoney(shownMoney),
      inIsland: Boolean(player.inIsland),
      islandTurns: player.islandTurns || 0,
      bankrupt: Boolean(player.bankrupt),
      teamId: playerTeam,
      isPartner,
      isTeamMode
    };

    (isLeft ? leftPlayers : rightPlayers).push(playerRecord);

    if (typeof document !== 'undefined') {
      const cardEl = document.getElementById(`hud-card-${id}`);
      if (cardEl && !player.inIsland) {
        cardEl.classList.remove('in-island-detention');
        const bars = cardEl.querySelectorAll('.island-iron-bars');
        bars.forEach(b => b.remove());
      }
    }

    if (!isSvelteMounted && typeof document !== 'undefined') {
      syncFallbackCard(id, player, shownMoney, isLeft, leftContainer, rightContainer);
    }
  });

  const aliveCount = gameState.players.filter(player => !player.bankrupt).length;
  const mySets = Object.keys(GROUP_META).filter(group => ownsFullColorGroup(0, group)).length;
  const targetSets = matchSettings.monopolySetsToWin || (isTeamMode ? 4 : 3);

  const rankedByNetWorth = gameState.players
    .map((p, idx) => ({ idx, bankrupt: Boolean(p.bankrupt), nw: calculatePlayerNetWorth(idx) }))
    .sort((a, b) => {
      if (a.bankrupt !== b.bankrupt) return a.bankrupt ? 1 : -1;
      return b.nw - a.nw;
    });
  const localRankEntryIdx = rankedByNetWorth.findIndex(entry => entry.idx === localPlayerIdx);
  const localRank = localRankEntryIdx >= 0 ? localRankEntryIdx + 1 : 1;
  const localNetWorth = localRankEntryIdx >= 0 ? rankedByNetWorth[localRankEntryIdx].nw : calculatePlayerNetWorth(localPlayerIdx);
  const localNetWorthFormatted = fmtMoney(localNetWorth);

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
    localRank,
    localNetWorthFormatted,
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

  const leaderboard = typeof document !== 'undefined' ? document.getElementById('modal-leaderboard') : null;
  if (leaderboard && !leaderboard.classList.contains('hidden') && window.renderLeaderboardModal) {
    window.renderLeaderboardModal();
  }
}
/** Show a floating cash label next to a player's HUD card and pulse the card. */
export function spawnFloatingCashOnHUD(playerIdx, text, isGain = true) {
  const card = document.getElementById(`hud-card-${playerIdx}`);
  if (card) {
    const pulseClass = isGain ? 'hud-card-receive' : 'hud-card-deduct';
    card.classList.remove('hud-card-receive', 'hud-card-deduct');
    void card.offsetWidth;
    card.classList.add(pulseClass);
    setTimeout(() => {
      card?.classList.remove(pulseClass);
    }, 650);
  }
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
export function animateRentTransferOnHUD(fromIdx, toIdx, amount, tileObj = null) {
  return new Promise(resolve => {
    const fromCard = document.getElementById(`hud-card-${fromIdx}`);
    const toCard = document.getElementById(`hud-card-${toIdx}`);
    const fromPlayer = gameState.players[fromIdx];
    const toPlayer = gameState.players[toIdx];

    if (globalThis.__WT_TEST__ || !fromCard || !toCard || !fromPlayer || !toPlayer) {
      if (!globalThis.__WT_TEST__) {
        spawnFloatingCashOnHUD(fromIdx, `-${fmtMoney(amount)}`, false);
        spawnFloatingCashOnHUD(toIdx, `+${fmtMoney(amount)}`, true);
      }
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
    playSFX('payRent');
    setPlayerPortraitMood(fromIdx, 'crying', 3500);
    setPlayerPortraitMood(toIdx, 'smug', 3500);
    spawnFloatingCashOnHUD(fromIdx, `-${fmtMoney(amount)} Rent`, false);
    triggerTokenHurtAnimation(fromIdx);

    // Update bottom-center status pill in real-time
    setStatusPill(`💸 <strong>${fromPlayer.name}</strong> transferred <strong>${fmtMoney(amount)}</strong> rent to <strong>${toPlayer.name}</strong>`, { isThinking: false, durationMs: 4500 });

    const tile = tileObj || (fromPlayer && typeof fromPlayer.position === 'number' ? BOARD_TILES[fromPlayer.position] : null);
    const cityName = tile?.name || 'CITY';
    const groupColor = (tile?.group && GROUP_META[tile.group]) ? GROUP_META[tile.group].colorHex : '#f59e0b';

    // 2. Display declarative Svelte rent settlement pill
    showRentTransferBanner(fromPlayer.name, toPlayer.name, amount, fromIdx, toIdx, cityName, groupColor);

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
              playSFX('receiveRent');
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

      const fromEl = document.getElementById(`hud-cash-val-${fromIdx}`);
      const toEl = document.getElementById(`hud-cash-val-${toIdx}`);
      if (fromEl) fromEl.classList.add('text-rose-600');
      if (toEl) toEl.classList.add('text-emerald-600');

      setTimeout(() => {
        toCard.classList.remove('hud-card-receive');
        if (fromEl) fromEl.classList.remove('text-rose-600');
        if (toEl) toEl.classList.remove('text-emerald-600');
        resolve();
      }, 650);
    }, totalFlightTime - 80);
  });
}

export function showRentTransferBanner(fromName, toName, amount, fromIdx = null, toIdx = null, cityName = 'CITY', groupColor = '#f59e0b') {
  const fromTheme = (fromIdx !== null && PLAYER_THEMES[fromIdx]) ? PLAYER_THEMES[fromIdx] : { colorHex: '#f43f5e' };
  const toTheme = (toIdx !== null && PLAYER_THEMES[toIdx]) ? PLAYER_THEMES[toIdx] : { colorHex: '#10b981' };

  triggerBanner('rentTransfer', {
    fromName,
    toName,
    amount,
    amountFormatted: fmtMoney(amount),
    fromColor: fromTheme.colorHex,
    toColor: toTheme.colorHex,
    cityName,
    groupColor
  }, 2800);
}

if (typeof window !== 'undefined') {
  window.showRentTransferBanner = showRentTransferBanner;
}
