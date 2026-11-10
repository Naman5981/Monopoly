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
import { updateModalSlice } from '../../svelte/stores/modalStore.js';

export function openBuyCityModal(tile, isDoubles) {
  if (isLobbyScreenActive()) return;
  gameState.phase = 'MODAL';
  gameState.pendingBuyTile = tile;
  gameState.pendingDoubles = isDoubles;
  if (engineCallbacks.updateUI) engineCallbacks.updateUI();

  setTileHighlightRing(tile.id, true);
  setStatusPill(`🏢 Deciding whether to buy <strong>${tile.name}</strong> (${fmtMoney(tile.price)})...`, { isThinking: false, playerIdx: gameState.currentPlayerIdx });

  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx] || gameState.players[0];
  const canAfford = p && p.cash >= tile.price;
  const theme = (PLAYER_THEMES && PLAYER_THEMES[pIdx]) || { colorHex: '#3b82f6' };
  const myLocalIdx = networkState.isMultiplayer ? networkState.localPlayerIdx : 0;
  const isLocalHuman = (pIdx === myLocalIdx) && !p.isAI;

  const colorHex = tile.group ? GROUP_META[tile.group].hex : '#0284c7';
  const countryName = tile.group ? GROUP_META[tile.group].name : 'RESORT DESTINATION';
  const maxRentHtml = (tile.type === 'city')
    ? `<span class="text-amber-700">${fmtMoney(tile.rent[tile.rent.length - 1] || tile.rent[4])}</span> <span class="text-[10px] text-slate-500 font-bold">(Skyscraper)</span>`
    : `<span class="text-sky-700">2× Boosted</span> <span class="text-[10px] text-slate-500 font-bold">(Set of 2)</span>`;

  updateModalSlice('buyCity', {
    visible: true,
    tile,
    cityName: tile.name,
    countryName,
    colorHex,
    priceFormatted: fmtMoney(tile.price),
    rentFormatted: fmtMoney(tile.rent[0]),
    buyerName: p.name,
    buyerBadge: p.isAI ? 'BOT' : (isLocalHuman ? 'YOU' : p.name),
    buyerColor: theme.colorHex,
    canAfford,
    balancePreview: canAfford ? `${fmtMoney(p.cash)} → ${fmtMoney(p.cash - tile.price)}` : `${fmtMoney(p.cash)} (Need ${fmtMoney(tile.price - p.cash)} more)`,
    maxRentHtml
  });

  const buyerCanvas = document.getElementById('buy-modal-buyer-avatar-canvas');
  if (buyerCanvas) drawPortraitFrame(buyerCanvas, pIdx, performance.now());

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
    broadcastAction('ACTION_BUY_CITY', {
      playerIdx: pIdx,
      tileId: tile.id,
      isDoubles: Boolean(gameState.pendingDoubles)
    });
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }

  clearCityPreview();
  updateModalSlice('buyCity', { visible: false });
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
  updateModalSlice('buyCity', { visible: false });
  animateModalSpringClose('#modal-buy-city', '#modal-buy-city-card');
  gameState.pendingBuyTile = null;

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_PASS_BUY_CITY', {
      playerIdx: gameState.currentPlayerIdx,
      tileId: tile ? tile.id : null,
      isDoubles: Boolean(isDoubles)
    });
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }

  if (engineCallbacks.concludeActionPhase) {
    engineCallbacks.concludeActionPhase(isDoubles);
  }
}
