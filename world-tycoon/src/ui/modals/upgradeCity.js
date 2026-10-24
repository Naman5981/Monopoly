/**
 * ui/modals/upgradeCity.js
 * In-visit property upgrading (Cottages, Villas, Manors, Skyscrapers).
 */

import { GROUP_META } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX } from '../../game/audio.js';
import { calculateTileRent } from '../../game/rules.js';
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
  populateCityPreview3DScene(tile, 'upgrade-city-3d-canvas');

  const origin = getTileScreenPosition(tile.id);
  animateModalSpringOpen('#modal-upgrade-city', '#modal-upgrade-city-card', origin);
  playSFX('hop');
}

export function renderUpgradeModalContent(tile) {
  const st = gameState.properties[tile.id];
  if (!st) return;
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx] || gameState.players[0];

  const header = document.getElementById('upgrade-modal-header');
  if (header) {
    const groupColor = tile.group ? GROUP_META[tile.group].hex : '#10b981';
    header.style.background = groupColor;
  }

  const countryEl = document.getElementById('upgrade-modal-country');
  if (countryEl) {
    countryEl.innerHTML = `<i class="fa-solid fa-crown text-amber-300"></i> ${tile.group ? GROUP_META[tile.group].name : 'ESTATE'}`;
  }

  const levelLabels = ['Base', '1 House', '2 Houses', '3 Houses', 'Skyscraper'];
  const levelPill = document.getElementById('upgrade-modal-level-pill');
  if (levelPill) {
    levelPill.textContent = `Level ${st.level}: ${levelLabels[st.level] || 'Base'}`;
    levelPill.className = 'text-xs font-black px-2.5 py-1 rounded-full bg-white/25 border border-white/40 shadow-xs';
  }

  const nameEl = document.getElementById('upgrade-modal-name');
  if (nameEl) nameEl.textContent = tile.name;

  const curRent = calculateTileRent(tile.id);
  const curRentEl = document.getElementById('upgrade-modal-current-rent');
  if (curRentEl) curRentEl.textContent = fmtMoney(curRent);
  const costEl = document.getElementById('upgrade-modal-cost');
  if (costEl) costEl.textContent = fmtMoney(tile.houseCost);
  const balEl = document.getElementById('upgrade-modal-balance');
  if (balEl) balEl.textContent = `Balance: ${fmtMoney(p.cash)}`;

  const tiersEl = document.getElementById('upgrade-modal-tiers');
  if (tiersEl) {
    tiersEl.innerHTML = levelLabels.map((lbl, idx) => {
      const isCurrent = (st.level === idx);
      const isNext = (st.level + 1 === idx);
      const rentVal = tile.rent[idx];
      const isSky = (idx === 4);

      let cardClass = isCurrent
        ? 'game-tier-card tier-card-current'
        : (isNext ? 'game-tier-card tier-card-next' : (isSky ? 'game-tier-card tier-card-skyscraper' : 'game-tier-card'));

      let statusPill = '';
      if (isCurrent) {
        statusPill = '<span class="text-[9px] uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black shadow-2xs">ACTIVE</span>';
      } else if (isNext) {
        statusPill = '<span class="text-[9px] uppercase px-2 py-0.5 rounded-full bg-sky-500 text-white font-black shadow-2xs">+NEXT</span>';
      } else if (isSky) {
        statusPill = '<span class="text-[9px] uppercase px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black shadow-2xs">MAX</span>';
      }

      let valPillClass = isCurrent
        ? 'tier-val-pill bg-emerald-600 text-white border-emerald-500 shadow-xs'
        : (isSky ? 'tier-val-pill tier-val-skyscraper' : 'tier-val-pill');

      return `
        <div class="${cardClass}">
          <div class="flex items-center gap-2.5">
            ${getTierBadgeHTML(idx)}
            <div>
              <div class="font-display font-black text-xs sm:text-sm text-slate-800 flex items-center gap-1.5 leading-tight">
                <span>${lbl}</span>
                ${statusPill}
              </div>
              <div class="text-[10px] text-slate-400 font-bold">${idx === 0 ? 'Base Land Payout' : (isSky ? 'Maximum Empire Rent' : `District Level ${idx}`)}</div>
            </div>
          </div>
          <div class="${valPillClass}">${fmtMoney(rentVal)}</div>
        </div>
      `;
    }).join('');
  }

  const noticeEl = document.getElementById('upgrade-modal-notice');
  const btnUpgrade = document.getElementById('btn-confirm-upgrade');
  const btnUpgrade2 = document.getElementById('btn-confirm-upgrade-2');
  const btnClose = document.getElementById('btn-close-upgrade-modal');
  const upgradesDone = gameState.upgradesThisVisit || 0;

  if (upgradesDone >= 2) {
    if (btnUpgrade2) btnUpgrade2.classList.add('hidden');
    if (noticeEl) {
      noticeEl.classList.remove('hidden');
      noticeEl.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600 mr-1"></i> <strong class="text-emerald-800">Visit Limit Reached (2/2)!</strong> You can upgrade at most 2 levels at one time.`;
    }
    if (btnUpgrade) {
      btnUpgrade.disabled = true;
      btnUpgrade.className = 'game-btn game-btn-slate opacity-50 cursor-not-allowed flex-1 py-3 px-3 text-xs sm:text-sm font-black flex flex-col items-center justify-center gap-0.5 leading-snug';
      btnUpgrade.innerHTML = `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-ban text-amber-500"></i> MAX REACHED</span><span class="text-xs font-bold opacity-80">(2/2 Levels)</span>`;
    }
    if (btnClose) btnClose.textContent = 'DONE';
  } else if (st.level >= 4) {
    if (btnUpgrade2) btnUpgrade2.classList.add('hidden');
    if (noticeEl) {
      noticeEl.classList.remove('hidden');
      noticeEl.innerHTML = `🏆 <strong class="text-amber-800">Skyscraper Maxed!</strong> This estate is generating maximum rent of ${fmtMoney(tile.rent[4])}.`;
    }
    if (btnUpgrade) {
      btnUpgrade.disabled = true;
      btnUpgrade.className = 'game-btn game-btn-slate opacity-50 cursor-not-allowed flex-1 py-3 px-3 text-xs sm:text-sm font-black flex flex-col items-center justify-center gap-0.5 leading-snug';
      btnUpgrade.innerHTML = `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-crown text-amber-500"></i> MAX LEVEL</span><span class="text-xs font-bold opacity-80">(Skyscraper)</span>`;
    }
    if (btnClose) btnClose.textContent = 'DONE';
  } else {
    const canAfford = p.cash >= tile.houseCost;
    if (btnUpgrade) {
      btnUpgrade.disabled = !canAfford;
      btnUpgrade.className = `game-btn ${canAfford ? 'game-btn-green' : 'game-btn-slate opacity-50 cursor-not-allowed'} flex-1 py-3 px-3 text-xs sm:text-sm font-black flex flex-col items-center justify-center gap-0.5 leading-snug`;
      btnUpgrade.innerHTML = canAfford
        ? `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-arrow-up-right-dots"></i> +1 LEVEL</span><span class="text-xs font-bold opacity-90">(${fmtMoney(tile.houseCost)})</span>`
        : `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-lock"></i> +1 LEVEL</span><span class="text-xs font-bold opacity-80">(NEED ${fmtMoney(tile.houseCost)})</span>`;
    }

    if (btnUpgrade2) {
      if (upgradesDone === 0 && st.level <= 2) {
        btnUpgrade2.classList.remove('hidden');
        const cost2 = tile.houseCost * 2;
        const canAfford2 = p.cash >= cost2;
        btnUpgrade2.disabled = !canAfford2;
        btnUpgrade2.className = `game-btn ${canAfford2 ? 'game-btn-blue' : 'game-btn-slate opacity-50 cursor-not-allowed'} flex-1 py-3 px-3 text-xs sm:text-sm font-black flex flex-col items-center justify-center gap-0.5 leading-snug`;
        btnUpgrade2.innerHTML = canAfford2
          ? `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-angles-up"></i> +2 LEVELS</span><span class="text-xs font-bold opacity-90">(${fmtMoney(cost2)})</span>`
          : `<span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-lock"></i> +2 LEVELS</span><span class="text-xs font-bold opacity-80">(NEED ${fmtMoney(cost2)})</span>`;
      } else {
        btnUpgrade2.classList.add('hidden');
      }
    }

    if (noticeEl) {
      if (upgradesDone > 0) {
        noticeEl.classList.remove('hidden');
        noticeEl.innerHTML = `⭐ <strong>${upgradesDone}/2 Upgrades completed</strong> this visit. You may upgrade 1 more level.`;
      } else {
        noticeEl.classList.add('hidden');
      }
    }
    if (btnClose) {
      btnClose.textContent = (upgradesDone > 0 || st.level > 0) ? 'DONE' : 'CONTINUE';
    }
  }
}

export function confirmUpgradeFromModal() {
  const tile = gameState.pendingUpgradeTile;
  if (!tile) return;
  const st = gameState.properties[tile.id];
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  if (!st || !p) return;

  if ((gameState.upgradesThisVisit || 0) >= 2) {
    showTurnLockToast("You can only upgrade at most 2 levels at one time!");
    return;
  }

  if (st.level >= 4 || p.cash < tile.houseCost) return;

  upgradeCityLevel(tile.id, true);
  gameState.upgradesThisVisit = (gameState.upgradesThisVisit || 0) + 1;
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
    broadcastAction('ACTION_UPGRADE_CITY', { playerIdx: pIdx, tileId: tile.id });
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }

  renderUpgradeModalContent(tile);
  populateCityPreview3DScene(tile, 'upgrade-city-3d-canvas');
  animateBuildingUpgradeBounce('#upgrade-city-3d-canvas');
}

export function confirmUpgradeTwoLevelsFromModal() {
  const tile = gameState.pendingUpgradeTile;
  if (!tile) return;
  const st = gameState.properties[tile.id];
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  if (!st || !p) return;

  const cost2 = tile.houseCost * 2;
  if ((gameState.upgradesThisVisit || 0) > 0 || st.level > 2 || p.cash < cost2) return;

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

  renderUpgradeModalContent(tile);
  populateCityPreview3DScene(tile, 'upgrade-city-3d-canvas');
  animateBuildingUpgradeBounce('#upgrade-city-3d-canvas');
}

export function closeUpgradeCityModal() {
  const tile = gameState.pendingUpgradeTile;
  const didBuildLandmark = tile && (gameState.upgradesThisVisit > 0) && (gameState.properties[tile.id]?.level >= 4);
  const landmarkTileId = tile ? tile.id : null;

  if (tile) {
    setTileHighlightRing(tile.id, false);
  }
  clearCityPreview();
  animateModalSpringClose('#modal-upgrade-city', '#modal-upgrade-city-card');
  gameState.pendingUpgradeTile = null;

  if (didBuildLandmark && landmarkTileId !== null) {
    playLandmarkCinematicReveal(landmarkTileId);
  }

  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastFullGameState();
  }

  if (engineCallbacks.concludeActionPhase) {
    engineCallbacks.concludeActionPhase(gameState.pendingDoubles);
  }
}
