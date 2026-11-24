/**
 * ui/modals/inspector.js
 * Property inspection modal, city level upgrade/downgrade, and portfolio view.
 */

import { BOARD_TILES, GROUP_META } from '../../game/data.js';
import { gameState, isHumanTurnActionable, localPlayerIdx, matchSettings } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX } from '../../game/audio.js';
import { calculateTileRent, getPropertyLevelMetadata, isTeammate } from '../../game/rules.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../../network/p2p.js';
import {
  populateCityPreview3DScene,
  clearCityPreview,
  setTileHighlightRing,
  refreshTileTextureAndBuildings,
  showSpeechBubble,
  getTileWorldPosition,
  spawnGoldCoinShower,
  triggerBoardShockwave
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

  const isTeammateOwner = Boolean(
    matchSettings?.teamMode &&
    st && st.owner !== null && st.owner !== undefined &&
    isTeammate(myIdx, st.owner)
  );

  const canUpgrade = Boolean(
    tile.type === 'city' &&
    (isOwner || isTeammateOwner) &&
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

export function upgradeCityLevel(tileId, isForcedAI = false, payerPlayerIdx = null, levelsToAdd = 1) {
  const st = gameState.properties[tileId];
  const tile = BOARD_TILES[tileId];
  if (!st || st.owner === null || st.owner === undefined || st.level >= 4) return false;

  const payerIdx = (payerPlayerIdx !== null && payerPlayerIdx !== undefined)
    ? payerPlayerIdx
    : (gameState.currentPlayerIdx !== undefined && gameState.currentPlayerIdx !== null ? gameState.currentPlayerIdx : st.owner);

  const payer = gameState.players[payerIdx];
  const owner = gameState.players[st.owner];
  if (!payer || !owner) return false;

  const isOwner = (payerIdx === st.owner);
  const isAlly = isTeammate(payerIdx, st.owner);
  if (!isOwner && !isAlly) {
    showTurnLockToast("You can only upgrade your own or your teammate's city!");
    return false;
  }

  if (!isForcedAI && payer.position !== tileId) {
    showTurnLockToast("You can only upgrade the property you are standing on!");
    return false;
  }

  const mySlot = networkState.isMultiplayer ? networkState.localPlayerIdx : localPlayerIdx;
  if (payerIdx === mySlot && !isForcedAI && !isHumanTurnActionable()) {
    showTurnLockToast("Wait for your turn to upgrade cities!");
    return false;
  }

  const levelsRequested = Math.max(1, levelsToAdd || 1);
  if (!isForcedAI && ((gameState.upgradesThisVisit || 0) + levelsRequested) > 2) {
    showTurnLockToast("You can only upgrade at most 2 levels at one time!");
    return false;
  }

  const actualLevels = Math.min(levelsRequested, 4 - st.level);
  if (actualLevels <= 0) return false;

  const totalCost = tile.houseCost * actualLevels;
  if (payer.cash < totalCost) {
    if (!isForcedAI) showTurnLockToast("Insufficient funds to upgrade this city!");
    return false;
  }

  payer.cash -= totalCost;
  st.level += actualLevels;

  if (st.level === 4) {
    if (isAlly) {
      logEvent(`🏛️ <strong>${payer.name}</strong> erected a luxury Skyscraper Landmark in teammate <strong>${owner.name}</strong>'s city <strong>${tile.name}</strong>!`);
    } else {
      logEvent(`🏛️ <strong>${payer.name}</strong> erected a luxury Skyscraper Landmark on <strong>${tile.name}</strong>!`);
    }
  } else {
    if (isAlly) {
      logEvent(`🏗️ <strong>${payer.name}</strong> upgraded teammate <strong>${owner.name}</strong>'s city <strong>${tile.name}</strong> to Level ${st.level}!`);
    } else {
      logEvent(`🏗️ <strong>${payer.name}</strong> upgraded <strong>${tile.name}</strong> to Level ${st.level}!`);
    }
  }

  if (!isForcedAI) {
    gameState.upgradesThisVisit = (gameState.upgradesThisVisit || 0) + actualLevels;
  }

  playSFX('build');
  const cashLabel = isAlly ? `-${fmtMoney(totalCost)} (Ally Upgrade)` : `-${fmtMoney(totalCost)}`;
  if (engineCallbacks.spawnFloatingCash) {
    engineCallbacks.spawnFloatingCash(payerIdx, cashLabel, false);
  }

  const tilePos = getTileWorldPosition(tileId);
  if (tilePos) {
    const coinCount = actualLevels > 1 ? 36 : 20;
    spawnGoldCoinShower(tilePos.x, tilePos.z, coinCount);
    triggerBoardShockwave(tilePos.x, tilePos.z, actualLevels > 1 ? 24 : 18, actualLevels > 1 ? 30 : 26);
  }

  if (networkState.isMultiplayer && !isForcedAI) {
    broadcastAction('ACTION_UPGRADE_CITY', { playerIdx: payerIdx, tileId, count: actualLevels });
  }

  refreshTileTextureAndBuildings(tileId);
  renderCornerHUDs();
  saveCurrentMatchToStorage();
  if (gameState.activeInspectorTile === tileId) openInspectorModal(tileId);

  return true;
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
}

export function toggleCityMortgage(tileId, isAutoLiquidation = false) {
  // Mortgage feature has been removed from the game.
}

export function openPortfolioModal() {
  if (isLobbyScreenActive()) return;
  const myIdx = networkState.isMultiplayer ? networkState.localPlayerIdx : localPlayerIdx;
  const owned = BOARD_TILES.filter(t => gameState.properties[t.id] && gameState.properties[t.id].owner === myIdx);
  if (owned.length > 0) {
    if (typeof window !== 'undefined' && typeof window.setEmpireSpotlight === 'function') {
      window.setEmpireSpotlight(myIdx);
    }
    openInspectorModal(owned[0].id);
  } else {
    showSpeechBubble('No cities owned yet!', 2000);
  }
}

export function closePortfolioModal() {
  closeInspectorModal();
}
