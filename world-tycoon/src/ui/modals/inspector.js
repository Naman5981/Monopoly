/**
 * ui/modals/inspector.js
 * Property inspection modal, city level upgrade/downgrade, mortgage/unmortgage, and portfolio view.
 */

import { BOARD_TILES, GROUP_META } from '../../game/data.js';
import { gameState, isHumanTurnActionable, localPlayerIdx } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX } from '../../game/audio.js';
import { calculateTileRent } from '../../game/rules.js';
import { networkState, broadcastAction } from '../../network/p2p.js';
import {
  populateCityPreview3DScene,
  clearCityPreview,
  setTileHighlightRing,
  refreshTileTextureAndBuildings
} from '../../three/scene.js';
import { renderCornerHUDs, showTurnLockToast, logEvent } from '../hud.js';
import { saveCurrentMatchToStorage } from '../../game/persistence.js';
import { engineCallbacks, isLobbyScreenActive, getTierBadgeHTML } from './common.js';

export function openInspectorModal(tileId) {
  if (isLobbyScreenActive()) return;
  const tile = BOARD_TILES[tileId];
  if (!tile) return;
  gameState.activeInspectorTile = tileId;

  setTileHighlightRing(tile.id, true);

  const st = gameState.properties[tileId];
  const header = document.getElementById('insp-header');
  if (header) {
    header.style.background = tile.group ? GROUP_META[tile.group].hex : '#475569';
  }

  const groupEl = document.getElementById('insp-group');
  if (groupEl) {
    groupEl.textContent = tile.group ? GROUP_META[tile.group].name : tile.type.toUpperCase();
  }
  const titleEl = document.getElementById('insp-title');
  if (titleEl) {
    titleEl.textContent = tile.name;
  }

  const myIdx = (typeof localPlayerIdx === 'number' ? localPlayerIdx : 0);
  const myPlayer = gameState.players[myIdx] || gameState.players[0];
  const isOwnedByLocalPlayer = (st && st.owner === myIdx);
  const isStandingOnTile = (myPlayer && myPlayer.position === tileId);

  const ownerPill = document.getElementById('insp-owner-pill');
  if (ownerPill) {
    if (st && st.owner !== null) {
      if (isOwnedByLocalPlayer) {
        const levelDesc = st.mortgaged ? 'MORTGAGED' : (st.level === 4 ? 'Skyscraper (MAX)' : (st.level > 0 ? `${st.level} House${st.level > 1 ? 's' : ''}` : 'Base Land'));
        ownerPill.className = `text-xs sm:text-sm font-display font-black text-center py-2 px-3 rounded-2xl ${st.mortgaged ? 'bg-rose-50 text-rose-800 border-2 border-rose-300' : 'bg-emerald-50 text-emerald-900 border-2 border-emerald-300'} shadow-2xs`;
        ownerPill.innerHTML = `<i class="fa-solid fa-crown ${st.mortgaged ? 'text-rose-600' : 'text-amber-500'} mr-1"></i> Your Estate • ${levelDesc}`;
      } else {
        const ownerName = gameState.players[st.owner]?.name || 'Opponent';
        ownerPill.className = 'text-xs sm:text-sm font-display font-black text-center py-2 px-3 rounded-2xl bg-slate-100 text-slate-800 border-2 border-slate-200/80 shadow-2xs';
        ownerPill.innerHTML = `Owned by <strong>${ownerName}</strong> ${st.mortgaged ? '<span class="text-rose-600 font-black">(MORTGAGED)</span>' : ''}`;
      }
    } else if (tile.price) {
      ownerPill.className = 'text-xs sm:text-sm font-display font-black text-center py-2 px-3 rounded-2xl bg-amber-50 text-amber-950 border-2 border-amber-300/80 shadow-2xs';
      ownerPill.innerHTML = `Unowned • Price: <strong class="text-emerald-700">${fmtMoney(tile.price)}</strong>`;
    } else {
      ownerPill.className = 'text-xs sm:text-sm font-display font-black text-center py-2 px-3 rounded-2xl bg-slate-100 text-slate-800 border-2 border-slate-200/80 shadow-2xs';
      ownerPill.textContent = tile.subtitle || 'Special Landmark';
    }
  }

  const rentList = document.getElementById('insp-rent-list');
  if (rentList) {
    if (tile.type === 'city') {
      const curLevel = (st && !st.mortgaged) ? (st.level || 0) : -1;
      const tierLabels = ['Base Land', '1 House', '2 Houses', '3 Houses', 'Skyscraper'];
      rentList.innerHTML = [0, 1, 2, 3, 4].map(idx => {
        const isCurrent = (curLevel === idx);
        const isSky = (idx === 4);
        const cardClass = isCurrent
          ? 'game-tier-card tier-card-current'
          : (isSky ? 'game-tier-card tier-card-skyscraper' : 'game-tier-card');
        const valPillClass = isCurrent
          ? 'tier-val-pill bg-emerald-600 text-white border-emerald-500 shadow-xs'
          : (isSky ? 'tier-val-pill tier-val-skyscraper' : 'tier-val-pill');
        const activeTag = isCurrent
          ? '<span class="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-black ml-1.5 shadow-2xs">ACTIVE</span>'
          : '';
        return `
          <div class="${cardClass} py-1.5 px-2.5">
            <div class="flex items-center gap-2">
              ${getTierBadgeHTML(idx)}
              <div class="flex items-center">
                <span class="font-display font-bold text-xs text-slate-800">${tierLabels[idx]}</span>
                ${activeTag}
              </div>
            </div>
            <div class="${valPillClass} text-xs py-1 px-2.5 font-black">${fmtMoney(tile.rent[idx])}</div>
          </div>
        `;
      }).join('');
    } else if (tile.type === 'resort') {
      rentList.innerHTML = `
        <div class="game-tier-card py-2 px-3">
          <div class="flex items-center gap-2">
            <div class="tier-level-badge tier-house">🌴</div>
            <span class="font-display font-bold text-xs text-slate-800">1 Resort Owned</span>
          </div>
          <div class="tier-val-pill text-xs py-1 px-2.5 font-black">${fmtMoney(tile.rent[0])}</div>
        </div>
        <div class="game-tier-card tier-card-skyscraper py-2 px-3">
          <div class="flex items-center gap-2">
            <div class="tier-level-badge tier-skyscraper-badge">🏖️</div>
            <span class="font-display font-bold text-xs text-amber-950">2 Resorts Owned (2×)</span>
          </div>
          <div class="tier-val-pill tier-val-skyscraper text-xs py-1 px-2.5 font-black">${fmtMoney(tile.rent[1])}</div>
        </div>
      `;
    } else {
      rentList.innerHTML = `<div class="p-3 bg-white rounded-2xl border border-slate-200 text-center font-bold text-xs text-slate-700">${tile.subtitle || 'Land here to trigger special board rules.'}</div>`;
    }
  }

  const actionsEl = document.getElementById('insp-actions');
  if (actionsEl) {
    actionsEl.innerHTML = '';

    if (isOwnedByLocalPlayer) {
      if (!isStandingOnTile) {
        actionsEl.innerHTML = `
          <div class="py-2.5 px-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow-2xs">
            <i class="fa-solid fa-location-dot text-slate-400"></i>
            <span>Land here to build upgrades or mortgage</span>
          </div>
        `;
      } else if (!isHumanTurnActionable()) {
        actionsEl.innerHTML = `
          <div class="w-full py-2.5 px-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 font-black text-xs text-center flex items-center justify-center gap-1.5 shadow-xs">
            <i class="fa-solid fa-lock text-amber-600"></i>
            <span>Wait for your turn to build or mortgage</span>
          </div>
        `;
      } else {
        let html = '';
        if (tile.type === 'city' && !st.mortgaged) {
          const canUp = st.level < 4 && myPlayer.cash >= tile.houseCost;
          const canDown = st.level > 0;
          html += `
            <div class="grid grid-cols-2 gap-2">
              <button onclick="window.upgradeCityLevel(${tileId})" ${!canUp ? 'disabled' : ''} class="game-btn ${canUp ? 'game-btn-green' : 'game-btn-slate opacity-50 cursor-not-allowed'} py-2.5 text-xs font-black">
                +Upgrade (${fmtMoney(tile.houseCost)})
              </button>
              <button onclick="window.downgradeCityLevel(${tileId})" ${!canDown ? 'disabled' : ''} class="game-btn ${canDown ? 'game-btn-orange' : 'game-btn-slate opacity-50 cursor-not-allowed'} py-2.5 text-xs font-black">
                -Sell (+${fmtMoney(tile.houseCost / 2)})
              </button>
            </div>
          `;
        }

        const unmortCost = Math.round(tile.price * 0.55);
        if (!st.mortgaged && (st.level || 0) === 0) {
          html += `
            <button onclick="window.toggleCityMortgage(${tileId})" class="game-btn game-btn-red w-full py-2.5 text-xs font-black">
              Mortgage City (+${fmtMoney(tile.price / 2)})
            </button>
          `;
        } else if (st.mortgaged) {
          const canAffordUnmort = myPlayer.cash >= unmortCost;
          html += `
            <button onclick="window.toggleCityMortgage(${tileId})" ${!canAffordUnmort ? 'disabled' : ''} class="game-btn ${canAffordUnmort ? 'game-btn-blue' : 'game-btn-slate opacity-50 cursor-not-allowed'} w-full py-2.5 text-xs font-black">
              Unmortgage City (-${fmtMoney(unmortCost)})
            </button>
          `;
        }
        actionsEl.innerHTML = html;
      }
    }
  }

  populateCityPreview3DScene(tile, 'insp-city-3d-canvas');

  const m = document.getElementById('modal-tile-inspector');
  const card = document.getElementById('modal-tile-inspector-card');
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
  }

  if (card) {
    const isPlayerOnTile = (myPlayer?.position === tileId);
    const canBeUpgraded = (tile.type === 'city' && st && isOwnedByLocalPlayer && !st.mortgaged && st.level < 4);
    if (isPlayerOnTile && canBeUpgraded) {
      const color = tile.group ? GROUP_META[tile.group].hex : '#0284c7';
      card.style.borderColor = color;
      card.style.boxShadow = `0 14px 35px -6px ${color}50, 0 0 20px 2px ${color}35`;
    } else {
      card.style.borderColor = '';
      card.style.boxShadow = '';
    }
    card.classList.remove('tile-inspector-exit', 'tile-inspector-pulse', 'tile-inspector-enter');
    void card.offsetWidth;
    card.classList.add('tile-inspector-enter');
    playSFX('hop');
  }
}

export function closeInspectorModal() {
  const m = document.getElementById('modal-tile-inspector');
  const card = document.getElementById('modal-tile-inspector-card');
  setTileHighlightRing(0, false);

  if (card && m && !m.classList.contains('hidden')) {
    card.style.borderColor = '';
    card.style.boxShadow = '';
    card.classList.remove('tile-inspector-enter', 'tile-inspector-pulse');
    card.classList.add('tile-inspector-exit');
    setTimeout(() => {
      m.classList.add('hidden');
      m.classList.remove('flex');
      card.classList.remove('tile-inspector-exit');
      clearCityPreview();
    }, 220);
  } else if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
    clearCityPreview();
  }
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
  if (!st || st.owner === null || st.mortgaged || st.level >= 4) return;
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
  if (st.owner === localPlayerIdx && !isAutoLiquidation && !isHumanTurnActionable()) {
    showTurnLockToast("Wait for your turn to sell buildings!");
    return;
  }
  const p = gameState.players[st.owner];
  const refund = tile.houseCost / 2;

  p.cash += refund;
  st.level--;
  playSFX('cash');
  if (engineCallbacks.spawnFloatingCash) engineCallbacks.spawnFloatingCash(st.owner, `+${fmtMoney(refund)}`, true);

  refreshTileTextureAndBuildings(tileId);
  renderCornerHUDs();
  saveCurrentMatchToStorage();
  if (gameState.activeInspectorTile === tileId) openInspectorModal(tileId);
  const portModal = document.getElementById('modal-portfolio');
  if (portModal && !portModal.classList.contains('hidden')) renderPortfolioGrid();
}

export function toggleCityMortgage(tileId, isAutoLiquidation = false) {
  const st = gameState.properties[tileId];
  const tile = BOARD_TILES[tileId];
  if (!st || st.owner === null) return;
  if (st.owner === localPlayerIdx && !isAutoLiquidation && !isHumanTurnActionable()) {
    showTurnLockToast("Wait for your turn to mortgage cities!");
    return;
  }
  const p = gameState.players[st.owner];

  if (!st.mortgaged) {
    const gain = tile.price / 2;
    st.mortgaged = true;
    p.cash += gain;
    playSFX('cash');
    if (engineCallbacks.spawnFloatingCash) engineCallbacks.spawnFloatingCash(st.owner, `+${fmtMoney(gain)}`, true);
    logEvent(`🏦 <strong>${p.name}</strong> mortgaged <strong>${tile.name}</strong> (+${fmtMoney(gain)}).`);
  } else {
    const cost = Math.round(tile.price * 0.55);
    if (p.cash < cost) return;
    p.cash -= cost;
    st.mortgaged = false;
    playSFX('cash');
    if (engineCallbacks.spawnFloatingCash) engineCallbacks.spawnFloatingCash(st.owner, `-${fmtMoney(cost)}`, false);
    logEvent(`🏦 <strong>${p.name}</strong> unmortgaged <strong>${tile.name}</strong> (-${fmtMoney(cost)}).`);
  }

  if (networkState.isMultiplayer && !isAutoLiquidation) {
    broadcastAction('ACTION_MORTGAGE_CITY', { playerIdx: st.owner, tileId, mortgaged: st.mortgaged });
  }

  refreshTileTextureAndBuildings(tileId);
  renderCornerHUDs();
  saveCurrentMatchToStorage();
  if (gameState.activeInspectorTile === tileId) openInspectorModal(tileId);
  const portModal = document.getElementById('modal-portfolio');
  if (portModal && !portModal.classList.contains('hidden')) renderPortfolioGrid();
}

export function openPortfolioModal() {
  if (isLobbyScreenActive()) return;
  if (!isHumanTurnActionable()) {
    showTurnLockToast("Wait for your turn to manage cities!");
    return;
  }
  renderPortfolioGrid();
  const m = document.getElementById('modal-portfolio');
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
  }
}

export function closePortfolioModal() {
  const m = document.getElementById('modal-portfolio');
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
}

export function renderPortfolioGrid() {
  const grid = document.getElementById('portfolio-grid');
  if (!grid) return;
  const owned = BOARD_TILES.filter(t => gameState.properties[t.id] && gameState.properties[t.id].owner === 0);
  const summaryBar = document.getElementById('portfolio-summary-bar');

  if (summaryBar) {
    const totalCities = owned.length;
    const totalRent = owned.reduce((sum, t) => sum + (gameState.properties[t.id]?.mortgaged ? 0 : calculateTileRent(t.id)), 0);
    const mortgagedCount = owned.filter(t => gameState.properties[t.id]?.mortgaged).length;
    summaryBar.innerHTML = `
      <div class="flex items-center gap-1.5">
        <span class="text-slate-500 font-extrabold uppercase text-[10px]">Cities Owned:</span>
        <span class="text-indigo-800 font-black text-sm">${totalCities}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-slate-500 font-extrabold uppercase text-[10px]">Total Rent Yield:</span>
        <span class="text-emerald-700 font-black text-sm">${fmtMoney(totalRent)}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-slate-500 font-extrabold uppercase text-[10px]">Mortgaged:</span>
        <span class="${mortgagedCount > 0 ? 'text-rose-600' : 'text-slate-600'} font-black text-sm">${mortgagedCount}</span>
      </div>
    `;
  }

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
    const st = gameState.properties[t.id];
    const color = t.group ? GROUP_META[t.group].hex : '#0284c7';
    const isPlayerOnTile = (gameState.players[0].position === t.id);
    const upgradesLeft = Math.max(0, 2 - (gameState.upgradesThisVisit || 0));
    const canBeUpgraded = (t.type === 'city' && !st.mortgaged && st.level < 4 && upgradesLeft > 0);
    const isIlluminated = isPlayerOnTile && canBeUpgraded;

    const cardClass = isIlluminated
      ? 'rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-md transition-[transform,box-shadow,border-color,background-color] duration-300 transform scale-[1.01]'
      : 'bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-xs';

    const cardStyle = isIlluminated
      ? `background: linear-gradient(145deg, ${color}26, ${color}0f); border: 2.5px solid ${color}; box-shadow: 0 10px 24px -4px ${color}45, 0 0 16px 2px ${color}30, inset 0 1px 2px 0 rgba(255,255,255,0.95);`
      : '';

    return `
      <div class="${cardClass}" style="${cardStyle}">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-4 h-4 rounded-full border border-black/20" style="background:${color}; ${isIlluminated ? `box-shadow: 0 0 8px ${color};` : ''}"></span>
            <span class="font-black text-sm text-slate-900">${t.name}</span>
            ${isIlluminated ? `
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-white shadow-2xs flex items-center gap-1" style="background:${color}">
                <i class="fa-solid fa-location-dot"></i> ACTIVE (${2 - upgradesLeft}/2)
              </span>
            ` : ''}
          </div>
          <span class="text-xs sm:text-sm font-black ${st.mortgaged ? 'text-rose-700' : 'text-emerald-700'}">
            ${st.mortgaged ? 'MORTGAGED' : `Rent: ${fmtMoney(calculateTileRent(t.id))}`}
          </span>
        </div>
        <div class="flex gap-2">
          ${t.type === 'city' && !st.mortgaged ? `
            ${isPlayerOnTile ? `
              ${canBeUpgraded ? `
                <button onclick="window.upgradeCityLevel(${t.id})" class="game-btn game-btn-green flex-1 py-2 text-xs sm:text-sm font-black shadow-md">
                  <i class="fa-solid fa-arrow-up-right-dots mr-1"></i> +Upgrade (${fmtMoney(t.houseCost)}) <span class="text-xs opacity-90 font-bold ml-1">(${2 - upgradesLeft}/2)</span>
                </button>
              ` : `
                <div class="flex-1 py-2 text-xs font-extrabold text-slate-600 bg-slate-100 rounded-xl text-center flex items-center justify-center gap-1 border border-slate-200">
                  <i class="fa-solid fa-ban text-amber-500"></i> ${st.level >= 4 ? 'Max Level' : 'Max 2/visit reached'}
                </div>
              `}
            ` : `
              <div class="flex-1 py-2 text-xs font-extrabold text-slate-600 bg-slate-100 rounded-xl text-center flex items-center justify-center gap-1 border border-slate-200" title="You can only upgrade when your avatar is standing on this tile">
                <i class="fa-solid fa-location-dot text-amber-500"></i> Land here to upgrade
              </div>
            `}
          ` : ''}
          <button onclick="window.toggleCityMortgage(${t.id})" class="game-btn ${st.mortgaged ? 'game-btn-blue' : 'game-btn-slate'} flex-1 py-2 text-xs sm:text-sm font-black">
            ${st.mortgaged ? 'Unmortgage' : `Mortgage (+${fmtMoney(t.price/2)})`}
          </button>
        </div>
      </div>
    `;
  }).join('');
}
