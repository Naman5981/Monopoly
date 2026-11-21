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
  {#if banner.activeBanner === 'monopolyThreat'}
    <!-- 6. Monopoly Threat Alert Banner (z-[1400] centered above HUD) -->
    <div
      role="status"
      aria-live="polite"
      style="left: 0; right: 0; width: 100%; top: 3.75rem; z-index: 1400;"
      class="fixed top-14 sm:top-16 left-0 right-0 w-full pointer-events-none z-[1400] flex justify-center select-none px-4"
      transition:fade={{ duration: 180 }}
    >
      <div
        id="monopoly-threat-banner"
        style="display: flex;"
        class="relative px-5 sm:px-6 py-2.5 rounded-2xl bg-slate-950/95 backdrop-blur-md border-2 border-amber-400 text-white shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_24px_rgba(245,158,11,0.35)] flex items-center gap-3.5 will-change-transform max-w-lg"
        use:threatBannerEntrance
        transition:fly={{ y: -30, duration: 450, easing: cubicOut }}
      >
        <div class="threat-stagger-item flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-400 text-lg flex-shrink-0">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        </div>
        <div class="threat-stagger-item flex flex-col justify-center min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-display font-black text-sm sm:text-base text-amber-400 tracking-wider uppercase leading-none">
              MONOPOLY THREAT
            </span>
            <span class="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-black uppercase tracking-wider">
              2× RENT
            </span>
          </div>
          <div class="mt-0.5 text-xs text-slate-200 font-semibold tracking-wide truncate">
            <strong class="text-white font-black" style="color: {banner.data.playerColor || '#facc15'}">{banner.data.playerName || 'Player'}</strong>
            needs
            <strong class="text-amber-300 font-black">{banner.data.missingCityName || 'City'}</strong>
            to complete the <strong class="text-white font-extrabold uppercase">{banner.data.groupName || 'Color Set'}</strong>!
          </div>
        </div>
      </div>
    </div>
  {:else}
    <!-- Center overlay for game-pausing celebratory banners (eliminated, takeover, doubles, monopoly ribbon, flight pass) -->
    <div role="status" aria-live="polite" class="fixed inset-0 pointer-events-none z-[1200] flex flex-col items-center justify-center select-none" transition:fade={{ duration: 180 }}>
      
      <!-- 1. Player Eliminated Banner -->
      {#if banner.activeBanner === 'eliminated'}
        <div
          id="player-eliminated-banner"
          style="display: flex;"
          class="relative px-8 sm:px-10 py-4 sm:py-5 rounded-3xl bg-gradient-to-r from-red-950 via-rose-900 to-slate-950 border-4 border-rose-500 shadow-[0_20px_60px_rgba(225,29,72,0.85)] flex flex-col items-center transform -translate-y-12"
          transition:scale={{ duration: 450, start: 0.3, easing: backOut }}
        >
          <div class="flex items-center gap-3">
            <i class="fa-solid fa-skull-crossbones text-3xl sm:text-4xl text-rose-300 filter drop-shadow" aria-hidden="true"></i>
            <span class="font-display font-black text-2xl sm:text-4xl text-rose-100 tracking-widest uppercase drop-shadow-[0_4px_16px_rgba(225,29,72,0.95)]">
              PLAYER ELIMINATED!
            </span>
            <i class="fa-solid fa-skull-crossbones text-3xl sm:text-4xl text-rose-300 filter drop-shadow" aria-hidden="true"></i>
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
            <i class="fa-solid fa-handshake-slash text-2xl sm:text-3xl text-white" aria-hidden="true"></i>
            <span class="font-display font-black text-2xl sm:text-3xl text-white tracking-widest uppercase drop-shadow">
              HOSTILE TAKEOVER!
            </span>
            <i class="fa-solid fa-handshake-slash text-2xl sm:text-3xl text-white" aria-hidden="true"></i>
          </div>
          <div class="mt-1 px-4 py-0.5 rounded-full bg-black/30 border border-white/20 text-rose-100 font-extrabold text-xs uppercase tracking-wider text-center">
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
            <i class="fa-solid fa-dice text-3xl sm:text-4xl text-slate-950 filter drop-shadow" aria-hidden="true"></i>
            <span class="font-display font-black text-3xl sm:text-4xl text-slate-950 tracking-wider drop-shadow-sm uppercase">DOUBLES!</span>
            <i class="fa-solid fa-dice text-3xl sm:text-4xl text-slate-950 filter drop-shadow" aria-hidden="true"></i>
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
          <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner border border-white/30 shrink-0">
            <i class="fa-solid fa-plane-departure text-white" aria-hidden="true"></i>
          </div>
          <div class="flex flex-col">
            <span class="text-xs uppercase font-black tracking-widest text-sky-200">WORLD TYCOON AIRWAYS</span>
            <span class="font-display font-black text-xl text-white tracking-wide">
              {banner.data.destinationName || 'DESTINATION'}
            </span>
            <span class="text-xs font-semibold text-sky-100">Direct Express Flight</span>
          </div>
        </div>

      <!-- 5. Rent Settlement Pill (Option 1A) -->
      {:else if banner.activeBanner === 'rentTransfer'}
        <div
          id="rent-transfer-banner"
          class="relative rounded-full px-6 py-2.5 flex items-center gap-4 text-white transform -translate-y-12 select-none"
          transition:scale={{ duration: 380, start: 0.6, easing: backOut }}
        >
          <!-- City Group Tag -->
          <div class="rent-city-tag flex items-center gap-2 border-r border-white/20 pr-4">
            <span class="rent-group-dot w-3 h-3 rounded-full shrink-0" style="background-color: {banner.data.groupColor || '#f59e0b'}; box-shadow: 0 0 8px {banner.data.groupColor || '#f59e0b'};"></span>
            <span class="rent-city-name font-black text-xs uppercase tracking-wider text-white">{banner.data.cityName || 'CITY'}</span>
          </div>

          <!-- Rent Value -->
          <div class="rent-amount-group flex items-center gap-2 font-black tracking-tight">
            <span class="rent-label-badge text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded">RENT</span>
            <span class="rent-value-amount text-xl font-black tabular-nums text-white">{banner.data.amountFormatted || ('$' + (banner.data.amount || 0))}</span>
          </div>

          <!-- Player Transfer Flow -->
          <div class="rent-transfer-flow flex items-center gap-2 border-l border-white/20 pl-4 text-xs font-black">
            <span class="rent-player-from flex items-center gap-1.5 font-extrabold">
              <span class="w-2.5 h-2.5 rounded-full inline-block border border-black/20 shrink-0" style="background-color: {banner.data.fromColor || '#f43f5e'};"></span>
              {banner.data.fromName}
            </span>
            <span class="rent-arrow text-sm font-black">➔</span>
            <span class="rent-player-to flex items-center gap-1.5 font-extrabold">
              <span class="w-2.5 h-2.5 rounded-full inline-block border border-black/20 shrink-0" style="background-color: {banner.data.toColor || '#10b981'};"></span>
              {banner.data.toName}
            </span>
          </div>
        </div>

      <!-- 6. Go Salary Burst Banner -->
      {:else if banner.activeBanner === 'salary'}
        <div
          id="go-salary-burst-banner"
          style="display: flex;"
          class="relative px-6 py-2.5 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-700 border-3 border-white text-white font-display font-black text-xl sm:text-2xl tracking-wider uppercase shadow-[0_12px_40px_rgba(16,185,129,0.6)] flex items-center gap-2 transform -translate-y-16 select-none"
          transition:scale={{ duration: 420, start: 0.3, easing: backOut }}
        >
          <span>💰</span>
          <span>{banner.data.amountLabel || '$200K'} SALARY!</span>
          <span>🚩</span>
        </div>

      <!-- 7. World Festival 2x Rent Boost (Option B: Grand Hero Card) -->
      {:else if banner.activeBanner === 'festival'}
        <div
          id="festival-hero-banner"
          class="relative px-8 py-5 rounded-3xl flex flex-col items-center select-none transform -translate-y-12"
          transition:scale={{ duration: 450, start: 0.3, easing: backOut }}
        >
          <!-- Top Carnival Ribbon Badge -->
          <div class="festival-ribbon flex items-center gap-1.5 px-4 py-1 rounded-full font-black text-xs uppercase tracking-widest shadow-md">
            <span>🎪</span>
            <span>WORLD FESTIVAL HOST</span>
            <span>🎪</span>
          </div>

          <!-- Headline -->
          <div class="festival-headline mt-1.5 font-display font-black text-2xl sm:text-3xl text-white tracking-wide uppercase drop-shadow">
            {banner.data.cityName || 'CITY'} RENT DOUBLED!
          </div>

          <!-- Hero Details Capsule -->
          <div class="festival-details-capsule mt-2.5 px-5 py-2 rounded-2xl flex items-center gap-4">
            <!-- City Chip -->
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full shrink-0" style="background-color: {banner.data.groupColor || '#f59e0b'}; box-shadow: 0 0 8px {banner.data.groupColor || '#f59e0b'};"></span>
              <span class="font-black text-sm uppercase text-white tracking-wider">{banner.data.cityName || 'CITY'}</span>
            </div>

            <!-- Big 2x Rent Hero -->
            <div class="festival-rent-val text-xl sm:text-2xl font-black text-emerald-400 tabular-nums">
              {banner.data.rentFormatted || ('$' + (banner.data.amount || 0))}
            </div>

            <!-- Player Attribution -->
            <div class="text-xs font-bold text-slate-300">
              Selected by <strong class="text-amber-300 font-black">{banner.data.playerName || 'Player'}</strong>
            </div>
          </div>

          <!-- Subtext for previous host tile if moved -->
          {#if banner.data.prevCityName}
            <div class="mt-1.5 text-[11px] font-bold text-amber-200/80 tracking-wide">
              ({banner.data.prevCityName} rent restored to normal)
            </div>
          {/if}
        </div>

      <!-- 8. Live In-Game Achievement Star Bounty -->
      {:else if banner.activeBanner === 'starBounty'}
        <div
          id="star-bounty-banner"
          class="relative px-6 py-3.5 rounded-2xl bg-white/95 backdrop-blur-md text-slate-900 shadow-[0_12px_40px_rgba(245,158,11,0.35),0_4px_16px_rgba(0,0,0,0.15)] border-2 border-amber-400 flex items-center gap-3.5 select-none transform -translate-y-12"
          transition:scale={{ duration: 400, start: 0.35, easing: backOut }}
        >
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center text-lg shadow-sm font-black flex-shrink-0">
            ⭐
          </div>
          <div class="flex flex-col text-left min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-black uppercase tracking-wider text-amber-600">{banner.data.title || 'ACHIEVEMENT!'}</span>
              <span class="px-2 py-0.5 rounded-full bg-slate-950 text-amber-300 text-[10px] font-black tabular-nums shadow-xs">+{banner.data.stars || 40} ⭐</span>
            </div>
            <div class="text-xs sm:text-sm font-black text-slate-900 tracking-wide truncate">
              {banner.data.desc || 'Milestone Reached!'}
            </div>
          </div>
        </div>
      {/if}

    </div>
  {/if}
{/if}
