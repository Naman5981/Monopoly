/**
 * game/achievements.js
 * In-game live achievement milestones with real-time Tycoon Star bounties,
 * celebratory HUD banners, audio fanfares, and P2P multiplayer synchronization.
 *
 * Adheres strictly to Clean Code (Single Responsibility Principle) and Minimal Code standards.
 */

import { triggerBanner } from '../svelte/stores/bannerStore.js';
import { playSFX } from './audio.js';
import { awardLiveAchievementStars } from '../ui/wardrobe.js';
import { broadcastAction } from '../network/p2pActions.js';
import { networkState } from '../network/p2p.js';

// Cache of feats completed in the current match to prevent duplicate payouts
const completedFeats = new Set();

/**
 * Resets match achievement tracking on game start or restart.
 */
export function resetMatchAchievements() {
  completedFeats.clear();
}

/**
 * Triggers a live achievement star bounty, updates profile wallet,
 * fires audio/banner celebrations, and syncs across multiplayer peers.
 *
 * @param {number} stars - Amount of Tycoon Stars awarded
 * @param {string} featKey - Unique identifier for the feat (e.g. 'monopoly_red')
 * @param {string} title - Short uppercase headline (e.g. 'MONOPOLY BUILT!')
 * @param {string} desc - Description text (e.g. 'Completed Red color set!')
 * @param {number} playerIdx - Index of the player earning the achievement
 */
export function triggerStarBounty(stars, featKey, title, desc, playerIdx = 0) {
  if (completedFeats.has(featKey)) return;
  completedFeats.add(featKey);

  // 1. Award stars to profile wallet and match tally
  awardLiveAchievementStars(stars, featKey, title, desc, playerIdx);

  // 2. Broadcast in multiplayer so all peers see the feat banner/toast
  if (networkState?.isMultiplayer) {
    broadcastAction('ACTION_STAR_BOUNTY', {
      stars,
      featKey,
      title,
      desc,
      playerIdx
    });
  }
}

/**
 * Checks and awards star bounty when a player completes a color monopoly set (+40 ⭐).
 * @param {number} playerIdx
 * @param {string} groupKey - e.g. 'orange', 'red', 'darkBlue'
 * @param {string} groupName - e.g. 'Orange', 'Red', 'Mayfair'
 */
export function checkMonopolyBuilt(playerIdx, groupKey, groupName) {
  const featKey = `mono_${playerIdx}_${groupKey}`;
  triggerStarBounty(
    40,
    featKey,
    'MONOPOLY COMPLETED!',
    `Built full ${groupName} color set!`,
    playerIdx
  );
}

/**
 * Checks and awards star bounty when a player builds a Level 4 Skyscraper Landmark (+30 ⭐).
 * @param {number} playerIdx
 * @param {string} cityName
 */
export function checkSkyscraperBuilt(playerIdx, cityName) {
  const featKey = `sky_${playerIdx}_${cityName}`;
  triggerStarBounty(
    30,
    featKey,
    'SKYSCRAPER BUILT!',
    `Erected luxury landmark on ${cityName}!`,
    playerIdx
  );
}

/**
 * Checks and awards star bounty when a player completes a hostile buyout (+35 ⭐).
 * @param {number} playerIdx
 * @param {string} cityName
 */
export function checkHostileBuyout(playerIdx, cityName) {
  const featKey = `buyout_${playerIdx}_${cityName}_${Date.now()}`;
  triggerStarBounty(
    35,
    featKey,
    'HOSTILE TAKEOVER!',
    `Executed hostile buyout of ${cityName}!`,
    playerIdx
  );
}

/**
 * Checks and awards star bounty when collecting >= $150k in rent (+25 ⭐).
 * @param {number} playerIdx
 * @param {number} rentAmount
 * @param {string} cityName
 */
export function checkMegaRent(playerIdx, rentAmount, cityName) {
  if (rentAmount < 150000) return;
  const featKey = `rent_${playerIdx}_${cityName}_${Math.floor(rentAmount / 50000)}`;
  triggerStarBounty(
    25,
    featKey,
    'MEGA RENT COLLECTED!',
    `Collected $${Math.round(rentAmount / 1000)}k rent on ${cityName}!`,
    playerIdx
  );
}

/**
 * Checks and awards star bounty when activating a World Festival 2x rent boost (+25 ⭐).
 * @param {number} playerIdx
 * @param {string} cityName
 */
export function checkFestivalBoost(playerIdx, cityName) {
  const featKey = `fest_${playerIdx}_${cityName}_${Date.now()}`;
  triggerStarBounty(
    25,
    featKey,
    'FESTIVAL HOST!',
    `Doubled rent on ${cityName} to 2×!`,
    playerIdx
  );
}

/**
 * Checks and awards star bounty when bankrupting an opponent (+60 ⭐).
 * @param {number} creditorIdx
 * @param {string} debtorName
 */
export function checkOpponentBankrupted(creditorIdx, debtorName) {
  const featKey = `bankrupt_${creditorIdx}_${debtorName}`;
  triggerStarBounty(
    60,
    featKey,
    'TYCOON KNOCKOUT!',
    `Bankrupted ${debtorName}!`,
    creditorIdx
  );
}
