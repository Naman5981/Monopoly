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

function isSvelteInspectorMounted() {
  const root = document.getElementById('modal-tile-inspector');
  if (!root) return false;
  const hasAttr = typeof root.hasAttribute === 'function' && root.hasAttribute('data-svelte-h');
  const hasChild = typeof root.querySelector === 'function' && Boolean(root.querySelector('[class*="svelte"]'));
  return Boolean(hasAttr || hasChild);
}

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

function renderOwnerPill(tile, st, isOwnedByLocalPlayer) {
  if (isSvelteInspectorMounted()) return;
  const el = document.getElementById('insp-owner-pill');
  if (!el) return;
  if (st && st.owner !== null) {
    if (isOwnedByLocalPlayer) {
      const levelDesc = getPropertyLevelMetadata(st.level).label;
      el.className = 'text-xs sm:text-sm font-display font-black text-center py-2 px-3 rounded-2xl bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 shadow-xs flex items-center justify-center gap-1.5';
      el.innerHTML = `<i class="fa-solid fa-crown text-amber-400"></i> <span>Your Estate • ${levelDesc}</span>`;
    } else {
      const owner = gameState.players[st.owner];
      const ownerName = owner?.name || 'Opponent';
      const ownerColor = owner?.colorHex || '#f43f5e';
      el.className = 'text-xs sm:text-sm font-display font-black text-center py-2 px-3 rounded-2xl bg-slate-900/80 text-slate-200 border border-white/10 shadow-xs flex items-center justify-center gap-1.5';
      el.innerHTML = `<span class="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-xs" style="background:${ownerColor}"></span> <span>Owned by <strong class="text-white">${ownerName}</strong></span>`;
    }
  } else if (tile.price) {
    el.className = 'text-xs sm:text-sm font-display font-black text-center py-2 px-3 rounded-2xl bg-slate-900/80 text-slate-300 border border-white/10 shadow-xs flex items-center justify-center gap-1.5';
    el.innerHTML = `<span>Unowned</span> <span class="text-white/40">•</span> <span>Price: <strong class="text-emerald-400">${fmtMoney(tile.price)}</strong></span>`;
  } else {
    el.className = 'text-xs sm:text-sm font-display font-black text-center py-2 px-3 rounded-2xl bg-slate-900/80 text-slate-300 border border-white/10 shadow-xs';
    el.textContent = tile.subtitle || 'Special Tile';
  }
}

function renderRentList(tile, st) {
  if (isSvelteInspectorMounted()) return;
  const el = document.getElementById('insp-rent-list');
  if (!el) return;
  if (tile.type === 'city') {
    const curLevel = st ? (st.level || 0) : -1;
    const tierLabels = ['Base Land', '1 House', '2 Houses', '3 Houses', 'Skyscraper'];
    el.innerHTML = [0, 1, 2, 3, 4].map(idx => {
      const isCurrent = (curLevel === idx);
      const isSky = (idx === 4);

      let rowClass = 'flex items-center justify-between py-1.5 px-2.5 rounded-xl border transition-all duration-150 ';
      let badgeHtml = '';
      let labelClass = 'font-display font-bold text-xs ';
      let valClass = 'text-xs font-mono font-black py-0.5 px-2 rounded-lg ';

      if (isCurrent) {
        rowClass += 'bg-emerald-950/70 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.2)] text-white';
        labelClass += 'text-emerald-300';
        valClass += 'bg-emerald-500 text-slate-950 font-black shadow-xs';
      } else if (isSky) {
        rowClass += 'bg-amber-950/30 border-amber-500/30 text-amber-200';
        labelClass += 'text-amber-300';
        valClass += 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
      } else {
        rowClass += 'bg-slate-900/50 border-white/5 hover:border-white/10 text-slate-300';
        labelClass += 'text-slate-300';
        valClass += 'text-slate-200';
      }

      const activeTag = isCurrent ? '<span class="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black ml-1.5 shadow-xs">ACTIVE</span>' : '';

      if (idx === 0) {
        badgeHtml = `<span class="w-6 h-6 rounded-md ${isCurrent ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/40' : 'bg-white/5 text-slate-400 border border-white/10'} flex items-center justify-center text-[10px] shrink-0"><i class="fa-solid fa-location-dot"></i></span>`;
      } else if (idx === 4) {
        badgeHtml = `<span class="w-6 h-6 rounded-md ${isCurrent ? 'bg-amber-500 text-slate-950' : 'bg-amber-500/20 text-amber-400 border border-amber-400/40'} flex items-center justify-center text-[10px] font-black shrink-0"><i class="fa-solid fa-crown"></i></span>`;
      } else {
        badgeHtml = `<span class="w-6 h-6 rounded-md ${isCurrent ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/40' : 'bg-white/5 text-slate-400 border border-white/10'} flex items-center justify-center text-[10px] font-black shrink-0">${idx}</span>`;
      }

      return `
        <div class="${rowClass}">
          <div class="flex items-center gap-2">
            ${badgeHtml}
            <div class="flex items-center">
              <span class="${labelClass}">${tierLabels[idx]}</span>
              ${activeTag}
            </div>
          </div>
          <div class="${valClass}">${fmtMoney(tile.rent[idx])}</div>
        </div>
      `;
    }).join('');
  } else if (tile.type === 'resort') {
    const curLevel = st ? (st.level || 0) : -1;
    const isCurrent0 = (curLevel === 0);
    const isCurrent1 = (curLevel === 1);
    el.innerHTML = `
      <div class="flex items-center justify-between py-2 px-2.5 rounded-xl border ${isCurrent0 ? 'bg-emerald-950/70 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.2)]' : 'bg-slate-900/50 border-white/5'}">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-md bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center text-[10px]"><i class="fa-solid fa-umbrella-beach"></i></span>
          <span class="font-display font-bold text-xs ${isCurrent0 ? 'text-emerald-300' : 'text-slate-300'}">1 Resort Owned</span>
          ${isCurrent0 ? '<span class="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black ml-1.5">ACTIVE</span>' : ''}
        </div>
        <div class="text-xs font-mono font-black ${isCurrent0 ? 'bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-lg' : 'text-slate-200'}">${fmtMoney(tile.rent[0])}</div>
      </div>
      <div class="flex items-center justify-between py-2 px-2.5 rounded-xl border ${isCurrent1 ? 'bg-emerald-950/70 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.2)]' : 'bg-amber-950/30 border-amber-500/20'} mt-1">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center text-[10px]"><i class="fa-solid fa-crown"></i></span>
          <span class="font-display font-bold text-xs ${isCurrent1 ? 'text-emerald-300' : 'text-amber-300'}">2 Resorts Owned (2×)</span>
          ${isCurrent1 ? '<span class="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black ml-1.5">ACTIVE</span>' : ''}
        </div>
        <div class="text-xs font-mono font-black ${isCurrent1 ? 'bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-lg' : 'text-amber-400'}">${fmtMoney(tile.rent[1])}</div>
      </div>
    `;
  } else {
    el.innerHTML = `<div class="p-3 bg-slate-900/60 rounded-2xl border border-white/10 text-center font-bold text-xs text-slate-300">${tile.subtitle || 'Land here to trigger special board rules.'}</div>`;
  }
}

function renderInspectorActions(tile, tileId, st, myPlayer, isOwnedByLocalPlayer, isStandingOnTile) {
  if (isSvelteInspectorMounted()) return;
  const el = document.getElementById('insp-actions');
  if (!el) return;
  el.innerHTML = '';
  if (!isOwnedByLocalPlayer) return;

  if (!isStandingOnTile) {
    el.innerHTML = `
      <div class="py-2 px-3 rounded-xl bg-slate-900/60 border border-white/10 text-slate-400 font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow-2xs">
        <i class="fa-solid fa-location-dot text-slate-500"></i>
        <span>Land here to build upgrades</span>
      </div>
    `;
    return;
  }

  if (!isHumanTurnActionable()) {
    el.innerHTML = `
      <div class="w-full py-2 px-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 font-black text-xs text-center flex items-center justify-center gap-1.5 shadow-xs">
        <i class="fa-solid fa-lock text-amber-400"></i>
        <span>Wait for your turn to build upgrades</span>
      </div>
    `;
    return;
  }

  if (tile.type === 'city') {
    const canUp = st.level < 4 && myPlayer.cash >= tile.houseCost;
    const canDown = st.level > 0;
    el.innerHTML = `
      <div class="grid grid-cols-2 gap-2">
        <button onclick="window.upgradeCityLevel(${tileId})" ${!canUp ? 'disabled' : ''} class="game-btn ${canUp ? 'game-btn-green' : 'game-btn-slate opacity-50 cursor-not-allowed'} py-2 text-xs font-black">
          +Upgrade (${fmtMoney(tile.houseCost)})
        </button>
        <button onclick="window.downgradeCityLevel(${tileId})" ${!canDown ? 'disabled' : ''} class="game-btn ${canDown ? 'game-btn-orange' : 'game-btn-slate opacity-50 cursor-not-allowed'} py-2 text-xs font-black">
          -Sell (+${fmtMoney(tile.houseCost / 2)})
        </button>
      </div>
    `;
  }
}

export function openInspectorModal(tileId) {
  if (isLobbyScreenActive()) return;
  const tile = BOARD_TILES[tileId];
  if (!tile) return;
  gameState.activeInspectorTile = tileId;

  setTileHighlightRing(tile.id, true);

  const st = gameState.properties[tileId];
  const hex = tile.group ? GROUP_META[tile.group].hex : '#3b82f6';
  const header = document.getElementById('insp-header');
  if (header) {
    header.style.background = `linear-gradient(180deg, ${hex}40 0%, rgba(2, 6, 23, 0.95) 100%)`;
    header.style.borderBottom = `1px solid ${hex}50`;
  }

  const groupEl = document.getElementById('insp-group');
  if (groupEl) {
    groupEl.textContent = tile.group ? GROUP_META[tile.group].name : tile.type.toUpperCase();
    groupEl.style.borderColor = `${hex}60`;
    groupEl.style.backgroundColor = `${hex}20`;
    groupEl.style.color = '#ffffff';
  }
  const titleEl = document.getElementById('insp-title');
  if (titleEl) {
    titleEl.textContent = tile.name;
  }

  const myIdx = (typeof localPlayerIdx === 'number' ? localPlayerIdx : 0);
  const myPlayer = gameState.players[myIdx] || gameState.players[0];
  const isOwnedByLocalPlayer = (st && st.owner === myIdx);
  const isStandingOnTile = (myPlayer && myPlayer.position === tileId);

  const sliceData = buildInspectorSliceData(tileId);
  updateModalSlice('inspector', sliceData);

  renderOwnerPill(tile, st, isOwnedByLocalPlayer);
  renderRentList(tile, st);
  renderInspectorActions(tile, tileId, st, myPlayer, isOwnedByLocalPlayer, isStandingOnTile);

  populateCityPreview3DScene(tile, 'insp-city-3d-canvas');

  const m = document.getElementById('modal-tile-inspector');
  const card = document.getElementById('modal-tile-inspector-card');
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
  }

  if (card) {
    const isPlayerOnTile = (myPlayer?.position === tileId);
    const canBeUpgraded = (tile.type === 'city' && st && isOwnedByLocalPlayer && st.level < 4);
    if (isPlayerOnTile && canBeUpgraded) {
      const color = tile.group ? GROUP_META[tile.group].hex : '#0284c7';
      card.style.borderColor = color;
      card.style.boxShadow = `0 14px 35px -6px ${color}50, 0 0 20px 2px ${color}35`;
    } else {
      card.style.borderColor = '';
      card.style.boxShadow = '';
    }
    animateTileInspectorSpringOpen('#modal-tile-inspector', card);
    playSFX('hop');
  }
}

export function closeInspectorModal() {
  updateModalSlice('inspector', { visible: false });
  const m = document.getElementById('modal-tile-inspector');
  const card = document.getElementById('modal-tile-inspector-card');
  setTileHighlightRing(0, false);

  if (card) {
    card.style.borderColor = '';
    card.style.boxShadow = '';
  }
  const header = document.getElementById('insp-header');
  if (header) {
    header.style.background = '';
    header.style.borderBottom = '';
  }
  const groupEl = document.getElementById('insp-group');
  if (groupEl) {
    groupEl.style.borderColor = '';
    groupEl.style.backgroundColor = '';
    groupEl.style.color = '';
  }
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

  const summaryBar = document.getElementById('portfolio-summary-bar');
  if (summaryBar) {
    summaryBar.innerHTML = `
      <div class="flex items-center gap-1.5">
        <span class="text-slate-500 font-extrabold uppercase text-[10px]">Cities Owned:</span>
        <span class="text-indigo-800 font-black text-sm">${totalCities}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-slate-500 font-extrabold uppercase text-[10px]">Total Rent Yield:</span>
        <span class="text-emerald-700 font-black text-sm">${totalRentFormatted}</span>
      </div>
    `;
  }

  // Defensive fallback for headless environments when Svelte is not mounted
  const isSvelteMounted = Boolean(document.getElementById('svelte-modals-mount')?.firstElementChild);
  if (grid && !isSvelteMounted) {
    if (owned.length === 0) {
      grid.innerHTML = `
        <div class="col-span-2 text-center py-10 px-4 flex flex-col items-center justify-center space-y-3">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-100 flex items-center justify-center text-3xl shadow-inner border border-indigo-200">
            🏙️
          </div>
          <div class="font-rounded font-black text-base text-slate-800">NO EMPIRE CITIES YET</div>
          <div class="text-xs font-semibold text-slate-500 max-w-sm">Roll the dice to travel the board, purchase world properties, and build houses and skyscrapers!</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = owned.map(t => {
      const color = t.group ? GROUP_META[t.group].hex : '#0284c7';
      const st = gameState.properties[t.id];
      const meta = getPropertyLevelMetadata(st ? st.level : 0);
      return `
        <div class="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-xs">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-4 h-4 rounded-full border border-black/20" style="background:${color}"></span>
              <span class="font-black text-sm text-slate-900">${t.name}</span>
            </div>
            <span class="text-xs sm:text-sm font-black text-emerald-700">
              Rent: ${fmtMoney(calculateTileRent(t.id))}
            </span>
          </div>
          <div class="text-xs font-bold text-slate-500">${meta.label}</div>
        </div>
      `;
    }).join('');
  }
}
