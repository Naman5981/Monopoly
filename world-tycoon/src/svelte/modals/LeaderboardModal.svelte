<script>
  import { modalStore } from '../stores/modalStore.js';
  import { hudStore } from '../stores/hudStore.js';
  import NetWorthChart from '../components/NetWorthChart.svelte';

  let state = $state({});
  let hud = $state({});
  let spotlightIdx = $state(null);

  modalStore.subscribe(val => {
    state = val.leaderboard || {};
    if (!state.visible) spotlightIdx = null;
  });
  hudStore.subscribe(val => { hud = val || {}; });

  const isDarkTheme = $derived(hud.lightingMode === 'Night' || hud.boardStyle === 'cyberpunk');

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
    class="speech-bubble-pop-in relative z-10 w-full max-w-[390px] sm:max-w-[420px] max-h-[calc(100vh-74px)] border-2 border-amber-400/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden font-ui pointer-events-auto {isDarkTheme ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}"
  >
    <!-- Pointer Beak pointing up to TopBar Trophy Pill -->
    <svg class="absolute -top-[11px] left-[65%] -translate-x-1/2 w-7 h-3 z-30 pointer-events-none overflow-visible drop-shadow-[0_-2px_4px_rgba(245,158,11,0.25)]" viewBox="0 0 28 12" fill="none" aria-hidden="true">
      <polygon points="4,12 14,1 24,12" fill={isDarkTheme ? '#020617' : '#ffffff'} />
      <polyline points="3,12 14,1 25,12" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>

    <!-- Header with Atmospheric Amber Gradient -->
    <div class="relative px-4 py-3 sm:px-5 sm:py-3.5 border-b flex items-center justify-between shadow-xs shrink-0 {isDarkTheme ? 'bg-gradient-to-r from-amber-950/70 via-slate-950 to-slate-950 border-amber-400/30' : 'bg-gradient-to-r from-amber-50 via-white to-white border-amber-200'}">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center text-sm shadow-md shrink-0">
          <i class="fa-solid fa-trophy"></i>
        </div>
        <div>
          <div class="flex items-center gap-1.5 leading-none">
            <span class="font-display font-black text-sm sm:text-base tracking-wide uppercase {isDarkTheme ? 'text-white' : 'text-slate-900'}">Empire Standings</span>
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-mono font-black {isDarkTheme ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-700'}">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> LIVE
            </span>
          </div>
          <p class="text-[10px] font-bold mt-1 flex items-center gap-1.5 {isDarkTheme ? 'text-amber-200/80' : 'text-amber-700'}">
            <span>Real-time rankings</span>
            <span class="{isDarkTheme ? 'text-white/30' : 'text-slate-300'}">•</span>
            <span id="leaderboard-match-timer" class="font-mono {isDarkTheme ? 'text-white' : 'text-slate-900'}">{state.matchTimerText || '15m match'}</span>
          </p>
        </div>
      </div>

      <button
        onclick={onClose}
        class="w-7 h-7 rounded-full active:scale-95 flex items-center justify-center cursor-pointer transition border shadow-xs {isDarkTheme ? 'bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 border-slate-200'}"
        title="Close [Esc]"
        aria-label="Close Leaderboard"
      >
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    </div>

    <!-- Summary / Proximity Banner -->
    {#if state.summaryText}
      <div id="leaderboard-summary-banner" class="border-b px-4 py-1.5 flex items-center gap-2 text-[11px] font-bold shrink-0 {isDarkTheme ? 'bg-amber-500/10 border-amber-400/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'}">
        <i class="fa-solid fa-crown text-amber-500 text-xs"></i>
        <span class="truncate">{state.summaryText}</span>
      </div>
    {/if}

    <!-- Scrollable Standings Body -->
    <div class="p-3 sm:p-3.5 overflow-y-auto space-y-2 flex-1 {isDarkTheme ? 'bg-slate-950/80' : 'bg-white'}">
      <div id="leaderboard-players-list" class="space-y-1.5">
        {#if state.standings && state.standings.length > 0}
          {#each state.standings as s}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              onmouseenter={() => { spotlightIdx = s.playerIdx; }}
              onmouseleave={() => { spotlightIdx = null; }}
              class="p-2 sm:p-2.5 rounded-2xl border shadow-xs flex items-center justify-between gap-2 transition-all cursor-pointer hover:border-amber-400/60 {isDarkTheme ? 'bg-slate-900/90 border-white/10 hover:bg-slate-900' : 'bg-slate-50 border-slate-200 hover:bg-amber-50/40'} {spotlightIdx !== null && spotlightIdx !== s.playerIdx ? 'opacity-40' : 'opacity-100'}"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-6 h-6 rounded-lg font-mono font-black flex items-center justify-center text-[11px] shadow-inner shrink-0 {s.rank === 1 ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 border border-amber-200' : s.rank === 2 ? 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-950 border border-white' : s.rank === 3 ? 'bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 text-amber-100 border border-amber-600/50' : (isDarkTheme ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-200 text-slate-700 border border-slate-300')}">
                  #{s.rank}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style="background:{s.colorHex}"></span>
                    <span class="font-display font-black text-xs sm:text-sm truncate {isDarkTheme ? 'text-white' : 'text-slate-900'}">{s.name}</span>
                    {#if s.isLocal}
                      <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.2 rounded border {isDarkTheme ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-50 text-emerald-700 border-emerald-300'}">YOU</span>
                    {/if}
                    {#if s.isAI}
                      <span class="text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border {isDarkTheme ? 'bg-white/10 text-slate-400 border-white/10' : 'bg-slate-200/80 text-slate-600 border-slate-300'}">BOT</span>
                    {/if}
                  </div>
                  <div class="text-[11px] flex items-center gap-2 mt-0.5 font-mono {isDarkTheme ? 'text-slate-400' : 'text-slate-500'}">
                    <span class="flex items-center gap-1"><i class="fa-solid fa-money-bill-wave text-emerald-500 text-[10px]" aria-hidden="true"></i> <strong class="{isDarkTheme ? 'text-emerald-400' : 'text-emerald-700'}">{s.cashFormatted}</strong></span>
                    <span>•</span>
                    <span class="flex items-center gap-1"><i class="fa-solid fa-city text-sky-500 text-[10px]" aria-hidden="true"></i> <strong class="{isDarkTheme ? 'text-slate-200' : 'text-slate-800'}">{s.citiesCount}</strong></span>
                    {#if s.setsCount > 0}
                      <span>•</span>
                      <span class="flex items-center gap-1"><i class="fa-solid fa-crown text-amber-500 text-[10px]" aria-hidden="true"></i> <strong class="{isDarkTheme ? 'text-amber-300' : 'text-amber-700'}">{s.setsCount}</strong></span>
                    {/if}
                  </div>
                </div>
              </div>

              <div class="text-right shrink-0">
                <div class="text-[10px] font-mono font-bold uppercase tracking-wider {isDarkTheme ? 'text-slate-400' : 'text-slate-500'}">Net Worth</div>
                <div class="font-mono font-black text-sm sm:text-base drop-shadow-xs {isDarkTheme ? 'text-amber-300' : 'text-amber-700'}">{s.netWorthFormatted}</div>
                {#if s.velocity}
                  <div class="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1 rounded border mt-0.5 {s.velocity.trend === 'up' ? (isDarkTheme ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-emerald-700 bg-emerald-50 border-emerald-200') : s.velocity.trend === 'down' ? (isDarkTheme ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' : 'text-rose-700 bg-rose-50 border-rose-200') : (isDarkTheme ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-slate-600 bg-slate-100 border-slate-200')}">
                    {#if s.velocity.trend === 'up'}
                      <i class="fa-solid fa-arrow-trend-up text-[10px]" aria-hidden="true"></i>
                    {:else if s.velocity.trend === 'down'}
                      <i class="fa-solid fa-arrow-trend-down text-[10px]" aria-hidden="true"></i>
                    {:else}
                      <i class="fa-solid fa-minus text-[10px]" aria-hidden="true"></i>
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
      <div class="mt-2.5 pt-2 border-t {isDarkTheme ? 'border-white/10' : 'border-slate-200'}">
        <div class="text-[10px] font-mono font-bold uppercase tracking-wider mb-1 flex items-center justify-between {isDarkTheme ? 'text-slate-400' : 'text-slate-500'}">
          <span class="flex items-center gap-1.5 {isDarkTheme ? 'text-amber-300/90' : 'text-amber-700'}">
            <i class="fa-solid fa-chart-line text-amber-500"></i> Trajectory
            {#if state.roundCount !== undefined}
              <span class="px-1.5 py-0.2 rounded border text-[10px] {isDarkTheme ? 'bg-amber-500/15 border-amber-400/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'}">Round {state.roundCount}</span>
            {/if}
          </span>
          <span class="text-[10px] font-normal {isDarkTheme ? 'text-slate-500' : 'text-slate-400'}">Hover / drag to inspect rounds</span>
        </div>
        <div id="leaderboard-timeline-chart" class="w-full rounded-xl border p-2 overflow-hidden flex items-center justify-center {isDarkTheme ? 'bg-slate-900/90 border-white/10' : 'bg-slate-50 border-slate-200'}">
          <NetWorthChart chart={state.historyChart} {spotlightIdx} />
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="border-t px-4 py-2 flex items-center justify-between text-[10px] shrink-0 {isDarkTheme ? 'bg-slate-900 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}">
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
