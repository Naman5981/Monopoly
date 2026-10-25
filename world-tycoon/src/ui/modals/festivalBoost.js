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

  const modal = document.getElementById('modal-festival-no-properties');
  if (modal) {
    animateModalSpringOpen('#modal-festival-no-properties', '#modal-festival-no-properties-card');
    playSFX('hop');
    setStatusPill(`🎪 Visited World Festival (No properties owned to increase rent)`, { isThinking: false, playerIdx: gameState.currentPlayerIdx });

    setTimeout(() => {
      document.getElementById('btn-festival-no-props-ok')?.focus();
    }, 60);
  } else {
    // Fallback if modal container missing
    if (window.concludeActionPhase) {
      window.concludeActionPhase(pendingFestivalDoubles);
    }
  }
}

/**
 * Closes the No Properties Owned alert modal and concludes action phase.
 */
export function closeFestivalNoPropertiesModal() {
  animateModalSpringClose('#modal-festival-no-properties', '#modal-festival-no-properties-card');
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

  // 3. Render and open selection modal
  renderFestivalBoostModal(cachedFestivalProperties, pIdx);
  animateModalSpringOpen('#modal-festival-boost', '#modal-festival-boost-card');
  playSFX('hop');
  setStatusPill(`🎪 Choose a city to host the World Festival (2× Rent Boost)!`, { isThinking: false, playerIdx: pIdx });
}

/**
 * Reopens the festival boost selection modal when clicking the banner button.
 */
export function openFestivalBoostModalFromBanner() {
  if (cachedFestivalProperties.length > 0) {
    renderFestivalBoostModal(cachedFestivalProperties, festivalPlayerIdx ?? gameState.currentPlayerIdx);
    animateModalSpringOpen('#modal-festival-boost', '#modal-festival-boost-card');
  }
}

/**
 * Renders the property choices into the modal grid.
 * @param {Array<object>} ownedProperties
 * @param {number} pIdx
 */
export function renderFestivalBoostModal(ownedProperties, pIdx) {
  const grid = document.getElementById('festival-boost-grid');
  if (!grid) return;

  const player = gameState.players[pIdx];
  const countEl = document.getElementById('festival-boost-count');
  if (countEl) countEl.textContent = `${ownedProperties.length} Properties Owned`;

  const playerNameEl = document.getElementById('festival-boost-player-name');
  if (playerNameEl && player) playerNameEl.textContent = player.name;

  if (ownedProperties.length === 0) {
    grid.innerHTML = `
      <div class="text-center py-8 text-slate-500 font-bold text-xs col-span-full">
        <i class="fa-solid fa-building-circle-xmark text-amber-500 text-2xl mb-2 block"></i>
        You do not own any properties to boost with the Festival.
      </div>
    `;
    return;
  }

  // Identify any currently boosted festival city across the entire board (no player constraint)
  const currentHostTile = BOARD_TILES.find(t => gameState.properties[t.id]?.festivalBoost);
  const currentHostProp = currentHostTile ? gameState.properties[currentHostTile.id] : null;
  const currentHostOwner = (currentHostProp && currentHostProp.owner !== null && gameState.players)
    ? gameState.players[currentHostProp.owner]
    : null;

  let hostNoticeHTML = '';
  if (currentHostTile) {
    const isOwnedByMe = currentHostProp?.owner === pIdx;
    hostNoticeHTML = `
      <div class="col-span-full p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 mb-1 shadow-2xs">
        <i class="fa-solid fa-champagne-glasses text-amber-500 text-base shrink-0"></i>
        <div class="text-[11px] leading-tight">
          ${isOwnedByMe
            ? `<strong>${currentHostTile.name}</strong> currently holds the World Festival. You may re-confirm it or move the 2× rent boost to any other owned city!`
            : `<strong>${currentHostTile.name}</strong> (owned by <strong>${currentHostOwner?.name || 'Rival'}</strong>) currently hosts the Festival. Selecting a city will transfer the festival and restore <strong>${currentHostTile.name}</strong>'s rent to normal.`}
        </div>
      </div>
    `;
  }

  const cardsHTML = ownedProperties.map(tile => {
    const st = gameState.properties[tile.id] || { level: 0, festivalBoost: false };
    const isAlreadyBoosted = Boolean(st.festivalBoost);
    const color = tile.group && GROUP_META[tile.group] ? GROUP_META[tile.group].hex : '#0284c7';
    const groupName = tile.group && GROUP_META[tile.group] ? GROUP_META[tile.group].name : tile.type.toUpperCase();

    // Standard base rent (unboosted 1x)
    const baseRent = calculateBaseTileRent(tile.id);
    const festivalRent = baseRent * 2;
    const levelBadge = getTierBadgeHTML(st.level || 0);

    const buttonLabel = isAlreadyBoosted
      ? 'RE-CONFIRM FESTIVAL (2× RENT)'
      : (currentHostTile ? 'TRANSFER FESTIVAL HERE (2×)' : 'HOST FESTIVAL (2× RENT)');

    return `
      <div class="bg-white border-2 ${isAlreadyBoosted ? 'border-amber-400 bg-amber-50/40 shadow-sm' : 'border-slate-200/90 hover:border-emerald-500 hover:shadow-md'} rounded-2xl p-3.5 flex flex-col justify-between gap-3 transition">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-4 h-4 rounded-full border border-black/20 shrink-0" style="background:${color};" title="${groupName}"></span>
            <div class="truncate">
              <div class="font-black text-sm text-slate-900 truncate flex items-center gap-1.5">
                <span>${tile.name}</span>
                ${isAlreadyBoosted ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-400 text-amber-950">Active Host</span>' : ''}
              </div>
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">${groupName}</div>
            </div>
          </div>
          <div class="shrink-0">
            ${levelBadge}
          </div>
        </div>

        <div class="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 flex items-center justify-between text-xs">
          <div>
            <div class="text-[9px] font-black uppercase text-slate-400">BASE RENT</div>
            <div class="font-extrabold text-slate-700">${fmtMoney(baseRent)}</div>
          </div>
          <div class="text-right">
            <div class="text-[9px] font-black uppercase text-emerald-600">FESTIVAL (2×)</div>
            <div class="font-black text-emerald-600 text-sm flex items-center justify-end gap-1">
              <i class="fa-solid fa-arrow-trend-up text-xs"></i>
              <span>${fmtMoney(festivalRent)}</span>
            </div>
          </div>
        </div>

        <button onclick="window.chooseFestivalBoostCity(${tile.id})"
          class="game-btn ${isAlreadyBoosted ? 'game-btn-orange' : 'game-btn-green'} w-full py-2.5 text-xs font-black shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition">
          <i class="fa-solid fa-sparkles"></i>
          <span>${buttonLabel}</span>
        </button>
      </div>
    `;
  }).join('');

  grid.innerHTML = hostNoticeHTML + cardsHTML;
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

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_FESTIVAL_BOOST', { playerIdx: pIdx, tileId });
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }

  // Close modal completely
  closeFestivalBoostModal(true);

  // Conclude turn cleanly
  const isDoubles = pendingFestivalDoubles;
  if (window.concludeActionPhase) {
    window.concludeActionPhase(isDoubles);
  }
}

/**
 * Closes the Festival modal.
 * @param {boolean} [forceCancelHighlights=false] - Whether to also shut down 3D breathing highlights
 */
export function closeFestivalBoostModal(forceCancelHighlights = false) {
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
