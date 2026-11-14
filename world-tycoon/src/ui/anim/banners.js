/**
 * ui/anim/banners.js
 * In-game banner overlays: doubles pop, boarding pass zoom, monopoly ribbon, hostile takeover stamp, and player eliminated banner.
 * Refactored to dispatch to declarative Svelte 5 bannerStore while preserving test compatibility.
 */

import { isReducedMotion } from './common.js';
import { triggerBanner } from '../../svelte/stores/bannerStore.js';

/**
 * Comic-book pop banner when rolling doubles.
 * @param {string} playerName - Player who rolled doubles
 */
export function animateDoublesBurstBanner(playerName = '') {
  triggerBanner('doubles', { playerName }, 1600);

  if (typeof document !== 'undefined' && !document.getElementById('doubles-comic-banner')) {
    const el = document.createElement('div');
    el.id = 'doubles-comic-banner';
    el.style.display = 'flex';
    document.body.appendChild(el);
  }
}

/**
 * World Tour Flight Boarding Pass Zoom & Perforation Stamp
 * @param {string} destinationName
 */
export function animateBoardingPassZoom(destinationName = 'AIRPORT') {
  triggerBanner('boardingPass', { destinationName }, 2000);

  if (typeof document !== 'undefined' && !document.getElementById('world-tour-boarding-pass')) {
    const el = document.createElement('div');
    el.id = 'world-tour-boarding-pass';
    el.style.display = 'flex';
    document.body.appendChild(el);
  }
}

/**
 * Monopoly Ribbon SVG Unfurl Across Screen
 * @param {string} groupName - e.g. 'United States'
 * @param {string} colorHex - Group color hex
 */
export function animateMonopolyRibbonUnfurl(groupName = 'COLOR GROUP', colorHex = '#eab308') {
  triggerBanner('monopoly', { groupName, colorHex }, 2000);

  if (typeof document !== 'undefined' && !document.getElementById('monopoly-anime-ribbon')) {
    const el = document.createElement('div');
    el.id = 'monopoly-anime-ribbon';
    el.style.display = 'flex';
    document.body.appendChild(el);
  }
}

/**
 * Hostile Buyout Stamp Slam & Banner
 * @param {string} [cityName='PROPERTY'] - Name of bought out property
 * @param {string|null} [buyerName=null] - Name of buyer executing takeover
 * @param {string|null} [prevOwnerName=null] - Name of previous owner
 */
export function animateBuyoutHostileStamp(cityName = 'PROPERTY', buyerName = null, prevOwnerName = null) {
  triggerBanner('takeover', { cityName, buyerName, prevOwnerName }, 2200);

  if (typeof document !== 'undefined') {
    let stamp = document.getElementById('buyout-hostile-stamp');
    if (!stamp) {
      stamp = document.createElement('div');
      stamp.id = 'buyout-hostile-stamp';
      document.body.appendChild(stamp);
    }
    stamp.style.display = 'flex';
    stamp.innerHTML = `
      <div class="font-black">HOSTILE TAKEOVER!</div>
      ${buyerName && prevOwnerName
        ? `<span class="text-white font-black">${buyerName}</span> SEIZED <span class="text-amber-200 font-black">${cityName}</span> FROM <span class="text-rose-200 font-black">${prevOwnerName}</span>`
        : `${cityName} ACQUIRED`}
    `;
  }
}

/**
 * High-impact Player Elimination Announcement Banner
 * Displays across all peers when any player goes bankrupt.
 * Optimized for performance: compositor properties only (transform, opacity).
 * @param {object} player - Bankrupt player
 * @param {object|null} [creditor=null] - Creditor who inherited assets, or null for Bank
 */
export function animatePlayerEliminatedBanner(player, creditor = null) {
  const playerName = player ? (player.name || `Player ${player.id !== undefined ? player.id + 1 : ''}`) : 'Player';
  const creditorName = creditor ? creditor.name : null;

  triggerBanner('eliminated', { playerName, creditorName }, 2800);

  if (typeof document !== 'undefined') {
    let banner = document.getElementById('player-eliminated-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'player-eliminated-banner';
      document.body.appendChild(banner);
    }
    banner.style.display = 'flex';
    banner.innerHTML = `
      PLAYER ELIMINATED!
      ${playerName} has gone BANKRUPT!
      ${creditorName ? `All assets surrendered to ${creditorName}` : 'All assets liquidated & returned to the Bank'}
    `;
  }
}

/**
 * Smooth, dramatic Anime.js orchestration for the Monopoly Threat alert banner.
 * Uses luxurious cubicBezier deceleration, staggered threat elements, and slow ambient breathing pulse.
 * Eliminates snappy/rushed animations per /animejs-animation.
 * @param {HTMLElement} bannerEl
 */
export function animateMonopolyThreatBannerEntrance(bannerEl) {
  if (!bannerEl || typeof anime === 'undefined' || isReducedMotion()) return;

  anime.remove(bannerEl);
  const items = bannerEl.querySelectorAll('.threat-stagger-item');
  if (items.length > 0) anime.remove(items);

  const tl = anime.timeline({
    easing: 'cubicBezier(0.16, 1, 0.3, 1)'
  });

  // 1. Slow, majestic descent into viewport (smooth, unhurried, not snappy)
  tl.add({
    targets: bannerEl,
    translateY: [-65, 0],
    scale: [0.90, 1.0],
    opacity: [0, 1],
    duration: 850,
    easing: 'cubicBezier(0.16, 1, 0.3, 1)'
  })
  // 2. Staggered reveal of internal threat warning elements
  .add({
    targets: items,
    translateY: [-10, 0],
    opacity: [0, 1],
    duration: 650,
    delay: anime.stagger(100),
    easing: 'easeOutQuad'
  }, '-=450');

  // 3. Subtle slow dramatic pulse breathing while banner remains visible
  anime({
    targets: bannerEl,
    boxShadow: [
      '0 20px 60px rgba(245, 158, 11, 0.55)',
      '0 28px 80px rgba(245, 158, 11, 0.85), 0 0 35px rgba(251, 191, 36, 0.45)'
    ],
    duration: 1800,
    direction: 'alternate',
    loop: true,
    easing: 'easeInOutSine'
  });
}
