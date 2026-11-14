<script>
  /**
   * svelte/hud/GameBanners.svelte
   * Pure declarative Svelte banner overlays for in-game celebrations and alerts.
   * Completely eliminates imperative document.createElement DOM manipulation.
   */
  import { bannerStore } from '../stores/bannerStore.js';
  import { fly, scale, fade } from 'svelte/transition';
  import { backOut, cubicOut } from 'svelte/easing';
  import { animateMonopolyThreatBannerEntrance } from '../../ui/anim/banners.js';

  let banner = $state({ activeBanner: null, data: {} });
  bannerStore.subscribe(val => { banner = val; });

  function threatBannerEntrance(node) {
    animateMonopolyThreatBannerEntrance(node);
    return {
      destroy() {
        if (typeof anime !== 'undefined') anime.remove(node);
      }
    };
  }
</script>

{#if banner.activeBanner}
  <div class="fixed inset-0 pointer-events-none z-[1200] flex flex-col items-center justify-center select-none" transition:fade={{ duration: 180 }}>
    
    <!-- 1. Player Eliminated Banner -->
    {#if banner.activeBanner === 'eliminated'}
      <div
        id="player-eliminated-banner"
        style="display: flex;"
        class="relative px-8 sm:px-10 py-4 sm:py-5 rounded-3xl bg-gradient-to-r from-red-950 via-rose-900 to-slate-950 border-4 border-rose-500 shadow-[0_20px_60px_rgba(225,29,72,0.85)] flex flex-col items-center transform -translate-y-12"
        transition:scale={{ duration: 450, start: 0.3, easing: backOut }}
      >
        <div class="flex items-center gap-3">
          <span class="text-3xl sm:text-4xl filter drop-shadow">☠️</span>
          <span class="font-display font-black text-2xl sm:text-4xl text-rose-100 tracking-widest uppercase drop-shadow-[0_4px_16px_rgba(225,29,72,0.95)]">
            PLAYER ELIMINATED!
          </span>
          <span class="text-3xl sm:text-4xl filter drop-shadow">☠️</span>
        </div>
        <div class="mt-2 text-base sm:text-lg text-white font-bold tracking-wide text-center">
          <span class="text-amber-300 font-black">{banner.data.playerName || 'Player'}</span> has gone <span class="text-rose-400 font-black uppercase">BANKRUPT</span>!
        </div>
        <div class="mt-1.5 px-4 py-1 rounded-full bg-black/50 border border-white/20 text-xs sm:text-sm text-slate-200 tracking-wide text-center shadow-inner">
          {#if banner.data.creditorName}
            All assets surrendered to <span class="text-emerald-300 font-extrabold">{banner.data.creditorName}</span>
          {:else}
            All assets liquidated & returned to the <span class="text-sky-300 font-extrabold">Bank</span>
          {/if}
        </div>
      </div>

    <!-- 2. Hostile Takeover Banner -->
    {:else if banner.activeBanner === 'takeover'}
      <div
        id="buyout-hostile-stamp"
        style="display: flex;"
        class="relative px-8 py-3.5 rounded-3xl bg-gradient-to-r from-rose-600 to-rose-800 border-4 border-white shadow-[0_16px_50px_rgba(225,29,72,0.7)] flex flex-col items-center transform -rotate-3 -translate-y-12"
        transition:scale={{ duration: 420, start: 0.35, easing: backOut }}
      >
        <div class="flex items-center gap-2">
          <span class="text-3xl">⚔️</span>
          <span class="font-display font-black text-2xl sm:text-3xl text-white tracking-widest uppercase drop-shadow">
            HOSTILE TAKEOVER!
          </span>
          <span class="text-3xl">⚔️</span>
        </div>
        <div class="mt-1 px-4 py-0.5 rounded-full bg-black/30 border border-white/20 text-rose-100 font-extrabold text-[12px] uppercase tracking-wider text-center">
          {#if banner.data.buyerName && banner.data.prevOwnerName}
            <span class="text-white font-black">{banner.data.buyerName}</span> SEIZED <span class="text-amber-200 font-black">{banner.data.cityName}</span> FROM <span class="text-rose-200 font-black">{banner.data.prevOwnerName}</span>
          {:else}
            <span class="text-amber-200 font-black">{banner.data.cityName || 'PROPERTY'}</span> ACQUIRED
          {/if}
        </div>
      </div>

    <!-- 3. Doubles Comic Pop Banner -->
    {:else if banner.activeBanner === 'doubles'}
      <div
        id="doubles-comic-banner"
        style="display: flex;"
        class="relative px-8 py-3.5 rounded-3xl bg-gradient-to-r from-amber-400 to-amber-600 border-4 border-white shadow-[0_14px_40px_rgba(245,158,11,0.6)] flex flex-col items-center transform -translate-y-16"
        transition:scale={{ duration: 400, start: 0.3, easing: backOut }}
      >
        <div class="flex items-center gap-2.5">
          <span class="text-3xl filter drop-shadow">🎲</span>
          <span class="font-display font-black text-3xl sm:text-4xl text-slate-950 tracking-wider drop-shadow-sm uppercase">DOUBLES!</span>
          <span class="text-3xl filter drop-shadow">🎲</span>
        </div>
        <div class="mt-1 px-3.5 py-0.5 rounded-full bg-slate-950 text-amber-300 font-black text-xs uppercase tracking-widest shadow-inner">
          {banner.data.playerName ? `${banner.data.playerName.toUpperCase()} GETS A ` : ''}ROLL AGAIN BONUS!
        </div>
      </div>

    <!-- 4. World Tour Boarding Pass -->
    {:else if banner.activeBanner === 'boardingPass'}
      <div
        id="world-tour-boarding-pass"
        style="display: flex;"
        class="relative bg-gradient-to-r from-sky-600 to-indigo-700 text-white rounded-3xl p-5 shadow-[0_16px_48px_rgba(2,132,199,0.55)] border-2 border-white/60 flex items-center gap-5 min-w-[320px] max-w-sm -translate-y-16"
        transition:fly={{ duration: 450, y: -40, easing: backOut }}
      >
        <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner border border-white/30 shrink-0">
          ✈️
        </div>
        <div class="flex flex-col">
          <span class="text-[10px] uppercase font-black tracking-widest text-sky-200">WORLD TYCOON AIRWAYS</span>
          <span class="font-display font-black text-xl text-white tracking-wide">
            {banner.data.destinationName || 'DESTINATION'}
          </span>
          <span class="text-[11px] font-semibold text-sky-100">Direct Express Flight</span>
        </div>
      </div>

    <!-- 5. Monopoly Ribbon -->
    {:else if banner.activeBanner === 'monopoly'}
      <div
        id="monopoly-anime-ribbon"
        style="display: flex;"
        class="relative px-8 py-4 rounded-3xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 border-4 border-white shadow-[0_16px_50px_rgba(245,158,11,0.7)] flex flex-col items-center transform -translate-y-14"
        transition:scale={{ duration: 450, start: 0.35, easing: backOut }}
      >
        <div class="flex items-center gap-2">
          <span class="text-3xl">👑</span>
          <span class="font-display font-black text-2xl sm:text-3xl text-slate-950 tracking-wider uppercase">
            MONOPOLY COMPLETE!
          </span>
          <span class="text-3xl">👑</span>
        </div>
        <div class="mt-1 px-4 py-0.5 rounded-full bg-slate-950 text-amber-300 font-extrabold text-xs uppercase tracking-widest text-center shadow-inner">
          CONQUERED ALL {banner.data.groupName || ''} DISTRICTS!
        </div>
      </div>

    <!-- 6. Monopoly Threat Alert Banner (sleek, high-stakes, anti-ui-slop) -->
    {:else if banner.activeBanner === 'monopolyThreat'}
      <div
        id="monopoly-threat-banner"
        style="display: flex;"
        class="relative px-6 sm:px-8 py-3 rounded-2xl bg-slate-950/95 backdrop-blur-md border-2 border-amber-400 text-white shadow-[0_16px_50px_rgba(245,158,11,0.55),0_0_24px_rgba(245,158,11,0.25)] flex items-center gap-4 transform -translate-y-12 will-change-transform"
        use:threatBannerEntrance
        transition:fly={{ y: -40, duration: 650, easing: cubicOut }}
      >
        <div class="threat-stagger-item flex items-center justify-center w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/50 text-2xl flex-shrink-0">
          ⚠️
        </div>
        <div class="threat-stagger-item flex flex-col justify-center">
          <div class="flex items-center gap-2">
            <span class="font-display font-black text-lg sm:text-xl text-amber-400 tracking-wider uppercase leading-none">
              MONOPOLY THREAT
            </span>
            <span class="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase tracking-wider">
              2× RENT
            </span>
          </div>
          <div class="mt-1 text-xs sm:text-sm text-slate-200 font-semibold tracking-wide">
            <strong class="text-white font-black" style="color: {banner.data.playerColor || '#facc15'}">{banner.data.playerName || 'Player'}</strong>
            needs
            <strong class="text-amber-300 font-black">{banner.data.missingCityName || 'City'}</strong>
            for <strong class="text-white font-extrabold uppercase">{banner.data.groupName || 'Color'}</strong> set!
          </div>
        </div>
      </div>
    {/if}

  </div>
{/if}
