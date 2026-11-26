<script>
  import { modalStore } from '../stores/modalStore.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.resumeMatch || {}; });

  function onDiscard() {
    if (typeof window !== 'undefined' && typeof window.discardSavedMatch === 'function') {
      window.discardSavedMatch();
    }
  }

  function onResume() {
    if (typeof window !== 'undefined' && typeof window.resumeLastSavedMatch === 'function') {
      window.resumeLastSavedMatch();
    }
  }
</script>

<div
  id="modal-resume-match"
  role="dialog"
  aria-modal="true"
  aria-labelledby="resume-match-title"
  class="fixed inset-0 z-[1000] items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overscroll-contain select-none {state.visible ? 'flex' : 'hidden'}"
>
  <div class="relative w-full max-w-md bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 text-slate-900 shadow-2xl flex flex-col gap-4 font-ui">
    <!-- Clean Header -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-base flex-shrink-0">
          <i class="fa-solid fa-play"></i>
        </div>
        <div>
          <h2 id="resume-match-title" class="font-display font-black text-xl text-slate-900 tracking-tight leading-tight">
            Resume Match?
          </h2>
          <p class="text-xs font-semibold text-slate-500">Pick up where you left off</p>
        </div>
      </div>

      {#if state.isMultiplayer}
        <span class="font-mono text-[11px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex-shrink-0">
          Room {state.roomCode || 'CODE'}
        </span>
      {/if}
    </div>

    <!-- Compact Match Meta Strip -->
    <div id="resume-match-meta" class="bg-slate-50 border border-slate-200/80 px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-600">
      <span class="flex items-center gap-1.5">
        <i class="fa-solid fa-stopwatch text-emerald-600"></i>
        <strong class="font-mono text-slate-900 font-black">{state.matchTimeFormatted || '00:00'}</strong>
      </span>
      <span class="inline-flex items-center gap-1.5 font-display font-black text-slate-800">
        <span class="w-2.5 h-2.5 rounded-full inline-block shrink-0" style="background:{state.currentPlayerColor || '#10b981'}"></span>
        <span>{state.currentPlayerName || 'Player'}'s Turn</span>
      </span>
    </div>

    <!-- Players Roster -->
    <div id="resume-player-roster" class="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
      {#if state.players && state.players.length > 0}
        {#each state.players as p}
          <div class="flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-50/90 border border-slate-200/80 text-xs">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-3 h-3 rounded-full shrink-0" style="background:{p.colorHex || '#6366f1'}"></span>
              <span class="font-display font-black text-slate-900 text-xs sm:text-sm truncate">{p.name}</span>
              {#if p.isAI}
                <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-slate-200/80 text-slate-600">Bot</span>
              {/if}
            </div>
            <div class="text-right flex items-center gap-1.5 flex-shrink-0">
              <span class="font-mono font-black text-emerald-700 text-xs sm:text-sm">${p.cashFormatted}</span>
              <span class="text-[11px] text-slate-500 font-semibold font-mono">({p.ownedCount} {p.ownedCount === 1 ? 'city' : 'cities'})</span>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-2.5 pt-1">
      <button
        type="button"
        onclick={onDiscard}
        class="game-btn game-btn-slate flex-1 py-2.5 text-xs sm:text-sm font-black cursor-pointer"
      >
        New Game
      </button>
      <button
        type="button"
        onclick={onResume}
        class="game-btn game-btn-green flex-1 py-2.5 text-xs sm:text-sm font-black cursor-pointer"
      >
        Resume Match
      </button>
    </div>
  </div>
</div>
