<script>
  import { modalStore } from '../stores/modalStore.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.leaderboard || {}; });

  function onClose() {
    if (typeof window !== 'undefined' && typeof window.closeLeaderboardModal === 'function') {
      window.closeLeaderboardModal();
    }
  }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  id="modal-leaderboard"
  onclick={onBackdropClick}
  class="fixed inset-0 z-50 items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-xl overscroll-contain select-none {state.visible ? 'flex' : 'hidden'}"
>
  <div
    class="relative w-full max-w-2xl max-h-[92vh] bg-slate-950/95 border border-amber-500/30 rounded-3xl p-0 text-white shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden font-ui transition-all duration-200"
    style="box-shadow: 0 25px 60px -15px rgba(0,0,0,0.9), 0 0 35px rgba(245,158,11,0.18);"
  >
    <!-- Header with Atmospheric Amber Gradient -->
    <div
      class="relative px-5 py-4 text-white flex items-center justify-between shadow-md overflow-hidden"
      style="background: radial-gradient(circle at 50% 20%, rgba(245,158,11,0.38) 0%, rgba(2,6,23,0.95) 85%); border-bottom: 1px solid rgba(245,158,11,0.3);"
    >
      <div class="relative z-10 flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-amber-500/20 backdrop-blur-md border border-amber-400/40 flex items-center justify-center text-2xl text-amber-300 shadow-inner">
          <i class="fa-solid fa-trophy"></i>
        </div>
        <div>
          <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 backdrop-blur-md text-[10px] font-mono font-bold uppercase tracking-widest text-amber-300 shadow-xs mb-1 border border-amber-400/30">
            <i class="fa-solid fa-crown text-amber-400"></i>
            <span>EMPIRE STANDINGS</span>
          </div>
          <h2 class="font-display font-black text-xl sm:text-2xl tracking-wide drop-shadow-sm flex items-center gap-2">
            <span>TYCOON LEADERBOARD</span>
            <span class="text-[10px] font-mono font-black uppercase tracking-widest bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shadow-xs">LIVE</span>
          </h2>
          <p class="text-xs font-semibold text-amber-200/90 mt-0.5 flex items-center gap-1.5">
            <span>Real-time net worth & empire rankings</span>
            <span class="text-white/40">•</span>
            <span id="leaderboard-match-timer" class="text-white font-mono font-bold">{state.matchTimerText || '15m match'}</span>
          </p>
        </div>
      </div>

      <button
        onclick={onClose}
        class="relative z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center cursor-pointer transition border border-white/20 backdrop-blur-md shadow-xs"
        title="Close Leaderboard [Esc]"
        aria-label="Close Leaderboard"
      >
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>
    </div>

    <!-- Summary / Proximity Banner -->
    {#if state.summaryText}
      <div id="leaderboard-summary-banner" class="bg-amber-950/40 border-b border-amber-500/20 px-5 py-2.5 flex items-center justify-between text-xs font-bold text-amber-200">
        <span>{state.summaryText}</span>
      </div>
    {/if}

    <!-- Scrollable Standings Body -->
    <div class="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 bg-slate-950/70">
      <div id="leaderboard-players-list" class="space-y-2.5">
        {#if state.standings && state.standings.length > 0}
          {#each state.standings as s}
            <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xs flex items-center justify-between gap-3 transition-colors hover:border-amber-400/40">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 rounded-xl font-mono font-black flex items-center justify-center text-sm shadow-inner shrink-0 {s.rank === 1 ? 'bg-amber-400 text-slate-950 font-black' : s.rank === 2 ? 'bg-slate-300 text-slate-950 font-black' : s.rank === 3 ? 'bg-amber-700 text-white font-black' : 'bg-slate-800 text-slate-400'}">
                  #{s.rank}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style="background:{s.colorHex}"></span>
                    <span class="font-display font-black text-sm text-white truncate">{s.name}</span>
                    {#if s.isLocal}
                      <span class="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">YOU</span>
                    {/if}
                    {#if s.isAI}
                      <span class="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md bg-white/10 text-slate-400 border border-white/10">AI</span>
                    {/if}
                  </div>
                  <div class="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                    <span>Cash: <strong class="text-emerald-400">{s.cashFormatted}</strong></span>
                    <span>•</span>
                    <span>Cities: <strong class="text-white">{s.citiesCount}</strong></span>
                    {#if s.setsCount > 0}
                      <span>•</span>
                      <span>Monopolies: <strong class="text-amber-300">{s.setsCount}</strong></span>
                    {/if}
                  </div>
                </div>
              </div>

              <div class="text-right shrink-0">
                <div class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Net Worth</div>
                <div class="font-mono font-black text-base text-amber-300">{s.netWorthFormatted}</div>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Live Timeline Chart Container -->
      <div class="mt-4 pt-3 border-t border-white/10">
        <div class="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
          <span class="flex items-center gap-1.5"><i class="fa-solid fa-chart-line text-amber-400"></i> Net Worth Trajectory Timeline</span>
          <span class="text-[10px] text-slate-500 font-normal">Turn-by-turn history</span>
        </div>
        <div id="leaderboard-timeline-chart" class="w-full h-36 bg-slate-900/80 rounded-2xl border border-white/10 p-2 overflow-hidden flex items-center justify-center">
          <!-- Populated by chart renderer or Svelte SVG -->
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="bg-slate-900/90 border-t border-white/10 px-5 py-3 flex items-center justify-between text-xs text-slate-400">
      <div class="flex items-center gap-2 font-medium text-[11px] sm:text-xs">
        <i class="fa-solid fa-circle-info text-sky-400"></i>
        <span>Net Worth = Cash + Property Deeds + House/Skyscraper Upgrades</span>
      </div>
      <button onclick={onClose} class="game-btn game-btn-blue px-6 py-2 text-xs font-black shadow-xs cursor-pointer">
        Close
      </button>
    </div>
  </div>
</div>
