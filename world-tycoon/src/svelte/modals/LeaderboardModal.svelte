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
    role="dialog"
    aria-modal="true"
    aria-labelledby="leaderboard-title"
    class="speech-bubble-pop-in relative z-10 w-full max-w-[430px] sm:max-w-[480px] max-h-[calc(100vh-74px)] border-2 border-amber-400/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden font-ui pointer-events-auto {isDarkTheme ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}"
  >
    <!-- Pointer Beak pointing up to TopBar Trophy Pill -->
    <svg class="absolute -top-[11px] left-[65%] -translate-x-1/2 w-7 h-3 z-30 pointer-events-none overflow-visible drop-shadow-[0_-2px_4px_rgba(245,158,11,0.25)]" viewBox="0 0 28 12" fill="none" aria-hidden="true">
      <polygon points="4,12 14,1 24,12" fill={isDarkTheme ? '#020617' : '#ffffff'} />
      <polyline points="3,12 14,1 25,12" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>

    <!-- Header with Atmospheric Amber Gradient -->
    <div class="relative px-4 py-3 sm:px-5 sm:py-3.5 border-b flex items-center justify-between shadow-xs shrink-0 {isDarkTheme ? 'bg-gradient-to-r from-amber-950/70 via-slate-950 to-slate-950 border-amber-400/30' : 'bg-gradient-to-r from-amber-50 via-white to-white border-amber-200'}">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center text-base shadow-md shrink-0" aria-hidden="true">
          <i class="fa-solid fa-trophy"></i>
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2 leading-none">
            <h2 id="leaderboard-title" class="font-display font-black text-base sm:text-lg tracking-wide uppercase {isDarkTheme ? 'text-white' : 'text-slate-900'}">Empire Standings</h2>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-mono font-bold {isDarkTheme ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'}">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true"></span> LIVE
            </span>
          </div>
          <p class="text-xs font-semibold mt-1 flex items-center gap-1.5 flex-wrap {isDarkTheme ? 'text-amber-200' : 'text-amber-800'}">
            <span>Real-time rankings</span>
            <span class="{isDarkTheme ? 'text-white/40' : 'text-slate-400'}" aria-hidden="true">•</span>
            <span id="leaderboard-match-timer" class="inline-flex items-center gap-1 tabular-nums {isDarkTheme ? 'text-slate-200' : 'text-slate-800'}">
              <i class="fa-regular fa-clock text-[11px]" aria-hidden="true"></i>
              <span>{state.matchTimerText || '15m match'}</span>
            </span>
          </p>
        </div>
      </div>

      <button
        onclick={onClose}
        class="w-9 h-9 rounded-full active:scale-95 flex items-center justify-center cursor-pointer transition border shadow-xs shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 {isDarkTheme ? 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border-white/15' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border-slate-300'}"
        title="Close [Esc]"
        aria-label="Close Leaderboard"
      >
        <i class="fa-solid fa-xmark text-sm" aria-hidden="true"></i>
      </button>
    </div>

    <!-- Summary / Proximity Banner -->
    {#if state.summaryText}
      <div id="leaderboard-summary-banner" class="border-b px-4 py-2 flex items-center gap-2 text-xs font-bold shrink-0 {isDarkTheme ? 'bg-amber-500/10 border-amber-400/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-950'}">
        <i class="fa-solid fa-crown text-amber-600 text-xs shrink-0" aria-hidden="true"></i>
        <span class="truncate">{state.summaryText}</span>
      </div>
    {/if}

    <!-- Scrollable Standings Body -->
    <div class="p-3.5 sm:p-4 overflow-y-auto space-y-3 flex-1 {isDarkTheme ? 'bg-slate-950/80' : 'bg-white'}">
      <div id="leaderboard-players-list" class="space-y-2">
        {#if state.standings && state.standings.length > 0}
          {#each state.standings as s}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              onmouseenter={() => { spotlightIdx = s.playerIdx; }}
              onmouseleave={() => { spotlightIdx = null; }}
              class="p-2.5 sm:p-3 rounded-2xl border shadow-xs flex items-center justify-between gap-3 transition-all cursor-pointer hover:border-amber-400/70 {isDarkTheme ? 'bg-slate-900/90 border-white/15 hover:bg-slate-900' : 'bg-slate-50 border-slate-200 hover:bg-amber-50/40'} {spotlightIdx !== null && spotlightIdx !== s.playerIdx ? 'opacity-45' : 'opacity-100'}"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-7 h-7 rounded-lg font-mono font-black tabular-nums flex items-center justify-center text-xs shadow-inner shrink-0 {s.rank === 1 ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 border border-amber-200' : s.rank === 2 ? 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-950 border border-white' : s.rank === 3 ? 'bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 text-amber-50 border border-amber-600/50' : (isDarkTheme ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-slate-200 text-slate-800 border border-slate-300')}">
                  #{s.rank}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="w-3 h-3 rounded-full shrink-0 shadow-xs" style="background:{s.colorHex}" aria-hidden="true"></span>
                    <span class="font-display font-black text-sm sm:text-base truncate {isDarkTheme ? 'text-white' : 'text-slate-900'}">{s.name}</span>
                    {#if s.isLocal}
                      <span class="text-xs font-mono font-bold uppercase px-1.5 py-0.5 rounded border leading-none {isDarkTheme ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-50 text-emerald-800 border-emerald-300'}">YOU</span>
                    {/if}
                    {#if s.isAI}
                      <span class="text-xs font-mono font-bold uppercase px-1.5 py-0.5 rounded border leading-none {isDarkTheme ? 'bg-white/10 text-slate-300 border-white/15' : 'bg-slate-200/80 text-slate-700 border-slate-300'}">BOT</span>
                    {/if}
                  </div>
                  <div class="text-xs flex items-center gap-2 mt-1 tabular-nums {isDarkTheme ? 'text-slate-300' : 'text-slate-600'}">
                    <span class="flex items-center gap-1">
                      <i class="fa-solid fa-money-bill-wave text-emerald-600 text-xs" aria-hidden="true"></i>
                      <strong class="font-bold {isDarkTheme ? 'text-emerald-300' : 'text-emerald-800'}">{s.cashFormatted}</strong>
                    </span>
                    <span aria-hidden="true">•</span>
                    <span class="flex items-center gap-1">
                      <i class="fa-solid fa-city text-sky-600 text-xs" aria-hidden="true"></i>
                      <strong class="font-bold {isDarkTheme ? 'text-slate-100' : 'text-slate-900'}">{s.citiesCount}</strong>
                      <span>{s.citiesCount === 1 ? 'city' : 'cities'}</span>
                    </span>
                    {#if s.setsCount > 0}
                      <span aria-hidden="true">•</span>
                      <span class="flex items-center gap-1">
                        <i class="fa-solid fa-crown text-amber-500 text-xs" aria-hidden="true"></i>
                        <strong class="font-bold {isDarkTheme ? 'text-amber-300' : 'text-amber-800'}">{s.setsCount}</strong>
                        <span>{s.setsCount === 1 ? 'set' : 'sets'}</span>
                      </span>
                    {/if}
                  </div>
                </div>
              </div>

              <div class="text-right shrink-0">
                <div class="text-xs font-semibold uppercase tracking-wide {isDarkTheme ? 'text-slate-300' : 'text-slate-600'}">Net Worth</div>
                <div class="font-mono font-black tabular-nums text-base sm:text-lg drop-shadow-xs {isDarkTheme ? 'text-amber-300' : 'text-amber-800'}">{s.netWorthFormatted}</div>
                {#if s.velocity}
                  <div class="inline-flex items-center gap-1 text-xs font-mono font-bold tabular-nums px-1.5 py-0.5 rounded border mt-0.5 {s.velocity.trend === 'up' ? (isDarkTheme ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/35' : 'text-emerald-800 bg-emerald-50 border-emerald-300') : s.velocity.trend === 'down' ? (isDarkTheme ? 'text-rose-300 bg-rose-500/15 border-rose-500/35' : 'text-rose-800 bg-rose-50 border-rose-300') : (isDarkTheme ? 'text-slate-300 bg-slate-800 border-slate-700' : 'text-slate-700 bg-slate-100 border-slate-300')}">
                    {#if s.velocity.trend === 'up'}
                      <i class="fa-solid fa-arrow-trend-up text-[11px]" aria-hidden="true"></i>
                    {:else if s.velocity.trend === 'down'}
                      <i class="fa-solid fa-arrow-trend-down text-[11px]" aria-hidden="true"></i>
                    {:else}
                      <i class="fa-solid fa-minus text-[11px]" aria-hidden="true"></i>
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
      <div class="pt-2.5 border-t {isDarkTheme ? 'border-white/10' : 'border-slate-200'}">
        <div class="text-xs font-bold mb-1.5 flex items-center justify-between gap-2 {isDarkTheme ? 'text-slate-300' : 'text-slate-700'}">
          <span class="flex items-center gap-1.5 uppercase tracking-wide {isDarkTheme ? 'text-amber-300' : 'text-amber-800'}">
            <i class="fa-solid fa-chart-line text-amber-600" aria-hidden="true"></i> Trajectory
            {#if state.roundCount !== undefined}
              <span class="px-1.5 py-0.5 rounded border text-xs font-mono tabular-nums {isDarkTheme ? 'bg-amber-500/15 border-amber-400/30 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'}">Round {state.roundCount}</span>
            {/if}
          </span>
          <span class="text-xs font-medium {isDarkTheme ? 'text-slate-300' : 'text-slate-600'}">Hover or drag to inspect</span>
        </div>
        <div id="leaderboard-timeline-chart" class="w-full rounded-xl border p-2.5 overflow-hidden flex items-center justify-center {isDarkTheme ? 'bg-slate-900/90 border-white/10' : 'bg-slate-50 border-slate-200'}">
          <NetWorthChart chart={state.historyChart} {spotlightIdx} />
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="border-t px-4 py-2.5 flex items-center justify-between text-xs shrink-0 {isDarkTheme ? 'bg-slate-900 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}">
      <div class="flex items-center gap-1.5 truncate mr-2 {isDarkTheme ? 'text-slate-300' : 'text-slate-600'}">
        <i class="fa-solid fa-circle-info text-sky-600 shrink-0" aria-hidden="true"></i>
        <span class="truncate font-medium">Net Worth = Cash + Deeds + Upgrades</span>
      </div>
      <button
        onclick={onClose}
        class="px-4 py-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 active:scale-95 text-slate-950 font-black text-xs shadow-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        Close
      </button>
    </div>
  </div>
</div>
