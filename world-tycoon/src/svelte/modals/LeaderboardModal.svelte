<script>
  import { modalStore } from '../stores/modalStore.js';
  import NetWorthChart from '../components/NetWorthChart.svelte';

  let state = $state({});
  let spotlightIdx = $state(null);

  modalStore.subscribe(val => {
    state = val.leaderboard || {};
    if (!state.visible) spotlightIdx = null;
  });

  function onClose() {
    if (typeof window !== 'undefined' && typeof window.closeLeaderboardModal === 'function') {
      window.closeLeaderboardModal();
    }
  }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget || e.target.id === 'leaderboard-backdrop') {
      onClose();
    }
  }

  function handleWindowKeydown(e) {
    if (!state.visible) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<!-- Leaderboard Speech-Bubble Popover (Unobstructed 3D Board, Attached to TopBar Trophy Pill) -->
<div
  id="modal-leaderboard"
  class="fixed inset-0 z-50 flex flex-col items-center justify-start pt-[54px] sm:pt-[58px] px-2.5 sm:px-4 pointer-events-none select-none overscroll-contain {state.visible ? 'pointer-events-auto' : 'hidden pointer-events-none'}"
  style="background: transparent !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important;"
>
  <!-- Transparent click-outside dismisser (board stays visible, clicking anywhere outside closes popover) -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    id="leaderboard-backdrop"
    onclick={onBackdropClick}
    class="absolute inset-0 bg-transparent pointer-events-auto cursor-default"
    aria-hidden="true"
  ></div>

  <!-- Comic / Arcade Speech Bubble Window with Spring Pop-In Animation -->
  <div
    id="modal-leaderboard-card"
    class="speech-bubble-pop-in relative z-10 w-full max-w-[390px] sm:max-w-[420px] max-h-[calc(100vh-74px)] bg-slate-950 border-2 border-amber-400/90 rounded-3xl text-white shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(245,158,11,0.25)] flex flex-col overflow-hidden font-ui pointer-events-auto"
  >
    <!-- Pointer Beak pointing up to TopBar Trophy Pill in HUD Center Capsule (Image 2 style) -->
    <svg class="absolute -top-[11px] left-[65%] -translate-x-1/2 w-7 h-3 z-30 pointer-events-none overflow-visible drop-shadow-[0_-2px_4px_rgba(245,158,11,0.25)]" viewBox="0 0 28 12" fill="none" aria-hidden="true">
      <polygon points="4,12 14,1 24,12" fill="#020617" />
      <polyline points="3,12 14,1 25,12" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>

    <!-- Header with Atmospheric Amber Gradient -->
    <div class="relative px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-amber-950/70 via-slate-950 to-slate-950 border-b border-amber-400/30 flex items-center justify-between shadow-xs shrink-0">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center text-sm shadow-md shrink-0">
          <i class="fa-solid fa-trophy"></i>
        </div>
        <div>
          <div class="flex items-center gap-1.5 leading-none">
            <span class="font-display font-black text-sm sm:text-base tracking-wide text-white uppercase">Empire Standings</span>
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[9px] font-mono font-black text-emerald-300">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> LIVE
            </span>
          </div>
          <p class="text-[10px] font-bold text-amber-200/80 mt-1 flex items-center gap-1.5">
            <span>Real-time rankings</span>
            <span class="text-white/30">•</span>
            <span id="leaderboard-match-timer" class="text-white font-mono">{state.matchTimerText || '15m match'}</span>
          </p>
        </div>
      </div>

      <button
        onclick={onClose}
        class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition border border-white/10 shadow-xs"
        title="Close [Esc]"
        aria-label="Close Leaderboard"
      >
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    </div>

    <!-- Summary / Proximity Banner -->
    {#if state.summaryText}
      <div id="leaderboard-summary-banner" class="bg-amber-500/10 border-b border-amber-400/20 px-4 py-1.5 flex items-center gap-2 text-[11px] font-bold text-amber-300 shrink-0">
        <i class="fa-solid fa-crown text-amber-400 text-xs"></i>
        <span class="truncate">{state.summaryText}</span>
      </div>
    {/if}

    <!-- Scrollable Standings Body -->
    <div class="p-3 sm:p-3.5 overflow-y-auto space-y-2 flex-1 bg-slate-950/80">
      <div id="leaderboard-players-list" class="space-y-1.5">
        {#if state.standings && state.standings.length > 0}
          {#each state.standings as s}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              onmouseenter={() => { spotlightIdx = s.playerIdx; }}
              onmouseleave={() => { spotlightIdx = null; }}
              class="p-2 sm:p-2.5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-xs flex items-center justify-between gap-2 transition-all cursor-pointer hover:border-amber-400/60 hover:bg-slate-900 {spotlightIdx !== null && spotlightIdx !== s.playerIdx ? 'opacity-40' : 'opacity-100'}"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-6 h-6 rounded-lg font-mono font-black flex items-center justify-center text-[11px] shadow-inner shrink-0 {s.rank === 1 ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 border border-amber-200' : s.rank === 2 ? 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-950 border border-white' : s.rank === 3 ? 'bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 text-amber-100 border border-amber-600/50' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
                  #{s.rank}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style="background:{s.colorHex}"></span>
                    <span class="font-display font-black text-xs sm:text-sm text-white truncate">{s.name}</span>
                    {#if s.isLocal}
                      <span class="text-[9px] font-mono font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">YOU</span>
                    {/if}
                    {#if s.isAI}
                      <span class="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-white/10 text-slate-400 border border-white/10">BOT</span>
                    {/if}
                  </div>
                  <div class="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                    <span class="flex items-center gap-1"><i class="fa-solid fa-money-bill-wave text-emerald-400 text-[10px]" aria-hidden="true"></i> <strong class="text-emerald-400">{s.cashFormatted}</strong></span>
                    <span>•</span>
                    <span class="flex items-center gap-1"><i class="fa-solid fa-city text-sky-400 text-[10px]" aria-hidden="true"></i> <strong class="text-slate-200">{s.citiesCount}</strong></span>
                    {#if s.setsCount > 0}
                      <span>•</span>
                      <span class="flex items-center gap-1"><i class="fa-solid fa-crown text-amber-400 text-[10px]" aria-hidden="true"></i> <strong class="text-amber-300">{s.setsCount}</strong></span>
                    {/if}
                  </div>
                </div>
              </div>

              <div class="text-right shrink-0">
                <div class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Net Worth</div>
                <div class="font-mono font-black text-sm sm:text-base text-amber-300 drop-shadow-xs">{s.netWorthFormatted}</div>
                {#if s.velocity}
                  <div class="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1 rounded border mt-0.5 {s.velocity.trend === 'up' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : s.velocity.trend === 'down' ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' : 'text-slate-400 bg-slate-800 border-slate-700'}">
                    {#if s.velocity.trend === 'up'}
                      <i class="fa-solid fa-arrow-trend-up text-[8px]" aria-hidden="true"></i>
                    {:else if s.velocity.trend === 'down'}
                      <i class="fa-solid fa-arrow-trend-down text-[8px]" aria-hidden="true"></i>
                    {:else}
                      <i class="fa-solid fa-minus text-[8px]" aria-hidden="true"></i>
                    {/if}
                    <span>{s.velocity.formattedDelta}</span>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Live Timeline Chart Container -->
      <div class="mt-2.5 pt-2 border-t border-white/10">
        <div class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
          <span class="flex items-center gap-1 text-amber-300/90"><i class="fa-solid fa-chart-line text-amber-400"></i> Trajectory</span>
          <span class="text-[9px] text-slate-500 font-normal">Hover / drag to inspect turns</span>
        </div>
        <div id="leaderboard-timeline-chart" class="w-full bg-slate-900/90 rounded-xl border border-white/10 p-2 overflow-hidden flex items-center justify-center">
          <NetWorthChart chart={state.historyChart} {spotlightIdx} />
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="bg-slate-900 border-t border-white/10 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
      <div class="flex items-center gap-1 text-slate-400 truncate mr-2">
        <i class="fa-solid fa-circle-info text-sky-400 shrink-0"></i>
        <span class="truncate">Net Worth = Cash + Deeds + Upgrades</span>
      </div>
      <button
        onclick={onClose}
        class="px-3.5 py-1 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 active:scale-95 text-slate-950 font-black text-xs shadow-xs transition-all cursor-pointer"
      >
        Close
      </button>
    </div>
  </div>
</div>
