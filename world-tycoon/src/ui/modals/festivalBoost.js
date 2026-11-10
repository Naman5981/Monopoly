/**
 * ui/modals/festivalBoost.js
 * Interactive World Festival city selection modal and 3D breathing property highlight orchestration.
 * Allows player to choose which owned property receives a 2x rent boost.
 * Complies with better-interface guidelines (accessibility, responsive layout, clear UX copy).
 */

import { BOARD_TILES, GROUP_META } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { calculateTileRent, calculateBaseTileRent } from '../../game/rules.js';
import { playSFX } from '../../game/audio.js';
import {
  refreshTileTextureAndBuildings,
  getTileWorldPosition,
  setTileHighlightRing,
  triggerBoardShockwave,
  setFestivalSelectionHighlights
} from '../../three/scene.js';
import {
  fireConfettiBurst,
  spawnAnimatedReaction
} from '../../three/effects.js';
import {
  renderCornerHUDs,
  spawnFloatingCashOnHUD,
  logEvent,
  setStatusPill
} from '../hud.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../../network/p2p.js';
import { animateModalSpringOpen, animateModalSpringClose } from '../anim.js';
import { engineCallbacks, isLobbyScreenActive, getTierBadgeHTML } from './common.js';
import { updateModalSlice } from '../../svelte/stores/modalStore.js';

let pendingFestivalDoubles = false;
let festivalPlayerIdx = null;
let cachedFestivalProperties = [];

/**
 * Displays an accessible alert modal when a player lands on World Festival but owns zero properties.
 * @param {object} player - Active player object
 * @param {boolean} isDoubles - Whether player rolled doubles
 */
export function showFestivalNoPropertiesModal(player, isDoubles = false) {
  if (isLobbyScreenActive()) return;

  pendingFestivalDoubles = Boolean(isDoubles);
  gameState.phase = 'MODAL';
  updateModalSlice('festivalBoost', { noPropertiesVisible: true });
  playSFX('hop');
  setStatusPill(`🎪 Visited World Festival (No properties owned to increase rent)`, { isThinking: false, playerIdx: gameState.currentPlayerIdx });
}

/**
 * Closes the No Properties Owned alert modal and concludes action phase.
 */
export function closeFestivalNoPropertiesModal() {
  updateModalSlice('festivalBoost', { noPropertiesVisible: false });
  const isDoubles = pendingFestivalDoubles;
  if (window.concludeActionPhase) {
    window.concludeActionPhase(isDoubles);
  }
}

/**
 * Opens the Festival Boost selection suite for the active human player.
 * Activates 3D breathing highlights on eligible owned properties and reveals banner and selection modal.
 * @param {Array<object>} ownedProperties - List of eligible BOARD_TILES owned by player
 * @param {boolean} isDoubles - Whether turn had rolled doubles
 * @param {number} playerIdx - Index of landing player
 */
export function openFestivalBoostModal(ownedProperties, isDoubles, playerIdx = null) {
  if (isLobbyScreenActive()) return;

  const pIdx = playerIdx !== null ? playerIdx : gameState.currentPlayerIdx;
  const player = gameState.players ? gameState.players[pIdx] : null;
  if (!player) return;

  gameState.phase = 'FESTIVAL_SELECT';
  pendingFestivalDoubles = Boolean(isDoubles);
  festivalPlayerIdx = pIdx;
  cachedFestivalProperties = Array.isArray(ownedProperties) ? ownedProperties : [];

  // 1. Activate 3D breathing rings on owned properties
  const eligibleTileIds = cachedFestivalProperties.map(t => t.id);
  setFestivalSelectionHighlights(true, eligibleTileIds, '#10b981');

  // 2. Display persistent World Festival top helper banner
  const banner = document.getElementById('festival-select-banner');
  if (banner) {
    banner.classList.remove('hidden');
    banner.classList.add('flex');
  }

  if (engineCallbacks.updateUI) engineCallbacks.updateUI();

  // 3. Update reactive Svelte modalStore slice
  renderFestivalBoostModal(cachedFestivalProperties, pIdx);
  updateModalSlice('festivalBoost', { visible: false });
  playSFX('hop');
  setStatusPill(`🎪 Click any flashing owned city on the board to double rent (2×)!`, { isThinking: false, playerIdx: pIdx });
}

/**
 * Reopens the festival boost selection modal when clicking the banner button.
 */
export function openFestivalBoostModalFromBanner() {
  if (cachedFestivalProperties.length > 0) {
    renderFestivalBoostModal(cachedFestivalProperties, festivalPlayerIdx ?? gameState.currentPlayerIdx);
    updateModalSlice('festivalBoost', { visible: true });
    animateModalSpringOpen('#modal-festival-boost', '#modal-festival-boost-card');
  }
}

/**
 * Renders the property choices into the modal grid.
 * @param {Array<object>} ownedProperties
 * @param {number} pIdx
 */
export function renderFestivalBoostModal(ownedProperties, pIdx) {
  const player = gameState.players ? gameState.players[pIdx] : null;
  const countEl = document.getElementById('festival-boost-count');
  if (countEl) countEl.textContent = `${ownedProperties.length} Properties Owned`;
  const playerNameEl = document.getElementById('festival-boost-player-name');
  if (playerNameEl && player) playerNameEl.textContent = player.name;

  updateModalSlice('festivalBoost', {
    playerName: player?.name || 'Player',
    potAmountFormatted: fmtMoney(gameState.festivalPot || 0),
    ownedProperties: ownedProperties.map(tile => {
      const st = gameState.properties[tile.id] || { level: 0, festivalBoost: false };
      const color = tile.group && GROUP_META[tile.group] ? GROUP_META[tile.group].hex : '#0284c7';
      const baseRent = calculateBaseTileRent(tile.id);
      return {
        id: tile.id,
        name: tile.name,
        color,
        level: st.level || 0,
        rentFormatted: fmtMoney(baseRent * 2),
        festivalBoost: Boolean(st.festivalBoost)
      };
    })
  });
}

/**
 * Handles player choosing a specific city to receive the 2x Festival boost.
 * Can be triggered either from the modal button OR by directly clicking the breathing 3D tile on the board.
 * @param {number} tileId
 */
export function chooseFestivalBoostCity(tileId) {
  const activeIdx = (typeof networkState !== 'undefined' && networkState.isMultiplayer)
    ? networkState.localPlayerIdx
    : gameState.currentPlayerIdx;
  const pIdx = festivalPlayerIdx !== null ? festivalPlayerIdx : activeIdx;
  const player = gameState.players ? gameState.players[pIdx] : null;
  const tile = BOARD_TILES[tileId];
  if (!player || !tile) return;

  const st = gameState.properties[tileId];
  if (!st || st.owner !== pIdx) return;

  // Restore any previous city's festival boost across the board (no player constraint)
  let prevHostTile = null;
  let prevHostOwner = null;
  for (const bt of BOARD_TILES) {
    if (bt.id !== tileId && gameState.properties[bt.id]?.festivalBoost) {
      prevHostTile = bt;
      const prevOwnerIdx = gameState.properties[bt.id].owner;
      prevHostOwner = (prevOwnerIdx !== null && gameState.players) ? gameState.players[prevOwnerIdx] : null;
      gameState.properties[bt.id].festivalBoost = false;
      refreshTileTextureAndBuildings(bt.id);
    }
  }

  const wasAlreadyBoosted = Boolean(st.festivalBoost);

  // 1. Apply the 2x festival boost to the chosen property
  st.festivalBoost = true;
  refreshTileTextureAndBuildings(tileId);

  // 2. Shut off 3D breathing rings and dismiss top banner
  setFestivalSelectionHighlights(false);
  const banner = document.getElementById('festival-select-banner');
  if (banner) {
    banner.classList.add('hidden');
    banner.classList.remove('flex');
  }

  const newRent = calculateTileRent(tileId);
  const worldPos = getTileWorldPosition(tileId);

  // 3. Audio, confetti, and shockwave celebrations
  playSFX('win', 1.0, worldPos);
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.45, 60);
  spawnAnimatedReaction('star', window.innerWidth / 2, window.innerHeight * 0.45);
  triggerBoardShockwave(worldPos.x, worldPos.z, 16, 24);
  setTileHighlightRing(tileId, true);
  setTimeout(() => setTileHighlightRing(tileId, false), 2200);

  spawnFloatingCashOnHUD(pIdx, `✨ 2× Rent in ${tile.name}!`, true);

  if (prevHostTile) {
    const prevOwnerText = prevHostOwner ? ` (${prevHostOwner.name})` : '';
    logEvent(`🎉 <strong>${player.name}</strong> moved the World Festival to <strong>${tile.name}</strong>! Rent doubled to 2× (<strong>${fmtMoney(newRent)}</strong>), and <strong>${prevHostTile.name}</strong>${prevOwnerText} rent restored to normal.`);
  } else if (wasAlreadyBoosted) {
    logEvent(`🎉 <strong>${player.name}</strong> re-confirmed <strong>${tile.name}</strong> as World Festival host! Rent remains boosted 2× at <strong>${fmtMoney(newRent)}</strong>.`);
  } else {
    logEvent(`🎉 <strong>${player.name}</strong> selected <strong>${tile.name}</strong> to host the World Festival! Rent boosted 2× to <strong>${fmtMoney(newRent)}</strong>!`);
  }
  renderCornerHUDs();

  const isDoubles = Boolean(pendingFestivalDoubles);

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_FESTIVAL_BOOST', { playerIdx: pIdx, tileId, isDoubles });
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }

  // Close modal completely
  closeFestivalBoostModal(true);

  // Conclude turn cleanly
  if (window.concludeActionPhase) {
    window.concludeActionPhase(isDoubles);
  }
}

/**
 * Closes the Festival modal.
 * @param {boolean} [forceCancelHighlights=false] - Whether to also shut down 3D breathing highlights
 */
export function closeFestivalBoostModal(forceCancelHighlights = false) {
  updateModalSlice('festivalBoost', { visible: false });
  animateModalSpringClose('#modal-festival-boost', '#modal-festival-boost-card');

  if (forceCancelHighlights) {
    setFestivalSelectionHighlights(false);
    const banner = document.getElementById('festival-select-banner');
    if (banner) {
      banner.classList.add('hidden');
      banner.classList.remove('flex');
    }
    festivalPlayerIdx = null;
  }
}

// Global exposures
if (typeof window !== 'undefined') {
  window.openFestivalBoostModal = openFestivalBoostModal;
  window.chooseFestivalBoostCity = chooseFestivalBoostCity;
  window.closeFestivalBoostModal = closeFestivalBoostModal;
  window.showFestivalNoPropertiesModal = showFestivalNoPropertiesModal;
  window.closeFestivalNoPropertiesModal = closeFestivalNoPropertiesModal;
  window.openFestivalBoostModalFromBanner = openFestivalBoostModalFromBanner;
}
