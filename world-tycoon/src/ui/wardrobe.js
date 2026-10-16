/**
 * ui/wardrobe.js
 * Wardrobe cosmetic customization system & balanced persistent Tycoon Stars economy.
 * Adheres strictly to `better-interface` across accessibility, layout, writing, typography, color and UI polish.
 */

import { playSFX } from '../game/audio.js';
import { matchSettings } from '../game/state.js';
import { updateLobbyHeroAvatar } from '../three/stages/lobbyStage.js';
import { applyEquippedDiceSkin } from '../three/assets/dice.js';

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

/**
 * Loads or initializes the player's persistent profile from localStorage.
 * Includes automatic migration from previous versions with a balanced 150 ⭐ wallet.
 * @returns {object}
 */
export function getTycoonProfile() {
  if (typeof localStorage === 'undefined') {
    return getDefaultProfile();
  }
  try {
    const raw = localStorage.getItem(WARDROBE_STORAGE_KEY);
    if (!raw) {
      // Migrate existing name if present in previous profile versions
      let existingName = 'NAMAN';
      const oldRaw = localStorage.getItem('WORLD_TYCOON_PROFILE_V2') || localStorage.getItem('WORLD_TYCOON_PROFILE_V1');
      if (oldRaw) {
        try {
          const old = JSON.parse(oldRaw);
          if (old.name) existingName = old.name;
        } catch (_) {}
      }
      const def = getDefaultProfile(existingName);
      saveTycoonProfile(def);
      return def;
    }
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name || 'NAMAN',
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
    return getDefaultProfile();
  }
}

function getDefaultProfile(name = 'NAMAN') {
  return {
    name,
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
  saveTycoonProfile(profile);

  playSFX('hop');
  applyEquippedCosmeticsToPlayer();
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

  // 1. Update player 0's hat style in matchSettings
  if (matchSettings?.customPlayers?.[0] && equippedHat) {
    matchSettings.customPlayers[0].hatStyle = equippedHat.hatStyle;
    const cp = matchSettings.customPlayers[0];
    updateLobbyHeroAvatar(cp.hatStyle, cp.colorHex || '#3b82f6', cp.charColor || 0x3b82f6, equippedPedestal?.id);
  }

  // 2. Apply dice skin to 3D board dice
  applyEquippedDiceSkin(equippedDice);
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
function renderWardrobeGrid() {
  const container = document.getElementById('wardrobe-items-grid');
  if (!container) return;

  const profile = getTycoonProfile();
  const items = WARDROBE_ITEMS[activeCategory] || [];
  const equippedId = profile.equipped[activeCategory];

  container.innerHTML = items.map(item => {
    const isUnlocked = profile.unlockedItems.includes(item.id);
    const isEquipped = equippedId === item.id;
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
        <button onclick="window.equipWardrobeItem('${activeCategory}', '${item.id}')" class="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-[transform,background-color]" aria-label="Equip ${item.name}">
          <span>Equip</span>
        </button>
      `;
    } else {
      actionButton = `
        <button onclick="window.unlockWardrobeItem('${item.id}')" class="w-full py-2 px-3 rounded-xl ${canAfford ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95 cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'} font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-[transform,background-color]" aria-label="Unlock ${item.name} for ${item.cost.toLocaleString()} Tycoon Stars" ${!canAfford ? 'disabled' : ''}>
          <i class="fa-solid fa-lock text-[10px]"></i>
          <span class="tabular-nums">${item.cost.toLocaleString()} ⭐</span>
        </button>
      `;
    }

    return `
      <div class="relative bg-white border-2 ${isEquipped ? 'border-emerald-400 ring-2 ring-emerald-200 shadow-md' : 'border-slate-200 hover:border-slate-300 shadow-xs'} rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-150">
        <div>
          <!-- Item Card Top Header -->
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="text-3xl select-none filter drop-shadow-xs">${item.icon}</span>
            <div class="flex flex-col items-end gap-1">
              <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${rarityClass}">
                ${item.rarity}
              </span>
              ${isEquipped 
                ? `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider">ACTIVE</span>`
                : isUnlocked 
                  ? `<span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">UNLOCKED</span>`
                  : `<span class="px-2 py-0.5 rounded-full ${canAfford ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'} text-[10px] font-black tracking-wider flex items-center gap-1 tabular-nums">
                      <i class="fa-solid fa-lock text-[9px]"></i> ${item.cost.toLocaleString()} ⭐
                     </span>`
              }
            </div>
          </div>

          <!-- Item Title & Description -->
          <h4 class="font-rounded font-black text-xs sm:text-sm text-slate-900 leading-tight">${item.name}</h4>
          <p class="text-[11px] text-slate-500 font-medium leading-normal mt-1 mb-3">${item.desc}</p>
        </div>

        <!-- Action Button -->
        <div class="mt-auto pt-1">
          ${actionButton}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Updates the modal header's star balance pill.
 */
function renderWardrobeHeader() {
  const profile = getTycoonProfile();
  const balEl = document.getElementById('wardrobe-stars-balance');
  if (balEl) balEl.textContent = profile.tycoonStars.toLocaleString();
}

/**
 * Updates all profile and lobby point badges.
 */
export function updateAllPointsBadges() {
  const profile = getTycoonProfile();
  const fmt = profile.tycoonStars.toLocaleString();

  const lobbyStarsEl = document.getElementById('setup-profile-stars');
  if (lobbyStarsEl) lobbyStarsEl.textContent = fmt;

  const btnStarsBadge = document.getElementById('wardrobe-button-stars-badge');
  if (btnStarsBadge) btnStarsBadge.textContent = fmt;

  const modalStarsEl = document.getElementById('wardrobe-stars-balance');
  if (modalStarsEl) modalStarsEl.textContent = fmt;

  const victoryBalEl = document.getElementById('victory-profile-balance');
  if (victoryBalEl) victoryBalEl.innerHTML = `${fmt} <svg class="ui-icon w-3.5 h-3.5 text-amber-400 inline ml-1" aria-hidden="true"><use href="#icon-star"></use></svg>`;
}

/**
 * Opens the Wardrobe modal with accessible focus trapping and esc listeners.
 */
export function openWardrobeModal() {
  previousActiveElement = document.activeElement;
  const modal = document.getElementById('modal-wardrobe');
  if (!modal) return;

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  renderWardrobeHeader();
  setWardrobeCategory(activeCategory);
  updateAllPointsBadges();

  playSFX('click');

  // Focus the close button for accessibility
  setTimeout(() => {
    const closeBtn = document.getElementById('btn-close-wardrobe');
    if (closeBtn) closeBtn.focus();
  }, 50);

  window.addEventListener('keydown', handleWardrobeKeyDown);
}

/**
 * Closes the Wardrobe modal.
 */
export function closeWardrobeModal() {
  const modal = document.getElementById('modal-wardrobe');
  if (!modal) return;

  modal.classList.add('hidden');
  modal.classList.remove('flex');

  window.removeEventListener('keydown', handleWardrobeKeyDown);
  playSFX('hop');

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
    window.resetTycoonProfile = resetTycoonProfile;
  }
}
