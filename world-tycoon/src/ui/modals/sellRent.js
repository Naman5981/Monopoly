/**
 * ui/modals/sellRent.js
 * Liquidating cities to pay rent debt or managing bankruptcy deficit.
 */

import { GROUP_META, BOARD_TILES } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX } from '../../game/audio.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../../network/p2p.js';
import { refreshTileTextureAndBuildings } from '../../three/scene.js';
import { renderCornerHUDs, logEvent } from '../hud.js';
import { spawnAnimatedReaction } from '../../three/effects.js';
import { engineCallbacks, isLobbyScreenActive } from './common.js';
import { animateBankruptcyQuake, animateModalSpringOpen, animateModalSpringClose } from '../anim.js';

export function calculatePropertySaleValue(tile, propState) {
  if (!tile) return 0;
  const basePrice = tile.price || 0;
  const level = propState?.level || 0;
  const houseCost = tile.houseCost || 0;
  return basePrice + (level * (houseCost / 2));
}

export function openSellCitiesModal(tile, rentOwed, creditorIdx, isDoubles, debtorIdx) {
  if (isLobbyScreenActive()) return;
  const pIdx = debtorIdx !== undefined ? debtorIdx : gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  const creditor = gameState.players[creditorIdx];
  if (!p || !creditor) return;

  gameState.phase = 'MODAL';
  gameState.pendingRentDebt = {
    tile,
    rentOwed,
    creditorIdx,
    debtorIdx: pIdx,
    isDoubles
  };

  if (engineCallbacks.updateUI) engineCallbacks.updateUI();

  renderSellCitiesModal();

  animateModalSpringOpen('#modal-sell-cities', '#modal-sell-cities-card');
  playSFX('hop');
}

function updateDebtFinancialsHUD(p, creditor, debt) {
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
}

function getBuildingLevelDescription(level) {
  if (level === 4) return 'Skyscraper (MAX)';
  if (level > 0) return `${level} House${level > 1 ? 's' : ''}`;
  return 'Base Property';
}

function formatPropertySaleCard(tile, propState) {
  const saleVal = calculatePropertySaleValue(tile, propState);
  const color = tile.group && GROUP_META[tile.group] ? GROUP_META[tile.group].hex : '#0284c7';
  const lvl = propState?.level || 0;
  const lvlDesc = getBuildingLevelDescription(lvl);

  return `
    <div onclick="window.sellPropertyForRent(${tile.id})"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.sellPropertyForRent(${tile.id});}"
         tabindex="0"
         role="button"
         data-tile-id="${tile.id}"
         aria-label="Sell ${tile.name} for ${fmtMoney(saleVal)}"
         class="group bg-white border-2 border-slate-200/90 hover:border-rose-500 hover:bg-rose-50/20 active:scale-[0.99] rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs hover:shadow-sm transition cursor-pointer select-none">
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0" style="background:${color}"></span>
        <div class="truncate">
          <div class="font-black text-xs sm:text-sm text-slate-900 group-hover:text-rose-950 transition-colors truncate">${tile.name}</div>
          <div class="text-[10px] font-bold text-slate-500">${lvlDesc}</div>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <div class="text-right">
          <div class="text-[9px] font-extrabold uppercase text-slate-400">SALE VALUE</div>
          <div class="text-xs sm:text-sm font-black text-emerald-600">+${fmtMoney(saleVal)}</div>
        </div>
        <button type="button"
                onclick="event.stopPropagation(); window.sellPropertyForRent(${tile.id})"
                class="game-btn game-btn-rose !py-2 !px-3 text-xs font-black shadow-xs pointer-events-auto">
          <i class="fa-solid fa-tag mr-1"></i> SELL
        </button>
      </div>
    </div>
  `;
}

function renderEmptyPropertiesMessage() {
  return `
    <div class="text-center py-8 text-slate-500 font-bold text-xs">
      <i class="fa-solid fa-triangle-exclamation text-amber-500 text-lg mb-1 block"></i>
      No properties left to sell.
    </div>
  `;
}

export function renderSellCitiesModal() {
  const debt = gameState.pendingRentDebt;
  if (!debt) return;

  const pIdx = debt.debtorIdx !== undefined ? debt.debtorIdx : gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  const creditor = gameState.players[debt.creditorIdx];
  if (!p || !creditor) return;

  updateDebtFinancialsHUD(p, creditor, debt);

  const grid = document.getElementById('sell-cities-card-grid');
  if (!grid) return;

  const ownedTiles = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === pIdx);
  if (ownedTiles.length === 0) {
    grid.innerHTML = renderEmptyPropertiesMessage();
    return;
  }

  grid.innerHTML = ownedTiles.map(t => formatPropertySaleCard(t, gameState.properties[t.id])).join('');
}

function applyPropertyLiquidation(player, tile, propState) {
  const saleVal = calculatePropertySaleValue(tile, propState);
  propState.owner = null;
  propState.level = 0;
  propState.mortgaged = false;
  player.cash += saleVal;
  return saleVal;
}

function notifyPropertyLiquidation(pIdx, player, tile, saleVal) {
  playSFX('cash');
  spawnAnimatedReaction('cash');
  if (engineCallbacks.spawnFloatingCash) {
    engineCallbacks.spawnFloatingCash(pIdx, `+${fmtMoney(saleVal)}`, true);
  }
  logEvent(`🏷️ <strong>${player.name}</strong> sold <strong>${tile.name}</strong> for <strong>${fmtMoney(saleVal)}</strong> to pay rent.`);

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_SELL_CITY_FOR_RENT', { playerIdx: pIdx, tileId: tile.id, saleVal });
  }

  refreshTileTextureAndBuildings(tile.id);
  renderCornerHUDs();
}

function resolveDebtOrRerender(debtorIdx, player, debt) {
  if (player.cash >= debt.rentOwed) {
    settlePendingRentAndCloseModal();
    return;
  }

  const remainingOwned = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === debtorIdx);
  if (remainingOwned.length === 0) {
    settleDebtDeficitWithoutProperties();
  } else {
    renderSellCitiesModal();
  }
}

export function sellPropertyForRent(tileId) {
  const debt = gameState.pendingRentDebt;
  if (!debt) return;

  const pIdx = debt.debtorIdx !== undefined ? debt.debtorIdx : gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  const id = Number(tileId);
  const tile = BOARD_TILES.find(t => t.id === id) || BOARD_TILES[id];
  const st = gameState.properties[id];
  if (!p || !tile || !st || st.owner !== pIdx) return;

  const saleVal = applyPropertyLiquidation(p, tile, st);
  notifyPropertyLiquidation(pIdx, p, tile, saleVal);
  resolveDebtOrRerender(pIdx, p, debt);
}

function getOwnedPropertiesSortedByValue(playerIdx) {
  const owned = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === playerIdx);
  owned.sort((a, b) => {
    const vA = calculatePropertySaleValue(a, gameState.properties[a.id]);
    const vB = calculatePropertySaleValue(b, gameState.properties[b.id]);
    return vA - vB;
  });
  return owned;
}

export function autoSellCheapestForRent() {
  const debt = gameState.pendingRentDebt;
  if (!debt) return;

  const pIdx = debt.debtorIdx !== undefined ? debt.debtorIdx : gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  if (!p) return;

  while (p.cash < debt.rentOwed) {
    const owned = getOwnedPropertiesSortedByValue(pIdx);
    if (owned.length === 0) break;

    const cheapest = owned[0];
    const st = gameState.properties[cheapest.id];
    const saleVal = applyPropertyLiquidation(p, cheapest, st);

    refreshTileTextureAndBuildings(cheapest.id);
    logEvent(`⚡ <strong>${p.name}</strong> auto-sold <strong>${cheapest.name}</strong> for <strong>${fmtMoney(saleVal)}</strong>.`);

    if (networkState.isMultiplayer) {
      broadcastAction('ACTION_SELL_CITY_FOR_RENT', { playerIdx: pIdx, tileId: cheapest.id, saleVal });
    }
  }

  playSFX('cash');
  renderCornerHUDs();
  resolveDebtOrRerender(pIdx, p, debt);
}

function closeSellCitiesModal() {
  animateModalSpringClose('#modal-sell-cities', '#modal-sell-cities-card');
}

export async function settlePendingRentAndCloseModal() {
  const debt = gameState.pendingRentDebt;
  if (!debt) return;

  const pIdx = debt.debtorIdx !== undefined ? debt.debtorIdx : gameState.currentPlayerIdx;
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

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_SETTLE_RENT', {
      debtorIdx: pIdx,
      creditorIdx: debt.creditorIdx,
      rentOwed: debt.rentOwed
    });
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }

  if (engineCallbacks.concludeActionPhase) {
    engineCallbacks.concludeActionPhase(isDoubles);
  }
}

export function settleDebtDeficitWithoutProperties() {
  const debt = gameState.pendingRentDebt;
  if (!debt) return;

  const pIdx = debt.debtorIdx !== undefined ? debt.debtorIdx : gameState.currentPlayerIdx;
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

  // Transfer remaining properties to creditor if solvent, otherwise revert
  BOARD_TILES.forEach(t => {
    const st = gameState.properties[t.id];
    if (st && st.owner === pIdx) {
      if (creditor && !creditor.bankrupt) {
        st.owner = debt.creditorIdx;
      } else {
        st.owner = null;
        st.level = 0;
      }
      refreshTileTextureAndBuildings(t.id);
    }
  });

  playSFX('bankrupt');
  logEvent(`💥 <strong>${p.name}</strong> has no properties left and could only pay <strong>${fmtMoney(paid)}</strong> of <strong>${fmtMoney(debt.rentOwed)}</strong> rent to <strong>${creditor.name}</strong>. <strong>BANKRUPT!</strong>`);
  renderCornerHUDs();
  animateBankruptcyQuake(pIdx);

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_BANKRUPTCY', {
      bankruptIdx: pIdx,
      creditorIdx: debt.creditorIdx,
      paidCash: paid
    });
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }

  if (engineCallbacks.concludeActionPhase) {
    engineCallbacks.concludeActionPhase(isDoubles);
  }
}

// Window self-registration for inline event handlers and global accessibility
if (typeof window !== 'undefined') {
  window.sellPropertyForRent = sellPropertyForRent;
  window.autoSellCheapestForRent = autoSellCheapestForRent;
  window.openSellCitiesModal = openSellCitiesModal;
}
