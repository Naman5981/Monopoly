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

  animateModalSpringOpen('#modal-sell-cities', '#modal-sell-cities-card');
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
  animateModalSpringClose('#modal-sell-cities', '#modal-sell-cities-card');
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
