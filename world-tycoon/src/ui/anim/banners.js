/**
 * ui/anim/banners.js
 * In-game banner overlays: doubles pop, boarding pass zoom, monopoly ribbon, and hostile buyout stamp.
 */

import { isReducedMotion } from './common.js';

/**
 * Comic-book pop banner when rolling doubles.
 * @param {string} playerName - Player who rolled doubles
 */
export function animateDoublesBurstBanner(playerName = '') {
  if (typeof anime === 'undefined' || isReducedMotion()) return;

  let banner = document.getElementById('doubles-comic-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'doubles-comic-banner';
    banner.className = 'fixed top-[26%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none flex flex-col items-center select-none';
    document.body.appendChild(banner);
  }

  banner.innerHTML = `
    <div class="doubles-comic-badge relative px-8 py-3.5 rounded-3xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 border-4 border-white shadow-[0_14px_40px_rgba(245,158,11,0.6)] flex flex-col items-center transform">
      <div class="flex items-center gap-2.5">
        <span class="text-3xl filter drop-shadow">🎲</span>
        <span class="font-display font-black text-3xl sm:text-4xl text-slate-950 tracking-wider drop-shadow-sm uppercase">DOUBLES!</span>
        <span class="text-3xl filter drop-shadow">🎲</span>
      </div>
      <div class="mt-1 px-3.5 py-0.5 rounded-full bg-slate-950 text-amber-300 font-black text-xs uppercase tracking-widest shadow-inner">
        ROLL AGAIN BONUS!
      </div>
    </div>
  `;

  banner.style.display = 'flex';
  banner.style.opacity = '1';

  anime.remove(banner);
  const badge = banner.querySelector('.doubles-comic-badge');
  anime({
    targets: badge,
    scale: [0.2, 1.2, 1],
    rotate: [-12, 3, 0],
    duration: 620,
    easing: 'spring(1, 80, 10, 0)'
  });

  setTimeout(() => {
    anime({
      targets: banner,
      opacity: [1, 0],
      translateY: [0, -28],
      duration: 350,
      easing: 'easeInQuad',
      complete: () => {
        banner.style.display = 'none';
      }
    });
  }, 1400);
}

/**
 * World Tour Flight Boarding Pass Zoom & Perforation Stamp
 * @param {string} destinationName
 */
export function animateBoardingPassZoom(destinationName = 'AIRPORT') {
  if (typeof anime === 'undefined' || isReducedMotion()) return;

  let pass = document.getElementById('world-tour-boarding-pass');
  if (!pass) {
    pass = document.createElement('div');
    pass.id = 'world-tour-boarding-pass';
    pass.className = 'fixed top-[22%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[65] pointer-events-none flex flex-col items-center select-none';
    document.body.appendChild(pass);
  }

  pass.innerHTML = `
    <div class="boarding-pass-card relative bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 text-white rounded-3xl p-5 shadow-[0_16px_48px_rgba(2,132,199,0.55)] border-2 border-white/60 flex items-center gap-5 min-w-[320px] max-w-sm">
      <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner border border-white/30">
        ✈️
      </div>
      <div>
        <div class="text-[10px] font-black tracking-widest text-sky-200 uppercase">WORLD TYCOON AIRWAYS</div>
        <div class="font-display font-black text-xl text-white tracking-wide">VIP FIRST CLASS</div>
        <div class="text-xs font-bold text-sky-100 flex items-center gap-1.5 mt-0.5">
          <span>DESTINATION:</span>
          <span class="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[11px] uppercase">${destinationName}</span>
        </div>
      </div>
    </div>
  `;

  pass.style.display = 'flex';
  pass.style.opacity = '1';

  const card = pass.querySelector('.boarding-pass-card');
  anime.remove(card);
  anime({
    targets: card,
    translateY: [60, 0],
    scale: [0.4, 1.05, 1],
    rotate: [-8, 0],
    duration: 650,
    easing: 'spring(1, 80, 10, 0)'
  });

  setTimeout(() => {
    anime({
      targets: pass,
      opacity: [1, 0],
      scale: [1, 1.1],
      translateY: [0, -40],
      duration: 350,
      easing: 'easeInQuad',
      complete: () => {
        pass.style.display = 'none';
      }
    });
  }, 1600);
}

/**
 * Monopoly Ribbon SVG Unfurl Across Screen
 * @param {string} groupName - e.g. 'United States'
 * @param {string} colorHex - Group color hex
 */
export function animateMonopolyRibbonUnfurl(groupName = 'COLOR GROUP', colorHex = '#eab308') {
  if (typeof anime === 'undefined' || isReducedMotion()) return;

  let ribbon = document.getElementById('monopoly-anime-ribbon');
  if (!ribbon) {
    ribbon = document.createElement('div');
    ribbon.id = 'monopoly-anime-ribbon';
    ribbon.className = 'fixed top-[32%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[65] pointer-events-none flex flex-col items-center select-none';
    document.body.appendChild(ribbon);
  }

  ribbon.innerHTML = `
    <div class="monopoly-ribbon-shell px-10 py-4 rounded-3xl text-white font-display font-black text-2xl sm:text-3xl tracking-widest uppercase shadow-[0_16px_48px_rgba(0,0,0,0.5)] border-4 border-white flex items-center gap-3 transform" style="background: ${colorHex};">
      <span>👑</span>
      <span>${groupName} MONOPOLY!</span>
      <span>👑</span>
    </div>
  `;

  ribbon.style.display = 'flex';
  ribbon.style.opacity = '1';

  const shell = ribbon.querySelector('.monopoly-ribbon-shell');
  anime.remove(shell);
  anime({
    targets: shell,
    scaleX: [0.1, 1],
    scaleY: [0.2, 1],
    rotate: [-8, 0],
    duration: 600,
    easing: 'spring(1, 80, 10, 0)'
  });

  setTimeout(() => {
    anime({
      targets: ribbon,
      opacity: [1, 0],
      scale: [1, 1.1],
      duration: 350,
      easing: 'easeInQuad',
      complete: () => {
        ribbon.style.display = 'none';
      }
    });
  }, 1800);
}

/**
 * Hostile Buyout Stamp Slam & Card Earthquake
 * @param {string} cityName - Name of bought out property
 */
export function animateBuyoutHostileStamp(cityName = 'PROPERTY') {
  if (typeof anime === 'undefined' || isReducedMotion()) return;

  let stamp = document.getElementById('buyout-hostile-stamp');
  if (!stamp) {
    stamp = document.createElement('div');
    stamp.id = 'buyout-hostile-stamp';
    stamp.className = 'fixed top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[75] pointer-events-none flex flex-col items-center select-none';
    document.body.appendChild(stamp);
  }

  stamp.innerHTML = `
    <div class="buyout-stamp-badge relative px-8 py-3.5 rounded-3xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 border-4 border-white shadow-[0_16px_50px_rgba(225,29,72,0.7)] flex flex-col items-center transform -rotate-6">
      <div class="flex items-center gap-2">
        <span class="text-3xl">⚔️</span>
        <span class="font-display font-black text-2xl sm:text-3xl text-white tracking-widest uppercase drop-shadow">HOSTILE TAKEOVER!</span>
        <span class="text-3xl">⚔️</span>
      </div>
      <div class="mt-0.5 px-3 py-0.5 rounded-full bg-white/20 text-rose-100 font-extrabold text-[11px] uppercase tracking-wider">
        ${cityName} ACQUIRED
      </div>
    </div>
  `;

  stamp.style.display = 'flex';
  stamp.style.opacity = '1';

  const badge = stamp.querySelector('.buyout-stamp-badge');
  anime.remove(badge);
  anime({
    targets: badge,
    scale: [2.5, 0.95, 1],
    rotate: [-18, -6],
    duration: 520,
    easing: 'spring(1, 95, 8, 0)'
  });

  const card = document.getElementById('modal-buyout-city-card');
  if (card) {
    anime({
      targets: card,
      translateX: [-10, 10, -6, 6, 0],
      duration: 400,
      easing: 'easeInOutQuad'
    });
  }

  setTimeout(() => {
    anime({
      targets: stamp,
      opacity: [1, 0],
      scale: [1, 1.15],
      duration: 320,
      easing: 'easeInQuad',
      complete: () => {
        stamp.style.display = 'none';
      }
    });
  }, 1400);
}
