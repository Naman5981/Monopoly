/**
 * ui/modals/upgradeCity.js
 * In-visit property upgrading (Cottages, Villas, Manors, Skyscrapers).
 */

import { GROUP_META } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX } from '../../game/audio.js';
import { calculateTileRent, getPropertyLevelMetadata } from '../../game/rules.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../../network/p2p.js';
import {
  populateCityPreview3DScene,
  clearCityPreview,
  setTileHighlightRing,
  spawnGoldCoinShower,
  triggerBoardShockwave,
  getTileWorldPosition,
  getTileScreenPosition
} from '../../three/scene.js';
import { setStatusPill, showTurnLockToast } from '../hud.js';
import { fireConfettiBurst, spawnAnimatedReaction } from '../../three/effects.js';
import { upgradeCityLevel } from './inspector.js';
import { engineCallbacks, isLobbyScreenActive, getTierBadgeHTML } from './common.js';
import { animateBuildingUpgradeBounce, animateModalSpringOpen, animateModalSpringClose } from '../anim.js';
import { playLandmarkCinematicReveal } from '../../three/theatre.js';
import { setPlayerPortraitMood } from '../portraitRenderer.js';
import { updateModalSlice } from '../../svelte/stores/modalStore.js';

export function openUpgradeCityModal(tile, isDoubles) {
  if (isLobbyScreenActive()) return;
  const st = tile ? gameState.properties[tile.id] : null;
  if (st && st.level >= 4) {
    if (engineCallbacks.concludeActionPhase) {
      engineCallbacks.concludeActionPhase(isDoubles);
    }
    return;
  }
  gameState.phase = 'MODAL';
  gameState.pendingUpgradeTile = tile;
  gameState.pendingDoubles = isDoubles;
  gameState.upgradesThisVisit = 0;
  if (engineCallbacks.updateUI) engineCallbacks.updateUI();

  setTileHighlightRing(tile.id, true);
  setStatusPill(`🏗️ Managing property upgrades for <strong>${tile.name}</strong>...`, { isThinking: false, playerIdx: gameState.currentPlayerIdx });
  renderUpgradeModalContent(tile);

  const origin = getTileScreenPosition(tile.id);
  animateModalSpringOpen('#modal-upgrade-city', '#modal-upgrade-city-card', origin);
  playSFX('hop');
}

export function renderUpgradeModalContent(tile) {
  const st = gameState.properties[tile.id];
  if (!st) return;
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx] || gameState.players[0];

  const groupColor = tile.group ? GROUP_META[tile.group].hex : '#10b981';
  const countryName = tile.group ? GROUP_META[tile.group].name : 'ESTATE';
  const curRent = calculateTileRent(tile.id);
  const nextRent = (st.level < 4) ? tile.rent[st.level + 1] : curRent;
  const remainingCash = Math.max(0, p.cash - tile.houseCost);

  const tiers = [0, 1, 2, 3, 4].map(idx => ({
    label: getPropertyLevelMetadata(idx).shortLabel,
    rent: fmtMoney(tile.rent[idx]),
    isCurrent: (st.level === idx),
    isSkyscraper: (idx === 4)
  }));

  const canAfford1 = p.cash >= tile.houseCost && st.level < 4;
  const canAfford2 = p.cash >= (tile.houseCost * 2) && st.level <= 2;

  updateModalSlice('upgradeCity', {
    visible: true,
    tile,
    cityName: tile.name,
    countryName,
    levelLabel: `Level ${st.level}: ${getPropertyLevelMetadata(st.level).label}`,
    colorHex: groupColor,
    currentRentFormatted: fmtMoney(curRent),
    nextRentFormatted: fmtMoney(nextRent),
    upgradeCostFormatted: fmtMoney(tile.houseCost),
    playerCashFormatted: fmtMoney(p.cash),
    remainingCashFormatted: fmtMoney(remainingCash),
    canAfford: canAfford1,
    canUpgrade: canAfford1,
    canUpgradeTwo: canAfford2,
    costOneFormatted: fmtMoney(tile.houseCost),
    costTwoFormatted: fmtMoney(tile.houseCost * 2),
    tiers
  });
}

export function confirmUpgradeFromModal() {
  const tile = gameState.pendingUpgradeTile;
  if (!tile) return;
  const st = gameState.properties[tile.id];
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  if (!st || !p) return;

  if (st.level >= 4 || p.cash < tile.houseCost) return;

  upgradeCityLevel(tile.id, true);
  gameState.upgradesThisVisit = 1;
  const newLevel = gameState.properties[tile.id]?.level;
  if (newLevel >= 4) {
    setPlayerPortraitMood(pIdx, 'cheering', 4500);
  }
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.4, 40);
  spawnAnimatedReaction('star', window.innerWidth / 2, window.innerHeight * 0.4);

  const tilePos = getTileWorldPosition(tile.id);
  spawnGoldCoinShower(tilePos.x, tilePos.z, 20);
  triggerBoardShockwave(tilePos.x, tilePos.z, 18, 26);

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_UPGRADE_CITY', { playerIdx: pIdx, tileId: tile.id, count: 1 });
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }

  // Decisive conclusion: close modal and conclude turn cleanly
  closeUpgradeCityModal();
}

export function confirmUpgradeTwoLevelsFromModal() {
  const tile = gameState.pendingUpgradeTile;
  if (!tile) return;
  const st = gameState.properties[tile.id];
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  if (!st || !p) return;

  const cost2 = tile.houseCost * 2;
  if (st.level > 2 || p.cash < cost2) return;

  upgradeCityLevel(tile.id, true);
  upgradeCityLevel(tile.id, true);
  gameState.upgradesThisVisit = 2;
  const newLevel2 = gameState.properties[tile.id]?.level;
  if (newLevel2 >= 4) {
    setPlayerPortraitMood(pIdx, 'cheering', 4500);
  }
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.4, 55);
  spawnAnimatedReaction('star', window.innerWidth / 2, window.innerHeight * 0.4);

  const tilePos = getTileWorldPosition(tile.id);
  spawnGoldCoinShower(tilePos.x, tilePos.z, 36);
  triggerBoardShockwave(tilePos.x, tilePos.z, 24, 30);

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_UPGRADE_CITY', { playerIdx: pIdx, tileId: tile.id, count: 2 });
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }

  // Decisive conclusion: close modal and conclude turn cleanly
  closeUpgradeCityModal();
}

export function closeUpgradeCityModal() {
  const tile = gameState.pendingUpgradeTile;
  const didBuildLandmark = tile && (gameState.upgradesThisVisit > 0) && (gameState.properties[tile.id]?.level >= 4);
  const landmarkTileId = tile ? tile.id : null;

  if (tile) {
    setTileHighlightRing(tile.id, false);
  }
  clearCityPreview();
  updateModalSlice('upgradeCity', { visible: false });
  animateModalSpringClose('#modal-upgrade-city', '#modal-upgrade-city-card');
  gameState.pendingUpgradeTile = null;

  if (didBuildLandmark && landmarkTileId !== null) {
    playLandmarkCinematicReveal(landmarkTileId);
  }

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_END_UPGRADE', {
      playerIdx: gameState.currentPlayerIdx,
      tileId: tile ? tile.id : null,
      isDoubles: Boolean(gameState.pendingDoubles)
    });
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }

  if (engineCallbacks.concludeActionPhase) {
    engineCallbacks.concludeActionPhase(gameState.pendingDoubles);
  }
}
