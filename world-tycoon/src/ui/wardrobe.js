/**
 * ui/wardrobe.js
 * Wardrobe cosmetic customization system & balanced persistent Tycoon Stars economy.
 * Adheres strictly to `better-interface` across accessibility, layout, writing, typography, color and UI polish.
 */

import { playSFX } from '../game/audio.js';
import { gameState, matchSettings, getSavedPlayerName, PLAYER_NAME_STORAGE_KEY } from '../game/state.js';
import { context } from '../three/core/context.js';
import { spawnAllPlayerTokens3D } from '../three/pawns/tokens.js';
import { updateLobbyHeroAvatar, updateLobbyHeroDiceSkin } from '../three/stages/lobbyStage.js';
import { applyEquippedDiceSkin } from '../three/assets/dice.js';
import { animateWardrobeGridCascade, animateNumberCounter } from './anim.js';
import { networkState, sendClientProfileUpdate, broadcastLobbySettings } from '../network/p2p.js';

export const WARDROBE_STORAGE_KEY = 'WORLD_TYCOON_PROFILE_V3';

export const RARITY_STYLES = {
  common: 'bg-slate-100 text-slate-700 border-slate-200',
  rare: 'bg-sky-100 text-sky-800 border-sky-300',
  epic: 'bg-purple-100 text-purple-800 border-purple-300',
  legendary: 'bg-amber-100 text-amber-900 border-amber-300',
  mythic: 'bg-rose-100 text-rose-900 border-rose-300'
};

export const WARDROBE_ITEMS = {
  hat: [
    { id: 'hat_aviator', hatStyle: 0, rarity: 'common', name: 'Aviator Goggles', icon: '✈️', cost: 0, desc: 'Sky captain flight helmet and brass goggles.' },
    { id: 'hat_banker', hatStyle: 1, rarity: 'common', name: 'Banker Monocle', icon: '🎩', cost: 0, desc: 'Classic golden monocle and silk black top hat.' },
    { id: 'hat_safari', hatStyle: 2, rarity: 'common', name: 'Explorer Helmet', icon: '🧭', cost: 0, desc: 'Rugged safari pith helmet for global conquest.' },
    { id: 'hat_cyber', hatStyle: 3, rarity: 'common', name: 'Cyber Nova Visor', icon: '⚡', cost: 0, desc: 'Heads-up tactical holographic visor.' },
    { id: 'hat_crown', hatStyle: 4, rarity: 'rare', name: 'Imperial Crown', icon: '👑', cost: 450, desc: 'Gilded 24K imperial crown studded with royal rubies.' },
    { id: 'hat_fedora', hatStyle: 5, rarity: 'epic', name: 'Diamond Fedora', icon: '💎', cost: 950, desc: 'Crisp midnight fedora with a diamond-cut band.' },
    { id: 'hat_captain', hatStyle: 6, rarity: 'legendary', name: 'Royal Bicorn', icon: '⚓', cost: 1850, desc: 'Naval fleet admiral bicorn with gold bullion fringe.' }
  ],
  dice: [
    { id: 'dice_classic', rarity: 'common', name: 'Classic Ivory', icon: '🎲', cost: 0, desc: 'Crisp polished ivory cubes with red and black pips.' },
    { id: 'dice_ruby', rarity: 'rare', name: 'Vegas Ruby Red', icon: '🔴', cost: 350, desc: 'Casino crimson resin cubes with metallic golden pips.' },
    { id: 'dice_neon', rarity: 'epic', name: 'Cyber Neon Blue', icon: '🔵', cost: 850, desc: 'Electroluminescent grid dice straight from Neo-Tokyo.' },
    { id: 'dice_midas', rarity: 'legendary', name: 'Midas Solid Gold', icon: '🟡', cost: 1450, desc: 'Pure 24K bullion dice that shimmer on the green felt.' },
    { id: 'dice_obsidian', rarity: 'mythic', name: 'Obsidian Onyx', icon: '⚫', cost: 1950, desc: 'Volcanic glass dice forged with mystical violet energy.' }
  ],
  pedestal: [
    { id: 'pedestal_classic', rarity: 'common', name: 'Slate Plinth', icon: '🔘', cost: 0, desc: 'Clean boardroom architectural marble base.' },
    { id: 'pedestal_gold', rarity: 'rare', name: 'Gilded 24K Ring', icon: '🌟', cost: 400, desc: 'High-gloss champion gold plinth with mirror finish.' },
    { id: 'pedestal_emerald', rarity: 'epic', name: 'Emerald Matrix', icon: '❇️', cost: 900, desc: 'Glowing crystal jade plinth with internal pulse.' },
    { id: 'pedestal_magma', rarity: 'legendary', name: 'Molten Magma', icon: '🔥', cost: 1750, desc: 'Obsidian rim surrounded by an intense fiery aura.' }
  ]
};

let activeCategory = 'hat';
let previousActiveElement = null;
let wardrobeCloseTimer = null;
let previewState = {
  hat: null,
  dice: null,
  pedestal: null
};

/**
 * Loads or initializes the player's persistent profile from localStorage.
 * Includes automatic migration from previous versions with a balanced 150 ⭐ wallet.
 * @returns {object}
 */
export function getTycoonProfile() {
  const currentSavedName = getSavedPlayerName();
  if (typeof localStorage === 'undefined') {
    return getDefaultProfile(currentSavedName);
  }
  try {
    const raw = localStorage.getItem(WARDROBE_STORAGE_KEY);
    if (!raw) {
      const def = getDefaultProfile(currentSavedName);
      saveTycoonProfile(def);
      return def;
    }
    const parsed = JSON.parse(raw);
    return {
      name: currentSavedName || parsed.name || 'TYCOON',
      tycoonStars: typeof parsed.tycoonStars === 'number' ? parsed.tycoonStars : 150,
      unlockedItems: Array.isArray(parsed.unlockedItems) ? parsed.unlockedItems : ['hat_aviator', 'hat_banker', 'hat_safari', 'hat_cyber', 'dice_classic', 'pedestal_classic'],
      equipped: {
        hat: parsed.equipped?.hat || 'hat_banker',
        dice: parsed.equipped?.dice || 'dice_classic',
        pedestal: parsed.equipped?.pedestal || 'pedestal_classic'
      }
    };
  } catch (e) {
    console.warn('Failed to parse wardrobe profile, using defaults:', e);
    return getDefaultProfile(currentSavedName);
  }
}

function getDefaultProfile(name = 'TYCOON') {
  return {
    name: name || getSavedPlayerName() || 'TYCOON',
    tycoonStars: 150, // Balanced starter wallet
    unlockedItems: ['hat_aviator', 'hat_banker', 'hat_safari', 'hat_cyber', 'dice_classic', 'pedestal_classic'],
    equipped: {
      hat: 'hat_banker',
      dice: 'dice_classic',
      pedestal: 'pedestal_classic'
    }
  };
}

/**
 * Resets profile to balanced defaults for testing or clean start.
 */
export function resetTycoonProfile() {
  const profile = getDefaultProfile();
  saveTycoonProfile(profile);
  applyEquippedCosmeticsToPlayer();
  renderWardrobeGrid();
  renderWardrobeHeader();
  updateAllPointsBadges();
  playSFX('bankrupt');
}

/**
 * Persists the tycoon profile to localStorage.
 * @param {object} profile
 */
export function saveTycoonProfile(profile) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(WARDROBE_STORAGE_KEY, JSON.stringify(profile));
    if (profile && profile.name) {
      localStorage.setItem(PLAYER_NAME_STORAGE_KEY, profile.name);
    }
  } catch (e) {
    console.error('Failed to save wardrobe profile:', e);
  }
  updateAllPointsBadges();
}

/**
 * Awards balanced Tycoon Stars at the end of a match.
 * Calibrated so top-tier prestige cosmetics unlock in 10-12 games:
 * Match winner: +140 ⭐
 * Finished match: +60 ⭐
 * Properties owned: +4 ⭐ per city (max 48 ⭐)
 * Color Monopolies: +20 ⭐ per monopoly (max 40 ⭐)
 * @param {object} params
 * @param {boolean} params.isWinner
 * @param {number} params.propertiesOwned
 * @param {number} params.monopoliesCount
 * @returns {{ totalEarned: number, breakdown: Array<{ label: string, pts: number }>, newBalance: number }}
 */
export function awardMatchPoints({ isWinner = false, propertiesOwned = 0, monopoliesCount = 0 }) {
  const profile = getTycoonProfile();
  const breakdown = [];

  if (isWinner) {
    breakdown.push({ label: 'Match Victory', pts: 140 });
  } else {
    breakdown.push({ label: 'Match Completed', pts: 60 });
  }

  if (propertiesOwned > 0) {
    const propPts = Math.min(propertiesOwned * 4, 48);
    breakdown.push({ label: `${propertiesOwned} Cities Owned`, pts: propPts });
  }

  if (monopoliesCount > 0) {
    const monoPts = Math.min(monopoliesCount * 20, 40);
    breakdown.push({ label: `${monopoliesCount} Monopolies Built`, pts: monoPts });
  }

  const totalEarned = breakdown.reduce((sum, item) => sum + item.pts, 0);
  profile.tycoonStars += totalEarned;
  saveTycoonProfile(profile);

  return {
    totalEarned,
    breakdown,
    newBalance: profile.tycoonStars
  };
}

/**
 * Unlocks a cosmetic item using Tycoon Stars.
 * @param {string} itemId
 */
export function unlockItem(itemId) {
  const profile = getTycoonProfile();
  const item = findItemById(itemId);
  if (!item) return;

  if (profile.unlockedItems.includes(itemId)) {
    equipItem(item.category, itemId);
    return;
  }

  if (profile.tycoonStars < item.cost) {
    playSFX('bankrupt');
    alert(`Not enough Tycoon Stars! You need ${item.cost.toLocaleString()} ⭐ (Balance: ${profile.tycoonStars.toLocaleString()} ⭐). Play more matches to earn stars!`);
    return;
  }

  profile.tycoonStars -= item.cost;
  profile.unlockedItems.push(itemId);
  profile.equipped[item.category] = itemId;
  previewState[item.category] = itemId;
  saveTycoonProfile(profile);

  playSFX('cash');
  applyEquippedCosmeticsToPlayer();
  renderWardrobeGrid();
  renderWardrobeHeader();
}

/**
 * Equips an already unlocked cosmetic item.
 * @param {string} category - 'hat' | 'dice' | 'pedestal'
 * @param {string} itemId
 */
export function equipItem(category, itemId) {
  const profile = getTycoonProfile();
  if (!profile.unlockedItems.includes(itemId)) {
    unlockItem(itemId);
    return;
  }

  profile.equipped[category] = itemId;
  previewState[category] = itemId;
  saveTycoonProfile(profile);

  playSFX('hop');
  applyEquippedCosmeticsToPlayer();
  renderWardrobeGrid();
}

/**
 * Previews any cosmetic item on the 3D player avatar and podium in real time.
 * @param {string} category - 'hat' | 'dice' | 'pedestal'
 * @param {string} itemId
 */
export function previewWardrobeItem(category, itemId) {
  if (!['hat', 'dice', 'pedestal'].includes(category)) return;
  previewState[category] = itemId;

  const item = findItemById(itemId);
  if (!item) return;

  const myIdx = (networkState?.isMultiplayer && !networkState?.isHost) ? (networkState.localPlayerIdx || 0) : 0;
  const cp = matchSettings?.customPlayers?.[myIdx] || { hatStyle: 0, colorHex: '#3b82f6', charColor: 0x3b82f6 };

  // Determine current preview hat style
  const previewHat = findItemById(previewState.hat);
  const curHatStyle = (previewHat && typeof previewHat.hatStyle === 'number') ? previewHat.hatStyle : (cp.hatStyle || 0);

  // Determine current preview pedestal
  const curPedestal = previewState.pedestal;

  // Update 3D hero avatar & podium live
  updateLobbyHeroAvatar(curHatStyle, cp.colorHex || '#3b82f6', cp.charColor || 0x3b82f6, curPedestal);

  // Update 3D mini dice on podium
  if (category === 'dice') {
    updateLobbyHeroDiceSkin(itemId);
  }

  playSFX('hop');
  renderWardrobeGrid();
}

/**
 * Finds item configuration by ID across all categories.
 * @param {string} itemId
 * @returns {object|null}
 */
export function findItemById(itemId) {
  for (const cat of ['hat', 'dice', 'pedestal']) {
    const found = WARDROBE_ITEMS[cat].find(i => i.id === itemId);
    if (found) return { ...found, category: cat };
  }
  return null;
}

/**
 * Applies currently equipped wardrobe cosmetics to active game state and 3D diorama.
 */
export function applyEquippedCosmeticsToPlayer() {
  const profile = getTycoonProfile();
  const equippedHat = findItemById(profile.equipped.hat);
  const equippedPedestal = findItemById(profile.equipped.pedestal);
  const equippedDice = profile.equipped.dice;

  // Synchronize preview state with profile loadout
  previewState.hat = profile.equipped.hat;
  previewState.dice = profile.equipped.dice;
  previewState.pedestal = profile.equipped.pedestal;

  // 1. Update local player's hat style & pedestal in matchSettings
  const myIdx = (networkState?.isMultiplayer && !networkState?.isHost) ? (networkState.localPlayerIdx || 0) : 0;
  if (matchSettings?.customPlayers?.[myIdx]) {
    if (equippedHat) {
      matchSettings.customPlayers[myIdx].hatStyle = equippedHat.hatStyle;
    }
    if (equippedPedestal) {
      matchSettings.customPlayers[myIdx].pedestal = equippedPedestal.id;
    }
    const cp = matchSettings.customPlayers[myIdx];
    updateLobbyHeroAvatar(cp.hatStyle, cp.colorHex || '#3b82f6', cp.charColor || 0x3b82f6, equippedPedestal?.id);

    if (networkState?.isMultiplayer) {
      if (networkState.isHost) {
        broadcastLobbySettings();
      } else {
        sendClientProfileUpdate({ hatStyle: cp.hatStyle, pedestal: cp.pedestal });
      }
    }
  }

  // 2. Apply dice skin to 3D board dice & lobby stage mini dice
  applyEquippedDiceSkin(equippedDice);
  updateLobbyHeroDiceSkin(equippedDice);

  // 3. Live-refresh 3D board pawns and HUD portraits if board meshes are active
  if (context?.playerMeshes?.length > 0 || gameState?.gameStarted) {
    spawnAllPlayerTokens3D();
  }
}

/**
 * Switches the active wardrobe category tab.
 * @param {string} cat - 'hat' | 'dice' | 'pedestal'
 */
export function setWardrobeCategory(cat) {
  if (!['hat', 'dice', 'pedestal'].includes(cat)) return;
  activeCategory = cat;
  playSFX('click');

  // Update tab button active states
  const tabs = document.querySelectorAll('.wardrobe-tab-btn');
  tabs.forEach(tab => {
    const isCurrent = tab.dataset.category === cat;
    if (isCurrent) {
      tab.classList.remove('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
      tab.classList.add('bg-amber-400', 'text-slate-950', 'shadow-sm', 'font-black');
      tab.setAttribute('aria-selected', 'true');
    } else {
      tab.classList.remove('bg-amber-400', 'text-slate-950', 'shadow-sm', 'font-black');
      tab.classList.add('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200', 'font-extrabold');
      tab.setAttribute('aria-selected', 'false');
    }
  });

  renderWardrobeGrid();
}

/**
 * Renders the items grid for the active category.
 */
/**
 * Renders the items grid for the active category with interactive preview support.
 */
function renderWardrobeGrid() {
  const container = document.getElementById('wardrobe-items-grid');
  if (!container) return;

  const profile = getTycoonProfile();
  const items = WARDROBE_ITEMS[activeCategory] || [];
  const equippedId = profile.equipped[activeCategory];
  const previewingId = previewState[activeCategory] || equippedId;

  container.innerHTML = items.map(item => {
    const isUnlocked = profile.unlockedItems.includes(item.id);
    const isEquipped = equippedId === item.id;
    const isPreviewing = previewingId === item.id;
    const canAfford = profile.tycoonStars >= item.cost;
    const rarityClass = RARITY_STYLES[item.rarity] || RARITY_STYLES.common;

    let actionButton = '';
    if (isEquipped) {
      actionButton = `
        <button disabled class="w-full py-2 px-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 font-black text-xs flex items-center justify-center gap-1.5 cursor-default select-none shadow-2xs">
          <i class="fa-solid fa-circle-check text-emerald-600"></i> Equipped
        </button>
      `;
    } else if (isUnlocked) {
      actionButton = `
        <button onclick="event.stopPropagation(); window.equipWardrobeItem('${activeCategory}', '${item.id}')" class="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.96] text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-[transform,background-color] duration-150 ease-out" aria-label="Equip ${item.name}">
          <span>Equip</span>
        </button>
      `;
    } else {
      actionButton = `
        <button onclick="event.stopPropagation(); window.unlockWardrobeItem('${item.id}')" class="w-full py-2 px-3 rounded-xl ${canAfford ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 active:scale-[0.96] cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'} font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-[transform,background-color] duration-150 ease-out" aria-label="Unlock ${item.name} for ${item.cost.toLocaleString()} Tycoon Stars" ${!canAfford ? 'disabled' : ''}>
          <i class="fa-solid fa-lock text-[10px]"></i>
          <span class="tabular-nums">${item.cost.toLocaleString()} ⭐</span>
        </button>
      `;
    }

    // Dynamic border and ring classes for preview state
    let stateBorderClass = 'border-slate-200 hover:border-sky-300 shadow-xs';
    if (isPreviewing) {
      stateBorderClass = 'border-sky-500 ring-2 ring-sky-400 shadow-md bg-sky-50/50 scale-[1.01]';
    } else if (isEquipped) {
      stateBorderClass = 'border-emerald-400 ring-1 ring-emerald-200 shadow-sm';
    }

    return `
      <div onclick="window.previewWardrobeItem('${activeCategory}', '${item.id}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.previewWardrobeItem('${activeCategory}', '${item.id}');}" class="relative bg-white border-2 ${stateBorderClass} rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-150 ease-out" title="Click to preview on avatar">
        <div>
          <!-- Item Card Top Header -->
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="text-3xl select-none filter drop-shadow-xs">${item.icon}</span>
            <div class="flex flex-col items-end gap-1">
              <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${rarityClass}">
                ${item.rarity}
              </span>
              ${isPreviewing 
                ? `<span class="px-2 py-0.5 rounded-full bg-sky-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                     <i class="fa-solid fa-eye text-[9px]"></i> PREVIEW
                   </span>`
                : ''
              }
              ${isEquipped 
                ? `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                     <i class="fa-solid fa-check text-[9px]"></i> ACTIVE
                   </span>`
                : isUnlocked 
                  ? `<span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">UNLOCKED</span>`
                  : `<span class="px-2 py-0.5 rounded-full ${canAfford ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'} text-[10px] font-black tracking-wider flex items-center gap-1 tabular-nums">
                      <i class="fa-solid fa-lock text-[9px]"></i> ${item.cost.toLocaleString()} ⭐
                     </span>`
              }
            </div>
          </div>

          <!-- Item Title & Description -->
          <h4 class="font-rounded font-black text-xs sm:text-sm text-slate-900 leading-tight flex items-center gap-1.5">
            ${item.name}
          </h4>
          <p class="text-[11px] text-slate-500 font-medium leading-normal mt-1 mb-3">${item.desc}</p>
        </div>

        <!-- Action Button -->
        <div class="mt-auto pt-1">
          ${actionButton}
        </div>
      </div>
    `;
  }).join('');

  // Anime.js kinetic card cascade
  animateWardrobeGridCascade('#wardrobe-items-grid > div');
}

/**
 * Updates the modal header's star balance pill with rolling number counter.
 */
function renderWardrobeHeader() {
  const profile = getTycoonProfile();
  const balEl = document.getElementById('wardrobe-stars-balance');
  if (balEl) {
    const curVal = parseInt(balEl.textContent.replace(/\D/g, ''), 10) || 0;
    animateNumberCounter(balEl, curVal, profile.tycoonStars);
  }
}

/**
 * Updates all profile and lobby point badges.
 */
export function updateAllPointsBadges() {
  const profile = getTycoonProfile();
  const fmt = profile.tycoonStars.toLocaleString();

  const lobbyStarsEl = document.getElementById('setup-profile-stars');
  if (lobbyStarsEl) {
    const curVal = parseInt(lobbyStarsEl.textContent.replace(/\D/g, ''), 10) || 0;
    animateNumberCounter(lobbyStarsEl, curVal, profile.tycoonStars);
  }

  const btnStarsBadge = document.getElementById('wardrobe-button-stars-badge');
  if (btnStarsBadge) {
    const curVal = parseInt(btnStarsBadge.textContent.replace(/\D/g, ''), 10) || 0;
    animateNumberCounter(btnStarsBadge, curVal, profile.tycoonStars);
  }

  const modalStarsEl = document.getElementById('wardrobe-stars-balance');
  if (modalStarsEl) {
    const curVal = parseInt(modalStarsEl.textContent.replace(/\D/g, ''), 10) || 0;
    animateNumberCounter(modalStarsEl, curVal, profile.tycoonStars);
  }

  const victoryBalEl = document.getElementById('victory-profile-balance');
  if (victoryBalEl) victoryBalEl.innerHTML = `${fmt} <svg class="ui-icon w-3.5 h-3.5 text-amber-400 inline ml-1" aria-hidden="true"><use href="#icon-star"></use></svg>`;
}

/**
 * Opens the Wardrobe modal with seamless avatar slide and right drawer entrance.
 */
export function openWardrobeModal() {
  if (networkState?.isMultiplayer) {
    const myIdx = networkState.isHost ? 0 : (networkState.localPlayerIdx || 0);
    window.selectSetupPlayer?.(myIdx);
  }
  previousActiveElement = document.activeElement;
  const landingScreen = document.getElementById('landing-setup-screen');
  const modal = document.getElementById('modal-wardrobe');
  if (!modal) return;

  if (wardrobeCloseTimer) {
    clearTimeout(wardrobeCloseTimer);
    wardrobeCloseTimer = null;
  }

  const profile = getTycoonProfile();
  previewState = {
    hat: profile.equipped.hat,
    dice: profile.equipped.dice,
    pedestal: profile.equipped.pedestal
  };

  // 1. Unhide modal and trigger hardware-accelerated drawer slide
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  void modal.offsetWidth; // Force reflow for smooth entry transition

  // 2. Animate landing columns: slide avatar left, slide roster/settings offscreen
  if (landingScreen) {
    landingScreen.classList.add('wardrobe-mode-active');
  }
  modal.classList.remove('wardrobe-panel-hidden');
  modal.classList.add('wardrobe-panel-visible');

  renderWardrobeHeader();
  setWardrobeCategory(activeCategory);
  updateAllPointsBadges();
  updateLobbyHeroDiceSkin(profile.equipped.dice);

  playSFX('click');

  // Focus the close button for accessibility
  setTimeout(() => {
    const closeBtn = document.getElementById('btn-close-wardrobe');
    if (closeBtn) closeBtn.focus();
  }, 100);

  window.addEventListener('keydown', handleWardrobeKeyDown);
}

/**
 * Closes the Wardrobe modal and animates the avatar smoothly back to center.
 */
export function closeWardrobeModal() {
  const landingScreen = document.getElementById('landing-setup-screen');
  const modal = document.getElementById('modal-wardrobe');
  if (!modal) return;

  window.removeEventListener('keydown', handleWardrobeKeyDown);
  playSFX('hop');

  // 1. Trigger slide-out animations
  modal.classList.remove('wardrobe-panel-visible');
  modal.classList.add('wardrobe-panel-hidden');
  if (landingScreen) {
    landingScreen.classList.remove('wardrobe-mode-active');
  }

  // 2. Revert any unequipped preview back to equipped loadout
  applyEquippedCosmeticsToPlayer();

  // 3. Clean up modal display after transition ends (360ms)
  wardrobeCloseTimer = setTimeout(() => {
    if (!landingScreen?.classList.contains('wardrobe-mode-active')) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    wardrobeCloseTimer = null;
  }, 360);

  if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
    previousActiveElement.focus();
  }
}

function handleWardrobeKeyDown(e) {
  if (e.key === 'Escape') {
    closeWardrobeModal();
  }
}

/**
 * Initializes the wardrobe system on app start.
 */
export function initWardrobeSystem() {
  const profile = getTycoonProfile();
  updateAllPointsBadges();
  applyEquippedCosmeticsToPlayer();

  // Expose global window helpers for inline HTML event handlers
  if (typeof window !== 'undefined') {
    window.openWardrobeModal = openWardrobeModal;
    window.closeWardrobeModal = closeWardrobeModal;
    window.setWardrobeCategory = setWardrobeCategory;
    window.equipWardrobeItem = equipItem;
    window.unlockWardrobeItem = unlockItem;
    window.previewWardrobeItem = previewWardrobeItem;
    window.resetTycoonProfile = resetTycoonProfile;
  }
}
