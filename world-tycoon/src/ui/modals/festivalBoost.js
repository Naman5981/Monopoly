/**
 * ui/modals/festivalBoost.js
 * Interactive World Festival city selection modal.
 * Allows player to choose which owned property receives a 2x rent boost.
 */

import { BOARD_TILES, GROUP_META } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { calculateTileRent } from '../../game/rules.js';
import { playSFX } from '../../game/audio.js';
import {
  refreshTileTextureAndBuildings,
  getTileWorldPosition,
  setTileHighlightRing,
  triggerBoardShockwave
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

/**
 * Opens the Festival Boost selection modal for the active human player.
 * @param {Array<object>} ownedProperties - List of eligible BOARD_TILES owned by player
 * @param {boolean} isDoubles - Whether turn had rolled doubles
 * @param {number} playerIdx - Index of landing player
 */
export function openFestivalBoostModal(ownedProperties, isDoubles, playerIdx = null) {
  if (isLobbyScreenActive()) return;

  const pIdx = playerIdx !== null ? playerIdx : gameState.currentPlayerIdx;
  const player = gameState.players ? gameState.players[pIdx] : null;
  if (!player) return;

  gameState.phase = 'MODAL';
  pendingFestivalDoubles = Boolean(isDoubles);
  festivalPlayerIdx = pIdx;

  if (engineCallbacks.updateUI) engineCallbacks.updateUI();

  renderFestivalBoostModal(ownedProperties, pIdx);

  animateModalSpringOpen('#modal-festival-boost', '#modal-festival-boost-card');
  playSFX('hop');
  setStatusPill(`🎪 Choose a city to host the World Festival (2× Rent Boost)!`, { isThinking: false, playerIdx: pIdx });
}

/**
 * Renders the property choices into the modal grid.
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

  grid.innerHTML = ownedProperties.map(tile => {
    const st = gameState.properties[tile.id] || { level: 0, festivalBoost: false };
    const isAlreadyBoosted = Boolean(st.festivalBoost);
    const color = tile.group && GROUP_META[tile.group] ? GROUP_META[tile.group].hex : '#0284c7';
    const groupName = tile.group && GROUP_META[tile.group] ? GROUP_META[tile.group].name : tile.type.toUpperCase();

    // Base current rent (without festival boost)
    const currentRent = calculateTileRent(tile.id);
    const projectedBoostedRent = isAlreadyBoosted ? currentRent : currentRent * 2;

    const levelBadge = getTierBadgeHTML(st.level || 0);

    return `
      <div class="bg-white border-2 ${isAlreadyBoosted ? 'border-amber-400 bg-amber-50/40' : 'border-slate-200/90 hover:border-emerald-500 hover:shadow-md'} rounded-2xl p-3.5 flex flex-col justify-between gap-3 transition">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-4 h-4 rounded-full border border-black/20 shrink-0" style="background:${color};" title="${groupName}"></span>
            <div class="truncate">
              <div class="font-black text-sm text-slate-900 truncate">${tile.name}</div>
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">${groupName}</div>
            </div>
          </div>
          <div class="shrink-0">
            ${levelBadge}
          </div>
        </div>

        <div class="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 flex items-center justify-between text-xs">
          <div>
            <div class="text-[9px] font-black uppercase text-slate-400">CURRENT RENT</div>
            <div class="font-extrabold text-slate-700">${fmtMoney(currentRent)}</div>
          </div>
          <div class="text-right">
            <div class="text-[9px] font-black uppercase text-emerald-600">FESTIVAL (2×)</div>
            <div class="font-black text-emerald-600 text-sm flex items-center justify-end gap-1">
              <i class="fa-solid fa-arrow-trend-up text-xs"></i>
              <span>${fmtMoney(projectedBoostedRent)}</span>
            </div>
          </div>
        </div>

        <button onclick="window.chooseFestivalBoostCity(${tile.id})"
          class="game-btn ${isAlreadyBoosted ? 'game-btn-orange' : 'game-btn-green'} w-full py-2.5 text-xs font-black shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition">
          <i class="fa-solid fa-sparkles"></i>
          <span>${isAlreadyBoosted ? 'RE-CONFIRM FESTIVAL' : 'HOST FESTIVAL (2× RENT)'}</span>
        </button>
      </div>
    `;
  }).join('');
}

/**
 * Handles player choosing a specific city to receive the 2x Festival boost.
 * @param {number} tileId
 */
export function chooseFestivalBoostCity(tileId) {
  const pIdx = festivalPlayerIdx !== null ? festivalPlayerIdx : gameState.currentPlayerIdx;
  const player = gameState.players ? gameState.players[pIdx] : null;
  const tile = BOARD_TILES[tileId];
  if (!player || !tile) return;

  const st = gameState.properties[tileId];
  if (!st || st.owner !== pIdx) return;

  // Apply the 2x festival boost to the chosen property
  st.festivalBoost = true;
  refreshTileTextureAndBuildings(tileId);

  const newRent = calculateTileRent(tileId);
  const worldPos = getTileWorldPosition(tileId);

  // Audio, confetti, and shockwave celebrations
  playSFX('win', 1.0, worldPos);
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.45, 60);
  spawnAnimatedReaction('star', window.innerWidth / 2, window.innerHeight * 0.45);
  triggerBoardShockwave(worldPos.x, worldPos.z, 16, 24);
  setTileHighlightRing(tileId, true);
  setTimeout(() => setTileHighlightRing(tileId, false), 2200);

  spawnFloatingCashOnHUD(pIdx, `✨ 2× Rent in ${tile.name}!`, true);
  logEvent(`🎉 <strong>${player.name}</strong> selected <strong>${tile.name}</strong> to host the World Festival! Rent boosted 2× to <strong>${fmtMoney(newRent)}</strong>!`);
  renderCornerHUDs();

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_FESTIVAL_BOOST', { playerIdx: pIdx, tileId });
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }

  closeFestivalBoostModal();

  const isDoubles = pendingFestivalDoubles;
  if (window.concludeActionPhase) {
    window.concludeActionPhase(isDoubles);
  }
}

/**
 * Closes the Festival modal.
 */
export function closeFestivalBoostModal() {
  animateModalSpringClose('#modal-festival-boost', '#modal-festival-boost-card');
  festivalPlayerIdx = null;
}

window.openFestivalBoostModal = openFestivalBoostModal;
window.chooseFestivalBoostCity = chooseFestivalBoostCity;
window.closeFestivalBoostModal = closeFestivalBoostModal;
