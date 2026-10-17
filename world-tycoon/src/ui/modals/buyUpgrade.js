/**
 * ui/modals/buyUpgrade.js
 * Property purchase and in-visit building upgrades (Cottages, Villas, Manors, Skyscrapers).
 */

import { GROUP_META, BOARD_TILES } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX } from '../../game/audio.js';
import { calculateTileRent } from '../../game/rules.js';
import { networkState, broadcastAction } from '../../network/p2p.js';
import {
  populateCityPreview3DScene,
  clearCityPreview,
  setTileHighlightRing,
  refreshTileTextureAndBuildings,
  getTileWorldPosition
} from '../../three/scene.js';
import { renderCornerHUDs, showTurnLockToast, logEvent, setStatusPill } from '../hud.js';
import { fireConfettiBurst, spawnAnimatedReaction } from '../../three/effects.js';
import { checkAndTriggerMonopoly } from './victory.js';
import { upgradeCityLevel } from './inspector.js';
import { engineCallbacks, isLobbyScreenActive, getTierBadgeHTML } from './common.js';
import { animateModalPunchIn, animateBankruptcyQuake, animateBuildingUpgradeBounce, animateBuyoutHostileStamp } from '../anim.js';

/* ─────────────────────────────────────────────────────────────────────────────
   A. BUY CITY MODAL
───────────────────────────────────────────────────────────────────────────── */
export function openBuyCityModal(tile, isDoubles) {
  if (isLobbyScreenActive()) return;
  gameState.phase = 'MODAL';
  gameState.pendingBuyTile = tile;
  gameState.pendingDoubles = isDoubles;
  if (engineCallbacks.updateUI) engineCallbacks.updateUI();

  const pos = getTileWorldPosition(tile.id);
  setTileHighlightRing(tile.id, true);
  setStatusPill(`🏢 Deciding whether to buy <strong>${tile.name}</strong> (${fmtMoney(tile.price)})...`, { isThinking: false, playerIdx: gameState.currentPlayerIdx });

  const header = document.getElementById('buy-modal-header');
  if (header) {
    header.style.background = tile.group ? GROUP_META[tile.group].hex : '#0284c7';
  }
  const countryEl = document.getElementById('buy-modal-country');
  if (countryEl) {
    countryEl.textContent = tile.group ? GROUP_META[tile.group].name : 'RESORT DESTINATION';
  }
  const nameEl = document.getElementById('buy-modal-name');
  if (nameEl) nameEl.textContent = tile.name;
  const priceEl = document.getElementById('buy-modal-price');
  if (priceEl) priceEl.textContent = fmtMoney(tile.price);
  const rentEl = document.getElementById('buy-modal-rent');
  if (rentEl) rentEl.textContent = fmtMoney(tile.rent[0]);

  const tiers = document.getElementById('buy-modal-tiers');
  if (tiers) {
    if (tile.type === 'city') {
      tiers.innerHTML = `
        <div class="game-tier-card">
          <div class="flex items-center gap-2.5">
            ${getTierBadgeHTML(1)}
            <div>
              <div class="font-display font-black text-xs sm:text-sm text-slate-800 leading-tight">1 House</div>
              <div class="text-[10px] text-slate-400 font-bold">Standard Estate</div>
            </div>
          </div>
          <div class="tier-val-pill">${fmtMoney(tile.rent[1])}</div>
        </div>
        <div class="game-tier-card">
          <div class="flex items-center gap-2.5">
            ${getTierBadgeHTML(2)}
            <div>
              <div class="font-display font-black text-xs sm:text-sm text-slate-800 leading-tight">2 Houses</div>
              <div class="text-[10px] text-slate-400 font-bold">Expanded District</div>
            </div>
          </div>
          <div class="tier-val-pill">${fmtMoney(tile.rent[2])}</div>
        </div>
        <div class="game-tier-card">
          <div class="flex items-center gap-2.5">
            ${getTierBadgeHTML(3)}
            <div>
              <div class="font-display font-black text-xs sm:text-sm text-slate-800 leading-tight">3 Houses</div>
              <div class="text-[10px] text-slate-400 font-bold">Prime Plaza</div>
            </div>
          </div>
          <div class="tier-val-pill">${fmtMoney(tile.rent[3])}</div>
        </div>
        <div class="game-tier-card tier-card-skyscraper">
          <div class="flex items-center gap-2.5">
            ${getTierBadgeHTML(4)}
            <div>
              <div class="font-display font-black text-xs sm:text-sm text-amber-950 flex items-center gap-1.5 leading-tight">
                <span>Skyscraper</span>
                <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-400 text-amber-950 border border-amber-500/50 shadow-2xs">MAX</span>
              </div>
              <div class="text-[10px] text-amber-800/80 font-bold">Global Megatower</div>
            </div>
          </div>
          <div class="tier-val-pill tier-val-skyscraper">
            <i class="fa-solid fa-bolt text-amber-600 text-xs mr-0.5"></i>${fmtMoney(tile.rent[4])}
          </div>
        </div>
      `;
    } else {
      tiers.innerHTML = `
        <div class="p-3 bg-gradient-to-r from-sky-50 to-indigo-50 rounded-2xl border-2 border-sky-200 text-center space-y-1">
          <div class="text-xl">🌴 🏖️</div>
          <div class="font-display font-black text-xs sm:text-sm text-sky-950">Luxury Destination Resort</div>
          <div class="text-[11px] text-slate-600 font-bold">Collect 2× boosted payouts when owning both world resorts!</div>
        </div>
      `;
    }
  }

  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx] || gameState.players[0];
  const btnBuy = document.getElementById('btn-confirm-buy');
  if (btnBuy) {
    const canAfford = p && p.cash >= tile.price;
    btnBuy.disabled = !canAfford;
    btnBuy.innerHTML = canAfford
      ? `<i class="fa-solid fa-cart-shopping mr-1"></i> BUY CITY`
      : `<i class="fa-solid fa-lock mr-1"></i> NEED ${fmtMoney(tile.price)}`;
    btnBuy.className = `game-btn ${canAfford ? 'game-btn-green' : 'game-btn-slate opacity-50 cursor-not-allowed'} flex-1 py-3.5 text-sm font-black`;
  }

  populateCityPreview3DScene(tile, 'buy-city-3d-canvas');

  const m = document.getElementById('modal-buy-city');
  const card = document.getElementById('modal-buy-city-card');
  if (m) {
    m.style.removeProperty('display');
    m.classList.remove('hidden');
    m.classList.add('flex', 'city-modal-backdrop-enter');
  }
  if (card) {
    card.classList.remove('city-modal-card-exit', 'city-modal-card-enter');
    void card.offsetWidth;
    card.classList.add('city-modal-card-enter');
    animateModalPunchIn(card);
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
  const buyModal = document.getElementById('modal-buy-city');
  if (buyModal) {
    buyModal.classList.add('hidden');
    buyModal.classList.remove('flex');
  }
  setTileHighlightRing(tile.id, false);
  gameState.pendingBuyTile = null;
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
  const isDoubles = gameState.pendingDoubles;
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
    engineCallbacks.concludeActionPhase(isDoubles);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   A1.5 HOSTILE BUYOUT MODAL (When landing on opponent property with enough cash)
───────────────────────────────────────────────────────────────────────────── */
export function calculateBuyoutCost(tile, propState) {
  if (!tile || !propState) return 0;
  const baseCost = (tile.price || 0) * 2;
  const housesBuilt = propState.level || 0;
  const houseCost = tile.houseCost || 0;
  return baseCost + (housesBuilt * houseCost);
}

export function openBuyoutCityModal(tile, isDoubles) {
  if (isLobbyScreenActive()) return;
  gameState.phase = 'MODAL';
  gameState.pendingBuyoutTile = tile;
  gameState.pendingDoubles = isDoubles;
  if (engineCallbacks.updateUI) engineCallbacks.updateUI();

  setTileHighlightRing(tile.id, true);
  setStatusPill(`⚔️ Hostile buyout option for <strong>${tile.name}</strong>...`, { isThinking: false, playerIdx: gameState.currentPlayerIdx });

  const st = gameState.properties[tile.id];
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  const prevOwner = gameState.players[st?.owner];
  const basePrice = (tile.price || 0) * 2;
  const housesCost = (st?.level || 0) * (tile.houseCost || 0);
  const totalBuyoutCost = basePrice + housesCost;

  const header = document.getElementById('buyout-modal-header');
  if (header && tile.group && GROUP_META[tile.group]) {
    header.style.background = `linear-gradient(135deg, ${GROUP_META[tile.group].hex}, #ea580c, #dc2626)`;
  }

  const nameEl = document.getElementById('buyout-modal-name');
  if (nameEl) nameEl.textContent = tile.name;

  const ownerEl = document.getElementById('buyout-modal-owner');
  if (ownerEl && prevOwner) {
    const lvl = st?.level || 0;
    ownerEl.innerHTML = `Acquire from <strong class="text-rose-600">${prevOwner.name}</strong> • ${lvl > 0 ? `${lvl} House${lvl > 1 ? 's' : ''}` : 'Base Property'}`;
  }

  const basePriceEl = document.getElementById('buyout-modal-base-price');
  if (basePriceEl) basePriceEl.textContent = fmtMoney(basePrice);

  const housesCostEl = document.getElementById('buyout-modal-houses-cost');
  if (housesCostEl) {
    const lvl = st?.level || 0;
    housesCostEl.textContent = lvl > 0 ? `${fmtMoney(housesCost)} (${lvl} built)` : '$0 (None)';
  }

  const totalCostEl = document.getElementById('buyout-modal-total-cost');
  if (totalCostEl) totalCostEl.textContent = fmtMoney(totalBuyoutCost);

  const balEl = document.getElementById('buyout-modal-balance');
  if (balEl && p) balEl.textContent = fmtMoney(p.cash);

  const confirmBtn = document.getElementById('btn-confirm-buyout');
  if (confirmBtn) {
    const canAfford = p && p.cash >= totalBuyoutCost;
    confirmBtn.disabled = !canAfford;
    confirmBtn.innerHTML = `<i class="fa-solid fa-handshake mr-1"></i> BUYOUT CITY (${fmtMoney(totalBuyoutCost)})`;
  }

  populateCityPreview3DScene(tile, 'buyout-city-3d-canvas');

  const m = document.getElementById('modal-buyout-city');
  const card = document.getElementById('modal-buyout-city-card');
  if (m) {
    m.style.removeProperty('display');
    m.classList.remove('hidden');
    m.classList.add('flex', 'city-modal-backdrop-enter');
  }
  if (card) {
    card.classList.remove('city-modal-card-exit', 'city-modal-card-enter');
    void card.offsetWidth;
    card.classList.add('city-modal-card-enter');
  }
  playSFX('hop');
}

export function confirmBuyoutCity() {
  const tile = gameState.pendingBuyoutTile;
  const isDoubles = gameState.pendingDoubles;
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  const st = tile ? gameState.properties[tile.id] : null;
  if (!tile || !p || !st) return;

  const prevOwnerIdx = st.owner;
  const prevOwner = gameState.players[prevOwnerIdx];
  const buyoutCost = calculateBuyoutCost(tile, st);
  if (p.cash < buyoutCost) return;

  p.cash -= buyoutCost;
  if (prevOwner) {
    prevOwner.cash += buyoutCost;
    if (engineCallbacks.spawnFloatingCash) engineCallbacks.spawnFloatingCash(prevOwnerIdx, `+${fmtMoney(buyoutCost)}`, true);
  }
  st.owner = pIdx;

  playSFX('build');
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.4, 45);
  spawnAnimatedReaction('money', window.innerWidth / 2, window.innerHeight * 0.4);
  animateBuyoutHostileStamp(tile.name);
  if (engineCallbacks.spawnFloatingCash) engineCallbacks.spawnFloatingCash(pIdx, `-${fmtMoney(buyoutCost)}`, false);
  logEvent(`⚔️ <strong>${p.name}</strong> bought out <strong>${tile.name}</strong> from <strong>${prevOwner ? prevOwner.name : 'Opponent'}</strong> for <strong>${fmtMoney(buyoutCost)}</strong>!`);

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_BUYOUT_CITY', { playerIdx: pIdx, tileId: tile.id, prevOwnerIdx, buyoutCost });
  }

  clearCityPreview();
  const m = document.getElementById('modal-buyout-city');
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
  setTileHighlightRing(tile.id, false);
  gameState.pendingBuyoutTile = null;

  refreshTileTextureAndBuildings(tile.id);
  renderCornerHUDs();
  if (tile.group) {
    checkAndTriggerMonopoly(pIdx, tile.group);
  }
  if (engineCallbacks.concludeActionPhase) {
    engineCallbacks.concludeActionPhase(isDoubles);
  }
}

export function passBuyoutCity() {
  const tile = gameState.pendingBuyoutTile;
  const isDoubles = gameState.pendingDoubles;
  if (tile) {
    setTileHighlightRing(tile.id, false);
    const p = gameState.players[gameState.currentPlayerIdx];
    if (p) logEvent(`🏷️ <strong>${p.name}</strong> passed on buying out <strong>${tile.name}</strong>.`);
  }
  clearCityPreview();
  const m = document.getElementById('modal-buyout-city');
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
  gameState.pendingBuyoutTile = null;

  if (engineCallbacks.concludeActionPhase) {
    engineCallbacks.concludeActionPhase(isDoubles);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   A1.6 SELL CITIES TO PAY RENT MODAL (Liquidation when debtor cannot afford rent)
───────────────────────────────────────────────────────────────────────────── */

export function calculatePropertySaleValue(tile, propState) {
  if (!tile) return 0;
  const basePrice = tile.price || 0;
  const level = propState?.level || 0;
  const houseCost = tile.houseCost || 0;
  return basePrice + (level * (houseCost / 2));
}

export function openSellCitiesModal(tile, rentOwed, creditorIdx, isDoubles) {
  if (isLobbyScreenActive()) return;
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  const creditor = gameState.players[creditorIdx];
  if (!p || !creditor) return;

  gameState.phase = 'MODAL';
  gameState.pendingRentDebt = {
    tile,
    rentOwed,
    creditorIdx,
    isDoubles
  };

  if (engineCallbacks.updateUI) engineCallbacks.updateUI();

  renderSellCitiesModal();

  const m = document.getElementById('modal-sell-cities');
  const card = document.getElementById('modal-sell-cities-card');
  if (m) {
    m.style.removeProperty('display');
    m.classList.remove('hidden');
    m.classList.add('flex', 'city-modal-backdrop-enter');
  }
  if (card) {
    card.classList.remove('city-modal-card-exit', 'city-modal-card-enter');
    void card.offsetWidth;
    card.classList.add('city-modal-card-enter');
  }
  playSFX('hop');
}

export function renderSellCitiesModal() {
  const debt = gameState.pendingRentDebt;
  if (!debt) return;

  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  const creditor = gameState.players[debt.creditorIdx];
  if (!p || !creditor) return;

  const subtitleEl = document.getElementById('sell-cities-creditor-subtitle');
  if (subtitleEl) {
    subtitleEl.textContent = `Owe rent on ${debt.tile.name} to ${creditor.name}`;
  }

  const rentDueEl = document.getElementById('sell-cities-rent-due');
  if (rentDueEl) rentDueEl.textContent = fmtMoney(debt.rentOwed);

  const curCashEl = document.getElementById('sell-cities-current-cash');
  if (curCashEl) curCashEl.textContent = fmtMoney(p.cash);

  const deficit = Math.max(0, debt.rentOwed - p.cash);
  const deficitEl = document.getElementById('sell-cities-deficit');
  if (deficitEl) deficitEl.textContent = fmtMoney(deficit);

  // Owned properties
  const ownedTiles = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === pIdx);
  const grid = document.getElementById('sell-cities-card-grid');
  if (!grid) return;

  if (ownedTiles.length === 0) {
    grid.innerHTML = `
      <div class="text-center py-8 text-slate-500 font-bold text-xs">
        <i class="fa-solid fa-triangle-exclamation text-amber-500 text-lg mb-1 block"></i>
        No properties left to sell.
      </div>
    `;
    return;
  }

  grid.innerHTML = ownedTiles.map(t => {
    const st = gameState.properties[t.id];
    const saleVal = calculatePropertySaleValue(t, st);
    const color = t.group && GROUP_META[t.group] ? GROUP_META[t.group].hex : '#0284c7';
    const lvl = st?.level || 0;
    const lvlDesc = lvl === 4 ? 'Skyscraper (MAX)' : (lvl > 0 ? `${lvl} House${lvl > 1 ? 's' : ''}` : 'Base Property');

    return `
      <div class="bg-white border-2 border-slate-200/90 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs hover:border-rose-400 transition">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0" style="background:${color}"></span>
          <div class="truncate">
            <div class="font-black text-xs sm:text-sm text-slate-900 truncate">${t.name}</div>
            <div class="text-[10px] font-bold text-slate-500">${lvlDesc}</div>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <div class="text-right">
            <div class="text-[9px] font-extrabold uppercase text-slate-400">SALE VALUE</div>
            <div class="text-xs sm:text-sm font-black text-emerald-600">+${fmtMoney(saleVal)}</div>
          </div>
          <button onclick="window.sellPropertyForRent(${t.id})" class="game-btn game-btn-rose !py-2 !px-3 text-xs font-black shadow-xs">
            <i class="fa-solid fa-tag mr-1"></i> SELL
          </button>
        </div>
      </div>
    `;
  }).join('');
}

export function sellPropertyForRent(tileId) {
  const debt = gameState.pendingRentDebt;
  if (!debt) return;
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  const tile = BOARD_TILES[tileId];
  const st = gameState.properties[tileId];
  if (!p || !tile || !st || st.owner !== pIdx) return;

  const saleVal = calculatePropertySaleValue(tile, st);

  // Transfer ownership back to bank and reset buildings
  st.owner = null;
  st.level = 0;
  st.mortgaged = false;
  p.cash += saleVal;

  playSFX('cash');
  spawnAnimatedReaction('cash');
  if (engineCallbacks.spawnFloatingCash) engineCallbacks.spawnFloatingCash(pIdx, `+${fmtMoney(saleVal)}`, true);
  logEvent(`🏷️ <strong>${p.name}</strong> sold <strong>${tile.name}</strong> for <strong>${fmtMoney(saleVal)}</strong> to pay rent.`);

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_SELL_CITY_FOR_RENT', { playerIdx: pIdx, tileId, saleVal });
  }

  refreshTileTextureAndBuildings(tile.id);
  renderCornerHUDs();

  // Check if cash now suffices to settle the rent
  if (p.cash >= debt.rentOwed) {
    settlePendingRentAndCloseModal();
  } else {
    // Re-check if player has any remaining properties
    const remainingOwned = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === pIdx);
    if (remainingOwned.length === 0) {
      // Out of properties but still short: handle mercy strike / bankruptcy
      settleDebtDeficitWithoutProperties();
    } else {
      renderSellCitiesModal();
    }
  }
}

export function autoSellCheapestForRent() {
  const debt = gameState.pendingRentDebt;
  if (!debt) return;
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  if (!p) return;

  while (p.cash < debt.rentOwed) {
    const owned = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === pIdx);
    if (owned.length === 0) break;

    // Sort by saleValue ascending
    owned.sort((a, b) => {
      const vA = calculatePropertySaleValue(a, gameState.properties[a.id]);
      const vB = calculatePropertySaleValue(b, gameState.properties[b.id]);
      return vA - vB;
    });

    const cheapest = owned[0];
    const st = gameState.properties[cheapest.id];
    const saleVal = calculatePropertySaleValue(cheapest, st);

    st.owner = null;
    st.level = 0;
    p.cash += saleVal;

    refreshTileTextureAndBuildings(cheapest.id);
    logEvent(`⚡ <strong>${p.name}</strong> auto-sold <strong>${cheapest.name}</strong> for <strong>${fmtMoney(saleVal)}</strong>.`);

    if (networkState.isMultiplayer) {
      broadcastAction('ACTION_SELL_CITY_FOR_RENT', { playerIdx: pIdx, tileId: cheapest.id, saleVal });
    }
  }

  playSFX('cash');
  renderCornerHUDs();

  if (p.cash >= debt.rentOwed) {
    settlePendingRentAndCloseModal();
  } else {
    settleDebtDeficitWithoutProperties();
  }
}

function closeSellCitiesModal() {
  const m = document.getElementById('modal-sell-cities');
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
}

export async function settlePendingRentAndCloseModal() {
  const debt = gameState.pendingRentDebt;
  if (!debt) return;
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  const creditor = gameState.players[debt.creditorIdx];
  const isDoubles = debt.isDoubles;

  closeSellCitiesModal();
  gameState.pendingRentDebt = null;

  if (p && creditor) {
    p.cash -= debt.rentOwed;
    creditor.cash += debt.rentOwed;
    playSFX('cash');
    if (engineCallbacks.spawnFloatingCash) {
      engineCallbacks.spawnFloatingCash(pIdx, `-${fmtMoney(debt.rentOwed)}`, false);
      engineCallbacks.spawnFloatingCash(debt.creditorIdx, `+${fmtMoney(debt.rentOwed)}`, true);
    }
    logEvent(`💸 <strong>${p.name}</strong> settled <strong>${fmtMoney(debt.rentOwed)}</strong> rent to <strong>${creditor.name}</strong>.`);
  }

  renderCornerHUDs();

  if (engineCallbacks.concludeActionPhase) {
    engineCallbacks.concludeActionPhase(isDoubles);
  }
}

export function settleDebtDeficitWithoutProperties() {
  const debt = gameState.pendingRentDebt;
  if (!debt) return;
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  const creditor = gameState.players[debt.creditorIdx];
  const isDoubles = debt.isDoubles;

  closeSellCitiesModal();
  gameState.pendingRentDebt = null;

  if (!p || !creditor) return;

  // Player owns no more properties and still cannot afford rent -> transfer all money to creditor, then bankrupt!
  const paid = Math.max(0, p.cash);
  p.cash = 0;
  creditor.cash += paid;
  p.bankrupt = true;

  // Reset any remaining property states if any
  BOARD_TILES.forEach(t => {
    const st = gameState.properties[t.id];
    if (st && st.owner === pIdx) {
      st.owner = null;
      st.level = 0;
      refreshTileTextureAndBuildings(t.id);
    }
  });

  playSFX('bankrupt');
  logEvent(`💥 <strong>${p.name}</strong> has no properties left and could only pay <strong>${fmtMoney(paid)}</strong> of <strong>${fmtMoney(debt.rentOwed)}</strong> rent to <strong>${creditor.name}</strong>. <strong>BANKRUPT!</strong>`);
  renderCornerHUDs();
  animateBankruptcyQuake(pIdx);

  if (engineCallbacks.concludeActionPhase) {
    engineCallbacks.concludeActionPhase(isDoubles);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   A2. UPGRADE CITY POPUP MODAL (When landing on owned property)
───────────────────────────────────────────────────────────────────────────── */
export function openUpgradeCityModal(tile, isDoubles) {
  if (isLobbyScreenActive()) return;
  const st = tile ? gameState.properties[tile.id] : null;
  if (st && st.level >= 4) {
    if (engineCallbacks.concludeActionPhase) {
      engineCallbacks.concludeActionPhase(isDoubles);
    }
    return;
  }
  gameState.phase = 'MODAL';
  gameState.pendingUpgradeTile = tile;
  gameState.pendingDoubles = isDoubles;
  gameState.upgradesThisVisit = 0;
  if (engineCallbacks.updateUI) engineCallbacks.updateUI();

  setTileHighlightRing(tile.id, true);
  setStatusPill(`🏗️ Managing property upgrades for <strong>${tile.name}</strong>...`, { isThinking: false, playerIdx: gameState.currentPlayerIdx });
  renderUpgradeModalContent(tile);
  populateCityPreview3DScene(tile, 'upgrade-city-3d-canvas');

  const m = document.getElementById('modal-upgrade-city');
  const card = document.getElementById('modal-upgrade-city-card');
  if (m) {
    m.style.removeProperty('display');
    m.classList.remove('hidden');
    m.classList.add('flex', 'city-modal-backdrop-enter');
  }
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
  if (header) {
    const groupColor = tile.group ? GROUP_META[tile.group].hex : '#10b981';
    header.style.background = groupColor;
  }

  const countryEl = document.getElementById('upgrade-modal-country');
  if (countryEl) {
    countryEl.innerHTML = `<i class="fa-solid fa-crown text-amber-300"></i> ${tile.group ? GROUP_META[tile.group].name : 'ESTATE'}`;
  }

  const levelLabels = ['Base', '1 House', '2 Houses', '3 Houses', 'Skyscraper'];
  const levelPill = document.getElementById('upgrade-modal-level-pill');
  if (levelPill) {
    levelPill.textContent = `Level ${st.level}: ${levelLabels[st.level] || 'Base'}`;
    levelPill.className = 'text-xs font-black px-2.5 py-1 rounded-full bg-white/25 border border-white/40 shadow-xs';
  }

  const nameEl = document.getElementById('upgrade-modal-name');
  if (nameEl) nameEl.textContent = tile.name;

  const curRent = calculateTileRent(tile.id);
  const curRentEl = document.getElementById('upgrade-modal-current-rent');
  if (curRentEl) curRentEl.textContent = fmtMoney(curRent);
  const costEl = document.getElementById('upgrade-modal-cost');
  if (costEl) costEl.textContent = fmtMoney(tile.houseCost);
  const balEl = document.getElementById('upgrade-modal-balance');
  if (balEl) balEl.textContent = `Balance: ${fmtMoney(p.cash)}`;

  const tiersEl = document.getElementById('upgrade-modal-tiers');
  if (tiersEl) {
    tiersEl.innerHTML = levelLabels.map((lbl, idx) => {
      const isCurrent = (st.level === idx);
      const isNext = (st.level + 1 === idx);
      const rentVal = tile.rent[idx];
      const isSky = (idx === 4);

      let cardClass = isCurrent
        ? 'game-tier-card tier-card-current'
        : (isNext ? 'game-tier-card tier-card-next' : (isSky ? 'game-tier-card tier-card-skyscraper' : 'game-tier-card'));

      let statusPill = '';
      if (isCurrent) {
        statusPill = '<span class="text-[9px] uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black shadow-2xs">ACTIVE</span>';
      } else if (isNext) {
        statusPill = '<span class="text-[9px] uppercase px-2 py-0.5 rounded-full bg-sky-500 text-white font-black shadow-2xs">+NEXT</span>';
      } else if (isSky) {
        statusPill = '<span class="text-[9px] uppercase px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black shadow-2xs">MAX</span>';
      }

      let valPillClass = isCurrent
        ? 'tier-val-pill bg-emerald-600 text-white border-emerald-500 shadow-xs'
        : (isSky ? 'tier-val-pill tier-val-skyscraper' : 'tier-val-pill');

      return `
        <div class="${cardClass}">
          <div class="flex items-center gap-2.5">
            ${getTierBadgeHTML(idx)}
            <div>
              <div class="font-display font-black text-xs sm:text-sm text-slate-800 flex items-center gap-1.5 leading-tight">
                <span>${lbl}</span>
                ${statusPill}
              </div>
              <div class="text-[10px] text-slate-400 font-bold">${idx === 0 ? 'Base Land Payout' : (isSky ? 'Maximum Empire Rent' : `District Level ${idx}`)}</div>
            </div>
          </div>
          <div class="${valPillClass}">${fmtMoney(rentVal)}</div>
        </div>
      `;
    }).join('');
  }

  const noticeEl = document.getElementById('upgrade-modal-notice');
  const btnUpgrade = document.getElementById('btn-confirm-upgrade');
  const btnUpgrade2 = document.getElementById('btn-confirm-upgrade-2');
  const btnClose = document.getElementById('btn-close-upgrade-modal');
  const upgradesDone = gameState.upgradesThisVisit || 0;

  if (upgradesDone >= 2) {
    if (btnUpgrade2) btnUpgrade2.classList.add('hidden');
    if (noticeEl) {
      noticeEl.classList.remove('hidden');
      noticeEl.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600 mr-1"></i> <strong class="text-emerald-800">Visit Limit Reached (2/2)!</strong> You can upgrade at most 2 levels at one time.`;
    }
    if (btnUpgrade) {
      btnUpgrade.disabled = true;
      btnUpgrade.className = 'game-btn game-btn-slate opacity-50 cursor-not-allowed flex-1 py-3 px-3 text-xs sm:text-sm font-black flex flex-col items-center justify-center gap-0.5 leading-snug';
      btnUpgrade.innerHTML = `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-ban text-amber-500"></i> MAX REACHED</span><span class="text-xs font-bold opacity-80">(2/2 Levels)</span>`;
    }
    if (btnClose) btnClose.textContent = 'DONE';
  } else if (st.level >= 4) {
    if (btnUpgrade2) btnUpgrade2.classList.add('hidden');
    if (noticeEl) {
      noticeEl.classList.remove('hidden');
      noticeEl.innerHTML = `🏆 <strong class="text-amber-800">Skyscraper Maxed!</strong> This estate is generating maximum rent of ${fmtMoney(tile.rent[4])}.`;
    }
    if (btnUpgrade) {
      btnUpgrade.disabled = true;
      btnUpgrade.className = 'game-btn game-btn-slate opacity-50 cursor-not-allowed flex-1 py-3 px-3 text-xs sm:text-sm font-black flex flex-col items-center justify-center gap-0.5 leading-snug';
      btnUpgrade.innerHTML = `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-crown text-amber-500"></i> MAX LEVEL</span><span class="text-xs font-bold opacity-80">(Skyscraper)</span>`;
    }
    if (btnClose) btnClose.textContent = 'DONE';
  } else {
    const canAfford = p.cash >= tile.houseCost;
    if (btnUpgrade) {
      btnUpgrade.disabled = !canAfford;
      btnUpgrade.className = `game-btn ${canAfford ? 'game-btn-green' : 'game-btn-slate opacity-50 cursor-not-allowed'} flex-1 py-3 px-3 text-xs sm:text-sm font-black flex flex-col items-center justify-center gap-0.5 leading-snug`;
      btnUpgrade.innerHTML = canAfford
        ? `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-arrow-up-right-dots"></i> +1 LEVEL</span><span class="text-xs font-bold opacity-90">(${fmtMoney(tile.houseCost)})</span>`
        : `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-lock"></i> +1 LEVEL</span><span class="text-xs font-bold opacity-80">(NEED ${fmtMoney(tile.houseCost)})</span>`;
    }

    if (btnUpgrade2) {
      if (upgradesDone === 0 && st.level <= 2) {
        btnUpgrade2.classList.remove('hidden');
        const cost2 = tile.houseCost * 2;
        const canAfford2 = p.cash >= cost2;
        btnUpgrade2.disabled = !canAfford2;
        btnUpgrade2.className = `game-btn ${canAfford2 ? 'game-btn-blue' : 'game-btn-slate opacity-50 cursor-not-allowed'} flex-1 py-3 px-3 text-xs sm:text-sm font-black flex flex-col items-center justify-center gap-0.5 leading-snug`;
        btnUpgrade2.innerHTML = canAfford2
          ? `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-angles-up"></i> +2 LEVELS</span><span class="text-xs font-bold opacity-90">(${fmtMoney(cost2)})</span>`
          : `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-lock"></i> +2 LEVELS</span><span class="text-xs font-bold opacity-80">(NEED ${fmtMoney(cost2)})</span>`;
      } else {
        btnUpgrade2.classList.add('hidden');
      }
    }

    if (noticeEl) {
      if (upgradesDone > 0) {
        noticeEl.classList.remove('hidden');
        noticeEl.innerHTML = `⭐ <strong>${upgradesDone}/2 Upgrades completed</strong> this visit. You may upgrade 1 more level.`;
      } else {
        noticeEl.classList.add('hidden');
      }
    }
    if (btnClose) {
      btnClose.textContent = (upgradesDone > 0 || st.level > 0) ? 'DONE' : 'CONTINUE';
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

  if ((gameState.upgradesThisVisit || 0) >= 2) {
    showTurnLockToast("You can only upgrade at most 2 levels at one time!");
    return;
  }

  if (st.level >= 4 || p.cash < tile.houseCost) return;

  upgradeCityLevel(tile.id, true);
  gameState.upgradesThisVisit = (gameState.upgradesThisVisit || 0) + 1;
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.4, 40);
  spawnAnimatedReaction('star', window.innerWidth / 2, window.innerHeight * 0.4);

  renderUpgradeModalContent(tile);
  populateCityPreview3DScene(tile, 'upgrade-city-3d-canvas');
  animateBuildingUpgradeBounce('#upgrade-city-3d-canvas');
}

export function confirmUpgradeTwoLevelsFromModal() {
  const tile = gameState.pendingUpgradeTile;
  if (!tile) return;
  const st = gameState.properties[tile.id];
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  if (!st || !p) return;

  const cost2 = tile.houseCost * 2;
  if ((gameState.upgradesThisVisit || 0) > 0 || st.level > 2 || p.cash < cost2) return;

  upgradeCityLevel(tile.id, true);
  upgradeCityLevel(tile.id, true);
  gameState.upgradesThisVisit = 2;
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.4, 55);
  spawnAnimatedReaction('star', window.innerWidth / 2, window.innerHeight * 0.4);

  renderUpgradeModalContent(tile);
  populateCityPreview3DScene(tile, 'upgrade-city-3d-canvas');
  animateBuildingUpgradeBounce('#upgrade-city-3d-canvas');
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
