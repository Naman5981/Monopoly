/**
 * ui/modals/sellRent.js
 * Liquidating cities to pay rent debt or managing bankruptcy deficit.
 */

import { GROUP_META, BOARD_TILES } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX } from '../../game/audio.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../../network/p2p.js';
import { refreshTileTextureAndBuildings, spawnShatterDebris, triggerBoardShockwave } from '../../three/scene.js';
import { renderCornerHUDs, logEvent } from '../hud.js';
import { spawnAnimatedReaction } from '../../three/effects.js';
import { engineCallbacks, isLobbyScreenActive } from './common.js';
import { animateBankruptcyQuake, animateModalSpringOpen, animateModalSpringClose, animatePlayerEliminatedBanner } from '../anim.js';
import { updateModalSlice } from '../../svelte/stores/modalStore.js';
import { startSoldPropertiesAuctionSequence } from '../../game/engine/auction.js';

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
  if (!p) return;
  const hasCreditor = creditorIdx !== null && creditorIdx !== undefined;
  const creditor = hasCreditor ? gameState.players[creditorIdx] : null;

  gameState.phase = 'MODAL';
  gameState.pendingRentDebt = {
    tile,
    rentOwed,
    creditorIdx: hasCreditor ? creditorIdx : null,
    debtorIdx: pIdx,
    isDoubles
  };

  if (engineCallbacks.updateUI) engineCallbacks.updateUI();

  renderSellCitiesModal();

  animateModalSpringOpen('#modal-sell-cities', '#modal-sell-cities-card');
  playSFX('hop');
}

function getBuildingLevelDescription(level) {
  if (level === 4) return 'Skyscraper (MAX)';
  if (level > 0) return `${level} House${level > 1 ? 's' : ''}`;
  return 'Base Property';
}

export function renderSellCitiesModal() {
  const debt = gameState.pendingRentDebt;
  if (!debt) return;

  const pIdx = debt.debtorIdx !== undefined ? debt.debtorIdx : gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  if (!p) return;
  const hasCreditor = debt.creditorIdx !== null && debt.creditorIdx !== undefined;
  const creditor = hasCreditor ? gameState.players[debt.creditorIdx] : null;

  const ownedTiles = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === pIdx);
  const deficit = Math.max(0, debt.rentOwed - p.cash);
  const ownedProps = ownedTiles.map(t => {
    const propState = gameState.properties[t.id];
    const saleVal = calculatePropertySaleValue(t, propState);
    const color = t.group && GROUP_META[t.group] ? GROUP_META[t.group].hex : '#0284c7';
    const lvl = propState?.level || 0;
    const lvlDesc = getBuildingLevelDescription(lvl);
    return {
      id: t.id,
      name: t.name,
      color,
      levelDesc: lvlDesc,
      saleValFormatted: fmtMoney(saleVal)
    };
  });

  const subtitle = creditor
    ? `Owe rent on ${debt.tile ? debt.tile.name : 'Property'} to ${creditor.name}`
    : `Owe ${fmtMoney(debt.rentOwed)} on ${debt.tile ? debt.tile.name : 'Fine/Tax'} to the Bank`;

  updateModalSlice('sellCities', {
    visible: true,
    creditorSubtitle: subtitle,
    rentDueFormatted: fmtMoney(debt.rentOwed),
    currentCashFormatted: fmtMoney(p.cash),
    deficitFormatted: fmtMoney(deficit),
    ownedProperties: ownedProps
  });
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

  if (!debt.soldTiles) debt.soldTiles = [];
  debt.soldTiles.push(tile);

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
    if (!debt.soldTiles) debt.soldTiles = [];
    debt.soldTiles.push(cheapest);
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
  updateModalSlice('sellCities', { visible: false });
  animateModalSpringClose('#modal-sell-cities', '#modal-sell-cities-card');
}

export async function settlePendingRentAndCloseModal() {
  const debt = gameState.pendingRentDebt;
  if (!debt) return;

  const pIdx = debt.debtorIdx !== undefined ? debt.debtorIdx : gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  const hasCreditor = debt.creditorIdx !== null && debt.creditorIdx !== undefined;
  const creditor = hasCreditor ? gameState.players[debt.creditorIdx] : null;
  const isDoubles = debt.isDoubles;
  const soldTiles = debt.soldTiles ? [...debt.soldTiles] : [];

  closeSellCitiesModal();
  gameState.pendingRentDebt = null;

  if (p) {
    p.cash -= debt.rentOwed;
    if (creditor) {
      creditor.cash += debt.rentOwed;
    } else if (debt.isTax) {
      gameState.festivalPot += debt.rentOwed;
    }
    playSFX('cash');
    if (engineCallbacks.spawnFloatingCash) {
      engineCallbacks.spawnFloatingCash(pIdx, `-${fmtMoney(debt.rentOwed)}`, false);
      if (creditor && debt.creditorIdx !== undefined) {
        engineCallbacks.spawnFloatingCash(debt.creditorIdx, `+${fmtMoney(debt.rentOwed)}`, true);
      }
    }
    if (creditor) {
      logEvent(`💸 <strong>${p.name}</strong> settled <strong>${fmtMoney(debt.rentOwed)}</strong> rent to <strong>${creditor.name}</strong>.`);
    } else {
      logEvent(`💸 <strong>${p.name}</strong> settled <strong>${fmtMoney(debt.rentOwed)}</strong> debt to the Bank.`);
    }
  }

  renderCornerHUDs();

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_SETTLE_RENT', {
      debtorIdx: pIdx,
      creditorIdx: hasCreditor ? debt.creditorIdx : null,
      rentOwed: debt.rentOwed
    });
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }

  if (soldTiles.length > 0) {
    startSoldPropertiesAuctionSequence(soldTiles, pIdx, isDoubles);
    return;
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
  const hasCreditor = debt.creditorIdx !== null && debt.creditorIdx !== undefined;
  const creditor = hasCreditor ? gameState.players[debt.creditorIdx] : null;
  const isDoubles = debt.isDoubles;
  const soldTiles = debt.soldTiles ? [...debt.soldTiles] : [];

  closeSellCitiesModal();
  gameState.pendingRentDebt = null;

  if (!p) return;

  // Player owns no more properties and still cannot afford debt -> surrender remaining cash, then declare bankruptcy!
  const paid = Math.max(0, p.cash);
  p.cash = 0;
  if (creditor) {
    creditor.cash += paid;
  }
  p.bankrupt = true;

  // Transfer remaining properties to creditor if solvent, otherwise revert to bank
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
  if (creditor) {
    logEvent(`💥 <strong>${p.name}</strong> has no properties left and could only pay <strong>${fmtMoney(paid)}</strong> of <strong>${fmtMoney(debt.rentOwed)}</strong> rent to <strong>${creditor.name}</strong>. <strong>BANKRUPT!</strong>`);
  } else {
    logEvent(`💥 <strong>${p.name}</strong> has no properties left and could only pay <strong>${fmtMoney(paid)}</strong> of <strong>${fmtMoney(debt.rentOwed)}</strong> debt to the Bank. <strong>BANKRUPT!</strong>`);
  }

  renderCornerHUDs();
  animatePlayerEliminatedBanner(p, creditor);
  animateBankruptcyQuake(pIdx);
  spawnShatterDebris(0, 0, 0xef4444, 36);
  triggerBoardShockwave(0, 0, 26, 32);

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_BANKRUPTCY', {
      bankruptIdx: pIdx,
      creditorIdx: hasCreditor ? debt.creditorIdx : null,
      paidCash: paid
    });
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }

  if (soldTiles.length > 0) {
    startSoldPropertiesAuctionSequence(soldTiles, pIdx, isDoubles);
    return;
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
