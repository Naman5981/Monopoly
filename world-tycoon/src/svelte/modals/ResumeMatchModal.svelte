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
  class="fixed inset-0 z-50 items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl overscroll-contain select-none {state.visible ? 'flex' : 'hidden'}"
>
  <div
    class="relative w-full max-w-md bg-slate-950/95 border border-white/15 rounded-3xl p-0 text-white shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden font-ui transition-all duration-200"
    style="box-shadow: 0 25px 60px -15px rgba(0,0,0,0.9), 0 0 35px rgba(16,185,129,0.2);"
  >
    <!-- Grand Atmospheric Emerald Header -->
    <div
      class="relative p-5 text-white overflow-hidden flex flex-col gap-2.5 shadow-md"
      style="background: radial-gradient(circle at 50% 20%, rgba(16,185,129,0.38) 0%, rgba(2,6,23,0.95) 85%); border-bottom: 1px solid rgba(16,185,129,0.35);"
    >
      <!-- Top Row Badges -->
      <div class="flex items-center justify-between w-full relative z-10">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 backdrop-blur-md text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-emerald-300 shadow-xs border border-emerald-400/30">
          <i class="fa-solid fa-floppy-disk text-emerald-400"></i>
          <span>SAVED GAME SESSION</span>
        </div>
        <span class="text-[11px] font-mono font-bold text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
          AUTO-SAVED
        </span>
      </div>

      <!-- Title & Subtitle -->
      <div class="relative z-10 pt-1">
        <h2 class="font-display font-black text-2xl sm:text-3xl text-white tracking-wide drop-shadow-md">
          RESUME MATCH?
        </h2>
        <p class="text-xs sm:text-sm font-semibold text-emerald-200/90 drop-shadow mt-0.5">
          An unfinished match was detected in local storage.
        </p>
      </div>
    </div>

    <!-- Body Section -->
    <div class="p-4 sm:p-5 space-y-3.5 bg-slate-950/70">
      <!-- Match Meta Pill -->
      <div id="resume-match-meta" class="bg-slate-900/80 p-3 rounded-2xl border border-white/10 shadow-xs">
        <div class="flex items-center justify-between text-xs font-bold text-slate-300">
          <span class="flex items-center gap-1.5">
            <i class="fa-solid fa-stopwatch text-emerald-400"></i>
            <span>Match Time:</span>
            <strong class="font-mono text-emerald-300 font-black">{state.matchTimeFormatted || '00:00'}</strong>
          </span>
          <span class="flex items-center gap-1.5">
            <i class="fa-solid fa-dice text-amber-400"></i>
            <span>Turn:</span>
            <span class="inline-flex items-center gap-1.5 font-display font-black text-white px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
              <span
                class="w-2 h-2 rounded-full inline-block shrink-0 shadow-xs"
                style="background:{state.currentPlayerColor || '#10b981'}"
              ></span>
              <span>{state.currentPlayerName || 'Player'}</span>
            </span>
          </span>
        </div>

        {#if state.isMultiplayer}
          <div class="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-amber-300">
            <span class="flex items-center gap-1.5">
              <i class="fa-solid fa-tower-broadcast"></i>
              <span>Multiplayer Session ({state.isHost ? 'Host' : 'Guest'})</span>
            </span>
            <span class="font-mono font-black bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
              Room {state.roomCode || 'CODE'}
            </span>
          </div>
        {/if}
      </div>

      <!-- Players List -->
      <div>
        <div class="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Players in Match</span>
          <span class="text-[10px] text-slate-500 font-normal">Active Standings</span>
        </div>
        <div id="resume-player-roster" class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {#if state.players && state.players.length > 0}
            {#each state.players as p}
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-xs transition-colors">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full shrink-0 shadow-xs" style="background:{p.colorHex || '#6366f1'}"></span>
                  <span class="font-display font-black text-white text-xs sm:text-sm tracking-wide">{p.name}</span>
                  {#if p.isAI}
                    <span class="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md bg-white/10 text-slate-400 border border-white/10">AI</span>
                  {/if}
                </div>
                <div class="text-right flex items-center gap-1.5">
                  <span class="font-mono font-black text-emerald-400 text-xs sm:text-sm">{p.cashFormatted}</span>
                  <span class="text-[11px] text-slate-400 font-semibold font-mono">({p.ownedCount} {p.ownedCount === 1 ? 'city' : 'cities'})</span>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-2.5 pt-1.5">
        <button
          onclick={onDiscard}
          class="game-btn game-btn-slate flex-1 py-3 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <i class="fa-solid fa-rotate-left"></i>
          <span>New Game</span>
        </button>
        <button
          onclick={onResume}
          class="game-btn game-btn-green flex-1 py-3 text-xs sm:text-sm font-black shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <i class="fa-solid fa-play"></i>
          <span>Resume Match</span>
        </button>
      </div>
    </div>
  </div>
</div>
