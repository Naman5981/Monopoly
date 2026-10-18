/**
 * ui/modals/buyoutCity.js
 * Hostile takeover & buyout when landing on an opponent's property.
 */

import { GROUP_META } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX } from '../../game/audio.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../../network/p2p.js';
import {
  populateCityPreview3DScene,
  clearCityPreview,
  setTileHighlightRing,
  refreshTileTextureAndBuildings,
  getTileWorldPosition,
  getTileScreenPosition
} from '../../three/scene.js';
import { renderCornerHUDs, logEvent, setStatusPill } from '../hud.js';
import { fireConfettiBurst, spawnAnimatedReaction } from '../../three/effects.js';
import { checkAndTriggerMonopoly } from './victory.js';
import { engineCallbacks, isLobbyScreenActive } from './common.js';
import { animateBuyoutHostileStamp, animateModalSpringOpen, animateModalSpringClose } from '../anim.js';

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

  const origin = getTileScreenPosition(tile.id);
  animateModalSpringOpen('#modal-buyout-city', '#modal-buyout-city-card', origin);
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

  playSFX('build', 1.0, getTileWorldPosition(tile.id));
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.4, 45);
  spawnAnimatedReaction('money', window.innerWidth / 2, window.innerHeight * 0.4);
  animateBuyoutHostileStamp(tile.name);
  if (engineCallbacks.spawnFloatingCash) engineCallbacks.spawnFloatingCash(pIdx, `-${fmtMoney(buyoutCost)}`, false);
  logEvent(`⚔️ <strong>${p.name}</strong> bought out <strong>${tile.name}</strong> from <strong>${prevOwner ? prevOwner.name : 'Opponent'}</strong> for <strong>${fmtMoney(buyoutCost)}</strong>!`);

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_BUYOUT_CITY', { playerIdx: pIdx, tileId: tile.id, prevOwnerIdx, buyoutCost });
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }

  clearCityPreview();
  animateModalSpringClose('#modal-buyout-city', '#modal-buyout-city-card');
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
  animateModalSpringClose('#modal-buyout-city', '#modal-buyout-city-card');
  gameState.pendingBuyoutTile = null;

  if (engineCallbacks.concludeActionPhase) {
    engineCallbacks.concludeActionPhase(isDoubles);
  }
}
