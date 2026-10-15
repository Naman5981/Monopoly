/**
 * ui/modals.js
 * Modals management: Buy City, Live Auction, Chance Wheel, Inspector, Portfolio, Trade, Lobby, Rules, Victory.
 */

import { BOARD_TILES, GROUP_META, PLAYER_THEMES, CHANCE_WHEEL_PRIZES } from '../game/data.js';
import { gameState, isHumanTurnActionable, setLobbyPlayerCount, lobbyPlayerCount, displayedCash, localPlayerIdx } from '../game/state.js';
import { fmtMoney } from '../game/utils.js';
import { playSFX } from '../game/audio.js';
import { calculateTileRent, ownsFullColorGroup } from '../game/rules.js';
import { networkState, broadcastAction, broadcastReturnToLobby, broadcastStartOnlineMatch } from '../network/p2p.js';
import { matchSettings } from '../game/state.js';
import {
  populateCityPreview3DScene,
  clearCityPreview,
  setTileHighlightRing,
  showSpeechBubble,
  refreshTileTextureAndBuildings,
  getTileWorldPosition,
  setMonopolyTileHighlights,
  startIntroCameraFlyIn
} from '../three/scene.js';
import { renderCornerHUDs, showTurnLockToast, logEvent } from './hud.js';
import { fireConfettiBurst, spawnAnimatedReaction, startVictoryCelebration, stopVictoryCelebration } from '../three/effects.js';
import { saveCurrentMatchToStorage } from '../game/persistence.js';

let engineCallbacks = {};

export function registerEngineCallbacks(cbs) {
  engineCallbacks = cbs;
}

/* ─────────────────────────────────────────────────────────────────────────────
   A. BUY CITY MODAL
───────────────────────────────────────────────────────────────────────────── */
export function openBuyCityModal(tile, isDoubles) {
  gameState.phase = 'MODAL';
  gameState.pendingBuyTile = tile;
  gameState.pendingDoubles = isDoubles;
  if (engineCallbacks.updateUI) engineCallbacks.updateUI();

  const pos = getTileWorldPosition(tile.id);
  setTileHighlightRing(tile.id, true);

  const header = document.getElementById('buy-modal-header');
  header.style.background = tile.group ? GROUP_META[tile.group].hex : '#0284c7';
  document.getElementById('buy-modal-country').textContent = tile.group ? GROUP_META[tile.group].name : 'RESORT DESTINATION';
  document.getElementById('buy-modal-name').textContent = tile.name;
  document.getElementById('buy-modal-price').textContent = fmtMoney(tile.price);
  document.getElementById('buy-modal-rent').textContent = fmtMoney(tile.rent[0]);

  const tiers = document.getElementById('buy-modal-tiers');
  if (tile.type === 'city') {
    tiers.innerHTML = `
      <div class="flex justify-between py-1 border-b border-slate-200"><span>1 House</span><strong class="text-slate-900">${fmtMoney(tile.rent[1])}</strong></div>
      <div class="flex justify-between py-1 border-b border-slate-200"><span>2 Houses</span><strong class="text-slate-900">${fmtMoney(tile.rent[2])}</strong></div>
      <div class="flex justify-between py-1 border-b border-slate-200"><span>3 Houses</span><strong class="text-slate-900">${fmtMoney(tile.rent[3])}</strong></div>
      <div class="flex justify-between py-1 text-sky-700 font-black"><span>Skyscraper</span><strong class="text-sky-800">${fmtMoney(tile.rent[4])}</strong></div>
    `;
  } else {
    tiers.innerHTML = `<div class="text-center font-black text-slate-800 py-1">Own both Resorts for higher payouts!</div>`;
  }

  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx] || gameState.players[0];
  const btnBuy = document.getElementById('btn-confirm-buy');
  const canAfford = p && p.cash >= tile.price;
  btnBuy.disabled = !canAfford;
  btnBuy.innerHTML = canAfford
    ? `<i class="fa-solid fa-cart-shopping mr-1"></i> BUY CITY`
    : `<i class="fa-solid fa-lock mr-1"></i> NEED ${fmtMoney(tile.price)}`;
  btnBuy.className = `game-btn ${canAfford ? 'game-btn-green' : 'game-btn-slate opacity-50 cursor-not-allowed'} flex-1 py-3.5 text-sm font-black`;

  populateCityPreview3DScene(tile, 'buy-city-3d-canvas');

  const m = document.getElementById('modal-buy-city');
  const card = document.getElementById('modal-buy-city-card');
  m.classList.remove('hidden');
  m.classList.add('flex', 'city-modal-backdrop-enter');
  if (card) {
    card.classList.remove('city-modal-card-exit', 'city-modal-card-enter');
    void card.offsetWidth;
    card.classList.add('city-modal-card-enter');
  }
  playSFX('hop');
}

export function confirmBuyCity() {
  const tile = gameState.pendingBuyTile;
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  if (!tile || !p || p.cash < tile.price) return;

  p.cash -= tile.price;
  gameState.properties[tile.id].owner = pIdx;
  playSFX('build');
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.4, 45);
  spawnAnimatedReaction('money', window.innerWidth / 2, window.innerHeight * 0.4);
  if (engineCallbacks.spawnFloatingCash) engineCallbacks.spawnFloatingCash(pIdx, `-${fmtMoney(tile.price)}`, false);
  logEvent(`🏙️ <strong>${p.name}</strong> bought <strong>${tile.name}</strong> for <strong>${fmtMoney(tile.price)}</strong>!`);

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_BUY_CITY', { playerIdx: pIdx, tileId: tile.id });
  }

  clearCityPreview();
  document.getElementById('modal-buy-city').classList.add('hidden');
  document.getElementById('modal-buy-city').classList.remove('flex');
  refreshTileTextureAndBuildings(tile.id);
  renderCornerHUDs();
  if (tile.group) {
    checkAndTriggerMonopoly(pIdx, tile.group);
  }
  if (engineCallbacks.concludeActionPhase) {
    engineCallbacks.concludeActionPhase(gameState.pendingDoubles);
  }
}

export function passBuyCity() {
  const tile = gameState.pendingBuyTile;
  if (tile) {
    setTileHighlightRing(tile.id, false);
    const p = gameState.players[gameState.currentPlayerIdx];
    if (p) logEvent(`🏷️ <strong>${p.name}</strong> passed on buying <strong>${tile.name}</strong>.`);
  }
  clearCityPreview();
  const m = document.getElementById('modal-buy-city');
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
  gameState.pendingBuyTile = null;

  if (engineCallbacks.concludeActionPhase) {
    engineCallbacks.concludeActionPhase(gameState.pendingDoubles);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   A2. UPGRADE CITY POPUP MODAL (When landing on owned property)
───────────────────────────────────────────────────────────────────────────── */
export function openUpgradeCityModal(tile, isDoubles) {
  gameState.phase = 'MODAL';
  gameState.pendingUpgradeTile = tile;
  gameState.pendingDoubles = isDoubles;
  gameState.upgradesThisVisit = 0;
  if (engineCallbacks.updateUI) engineCallbacks.updateUI();

  setTileHighlightRing(tile.id, true);
  renderUpgradeModalContent(tile);
  populateCityPreview3DScene(tile, 'upgrade-city-3d-canvas');

  const m = document.getElementById('modal-upgrade-city');
  const card = document.getElementById('modal-upgrade-city-card');
  m.classList.remove('hidden');
  m.classList.add('flex', 'city-modal-backdrop-enter');
  if (card) {
    card.classList.remove('city-modal-card-exit', 'city-modal-card-enter');
    void card.offsetWidth;
    card.classList.add('city-modal-card-enter');
  }
  playSFX('hop');
}

export function renderUpgradeModalContent(tile) {
  const st = gameState.properties[tile.id];
  if (!st) return;
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx] || gameState.players[0];

  const header = document.getElementById('upgrade-modal-header');
  const groupColor = tile.group ? GROUP_META[tile.group].hex : '#10b981';
  header.style.background = groupColor;

  document.getElementById('upgrade-modal-country').innerHTML = `
    <i class="fa-solid fa-crown text-amber-300"></i> ${tile.group ? GROUP_META[tile.group].name : 'ESTATE'}
  `;

  const levelLabels = ['Base', '1 House', '2 Houses', '3 Houses', 'Skyscraper'];
  const levelPill = document.getElementById('upgrade-modal-level-pill');
  if (st.mortgaged) {
    levelPill.textContent = 'MORTGAGED';
    levelPill.className = 'text-xs font-black px-2.5 py-1 rounded-full bg-rose-600/90 border border-white/40 shadow-xs';
  } else {
    levelPill.textContent = `Level ${st.level}: ${levelLabels[st.level] || 'Base'}`;
    levelPill.className = 'text-xs font-black px-2.5 py-1 rounded-full bg-white/25 border border-white/40 shadow-xs';
  }

  document.getElementById('upgrade-modal-name').textContent = tile.name;

  const curRent = calculateTileRent(tile.id);
  document.getElementById('upgrade-modal-current-rent').textContent = fmtMoney(curRent);
  document.getElementById('upgrade-modal-cost').textContent = fmtMoney(tile.houseCost);
  document.getElementById('upgrade-modal-balance').textContent = `Balance: ${fmtMoney(p.cash)}`;

  // Tiers breakdown
  const tiersEl = document.getElementById('upgrade-modal-tiers');
  tiersEl.innerHTML = levelLabels.map((lbl, idx) => {
    const isCurrent = (st.level === idx && !st.mortgaged);
    const isNext = (st.level + 1 === idx && !st.mortgaged);
    const rentVal = tile.rent[idx];
    let rowClass = 'flex justify-between items-center py-1 px-2 rounded-lg text-slate-700 transition-colors';
    let badge = '';
    if (isCurrent) {
      rowClass = 'flex justify-between items-center py-1 px-2.5 rounded-xl bg-emerald-100 text-emerald-950 font-black border border-emerald-300 shadow-2xs';
      badge = '<span class="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-black ml-1.5 shadow-2xs">Current</span>';
    } else if (isNext) {
      rowClass = 'flex justify-between items-center py-1 px-2.5 rounded-xl bg-sky-50 text-sky-950 font-black border border-sky-200';
      badge = '<span class="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-sky-600 text-white font-black ml-1.5">Next</span>';
    }
    return `
      <div class="${rowClass}">
        <span class="flex items-center text-xs font-extrabold">${lbl} ${badge}</span>
        <strong class="${isCurrent ? 'text-emerald-800 font-black' : isNext ? 'text-sky-800 font-black' : 'text-slate-800'}">${fmtMoney(rentVal)}</strong>
      </div>
    `;
  }).join('');

  // Status Notice & Upgrade button states
  const noticeEl = document.getElementById('upgrade-modal-notice');
  const btnUpgrade = document.getElementById('btn-confirm-upgrade');
  const btnUpgrade2 = document.getElementById('btn-confirm-upgrade-2');
  const btnClose = document.getElementById('btn-close-upgrade-modal');
  const upgradesDone = gameState.upgradesThisVisit || 0;

  if (st.mortgaged) {
    if (btnUpgrade2) btnUpgrade2.classList.add('hidden');
    const unmortCost = Math.round(tile.price * 0.55);
    const canUnmort = p.cash >= unmortCost;
    noticeEl.classList.remove('hidden');
    noticeEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-600 mr-1"></i> City is mortgaged! Unmortgage to start collecting rent and upgrading.`;
    btnUpgrade.disabled = !canUnmort;
    btnUpgrade.className = `game-btn ${canUnmort ? 'game-btn-blue' : 'game-btn-slate opacity-50 cursor-not-allowed'} flex-1 py-2.5 px-3 text-xs font-black flex flex-col items-center justify-center gap-0.5 leading-snug`;
    btnUpgrade.innerHTML = `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-key"></i> UNMORTGAGE</span><span class="text-[11px] font-extrabold opacity-90">(${fmtMoney(unmortCost)})</span>`;
    btnClose.textContent = 'CLOSE';
  } else if (upgradesDone >= 2) {
    if (btnUpgrade2) btnUpgrade2.classList.add('hidden');
    noticeEl.classList.remove('hidden');
    noticeEl.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600 mr-1"></i> <strong class="text-emerald-800">Visit Limit Reached (2/2)!</strong> You can upgrade at most 2 levels at one time.`;
    btnUpgrade.disabled = true;
    btnUpgrade.className = 'game-btn game-btn-slate opacity-50 cursor-not-allowed flex-1 py-2.5 px-3 text-xs font-black flex flex-col items-center justify-center gap-0.5 leading-snug';
    btnUpgrade.innerHTML = `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-ban text-amber-500"></i> MAX REACHED</span><span class="text-[11px] font-extrabold opacity-80">(2/2 Levels)</span>`;
    btnClose.textContent = 'DONE';
  } else if (st.level >= 4) {
    if (btnUpgrade2) btnUpgrade2.classList.add('hidden');
    noticeEl.classList.remove('hidden');
    noticeEl.innerHTML = `🏆 <strong class="text-amber-800">Skyscraper Maxed!</strong> This estate is generating maximum rent of ${fmtMoney(tile.rent[4])}.`;
    btnUpgrade.disabled = true;
    btnUpgrade.className = 'game-btn game-btn-slate opacity-50 cursor-not-allowed flex-1 py-2.5 px-3 text-xs font-black flex flex-col items-center justify-center gap-0.5 leading-snug';
    btnUpgrade.innerHTML = `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-crown text-amber-500"></i> MAX LEVEL</span><span class="text-[11px] font-extrabold opacity-80">(Skyscraper)</span>`;
    btnClose.textContent = 'DONE';
  } else {
    const canAfford = p.cash >= tile.houseCost;
    btnUpgrade.disabled = !canAfford;
    btnUpgrade.className = `game-btn ${canAfford ? 'game-btn-green' : 'game-btn-slate opacity-50 cursor-not-allowed'} flex-1 py-2.5 px-3 text-xs font-black flex flex-col items-center justify-center gap-0.5 leading-snug`;
    btnUpgrade.innerHTML = canAfford
      ? `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-arrow-up-right-dots"></i> +1 LEVEL</span><span class="text-[11px] font-extrabold opacity-90">(${fmtMoney(tile.houseCost)})</span>`
      : `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-lock"></i> +1 LEVEL</span><span class="text-[11px] font-extrabold opacity-80">(NEED ${fmtMoney(tile.houseCost)})</span>`;

    // Show +2 Levels button if 0 upgrades done yet, property can take 2 more levels, and level <= 2
    if (btnUpgrade2) {
      if (upgradesDone === 0 && st.level <= 2) {
        btnUpgrade2.classList.remove('hidden');
        const cost2 = tile.houseCost * 2;
        const canAfford2 = p.cash >= cost2;
        btnUpgrade2.disabled = !canAfford2;
        btnUpgrade2.className = `game-btn ${canAfford2 ? 'game-btn-blue' : 'game-btn-slate opacity-50 cursor-not-allowed'} flex-1 py-2.5 px-3 text-xs font-black flex flex-col items-center justify-center gap-0.5 leading-snug`;
        btnUpgrade2.innerHTML = canAfford2
          ? `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-angles-up"></i> +2 LEVELS</span><span class="text-[11px] font-extrabold opacity-90">(${fmtMoney(cost2)})</span>`
          : `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-lock"></i> +2 LEVELS</span><span class="text-[11px] font-extrabold opacity-80">(NEED ${fmtMoney(cost2)})</span>`;
      } else {
        btnUpgrade2.classList.add('hidden');
      }
    }

    if (upgradesDone > 0) {
      noticeEl.classList.remove('hidden');
      noticeEl.innerHTML = `⭐ <strong>${upgradesDone}/2 Upgrades completed</strong> this visit. You may upgrade 1 more level.`;
      btnClose.textContent = 'DONE';
    } else {
      noticeEl.classList.add('hidden');
      if (st.level > 0) {
        btnClose.textContent = 'DONE';
      } else {
        btnClose.textContent = 'CONTINUE';
      }
    }
  }
}

export function confirmUpgradeFromModal() {
  const tile = gameState.pendingUpgradeTile;
  if (!tile) return;
  const st = gameState.properties[tile.id];
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  if (!st || !p) return;

  if (st.mortgaged) {
    const unmortCost = Math.round(tile.price * 0.55);
    if (p.cash < unmortCost) return;
    p.cash -= unmortCost;
    st.mortgaged = false;
    playSFX('cash');
    logEvent(`🏦 <strong>${p.name}</strong> unmortgaged <strong>${tile.name}</strong>.`);
    refreshTileTextureAndBuildings(tile.id);
    renderCornerHUDs();
    renderUpgradeModalContent(tile);
    populateCityPreview3DScene(tile, 'upgrade-city-3d-canvas');
    return;
  }

  if ((gameState.upgradesThisVisit || 0) >= 2) {
    showTurnLockToast("You can only upgrade at most 2 levels at one time!");
    return;
  }

  if (st.level >= 4 || p.cash < tile.houseCost) return;

  upgradeCityLevel(tile.id, true);
  gameState.upgradesThisVisit = (gameState.upgradesThisVisit || 0) + 1;
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.4, 40);
  spawnAnimatedReaction('star', window.innerWidth / 2, window.innerHeight * 0.4);

  // Re-render modal content with new level, rent, and 3D preview
  renderUpgradeModalContent(tile);
  populateCityPreview3DScene(tile, 'upgrade-city-3d-canvas');
}

export function confirmUpgradeTwoLevelsFromModal() {
  const tile = gameState.pendingUpgradeTile;
  if (!tile) return;
  const st = gameState.properties[tile.id];
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  if (!st || !p || st.mortgaged) return;

  const cost2 = tile.houseCost * 2;
  if ((gameState.upgradesThisVisit || 0) > 0 || st.level > 2 || p.cash < cost2) return;

  upgradeCityLevel(tile.id, true);
  upgradeCityLevel(tile.id, true);
  gameState.upgradesThisVisit = 2;
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.4, 55);
  spawnAnimatedReaction('star', window.innerWidth / 2, window.innerHeight * 0.4);

  renderUpgradeModalContent(tile);
  populateCityPreview3DScene(tile, 'upgrade-city-3d-canvas');
}

export function closeUpgradeCityModal() {
  const tile = gameState.pendingUpgradeTile;
  if (tile) {
    setTileHighlightRing(tile.id, false);
  }
  clearCityPreview();
  const m = document.getElementById('modal-upgrade-city');
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
  gameState.pendingUpgradeTile = null;

  if (engineCallbacks.concludeActionPhase) {
    engineCallbacks.concludeActionPhase(gameState.pendingDoubles);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   B. LIVE AUCTION MODAL
───────────────────────────────────────────────────────────────────────────── */
export function startCityAuction() {
  clearCityPreview();
  document.getElementById('modal-buy-city').classList.add('hidden');
  document.getElementById('modal-buy-city').classList.remove('flex');

  const tile = gameState.pendingBuyTile;
  const activeBidders = gameState.players.map((p, idx) => (!p.bankrupt ? idx : -1)).filter(i => i !== -1);

  gameState.auction = {
    tile,
    highBid: Math.max(50000, Math.round((tile.price * 0.4) / 25000) * 25000),
    highBidder: 0,
    activeBidders,
    turnPos: 0
  };

  updateAuctionModalUI();
  const m = document.getElementById('modal-auction');
  m.classList.remove('hidden');
  m.classList.add('flex');
  checkAIAuctionTurn();
}

export function updateAuctionModalUI() {
  const a = gameState.auction;
  if (!a) return;
  document.getElementById('auction-city-name').textContent = `Bidding on ${a.tile.name}`;
  document.getElementById('auction-base-val').textContent = `Value: ${fmtMoney(a.tile.price)}`;
  document.getElementById('auction-high-bid').textContent = fmtMoney(a.highBid);
  document.getElementById('auction-high-bidder').textContent = `Leading: ${gameState.players[a.highBidder]?.name}`;
  const curBidderIdx = a.activeBidders[a.turnPos % a.activeBidders.length];
  document.getElementById('auction-turn-player').textContent = gameState.players[curBidderIdx]?.name || 'Unknown';
}

export function placeAuctionBid(increment) {
  const a = gameState.auction;
  if (!a) return;
  const curBidderIdx = a.activeBidders[a.turnPos % a.activeBidders.length];
  const bidder = gameState.players[curBidderIdx];
  if (bidder.cash < a.highBid + increment) {
    passAuctionBid();
    return;
  }
  a.highBid += increment;
  a.highBidder = curBidderIdx;
  a.turnPos = (a.turnPos + 1) % a.activeBidders.length;
  playSFX('hop');
  updateAuctionModalUI();
  checkAIAuctionTurn();
}

export function passAuctionBid() {
  const a = gameState.auction;
  if (!a) return;
  const curPos = a.turnPos % a.activeBidders.length;
  a.activeBidders.splice(curPos, 1);

  if (a.activeBidders.length <= 1) {
    const winnerIdx = a.activeBidders[0] !== undefined ? a.activeBidders[0] : a.highBidder;
    const winner = gameState.players[winnerIdx];
    winner.cash -= a.highBid;
    gameState.properties[a.tile.id].owner = winnerIdx;
    playSFX('gavel');
    fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.45, 50);
    if (engineCallbacks.spawnFloatingCash) engineCallbacks.spawnFloatingCash(winnerIdx, `-${fmtMoney(a.highBid)}`, false);
    logEvent(`🔨 <strong>${winner.name}</strong> won the auction for <strong>${a.tile.name}</strong> at <strong>${fmtMoney(a.highBid)}</strong>!`);

    document.getElementById('modal-auction').classList.add('hidden');
    document.getElementById('modal-auction').classList.remove('flex');
    refreshTileTextureAndBuildings(a.tile.id);
    renderCornerHUDs();
    if (a.tile.group) {
      checkAndTriggerMonopoly(winnerIdx, a.tile.group);
    }
    gameState.auction = null;
    if (engineCallbacks.concludeActionPhase) {
      engineCallbacks.concludeActionPhase(gameState.pendingDoubles);
    }
    return;
  }

  a.turnPos = a.turnPos % a.activeBidders.length;
  updateAuctionModalUI();
  checkAIAuctionTurn();
}

function checkAIAuctionTurn() {
  const a = gameState.auction;
  if (!a) return;
  const curBidderIdx = a.activeBidders[a.turnPos % a.activeBidders.length];
  const p = gameState.players[curBidderIdx];
  if (p && p.isAI) {
    setTimeout(() => {
      if (!gameState.auction) return;
      if (a.highBid + 25000 <= a.tile.price * 0.9 && p.cash >= a.highBid + 150000) {
        placeAuctionBid(25000);
      } else {
        passAuctionBid();
      }
    }, 550);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   C. CHANCE WHEEL MODAL
───────────────────────────────────────────────────────────────────────────── */
let wheelAngle = 0;
export function drawChanceWheelCanvas() {
  const c = document.getElementById('chance-wheel-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  const cx = 104, cy = 104, r = 100;
  const slice = (Math.PI * 2) / CHANCE_WHEEL_PRIZES.length;

  ctx.clearRect(0, 0, 208, 208);
  CHANCE_WHEEL_PRIZES.forEach((p, i) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, i * slice, (i + 1) * slice);
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(i * slice + slice / 2);
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(p.label, r - 12, 4);
    ctx.restore();
  });
}

export function openChanceWheelModal(isDoubles) {
  gameState.phase = 'MODAL';
  gameState.pendingDoubles = isDoubles;
  if (engineCallbacks.updateUI) engineCallbacks.updateUI();
  drawChanceWheelCanvas();
  document.getElementById('chance-result-text').textContent = 'Click Spin to test your luck!';
  document.getElementById('btn-spin-wheel').disabled = false;

  const m = document.getElementById('modal-chance-wheel');
  m.classList.remove('hidden');
  m.classList.add('flex');
}

export function spinChanceWheel() {
  const btn = document.getElementById('btn-spin-wheel');
  btn.disabled = true;
  playSFX('dice');

  const prizeIdx = Math.floor(Math.random() * CHANCE_WHEEL_PRIZES.length);
  const prize = CHANCE_WHEEL_PRIZES[prizeIdx];
  wheelAngle += 1440 + Math.floor(Math.random() * 360);
  const canvas = document.getElementById('chance-wheel-canvas');
  canvas.style.transform = `rotate(${wheelAngle}deg)`;

  setTimeout(async () => {
    document.getElementById('chance-result-text').textContent = prize.desc;
    await new Promise(r => setTimeout(r, 1100));
    document.getElementById('modal-chance-wheel').classList.add('hidden');
    document.getElementById('modal-chance-wheel').classList.remove('flex');
    if (engineCallbacks.applyChancePrize) {
      await engineCallbacks.applyChancePrize(0, prize, gameState.pendingDoubles);
    }
  }, 1850);
}

/* ─────────────────────────────────────────────────────────────────────────────
   D. TILE INSPECTOR MODAL
───────────────────────────────────────────────────────────────────────────── */
export function openInspectorModal(tileId) {
  const tile = BOARD_TILES[tileId];
  if (!tile) return;
  gameState.activeInspectorTile = tileId;

  setTileHighlightRing(tile.id, true);

  const st = gameState.properties[tileId];
  const header = document.getElementById('insp-header');
  header.style.background = tile.group ? GROUP_META[tile.group].hex : '#475569';

  document.getElementById('insp-group').textContent = tile.group ? GROUP_META[tile.group].name : tile.type.toUpperCase();
  document.getElementById('insp-title').textContent = tile.name;

  const ownerPill = document.getElementById('insp-owner-pill');
  if (st && st.owner !== null) {
    ownerPill.textContent = `Owned by ${gameState.players[st.owner]?.name} ${st.mortgaged ? '(MORTGAGED)' : ''}`;
  } else if (tile.price) {
    ownerPill.textContent = `Unowned • Price: ${fmtMoney(tile.price)}`;
  } else {
    ownerPill.textContent = tile.subtitle || 'Special Landmark';
  }

  const rentList = document.getElementById('insp-rent-list');
  if (tile.type === 'city') {
    rentList.innerHTML = `
      <div class="flex justify-between py-0.5 border-b border-slate-200"><span>Base Rent</span><strong class="text-slate-900">${fmtMoney(tile.rent[0])}</strong></div>
      <div class="flex justify-between py-0.5 border-b border-slate-200"><span>1 House</span><strong class="text-slate-900">${fmtMoney(tile.rent[1])}</strong></div>
      <div class="flex justify-between py-0.5 border-b border-slate-200"><span>2 Houses</span><strong class="text-slate-900">${fmtMoney(tile.rent[2])}</strong></div>
      <div class="flex justify-between py-0.5 border-b border-slate-200"><span>3 Houses</span><strong class="text-slate-900">${fmtMoney(tile.rent[3])}</strong></div>
      <div class="flex justify-between py-0.5 text-sky-700 font-black"><span>Skyscraper</span><strong class="text-sky-800">${fmtMoney(tile.rent[4])}</strong></div>
      <div class="border-t-2 border-slate-300 pt-2 mt-2 flex justify-between text-slate-700 font-black">
        <span>Upgrade: ${fmtMoney(tile.houseCost)}</span>
        <span>Mortgage: ${fmtMoney(tile.price / 2)}</span>
      </div>
    `;
  } else {
    rentList.innerHTML = `<div class="text-center py-2 text-slate-800 font-bold">${tile.subtitle || 'Land here to trigger special board rules.'}</div>`;
  }

  const actionsEl = document.getElementById('insp-actions');
  actionsEl.innerHTML = '';

  if (st && st.owner === 0) {
    const humanTurnAllowed = isHumanTurnActionable();
    if (!humanTurnAllowed) {
      actionsEl.innerHTML = `
        <div class="w-full py-2.5 px-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 font-black text-xs text-center flex items-center justify-center gap-1.5 shadow-xs">
          <i class="fa-solid fa-lock text-amber-600"></i>
          <span>Wait for your turn to build or mortgage!</span>
        </div>
      `;
    } else {
      let html = `<div class="grid grid-cols-2 gap-2">`;
      if (tile.type === 'city' && !st.mortgaged) {
        const isStandingOnTile = (gameState.players[0].position === tileId);
        const canUp = isStandingOnTile && st.level < 4 && gameState.players[0].cash >= tile.houseCost;
        const canDown = isStandingOnTile && st.level > 0;
        if (isStandingOnTile) {
          html += `
            <button onclick="window.upgradeCityLevel(${tileId})" ${!canUp ? 'disabled' : ''} class="game-btn ${canUp ? 'game-btn-green' : 'game-btn-slate opacity-50 cursor-not-allowed'} py-2.5 text-xs font-black">
              +Upgrade (${fmtMoney(tile.houseCost)})
            </button>
            <button onclick="window.downgradeCityLevel(${tileId})" ${!canDown ? 'disabled' : ''} class="game-btn ${canDown ? 'game-btn-orange' : 'game-btn-slate opacity-50 cursor-not-allowed'} py-2.5 text-xs font-black">
              -Sell (+${fmtMoney(tile.houseCost / 2)})
            </button>
          `;
        } else {
          html += `
            <div class="col-span-2 py-2 px-3 text-[11px] font-black text-slate-500 bg-slate-100 rounded-xl text-center flex items-center justify-center gap-1.5 border border-slate-200">
              <i class="fa-solid fa-location-dot text-amber-500"></i> Land here to upgrade this estate
            </div>
          `;
        }
      }
      html += `</div>`;

      const unmortCost = Math.round(tile.price * 0.55);
      if (!st.mortgaged && (st.level || 0) === 0) {
        html += `
          <button onclick="window.toggleCityMortgage(${tileId})" class="game-btn game-btn-red w-full py-2.5 text-xs font-black">
            Mortgage City (+${fmtMoney(tile.price / 2)})
          </button>
        `;
      } else if (st.mortgaged) {
        html += `
          <button onclick="window.toggleCityMortgage(${tileId})" class="game-btn game-btn-blue w-full py-2.5 text-xs font-black">
            Unmortgage City (-${fmtMoney(unmortCost)})
          </button>
        `;
      }
      actionsEl.innerHTML = html;
    }
  }

  populateCityPreview3DScene(tile, 'insp-city-3d-canvas');

  const m = document.getElementById('modal-tile-inspector');
  const card = document.getElementById('modal-tile-inspector-card');
  const wasHidden = m.classList.contains('hidden');
  m.classList.remove('hidden');
  m.classList.add('flex');

  if (card) {
    const isPlayerOnTile = (gameState.players[0]?.position === tileId);
    const canBeUpgraded = (tile.type === 'city' && st && st.owner === 0 && !st.mortgaged && st.level < 4);
    if (isPlayerOnTile && canBeUpgraded) {
      const color = tile.group ? GROUP_META[tile.group].hex : '#0284c7';
      card.style.borderColor = color;
      card.style.boxShadow = `0 14px 35px -6px ${color}50, 0 0 20px 2px ${color}35`;
    } else {
      card.style.borderColor = '';
      card.style.boxShadow = '';
    }
    card.classList.remove('tile-inspector-exit', 'tile-inspector-pulse', 'tile-inspector-enter');
    void card.offsetWidth;
    card.classList.add('tile-inspector-enter');
    playSFX('hop');
  }
}

export function closeInspectorModal() {
  const m = document.getElementById('modal-tile-inspector');
  const card = document.getElementById('modal-tile-inspector-card');
  setTileHighlightRing(0, false);

  if (card && !m.classList.contains('hidden')) {
    card.style.borderColor = '';
    card.style.boxShadow = '';
    card.classList.remove('tile-inspector-enter', 'tile-inspector-pulse');
    card.classList.add('tile-inspector-exit');
    setTimeout(() => {
      m.classList.add('hidden');
      m.classList.remove('flex');
      card.classList.remove('tile-inspector-exit');
      clearCityPreview();
    }, 220);
  } else {
    m.classList.add('hidden');
    m.classList.remove('flex');
    clearCityPreview();
  }
  gameState.activeInspectorTile = null;
}

// Light dismiss: clicking anywhere outside the inspector card closes it
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => {
    const m = document.getElementById('modal-tile-inspector');
    const card = document.getElementById('modal-tile-inspector-card');
    if (!m || m.classList.contains('hidden')) return;

    // Keep open if clicked inside the inspector card
    if (card && card.contains(e.target)) return;

    // If clicking on 3D canvas, handleCanvasClick handles tile selection vs empty board click
    const canvasContainer = document.getElementById('three-canvas-container');
    if (canvasContainer && (e.target === canvasContainer || canvasContainer.contains(e.target))) {
      return;
    }

    // Clicked anywhere else in the document
    closeInspectorModal();
  });
}

export function upgradeCityLevel(tileId, isForcedAI = false) {
  const st = gameState.properties[tileId];
  const tile = BOARD_TILES[tileId];
  if (!st || st.owner === null || st.mortgaged || st.level >= 4) return;
  const p = gameState.players[st.owner];
  if (!isForcedAI && p.position !== tileId) {
    showTurnLockToast("You can only upgrade the property you are standing on!");
    return;
  }
  if (st.owner === localPlayerIdx && !isForcedAI && !isHumanTurnActionable()) {
    showTurnLockToast("Wait for your turn to upgrade cities!");
    return;
  }
  if (!isForcedAI && (gameState.upgradesThisVisit || 0) >= 2) {
    showTurnLockToast("You can only upgrade at most 2 levels at one time!");
    return;
  }
  if (p.cash < tile.houseCost) return;

  p.cash -= tile.houseCost;
  st.level++;
  if (!isForcedAI) {
    gameState.upgradesThisVisit = (gameState.upgradesThisVisit || 0) + 1;
  }
  playSFX('build');
  if (engineCallbacks.spawnFloatingCash) engineCallbacks.spawnFloatingCash(st.owner, `-${fmtMoney(tile.houseCost)}`, false);
  logEvent(`🏗️ <strong>${p.name}</strong> upgraded <strong>${tile.name}</strong> to Level ${st.level}!`);

  if (networkState.isMultiplayer && !isForcedAI) {
    broadcastAction('ACTION_UPGRADE_CITY', { playerIdx: st.owner, tileId });
  }

  refreshTileTextureAndBuildings(tileId);
  renderCornerHUDs();
  saveCurrentMatchToStorage();
  if (gameState.activeInspectorTile === tileId) openInspectorModal(tileId);
  if (!document.getElementById('modal-portfolio').classList.contains('hidden')) renderPortfolioGrid();
}

export function downgradeCityLevel(tileId, isAutoLiquidation = false) {
  const st = gameState.properties[tileId];
  const tile = BOARD_TILES[tileId];
  if (!st || st.owner === null || st.level <= 0) return;
  if (st.owner === localPlayerIdx && !isAutoLiquidation && !isHumanTurnActionable()) {
    showTurnLockToast("Wait for your turn to sell buildings!");
    return;
  }
  const p = gameState.players[st.owner];
  const refund = tile.houseCost / 2;

  p.cash += refund;
  st.level--;
  playSFX('cash');
  if (engineCallbacks.spawnFloatingCash) engineCallbacks.spawnFloatingCash(st.owner, `+${fmtMoney(refund)}`, true);

  refreshTileTextureAndBuildings(tileId);
  renderCornerHUDs();
  saveCurrentMatchToStorage();
  if (gameState.activeInspectorTile === tileId) openInspectorModal(tileId);
  if (!document.getElementById('modal-portfolio').classList.contains('hidden')) renderPortfolioGrid();
}

export function toggleCityMortgage(tileId, isAutoLiquidation = false) {
  const st = gameState.properties[tileId];
  const tile = BOARD_TILES[tileId];
  if (!st || st.owner === null) return;
  if (st.owner === localPlayerIdx && !isAutoLiquidation && !isHumanTurnActionable()) {
    showTurnLockToast("Wait for your turn to mortgage cities!");
    return;
  }
  const p = gameState.players[st.owner];

  if (!st.mortgaged) {
    const gain = tile.price / 2;
    st.mortgaged = true;
    p.cash += gain;
    playSFX('cash');
    if (engineCallbacks.spawnFloatingCash) engineCallbacks.spawnFloatingCash(st.owner, `+${fmtMoney(gain)}`, true);
    logEvent(`🏦 <strong>${p.name}</strong> mortgaged <strong>${tile.name}</strong> (+${fmtMoney(gain)}).`);
  } else {
    const cost = Math.round(tile.price * 0.55);
    if (p.cash < cost) return;
    p.cash -= cost;
    st.mortgaged = false;
    playSFX('cash');
    if (engineCallbacks.spawnFloatingCash) engineCallbacks.spawnFloatingCash(st.owner, `-${fmtMoney(cost)}`, false);
    logEvent(`🏦 <strong>${p.name}</strong> unmortgaged <strong>${tile.name}</strong> (-${fmtMoney(cost)}).`);
  }

  if (networkState.isMultiplayer && !isAutoLiquidation) {
    broadcastAction('ACTION_MORTGAGE_CITY', { playerIdx: st.owner, tileId, mortgaged: st.mortgaged });
  }

  refreshTileTextureAndBuildings(tileId);
  renderCornerHUDs();
  saveCurrentMatchToStorage();
  if (gameState.activeInspectorTile === tileId) openInspectorModal(tileId);
  if (!document.getElementById('modal-portfolio').classList.contains('hidden')) renderPortfolioGrid();
}

/* ─────────────────────────────────────────────────────────────────────────────
   E. MANAGE CITIES PORTFOLIO MODAL
───────────────────────────────────────────────────────────────────────────── */
export function openPortfolioModal() {
  if (!isHumanTurnActionable()) {
    showTurnLockToast("Wait for your turn to manage cities!");
    return;
  }
  renderPortfolioGrid();
  const m = document.getElementById('modal-portfolio');
  m.classList.remove('hidden');
  m.classList.add('flex');
}

export function closePortfolioModal() {
  document.getElementById('modal-portfolio').classList.add('hidden');
  document.getElementById('modal-portfolio').classList.remove('flex');
}

export function renderPortfolioGrid() {
  const grid = document.getElementById('portfolio-grid');
  const owned = BOARD_TILES.filter(t => gameState.properties[t.id] && gameState.properties[t.id].owner === 0);

  if (owned.length === 0) {
    grid.innerHTML = `<div class="col-span-2 text-center py-8 text-slate-700 text-sm font-black">You haven't bought any cities yet! Roll the dice to start your empire.</div>`;
    return;
  }

  grid.innerHTML = owned.map(t => {
    const st = gameState.properties[t.id];
    const color = t.group ? GROUP_META[t.group].hex : '#0284c7';
    const isPlayerOnTile = (gameState.players[0].position === t.id);
    const upgradesLeft = Math.max(0, 2 - (gameState.upgradesThisVisit || 0));
    const canBeUpgraded = (t.type === 'city' && !st.mortgaged && st.level < 4 && upgradesLeft > 0);
    const isIlluminated = isPlayerOnTile && canBeUpgraded;

    const cardClass = isIlluminated
      ? 'rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-md transition-all duration-300 transform scale-[1.01]'
      : 'bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-xs';

    const cardStyle = isIlluminated
      ? `background: linear-gradient(145deg, ${color}26, ${color}0f); border: 2.5px solid ${color}; box-shadow: 0 10px 24px -4px ${color}45, 0 0 16px 2px ${color}30, inset 0 1px 2px 0 rgba(255,255,255,0.95);`
      : '';

    return `
      <div class="${cardClass}" style="${cardStyle}">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-4 h-4 rounded-full border border-black/20" style="background:${color}; ${isIlluminated ? `box-shadow: 0 0 8px ${color};` : ''}"></span>
            <span class="font-black text-sm text-slate-900">${t.name}</span>
            ${isIlluminated ? `
              <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-white shadow-2xs flex items-center gap-1" style="background:${color}">
                <i class="fa-solid fa-location-dot"></i> ACTIVE (${2 - upgradesLeft}/2)
              </span>
            ` : ''}
          </div>
          <span class="text-xs font-black ${st.mortgaged ? 'text-rose-700' : 'text-emerald-700'}">
            ${st.mortgaged ? 'MORTGAGED' : `Rent: ${fmtMoney(calculateTileRent(t.id))}`}
          </span>
        </div>
        <div class="flex gap-2">
          ${t.type === 'city' && !st.mortgaged ? `
            ${isPlayerOnTile ? `
              ${canBeUpgraded ? `
                <button onclick="window.upgradeCityLevel(${t.id})" class="game-btn game-btn-green flex-1 py-2 text-xs font-black shadow-md">
                  <i class="fa-solid fa-arrow-up-right-dots mr-1"></i> +Upgrade (${fmtMoney(t.houseCost)}) <span class="text-[10px] opacity-80 font-bold ml-1">(${2 - upgradesLeft}/2)</span>
                </button>
              ` : `
                <div class="flex-1 py-2 text-[11px] font-black text-slate-500 bg-slate-100 rounded-xl text-center flex items-center justify-center gap-1 border border-slate-200">
                  <i class="fa-solid fa-ban text-amber-500"></i> ${st.level >= 4 ? 'Max Level' : 'Max 2/visit reached'}
                </div>
              `}
            ` : `
              <div class="flex-1 py-2 text-[11px] font-black text-slate-500 bg-slate-100 rounded-xl text-center flex items-center justify-center gap-1 border border-slate-200" title="You can only upgrade when your avatar is standing on this tile">
                <i class="fa-solid fa-location-dot text-amber-500"></i> Land here to upgrade
              </div>
            `}
          ` : ''}
          <button onclick="window.toggleCityMortgage(${t.id})" class="game-btn ${st.mortgaged ? 'game-btn-blue' : 'game-btn-slate'} flex-1 py-2 text-xs font-black">
            ${st.mortgaged ? 'Unmortgage' : `Mortgage (+${fmtMoney(t.price/2)})`}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/* ─────────────────────────────────────────────────────────────────────────────
   F. DIPLOMATIC TRADE MODAL
───────────────────────────────────────────────────────────────────────────── */
export function openTradeModal() {
  if (!isHumanTurnActionable()) {
    showTurnLockToast("Wait for your turn to propose a trade!");
    return;
  }
  const myIdx = localPlayerIdx || 0;
  const sel = document.getElementById('trade-partner-select');
  sel.innerHTML = '';
  gameState.players.forEach((p, idx) => {
    if (idx !== myIdx && !p.bankrupt) {
      const o = document.createElement('option');
      o.value = idx;
      o.textContent = p.name;
      sel.appendChild(o);
    }
  });

  const myProps = BOARD_TILES.filter(t => gameState.properties[t.id] && gameState.properties[t.id].owner === myIdx);
  document.getElementById('trade-offer-props').innerHTML = myProps.map(t => `
    <label class="flex items-center justify-between text-xs font-black bg-white px-3 py-2 rounded-xl border-2 border-slate-200 text-slate-800 cursor-pointer hover:border-slate-300">
      <span class="flex items-center gap-1.5"><input type="checkbox" value="${t.id}" class="trade-my-prop mr-1 w-3.5 h-3.5">${t.name}</span>
      <span class="font-black text-emerald-700">${fmtMoney(t.price)}</span>
    </label>
  `).join('') || '<div class="text-xs font-bold text-slate-500 py-2 text-center">No cities owned</div>';

  populateTradePartnerProps();
  document.getElementById('trade-status-msg').classList.add('hidden');
  const m = document.getElementById('modal-trade');
  m.classList.remove('hidden');
  m.classList.add('flex');
}

export function populateTradePartnerProps() {
  const pIdx = parseInt(document.getElementById('trade-partner-select').value, 10);
  if (isNaN(pIdx)) return;
  const props = BOARD_TILES.filter(t => gameState.properties[t.id] && gameState.properties[t.id].owner === pIdx);
  document.getElementById('trade-req-props').innerHTML = props.map(t => `
    <label class="flex items-center justify-between text-xs font-black bg-white px-3 py-2 rounded-xl border-2 border-slate-200 text-slate-800 cursor-pointer hover:border-slate-300">
      <span class="flex items-center gap-1.5"><input type="checkbox" value="${t.id}" class="trade-their-prop mr-1 w-3.5 h-3.5">${t.name}</span>
      <span class="font-black text-emerald-700">${fmtMoney(t.price)}</span>
    </label>
  `).join('') || '<div class="text-xs font-bold text-slate-500 py-2 text-center">No cities owned</div>';
}

export function executeTradeOffer() {
  const partnerIdx = parseInt(document.getElementById('trade-partner-select').value, 10);
  if (isNaN(partnerIdx)) return;
  const myIdx = localPlayerIdx || 0;
  const me = gameState.players[myIdx];
  const partner = gameState.players[partnerIdx];

  const offerCash = (parseInt(document.getElementById('trade-offer-cash').value || '0', 10)) * 1000;
  const reqCash = (parseInt(document.getElementById('trade-req-cash').value || '0', 10)) * 1000;
  const myIds = Array.from(document.querySelectorAll('.trade-my-prop:checked')).map(e => parseInt(e.value, 10));
  const theirIds = Array.from(document.querySelectorAll('.trade-their-prop:checked')).map(e => parseInt(e.value, 10));

  const msg = document.getElementById('trade-status-msg');
  msg.classList.remove('hidden');

  if (offerCash > me.cash || reqCash > partner.cash) {
    msg.className = 'text-center text-xs font-extrabold py-1 text-rose-600';
    msg.textContent = 'Not enough cash for this trade!';
    return;
  }

  let offerVal = offerCash + myIds.reduce((acc, id) => acc + BOARD_TILES[id].price, 0);
  let reqVal = reqCash + theirIds.reduce((acc, id) => acc + BOARD_TILES[id].price * 1.15, 0);

  if (offerVal < reqVal) {
    msg.className = 'text-center text-xs font-extrabold py-1 text-rose-600';
    msg.textContent = `${partner.name} declined! Offer at least ${fmtMoney(reqVal - offerVal)} more value.`;
    return;
  }

  me.cash = me.cash - offerCash + reqCash;
  partner.cash = partner.cash - reqCash + offerCash;
  myIds.forEach(id => { gameState.properties[id].owner = partnerIdx; refreshTileTextureAndBuildings(id); });
  theirIds.forEach(id => { gameState.properties[id].owner = myIdx; refreshTileTextureAndBuildings(id); });

  const affectedGroups = new Set();
  [...myIds, ...theirIds].forEach(id => {
    if (BOARD_TILES[id]?.group) affectedGroups.add(BOARD_TILES[id].group);
  });
  affectedGroups.forEach(grp => {
    checkAndTriggerMonopoly(myIdx, grp);
    checkAndTriggerMonopoly(partnerIdx, grp);
  });

  playSFX('cash');
  logEvent(`🤝 <strong>Trade Completed</strong> between ${me.name} and ${partner.name}!`);
  renderCornerHUDs();
  saveCurrentMatchToStorage();
  closeTradeModal();
}

export function closeTradeModal() {
  document.getElementById('modal-trade').classList.add('hidden');
  document.getElementById('modal-trade').classList.remove('flex');
}

/* ─────────────────────────────────────────────────────────────────────────────
   G. VICTORY CELEBRATION MODAL
───────────────────────────────────────────────────────────────────────────── */
export function showVictoryModal(winner) {
  const winnerObj = winner || gameState.players.find(p => !p.bankrupt) || gameState.players[0];
  const isLocalHuman = winnerObj && (winnerObj.id === localPlayerIdx || (!winnerObj.isAI && (localPlayerIdx === undefined || localPlayerIdx === 0)));

  const titleEl = document.getElementById('victory-title');
  if (titleEl) {
    titleEl.textContent = isLocalHuman ? 'YOU WON!' : `${winnerObj?.name || 'Player'} WON!`;
  }

  const subtitleEl = document.getElementById('victory-subtitle');
  if (subtitleEl) {
    subtitleEl.textContent = isLocalHuman ? 'Supreme World Real Estate Tycoon' : 'Master of the Global Board';
  }

  const cashEl = document.getElementById('victory-stat-cash');
  if (cashEl && winnerObj) {
    cashEl.textContent = fmtMoney(winnerObj.cash || 0);
  }

  const propsEl = document.getElementById('victory-stat-props');
  if (propsEl && winnerObj) {
    const ownedCount = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === winnerObj.id).length;
    propsEl.textContent = `${ownedCount} Cities`;
  }

  const modal = document.getElementById('modal-victory');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  const card = document.getElementById('victory-card');
  if (card) {
    card.classList.remove('victory-card-animate');
    void card.offsetWidth; // re-flow
    card.classList.add('victory-card-animate');
  }

  // Reset rematch button & multiplayer status indicators
  const statusEl = document.getElementById('victory-multiplayer-status');
  if (statusEl) {
    statusEl.innerHTML = '';
    statusEl.classList.add('hidden');
  }

  const playBtn = document.getElementById('btn-victory-play-again');
  if (playBtn) {
    playBtn.disabled = false;
    playBtn.classList.remove('ring-4', 'ring-amber-300', 'animate-pulse');
  }

  const playBtnText = document.getElementById('btn-victory-play-again-text');
  if (playBtnText) {
    playBtnText.textContent = 'PLAY AGAIN';
  }

  startVictoryCelebration(winnerObj);
}

export function closeAllGameModals() {
  const modalIds = [
    'modal-victory',
    'modal-buy-city',
    'modal-upgrade-city',
    'modal-auction',
    'modal-chance-wheel',
    'modal-tile-inspector',
    'modal-portfolio',
    'modal-trade',
    'modal-rules',
    'modal-disconnect-notice',
    'modal-setup',
    'modal-monopoly-celebration',
    'modal-confirm-exit-lobby'
  ];
  modalIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  });
}

export function handlePlayAgainAction() {
  if (networkState.isMultiplayer && !networkState.isHost) {
    // Guest requests rematch from Room Host
    const myName = (matchSettings.customPlayers[networkState.localPlayerIdx] || {}).name || 'Tycoon Friend';
    broadcastAction('ACTION_REQUEST_PLAY_AGAIN', {
      playerName: myName
    });
    const btnText = document.getElementById('btn-victory-play-again-text');
    if (btnText) btnText.textContent = 'WAITING FOR HOST...';
    const statusEl = document.getElementById('victory-multiplayer-status');
    if (statusEl) {
      statusEl.innerHTML = '<i class="fa-solid fa-hourglass-half fa-spin mr-1"></i> Rematch requested! Waiting for Room Host to start...';
      statusEl.classList.remove('hidden');
    }
    const btn = document.getElementById('btn-victory-play-again');
    if (btn) btn.disabled = true;
    playSFX('hop');
    logEvent('⏳ Rematch requested from Room Host.');
    return;
  }

  // Host or Local Single Player: immediately launch rematch!
  stopVictoryCelebration();
  const modal = document.getElementById('modal-victory');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  closeAllGameModals();

  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastStartOnlineMatch();
  }

  startIntroCameraFlyIn();
  if (engineCallbacks.startNewMatch) {
    engineCallbacks.startNewMatch();
  } else if (window.startNewMatch) {
    window.startNewMatch();
  }
}

export function handleReturnToLobbyFromVictory() {
  stopVictoryCelebration();
  const modal = document.getElementById('modal-victory');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  closeAllGameModals();
  gameState.gameStarted = false;

  if (networkState.isMultiplayer) {
    if (networkState.isHost) {
      // Host informs all guests to return to lobby together WITHOUT disconnecting!
      broadcastReturnToLobby();
      logEvent('👑 Table Host brought all room players back to the lobby.');
    } else {
      // Guest notifies host
      broadcastAction('ACTION_GUEST_LOBBY', {
        senderIdx: networkState.localPlayerIdx
      });
      logEvent('🚪 Returned to room lobby.');
    }
  }

  // Open the landing setup screen without leaving the room!
  if (window.openLandingSetupScreen) {
    window.openLandingSetupScreen();
  } else {
    openSetupModal();
  }
}

export function closeVictoryAndPlayAgain() {
  handlePlayAgainAction();
}

/* ─────────────────────────────────────────────────────────────────────────────
   H. SETUP / LOBBY MODAL
───────────────────────────────────────────────────────────────────────────── */
export function openSetupModal() {
  stopVictoryCelebration();
  document.getElementById('modal-victory')?.classList.add('hidden');
  document.getElementById('modal-victory')?.classList.remove('flex');
  renderLobbyControls();
  const m = document.getElementById('modal-setup');
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
  }
}

export function setLobbyCount(n) {
  setLobbyPlayerCount(n);
  renderLobbyControls();
}

export function renderLobbyControls() {
  [2, 3, 4].forEach(n => {
    const b = document.getElementById(`lobby-cnt-${n}`);
    if (b) {
      b.className = n === lobbyPlayerCount
        ? 'px-3 py-1.5 rounded-xl text-xs font-extrabold bg-indigo-600 text-white cursor-pointer'
        : 'px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-200 text-slate-600 cursor-pointer';
    }
  });

  const list = document.getElementById('lobby-players-list');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < lobbyPlayerCount; i++) {
    const th = PLAYER_THEMES[i];
    list.innerHTML += `
      <div class="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200">
        <div class="flex items-center gap-2">
          <span class="w-3.5 h-3.5 rounded-full" style="background:${th.colorHex}"></span>
          <input type="text" value="${th.name}" onchange="window.updatePlayerName(${i}, this.value)" class="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-extrabold w-28">
        </div>
        <span class="text-xs font-bold text-slate-500">${i === 0 ? 'Human (YOU)' : 'Smart AI Bot'}</span>
      </div>
    `;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   H. RULES MODAL
───────────────────────────────────────────────────────────────────────────── */
export function openRulesModal() {
  document.getElementById('modal-rules').classList.remove('hidden');
  document.getElementById('modal-rules').classList.add('flex');
}

export function closeRulesModal() {
  document.getElementById('modal-rules').classList.add('hidden');
  document.getElementById('modal-rules').classList.remove('flex');
}

/* ─────────────────────────────────────────────────────────────────────────────
   I. TOMATO / EMOTES
───────────────────────────────────────────────────────────────────────────── */
let tomatoThrows = 0;
export function throwTomatoAtOpponent() {
  tomatoThrows++;
  const elCounter = document.getElementById('tomato-counter');
  if (elCounter) elCounter.textContent = tomatoThrows;

  const tomato = document.createElement('div');
  tomato.className = 'flying-tomato';
  tomato.textContent = '🍅';
  tomato.style.left = '120px';
  tomato.style.top = '90px';
  document.body.appendChild(tomato);

  requestAnimationFrame(() => {
    tomato.style.left = `${window.innerWidth - 160}px`;
    tomato.style.top = '95px';
    tomato.style.transform = 'rotate(360deg) scale(1.35)';
  });

  setTimeout(() => {
    tomato.textContent = '💥';
    playSFX('hop');
    setTimeout(() => tomato.remove(), 350);
  }, 550);
}

export function toggleEmotePopover() {
  const p = document.getElementById('emote-popover');
  p.classList.toggle('hidden');
  p.classList.toggle('flex');
}

export function sendQuickEmote(text) {
  toggleEmotePopover();
  if (text.includes('🍅')) throwTomatoAtOpponent();
  showSpeechBubble(text, 2500);
}

export function toggleEventLogDrawer() {
  const d = document.getElementById('event-log-drawer');
  d.classList.toggle('hidden');
  d.classList.toggle('flex');
}

/* ─────────────────────────────────────────────────────────────────────────────
   J. MONOPOLY CELEBRATION MODAL
───────────────────────────────────────────────────────────────────────────── */
export function openMonopolyCelebrationModal(playerIdx, groupKey) {
  const p = gameState.players[playerIdx];
  const group = GROUP_META[groupKey];
  if (!p || !group) return;

  const winnerEl = document.getElementById('monopoly-winner-name');
  const groupEl = document.getElementById('monopoly-group-name');
  const headerEl = document.getElementById('monopoly-modal-header');
  const tilesContainer = document.getElementById('monopoly-tiles-list');

  if (winnerEl) winnerEl.textContent = `${p.name} ACHIEVED A MONOPOLY!`;
  if (groupEl) groupEl.textContent = `${group.name} Set Completed`;
  if (headerEl) headerEl.style.background = `linear-gradient(135deg, ${group.hex}, #1e1b4b)`;

  // Filter cities in this group
  const groupTiles = BOARD_TILES.filter(t => t.type === 'city' && t.group === groupKey);

  if (tilesContainer) {
    tilesContainer.innerHTML = groupTiles.map(t => {
      const baseRent = t.rent[0];
      const boostedRent = baseRent * 2;
      return `
        <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50 shadow-xs">
          <div class="flex items-center gap-2.5">
            <span class="w-4 h-4 rounded-full border-2 border-white shadow-xs" style="background:${group.hex}"></span>
            <div>
              <div class="font-rounded font-extrabold text-sm text-slate-800">${t.name}</div>
              <div class="text-[10px] text-slate-500 font-semibold">City Value: ${fmtMoney(t.price)}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs font-black text-emerald-600">${fmtMoney(boostedRent)} / visit</div>
            <div class="text-[10px] font-extrabold text-amber-600 tracking-wider uppercase">⚡ 2× RENT BOOSTED</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Play fanfare and burst confetti
  playSFX('win');
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.45, 120);
  spawnAnimatedReaction('money');

  // Highlight tiles on 3D board
  setMonopolyTileHighlights(groupTiles.map(t => t.id), group.hex);

  // Show modal with bounce animation
  const m = document.getElementById('modal-monopoly-celebration');
  const card = document.getElementById('modal-monopoly-card');
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
    if (card) {
      setTimeout(() => {
        card.classList.remove('scale-90', 'opacity-0');
        card.classList.add('scale-100', 'opacity-100');
      }, 30);
    }
  }

  logEvent(`👑 <strong>${p.name}</strong> completed the <strong>${group.name}</strong> Monopoly! All cities collect <strong>2× Rent</strong>!`);
}

export function closeMonopolyModal() {
  const m = document.getElementById('modal-monopoly-celebration');
  const card = document.getElementById('modal-monopoly-card');
  if (card) {
    card.classList.remove('scale-100', 'opacity-100');
    card.classList.add('scale-90', 'opacity-0');
  }
  setTimeout(() => {
    if (m) {
      m.classList.add('hidden');
      m.classList.remove('flex');
    }
  }, 250);
}

export function checkAndTriggerMonopoly(playerIdx, groupKey) {
  if (!groupKey) return;
  if (!gameState.achievedMonopolies) gameState.achievedMonopolies = {};

  const key = `${playerIdx}_${groupKey}`;
  if (gameState.achievedMonopolies[key]) return;

  if (ownsFullColorGroup(playerIdx, groupKey)) {
    gameState.achievedMonopolies[key] = true;
    openMonopolyCelebrationModal(playerIdx, groupKey);
    if (networkState.isMultiplayer) {
      broadcastAction('ACTION_MONOPOLY', { playerIdx, groupKey });
    }
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   J. EXIT TO LOBBY CONFIRMATION MODAL
───────────────────────────────────────────────────────────────────────────── */
export function openConfirmExitLobbyModal() {
  const m = document.getElementById('modal-confirm-exit-lobby');
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
  }
}

export function closeConfirmExitLobbyModal() {
  const m = document.getElementById('modal-confirm-exit-lobby');
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
}

export function handleLobbyButtonClick() {
  if (gameState && gameState.gameStarted) {
    openConfirmExitLobbyModal();
  } else {
    if (window.openLandingSetupScreen) {
      window.openLandingSetupScreen();
    }
  }
}

export function confirmExitToLobbyAction() {
  closeConfirmExitLobbyModal();
  if (window.terminateMatchAndReturnToLobby) {
    window.terminateMatchAndReturnToLobby();
  } else {
    gameState.gameStarted = false;
    gameState.phase = 'SETUP';
    closeAllGameModals();
    if (window.openLandingSetupScreen) {
      window.openLandingSetupScreen();
    }
  }
}
