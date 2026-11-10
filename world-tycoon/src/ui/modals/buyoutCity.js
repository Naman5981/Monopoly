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
import { updateModalSlice } from '../../svelte/stores/modalStore.js';

let buyoutCountdownInterval = null;
let buyoutCountdownTimer = null;

export function clearBuyoutTimers() {
  if (buyoutCountdownInterval) {
    clearInterval(buyoutCountdownInterval);
    buyoutCountdownInterval = null;
  }
  if (buyoutCountdownTimer) {
    clearTimeout(buyoutCountdownTimer);
    buyoutCountdownTimer = null;
  }
}

export function calculateBuyoutCost(tile, propState) {
  if (!tile || !propState) return 0;
  if ((propState.level || 0) >= 4) return 0; // Maxed skyscrapers are immune to hostile takeover
  const baseCost = (tile.price || 0) * 2;
  const housesBuilt = propState.level || 0;
  const houseCost = tile.houseCost || 0;
  return baseCost + (housesBuilt * houseCost);
}

export function openBuyoutCityModal(tile, isDoubles) {
  if (isLobbyScreenActive()) return;
  const st = gameState.properties[tile.id];
  if (calculateBuyoutCost(tile, st) <= 0) {
    if (typeof window !== 'undefined' && window.concludeActionPhase) {
      window.concludeActionPhase(isDoubles);
    }
    return;
  }
  clearBuyoutTimers();

  gameState.phase = 'MODAL';
  gameState.pendingBuyoutTile = tile;
  gameState.pendingDoubles = isDoubles;
  if (engineCallbacks.updateUI) engineCallbacks.updateUI();

  setTileHighlightRing(tile.id, true);
  setStatusPill(`⚔️ Hostile buyout option for <strong>${tile.name}</strong>...`, { isThinking: false, playerIdx: gameState.currentPlayerIdx });

  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  const prevOwner = gameState.players[st?.owner];
  const basePrice = (tile.price || 0) * 2;
  const housesCost = (st?.level || 0) * (tile.houseCost || 0);
  const totalBuyoutCost = basePrice + housesCost;

  let secondsLeft = 12;
  updateModalSlice('buyout', {
    visible: true,
    tile,
    buyoutCost: totalBuyoutCost,
    buyoutCostFormatted: fmtMoney(totalBuyoutCost),
    basePriceFormatted: fmtMoney(basePrice),
    housesCostFormatted: (st?.level || 0) > 0 ? `${fmtMoney(housesCost)} (${st.level} built)` : '$0 (None)',
    sellerName: prevOwner?.name || 'Opponent',
    buyerBalanceFormatted: fmtMoney(p?.cash || 0),
    canAfford: Boolean(p && p.cash >= totalBuyoutCost),
    secondsLeft
  });

  buyoutCountdownInterval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft > 0) {
      updateModalSlice('buyout', { secondsLeft });
    } else {
      clearBuyoutTimers();
      passBuyoutCity();
    }
  }, 1000);

  try {
    populateCityPreview3DScene(tile, 'buyout-city-3d-canvas');
  } catch (err) {
    console.warn('[BuyoutCity] Failed to populate 3D preview:', err);
  }

  const origin = getTileScreenPosition(tile.id);
  animateModalSpringOpen('#modal-buyout-city', '#modal-buyout-city-card', origin);
  playSFX('hop');
}

export function confirmBuyoutCity() {
  clearBuyoutTimers();
  updateModalSlice('buyout', { visible: false });
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
    broadcastAction('ACTION_BUYOUT_CITY', { playerIdx: pIdx, tileId: tile.id, prevOwnerIdx, buyoutCost, isDoubles: Boolean(isDoubles) });
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
  } else if (typeof window !== 'undefined' && window.concludeActionPhase) {
    window.concludeActionPhase(isDoubles);
  }
}

export function passBuyoutCity() {
  clearBuyoutTimers();
  updateModalSlice('buyout', { visible: false });
  const tile = gameState.pendingBuyoutTile;
  const isDoubles = gameState.pendingDoubles;
  if (tile) {
    setTileHighlightRing(tile.id, false);
    const p = gameState.players[gameState.currentPlayerIdx];
    if (p) logEvent(`🏷️ <strong>${p.name}</strong> passed on buying out <strong>${tile.name}</strong>.`);
  }

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_PASS_BUYOUT', {
      playerIdx: gameState.currentPlayerIdx,
      tileId: tile ? tile.id : null,
      isDoubles: Boolean(isDoubles)
    });
  }

  clearCityPreview();
  animateModalSpringClose('#modal-buyout-city', '#modal-buyout-city-card');
  gameState.pendingBuyoutTile = null;

  if (engineCallbacks.concludeActionPhase) {
    engineCallbacks.concludeActionPhase(isDoubles);
  } else if (typeof window !== 'undefined' && window.concludeActionPhase) {
    window.concludeActionPhase(isDoubles);
  }
}
