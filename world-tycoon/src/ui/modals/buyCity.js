/**
 * ui/modals/buyCity.js
 * Purchasing unowned properties and resorts.
 */

import { GROUP_META, PLAYER_THEMES } from '../../game/data.js';
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
import { animateModalSpringOpen, animateModalSpringClose } from '../anim.js';
import { drawPortraitFrame } from '../portraitRenderer.js';

export function openBuyCityModal(tile, isDoubles) {
  if (isLobbyScreenActive()) return;
  gameState.phase = 'MODAL';
  gameState.pendingBuyTile = tile;
  gameState.pendingDoubles = isDoubles;
  if (engineCallbacks.updateUI) engineCallbacks.updateUI();

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
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx] || gameState.players[0];

  // Buyer profile info & avatar
  const buyerNameEl = document.getElementById('buy-modal-buyer-name');
  if (buyerNameEl && p) buyerNameEl.textContent = p.name;
  const buyerBadgeEl = document.getElementById('buy-modal-buyer-badge');
  const theme = (PLAYER_THEMES && PLAYER_THEMES[pIdx]) || { colorHex: '#3b82f6' };
  const avatarWrap = document.getElementById('buy-modal-buyer-avatar-wrap');
  if (avatarWrap) avatarWrap.style.boxShadow = `0 0 0 2px ${theme.colorHex}`;
  if (buyerBadgeEl && p) {
    const myLocalIdx = networkState.isMultiplayer ? networkState.localPlayerIdx : 0;
    const isLocalHuman = (pIdx === myLocalIdx) && !p.isAI;
    buyerBadgeEl.textContent = p.isAI ? 'BOT' : (isLocalHuman ? 'YOU' : p.name);
    buyerBadgeEl.style.borderColor = theme.colorHex;
  }
  const buyerCanvas = document.getElementById('buy-modal-buyer-avatar-canvas');
  if (buyerCanvas) drawPortraitFrame(buyerCanvas, pIdx, performance.now());

  const priceEl = document.getElementById('buy-modal-price');
  if (priceEl) priceEl.textContent = fmtMoney(tile.price);
  const rentEl = document.getElementById('buy-modal-rent');
  if (rentEl) rentEl.textContent = fmtMoney(tile.rent[0]);

  // Balance after purchase preview
  const balancePreviewEl = document.getElementById('buy-modal-balance-preview');
  if (balancePreviewEl) {
    if (p) {
      if (p.cash >= tile.price) {
        const remaining = p.cash - tile.price;
        balancePreviewEl.className = 'font-mono tabular-nums font-black text-emerald-700';
        balancePreviewEl.textContent = `${fmtMoney(p.cash)} → ${fmtMoney(remaining)}`;
      } else {
        balancePreviewEl.className = 'font-mono tabular-nums font-black text-rose-600';
        balancePreviewEl.textContent = `${fmtMoney(p.cash)} (Need ${fmtMoney(tile.price - p.cash)} more)`;
      }
    }
  }

  // Max Potential preview
  const maxRentEl = document.getElementById('buy-modal-max-rent');
  if (maxRentEl) {
    if (tile.type === 'city') {
      const maxVal = tile.rent[tile.rent.length - 1] || tile.rent[4];
      maxRentEl.innerHTML = `<span class="text-amber-700">${fmtMoney(maxVal)}</span> <span class="text-[10px] text-slate-500 font-bold">(Skyscraper)</span>`;
    } else {
      maxRentEl.innerHTML = `<span class="text-sky-700">2× Boosted</span> <span class="text-[10px] text-slate-500 font-bold">(Set of 2)</span>`;
    }
  }

  // Primary Action Button with embedded price
  const btnBuy = document.getElementById('btn-confirm-buy');
  if (btnBuy) {
    const canAfford = p && p.cash >= tile.price;
    btnBuy.disabled = !canAfford;
    btnBuy.innerHTML = canAfford
      ? `<i class="fa-solid fa-cart-shopping mr-1.5"></i> BUY FOR ${fmtMoney(tile.price)}`
      : `<i class="fa-solid fa-lock mr-1.5"></i> NEED ${fmtMoney(tile.price)}`;
    btnBuy.className = `game-btn ${canAfford ? 'game-btn-green' : 'game-btn-slate opacity-50 cursor-not-allowed'} flex-1 py-3 text-sm font-black shadow-md cursor-pointer transition`;
  }

  populateCityPreview3DScene(tile, 'buy-city-3d-canvas');

  const origin = getTileScreenPosition(tile.id);
  animateModalSpringOpen('#modal-buy-city', '#modal-buy-city-card', origin);
  playSFX('hop');
}

export function confirmBuyCity() {
  const tile = gameState.pendingBuyTile;
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  if (!tile || !p || p.cash < tile.price) return;

  p.cash -= tile.price;
  gameState.properties[tile.id].owner = pIdx;
  playSFX('build', 1.0, getTileWorldPosition(tile.id));
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.4, 45);
  spawnAnimatedReaction('money', window.innerWidth / 2, window.innerHeight * 0.4);
  if (engineCallbacks.spawnFloatingCash) engineCallbacks.spawnFloatingCash(pIdx, `-${fmtMoney(tile.price)}`, false);
  logEvent(`🏙️ <strong>${p.name}</strong> bought <strong>${tile.name}</strong> for <strong>${fmtMoney(tile.price)}</strong>!`);

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_BUY_CITY', { playerIdx: pIdx, tileId: tile.id });
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }

  clearCityPreview();
  animateModalSpringClose('#modal-buy-city', '#modal-buy-city-card');
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
  animateModalSpringClose('#modal-buy-city', '#modal-buy-city-card');
  gameState.pendingBuyTile = null;

  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastFullGameState();
  }

  if (engineCallbacks.concludeActionPhase) {
    engineCallbacks.concludeActionPhase(isDoubles);
  }
}
