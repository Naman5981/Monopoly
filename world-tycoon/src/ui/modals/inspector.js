/**
 * ui/modals/inspector.js
 * Property inspection modal, city level upgrade/downgrade, and portfolio view.
 */

import { BOARD_TILES, GROUP_META } from '../../game/data.js';
import { gameState, isHumanTurnActionable, localPlayerIdx } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX } from '../../game/audio.js';
import { calculateTileRent, getPropertyLevelMetadata } from '../../game/rules.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../../network/p2p.js';
import {
  populateCityPreview3DScene,
  clearCityPreview,
  setTileHighlightRing,
  refreshTileTextureAndBuildings
} from '../../three/scene.js';
import { renderCornerHUDs, showTurnLockToast, logEvent, refreshActivePlayerTurnStatus, updateRollButtonsUI } from '../hud.js';
import { saveCurrentMatchToStorage } from '../../game/persistence.js';
import { engineCallbacks, isLobbyScreenActive, getTierBadgeHTML, closeOtherInformationalModals } from './common.js';
import { animateTileInspectorSpringOpen, animateTileInspectorSpringClose, animateModalSpringOpen, animateModalSpringClose } from '../anim.js';
import { updateModalSlice } from '../../svelte/stores/modalStore.js';

export function buildInspectorSliceData(tileId) {
  const tile = BOARD_TILES[tileId];
  if (!tile) return { visible: false };

  const st = gameState.properties[tileId];
  const myIdx = (typeof localPlayerIdx === 'number' ? localPlayerIdx : 0);
  const myPlayer = gameState.players[myIdx] || gameState.players[0];
  const isOwned = Boolean(st && st.owner !== null && st.owner !== undefined);
  const isOwner = Boolean(st && st.owner === myIdx);
  const isStandingOnTile = Boolean(myPlayer && myPlayer.position === tileId);
  const isTurnActionable = isHumanTurnActionable();
  const curLevel = st ? (st.level || 0) : 0;
  const groupMeta = tile.group ? GROUP_META[tile.group] : null;
  const groupHex = groupMeta ? groupMeta.hex : '#3b82f6';
  const groupName = groupMeta ? groupMeta.name : tile.type.toUpperCase();

  const owner = isOwned ? gameState.players[st.owner] : null;
  const ownerName = owner ? owner.name : 'Unowned';
  const ownerColorHex = owner?.colorHex || '#f43f5e';
  const levelMetadata = getPropertyLevelMetadata(curLevel);

  const rentTiers = [];
  if (tile.type === 'city' && Array.isArray(tile.rent)) {
    const tierLabels = ['Base Land', '1 House', '2 Houses', '3 Houses', 'Skyscraper'];
    const tierIcons = ['fa-location-dot', 'fa-house', 'fa-house', 'fa-house', 'fa-city'];
    const badgeTexts = ['Base', '1', '2', '3', 'MAX'];
    for (let idx = 0; idx < tile.rent.length; idx++) {
      rentTiers.push({
        index: idx,
        label: tierLabels[idx] || `Level ${idx}`,
        rent: fmtMoney(tile.rent[idx]),
        isCurrent: isOwned ? curLevel === idx : idx === 0,
        isMax: idx === 4,
        icon: tierIcons[idx] || 'fa-building',
        badgeText: badgeTexts[idx] || String(idx)
      });
    }
  } else if (tile.type === 'resort' && Array.isArray(tile.rent)) {
    rentTiers.push({
      index: 0,
      label: '1 Resort Owned',
      rent: fmtMoney(tile.rent[0]),
      isCurrent: isOwned ? curLevel === 0 : true,
      isMax: false,
      icon: 'fa-umbrella-beach',
      badgeText: '1'
    });
    if (tile.rent.length > 1) {
      rentTiers.push({
        index: 1,
        label: '2 Resorts Owned (2×)',
        rent: fmtMoney(tile.rent[1]),
        isCurrent: isOwned ? curLevel === 1 : false,
        isMax: true,
        icon: 'fa-crown',
        badgeText: 'MAX'
      });
    }
  }

  const canUpgrade = Boolean(
    tile.type === 'city' &&
    isOwner &&
    curLevel < 4 &&
    isStandingOnTile &&
    isTurnActionable &&
    myPlayer &&
    myPlayer.cash >= tile.houseCost &&
    (gameState.upgradesThisVisit || 0) < 2
  );

  const canDowngrade = Boolean(
    tile.type === 'city' &&
    isOwner &&
    curLevel > 0 &&
    isStandingOnTile &&
    isTurnActionable
  );

  return {
    visible: true,
    tile,
    tileId,
    cityName: tile.name,
    subtitle: tile.subtitle || '',
    groupHex,
    groupName,
    isOwned,
    isOwner,
    ownerName,
    ownerColorHex,
    level: curLevel,
    levelLabel: levelMetadata.label,
    priceFormatted: tile.price ? fmtMoney(tile.price) : null,
    houseCost: tile.houseCost || 0,
    houseCostFormatted: tile.houseCost ? fmtMoney(tile.houseCost) : null,
    downgradeRefundFormatted: tile.houseCost ? fmtMoney(tile.houseCost / 2) : null,
    currentRentFormatted: isOwned ? fmtMoney(calculateTileRent(tileId)) : null,
    isStandingOnTile,
    isTurnActionable,
    canUpgrade,
    canDowngrade,
    rentTiers,
    festivalBoost: Boolean(st?.festivalBoost)
  };
}

export function openInspectorModal(tileId) {
  if (isLobbyScreenActive()) return;
  const tile = BOARD_TILES[tileId];
  if (!tile) return;
  gameState.activeInspectorTile = tileId;

  setTileHighlightRing(tile.id, true);

  const sliceData = buildInspectorSliceData(tileId);
  updateModalSlice('inspector', sliceData);

  populateCityPreview3DScene(tile, 'insp-city-3d-canvas');

  const m = document.getElementById('modal-tile-inspector');
  const card = document.getElementById('modal-tile-inspector-card');
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
  }

  if (card) {
    animateTileInspectorSpringOpen('#modal-tile-inspector', card);
    playSFX('hop');
  }
}

export function closeInspectorModal() {
  updateModalSlice('inspector', { visible: false });
  const m = document.getElementById('modal-tile-inspector');
  const card = document.getElementById('modal-tile-inspector-card');
  setTileHighlightRing(0, false);

  animateTileInspectorSpringClose(m, card, () => {
    clearCityPreview();
  });
  gameState.activeInspectorTile = null;
}

// Light dismiss: clicking anywhere outside the inspector card closes it
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => {
    const m = document.getElementById('modal-tile-inspector');
    const card = document.getElementById('modal-tile-inspector-card');
    if (!m || m.classList.contains('hidden')) return;

    if (card && card.contains(e.target)) return;

    const canvasContainer = document.getElementById('three-canvas-container');
    if (canvasContainer && (e.target === canvasContainer || canvasContainer.contains(e.target))) {
      return;
    }

    closeInspectorModal();
  });
}

export function upgradeCityLevel(tileId, isForcedAI = false) {
  const st = gameState.properties[tileId];
  const tile = BOARD_TILES[tileId];
  if (!st || st.owner === null || st.level >= 4) return;
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
  const portModal = document.getElementById('modal-portfolio');
  if (portModal && !portModal.classList.contains('hidden')) renderPortfolioGrid();
}

export function downgradeCityLevel(tileId, isAutoLiquidation = false) {
  const st = gameState.properties[tileId];
  const tile = BOARD_TILES[tileId];
  if (!st || st.owner === null || st.level <= 0) return;
  const mySlot = networkState.isMultiplayer ? networkState.localPlayerIdx : localPlayerIdx;
  if (st.owner === mySlot && !isAutoLiquidation && !isHumanTurnActionable()) {
    showTurnLockToast("Wait for your turn to sell buildings!");
    return;
  }
  const p = gameState.players[st.owner];
  const refund = tile.houseCost / 2;

  p.cash += refund;
  st.level--;
  playSFX('cash');
  if (engineCallbacks.spawnFloatingCash) engineCallbacks.spawnFloatingCash(st.owner, `+${fmtMoney(refund)}`, true);
  logEvent(`🏷️ <strong>${p.name}</strong> sold a building in <strong>${tile.name}</strong> for <strong>${fmtMoney(refund)}</strong>.`);

  if (networkState.isMultiplayer && !isAutoLiquidation) {
    broadcastAction('ACTION_DOWNGRADE_CITY', { playerIdx: st.owner, tileId, refund });
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }

  refreshTileTextureAndBuildings(tileId);
  renderCornerHUDs();
  saveCurrentMatchToStorage();
  if (gameState.activeInspectorTile === tileId) openInspectorModal(tileId);
  const portModal = document.getElementById('modal-portfolio');
  if (portModal && !portModal.classList.contains('hidden')) renderPortfolioGrid();
}

export function toggleCityMortgage(tileId, isAutoLiquidation = false) {
  // Mortgage feature has been removed from the game.
}

export function openPortfolioModal() {
  if (isLobbyScreenActive()) return;
  const m = document.getElementById('modal-portfolio');
  if (m && m.classList.contains('flex') && !m.classList.contains('hidden')) {
    closePortfolioModal();
    return;
  }
  closeOtherInformationalModals('modal-portfolio');
  updateModalSlice('portfolio', { visible: true });
  renderPortfolioGrid();
  if (m) {
    m.style.removeProperty('display');
    m.style.removeProperty('pointer-events');
    animateModalSpringOpen(m, '#modal-portfolio .game-modal-shell');
  }
  playSFX('hop');
}

export function closePortfolioModal() {
  updateModalSlice('portfolio', { visible: false });
  const m = document.getElementById('modal-portfolio');
  if (m) {
    animateModalSpringClose(m, '#modal-portfolio .game-modal-shell', () => {
      m.classList.add('hidden');
      m.classList.remove('flex');
      m.style.setProperty('display', 'none', 'important');
    });
  }
  if (gameState.gameStarted && gameState.phase !== 'SETUP') {
    renderCornerHUDs();
    refreshActivePlayerTurnStatus();
    updateRollButtonsUI(isHumanTurnActionable());
  }
}

export function renderPortfolioGrid() {
  const grid = document.getElementById('portfolio-grid');
  const myIdx = networkState.isMultiplayer ? networkState.localPlayerIdx : localPlayerIdx;
  const owned = BOARD_TILES.filter(t => gameState.properties[t.id] && gameState.properties[t.id].owner === myIdx);
  const totalCities = owned.length;
  const totalRent = owned.reduce((sum, t) => sum + calculateTileRent(t.id), 0);
  const totalRentFormatted = fmtMoney(totalRent);

  const formattedProps = owned.map(t => {
    const st = gameState.properties[t.id];
    const color = t.group ? GROUP_META[t.group].hex : '#0284c7';
    const meta = getPropertyLevelMetadata(st ? st.level : 0);
    return {
      id: t.id,
      name: t.name,
      color,
      levelDesc: meta.label,
      rentFormatted: fmtMoney(calculateTileRent(t.id))
    };
  });

  updateModalSlice('portfolio', {
    visible: true,
    totalCities,
    totalRentFormatted,
    properties: formattedProps
  });
}
