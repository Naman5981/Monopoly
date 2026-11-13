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
import { networkState, sendClientProfileUpdate, broadcastLobbySettings } from '../network/p2p.js';
import { currentLobbyView } from './setup/lobbyNavigation.js';
import { showTurnLockToast } from './hud.js';
import { updateModalSlice } from '../svelte/stores/modalStore.js';

const WARDROBE_STORAGE_KEY = 'WORLD_TYCOON_PROFILE_V3';

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
function getTycoonProfile() {
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
  updateWardrobeItems();
  renderWardrobeHeader();
  updateAllPointsBadges();
  playSFX('bankrupt');
}

/**
 * Persists the tycoon profile to localStorage.
 * @param {object} profile
 */
function saveTycoonProfile(profile) {
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
  updateWardrobeItems();
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
  updateWardrobeItems();
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
  updateWardrobeItems();
}

/**
 * Finds item configuration by ID across all categories.
 * @param {string} itemId
 * @returns {object|null}
 */
function findItemById(itemId) {
  for (const cat of ['hat', 'dice', 'pedestal']) {
    const found = WARDROBE_ITEMS[cat].find(i => i.id === itemId);
    if (found) return { ...found, category: cat };
  }
  return null;
}

/**
 * Applies currently equipped wardrobe cosmetics to active game state and 3D diorama.
 */
function applyEquippedCosmeticsToPlayer() {
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
  updateModalSlice('wardrobe', {
    activeCategory: cat,
    items: getWardrobeItemsForView(cat)
  });
}

function getWardrobeItemsForView(category = activeCategory) {
  const profile = getTycoonProfile();
  const equippedId = profile.equipped[category];
  const previewingId = previewState[category] || equippedId;
  return (WARDROBE_ITEMS[category] || []).map(item => {
    const isUnlocked = profile.unlockedItems.includes(item.id);
    const isEquipped = equippedId === item.id;
    const isPreviewing = previewingId === item.id;
    return { ...item, category, isUnlocked, isEquipped, isPreviewing, canAfford: profile.tycoonStars >= item.cost };
  });
}

function updateWardrobeItems() {
  updateModalSlice('wardrobe', { items: getWardrobeItemsForView() });
}

/**
 * Updates the modal header's star balance pill with rolling number counter.
 */
function renderWardrobeHeader() {
  const profile = getTycoonProfile();
  updateModalSlice('wardrobe', { starsBalance: profile.tycoonStars });
}

/**
 * Updates all profile and lobby point badges.
 */
export function updateAllPointsBadges() {
  const profile = getTycoonProfile();
  const balance = profile.tycoonStars.toLocaleString();
  updateModalSlice('wardrobe', { starsBalance: profile.tycoonStars });
  updateModalSlice('victory', { totalBalanceStars: `${balance} ⭐` });
  const lobbyStarsEl = document.getElementById('setup-profile-stars');
  if (lobbyStarsEl) lobbyStarsEl.textContent = balance;
  const btnStarsBadge = document.getElementById('wardrobe-button-stars-badge');
  if (btnStarsBadge) btnStarsBadge.textContent = balance;
}

/**
 * Opens the Wardrobe modal with seamless avatar slide and right drawer entrance.
 */
export function openWardrobeModal() {
  if (currentLobbyView !== 'title') {
    showTurnLockToast('Wardrobe can only be accessed on the Home Screen!');
    return;
  }
  if (networkState?.isMultiplayer) {
    const myIdx = networkState.isHost ? 0 : (networkState.localPlayerIdx || 0);
    window.selectSetupPlayer?.(myIdx);
  }
  previousActiveElement = document.activeElement;
  const landingScreen = document.getElementById('landing-setup-screen');
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
  updateModalSlice('wardrobe', {
    visible: true,
    isClosing: false,
    activeCategory,
    starsBalance: profile.tycoonStars,
    items: getWardrobeItemsForView()
  });

  // 2. Animate landing columns: slide avatar left, slide roster/settings offscreen
  if (landingScreen) {
    landingScreen.classList.add('wardrobe-mode-active');
  }
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
  window.removeEventListener('keydown', handleWardrobeKeyDown);
  playSFX('hop');

  // Svelte owns drawer visibility. Restore the lobby view alongside it.
  if (landingScreen) {
    landingScreen.classList.remove('wardrobe-mode-active');
  }
  updateModalSlice('wardrobe', { isClosing: true });

  // 2. Revert any unequipped preview back to equipped loadout
  applyEquippedCosmeticsToPlayer();

  // Wait for the Svelte drawer transition before changing modal state.
  wardrobeCloseTimer = setTimeout(() => {
    if (!landingScreen?.classList.contains('wardrobe-mode-active')) {
      updateModalSlice('wardrobe', { visible: false, isClosing: false });
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
