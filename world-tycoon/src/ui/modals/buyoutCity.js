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
  getTileScreenPosition,
  playBuyoutCinematicFocus
} from '../../three/scene.js';
import { context } from '../../three/core/context.js';
import { renderCornerHUDs, logEvent, setStatusPill } from '../hud.js';
import { fireConfettiBurst, spawnAnimatedReaction } from '../../three/effects.js';
import { checkAndTriggerMonopoly } from './victory.js';
import { checkNearMonopolyGroup, isTeammate } from '../../game/rules.js';
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
  if ((propState.takeoverCount || 0) >= 2) return 0; // Protected landmark after 2 takeovers
  const baseCost = (tile.price || 0) * 2;
  const housesBuilt = propState.level || 0;
  const houseCost = tile.houseCost || 0;
  return baseCost + (housesBuilt * houseCost);
}

export function openBuyoutCityModal(tile, isDoubles) {
  if (isLobbyScreenActive()) return;
  const st = gameState.properties[tile.id];
  const pIdx = gameState.currentPlayerIdx;
  if (calculateBuyoutCost(tile, st) <= 0 || isTeammate(st?.owner, pIdx)) {
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
  setStatusPill(`⚔️ Hostile buyout option for <strong>${tile.name}</strong>...`, { isThinking: false, playerIdx: pIdx });

  const p = gameState.players[pIdx];
  const prevOwner = gameState.players[st?.owner];
  const basePrice = (tile.price || 0) * 2;
  const housesCost = (st?.level || 0) * (tile.houseCost || 0);
  const totalBuyoutCost = basePrice + housesCost;
  const sellerPayout = Math.round((tile.price || 0) * 1.4) + housesCost;
  const bankFee = totalBuyoutCost - sellerPayout;
  const currentTakeovers = st?.takeoverCount || 0;
  const isFinalTakeover = (currentTakeovers === 1);

  const nearStatus = tile.group ? checkNearMonopolyGroup(pIdx, tile.group) : null;
  const isMonopolyFinisher = Boolean(nearStatus?.isNear && nearStatus?.missingTile?.id === tile.id);
  const colorHex = tile.group ? GROUP_META[tile.group]?.hex : (tile.type === 'resort' ? '#14b8a6' : '#f43f5e');

  let secondsLeft = 12;
  updateModalSlice('buyout', {
    visible: true,
    tile,
    cityName: tile.name,
    colorHex,
    buyoutCost: totalBuyoutCost,
    buyoutCostFormatted: fmtMoney(totalBuyoutCost),
    basePriceFormatted: fmtMoney(basePrice),
    sellerPayoutFormatted: fmtMoney(sellerPayout),
    bankFeeFormatted: fmtMoney(bankFee),
    takeoverBadge: isFinalTakeover ? 'FINAL TAKEOVER (2/2) — LOCKS TO YOU!' : 'TAKEOVER 1/2',
    isFinalTakeover,
    housesCostFormatted: (st?.level || 0) > 0 ? `${fmtMoney(housesCost)} (${st.level} built)` : '$0 (None)',
    sellerName: prevOwner?.name || 'Opponent',
    buyerBalanceFormatted: fmtMoney(p?.cash || 0),
    canAfford: Boolean(p && p.cash >= totalBuyoutCost),
    secondsLeft,
    isMonopolyFinisher
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
  if (networkState && networkState.isReconnecting) return;
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

  const basePrice = (tile.price || 0) * 2;
  const housesCost = (st.level || 0) * (tile.houseCost || 0);
  const sellerPayout = Math.round((tile.price || 0) * 1.4) + housesCost;
  const bankFee = buyoutCost - sellerPayout;

  p.cash -= buyoutCost;
  if (prevOwner) {
    prevOwner.cash += sellerPayout;
    if (engineCallbacks.spawnFloatingCash) engineCallbacks.spawnFloatingCash(prevOwnerIdx, `+${fmtMoney(sellerPayout)}`, true);
  }
  st.owner = pIdx;
  st.takeoverCount = (st.takeoverCount || 0) + 1;

  playSFX('takeover', 1.0, getTileWorldPosition(tile.id));
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.4, 45);
  spawnAnimatedReaction('money', window.innerWidth / 2, window.innerHeight * 0.4);
  animateBuyoutHostileStamp(tile.name, p.name, prevOwner ? prevOwner.name : 'Opponent');
  if (engineCallbacks.spawnFloatingCash) engineCallbacks.spawnFloatingCash(pIdx, `-${fmtMoney(buyoutCost)}`, false);
  if (st.takeoverCount >= 2) {
    logEvent(`🏛️ <strong>${p.name}</strong> executed the FINAL takeover on <strong>${tile.name}</strong> for <strong>${fmtMoney(buyoutCost)}</strong>! It is now a <strong>Protected Landmark</strong> (immune to further buyouts)! (${fmtMoney(bankFee)} Bank Tax burned).`);
  } else {
    logEvent(`⚔️ <strong>${p.name}</strong> bought out <strong>${tile.name}</strong> from <strong>${prevOwner ? prevOwner.name : 'Opponent'}</strong> for <strong>${fmtMoney(buyoutCost)}</strong> (${fmtMoney(bankFee)} Bank Tax burned, Takeover 1/2)!`);
  }

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_BUYOUT_CITY', {
      playerIdx: pIdx,
      tileId: tile.id,
      prevOwnerIdx,
      buyoutCost,
      sellerPayout,
      bankFee,
      takeoverCount: st.takeoverCount,
      isDoubles: Boolean(isDoubles)
    });
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

  const finish = () => {
    if (engineCallbacks.concludeActionPhase) {
      engineCallbacks.concludeActionPhase(isDoubles);
    } else if (typeof window !== 'undefined' && window.concludeActionPhase) {
      window.concludeActionPhase(isDoubles);
    }
  };

  if (context.camera) {
    playBuyoutCinematicFocus(tile.id, 1500).then(finish);
  } else {
    finish();
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
